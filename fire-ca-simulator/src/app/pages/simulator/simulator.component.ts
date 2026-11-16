import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import {
  Cell, DemSummary, FirePoint, FirmsResponse, Frame, RunRecord, RunResult, Stats, TerrainResponse, WeatherHour
} from '../../models';

type Status = 'idle' | 'calculating' | 'running' | 'paused' | 'finished';

const STATUS_TEXT: Record<Status, string> = {
  idle: 'очікування', calculating: 'розрахунок', running: 'виконується', paused: 'пауза', finished: 'завершено'
};
const DIRECTIONS = ['схід', 'південний схід', 'південь', 'південний захід',
                    'захід', 'північний захід', 'північ', 'північний схід'];
const SERVER_ERROR = 'Не вдалося зв’язатися із сервером. Переконайтеся, що бекенд запущено (npm start у каталозі backend).';
const EMPTY_STATS: Stats = { step: 0, burning: 0, burned: 0, percent: 0, areaHa: 0 };
const MAX_POINTS = 20;                      // має збігатися з MAX_IGNITIONS на сервері

// кольори клітин: вода, трава, ліс, густий ліс
const FUEL_COLORS: number[][] = [[63, 127, 176], [138, 168, 74], [47, 93, 54], [31, 68, 38]];
const BURNING_COLOR = [255, 90, 44];
const BURNED_COLOR = [43, 51, 56];

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './simulator.component.html'
})
export class SimulatorComponent implements AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private timer: ReturnType<typeof setInterval> | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private image: ImageData | null = null;

  @ViewChild('mapCanvas') mapCanvas?: ElementRef<HTMLCanvasElement>;

  // дані із сервера
  readonly firms = signal<FirmsResponse | null>(null);
  readonly dem = signal<DemSummary | null>(null);
  readonly weather = signal<WeatherHour[]>([]);
  readonly terrain = signal<TerrainResponse | null>(null);
  readonly history = signal<RunRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly hint = signal('');

  // карта та точки займання
  readonly mapId = signal(1);
  readonly ignitions = signal<Cell[]>([]);
  readonly size = computed(() => this.terrain()?.size ?? 60);

  // стан симуляції
  readonly status = signal<Status>('idle');
  readonly hourIndex = signal(0);
  readonly frames = signal<Frame[]>([]);
  readonly series = signal<Stats[]>([]);
  readonly frameIdx = signal(0);
  readonly seed = signal<number | null>(null);
  readonly runId = signal<string | null>(null);      // запуск, що відображається зараз

  readonly statusText = computed(() => STATUS_TEXT[this.status()]);
  readonly lastStep = computed(() => Math.max(0, this.series().length - 1));
  readonly stats = computed<Stats>(() => {
    const frame = this.frames()[this.frameIdx()];
    const s = frame ? this.series()[frame.step] : undefined;
    return s ?? EMPTY_STATS;
  });

  // швидкість і напрямок вітру зі складових ERA5 u10/v10
  readonly wind = computed(() => {
    const h = this.weather()[this.hourIndex()];
    if (!h) return null;
    const speed = Math.hypot(h.u10, h.v10);
    const deg = (Math.atan2(-h.v10, h.u10) * 180 / Math.PI + 360) % 360;
    return { speed: +speed.toFixed(1), rh: h.rh, name: DIRECTIONS[Math.round(deg / 45) % 8] };
  });

  // найпотужніша гаряча точка (за FRP)
  readonly strongest = computed<FirePoint | null>(() => {
    const pts = this.firms()?.points ?? [];
    return pts.length ? pts.reduce((a, b) => (b.frp > a.frp ? b : a)) : null;
  });

  constructor() {
    forkJoin({
      firms: this.api.getFirms(), weather: this.api.getWeather(), terrain: this.api.getTerrain(1),
      dem: this.api.getDem(1), runs: this.api.listRuns()
    }).subscribe({
      next: (d) => {
        this.firms.set(d.firms); this.weather.set(d.weather.hours); this.history.set(d.runs);
        this.applyMap(d.terrain, d.dem);
        this.loading.set(false);
        this.draw();
        const requested = this.route.snapshot.queryParamMap.get('run');   // перехід зі сторінки запуску
        if (requested) this.open(requested);
      },
      error: () => { this.error.set(SERVER_ERROR); this.loading.set(false); }
    });
  }

  ngAfterViewInit(): void {
    this.ctx = this.mapCanvas?.nativeElement.getContext('2d') ?? null;
    this.draw();
  }

  ngOnDestroy(): void { this.clearTimer(); }

  // --- дії користувача ---
  onHourChange(event: Event): void {
    this.hourIndex.set(Number((event.target as HTMLSelectElement).value));
  }

  /** Клацання по карті: додає точку займання або прибирає наявну (лише до запуску). */
  onMapClick(event: MouseEvent): void {
    const t = this.terrain();
    const canvas = this.mapCanvas?.nativeElement;
    if (!t || !canvas || this.status() !== 'idle') return;

    const r = canvas.getBoundingClientRect();
    const x = Math.min(t.size - 1, Math.max(0, Math.floor(((event.clientX - r.left) / r.width) * t.size)));
    const y = Math.min(t.size - 1, Math.max(0, Math.floor(((event.clientY - r.top) / r.height) * t.size)));

    const existing = this.ignitions().findIndex((c) => c.x === x && c.y === y);
    if (existing >= 0) {
      this.ignitions.update((list) => list.filter((_, i) => i !== existing));
      this.hint.set('');
    } else if (t.fuel.charCodeAt(y * t.size + x) - 48 === 0) {
      this.hint.set('Тут вода: точку можна поставити лише на суші.');
    } else if (this.ignitions().length >= MAX_POINTS) {
      this.hint.set(`Можна поставити не більше ${MAX_POINTS} точок.`);
    } else {
      this.ignitions.update((list) => [...list, { x, y }]);
      this.hint.set('');
    }
  }

  clearPoints(): void { this.ignitions.set([]); this.hint.set(''); }

  useFirmsPoints(): void {
    this.ignitions.set(this.terrain()?.firmsCells ?? []);
    this.hint.set('');
  }

  start(): void {
    if (this.status() === 'paused') { this.play(); return; }
    if (this.status() !== 'idle') return;
    if (this.ignitions().length === 0) { this.hint.set('Поставте на карті хоча б одну точку займання.'); return; }
    this.error.set('');
    this.hint.set('');
    this.status.set('calculating');
    this.api.runSimulation(this.hourIndex(), this.mapId(), this.ignitions()).subscribe({
      next: (run) => { this.loadRun(run); this.refreshHistory(); },
      error: () => { this.status.set('idle'); this.error.set(SERVER_ERROR); }
    });
  }

  pause(): void { this.clearTimer(); this.status.set('paused'); }

  /** Скидає симуляцію й підставляє випадкову карту (відмінну від поточної). */
  reset(): void {
    if (this.status() === 'calculating') return;
    this.clearTimer();
    this.frames.set([]); this.series.set([]); this.frameIdx.set(0); this.seed.set(null); this.runId.set(null);
    this.status.set('idle');
    this.hint.set('');
    this.api.getTerrain(this.nextMapId()).subscribe({
      next: (t) => this.api.getDem(t.mapId).subscribe({
        next: (d) => { this.applyMap(t, d); this.draw(); },
        error: () => this.error.set(SERVER_ERROR)
      }),
      error: () => this.error.set(SERVER_ERROR)
    });
  }

  open(id: string): void {
    if (this.status() === 'calculating') return;
    this.error.set('');
    this.clearTimer();
    this.api.getRun(id).subscribe({
      next: (run) => this.loadRun(run),
      error: () => this.error.set(SERVER_ERROR)
    });
  }

  remove(id: string): void {
    this.api.deleteRun(id).subscribe({ next: () => this.refreshHistory(), error: () => this.error.set(SERVER_ERROR) });
  }

  // --- допоміжне ---
  /** Положення клітини на карті у відсотках (центр клітини). */
  cellPct(index: number): string { return ((index + 0.5) / this.size()) * 100 + '%'; }

  private nextMapId(): number {
    const ids = this.terrain()?.mapIds ?? [1, 2, 3];
    const others = ids.filter((i) => i !== this.mapId());
    const pool = others.length ? others : ids;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private applyMap(t: TerrainResponse, d: DemSummary): void {
    this.mapId.set(t.mapId);
    this.terrain.set(t);
    this.dem.set(d);
    this.ignitions.set(t.firmsCells);          // за замовчуванням початкові осередки беруться з FIRMS
  }

  private ensureMap(id: number): Observable<void> {
    if (id === this.mapId()) return of(undefined);
    return forkJoin({ t: this.api.getTerrain(id), d: this.api.getDem(id) })
      .pipe(map(({ t, d }) => this.applyMap(t, d)));
  }

  private loadRun(run: RunResult): void {
    this.ensureMap(run.params.mapId ?? 1).subscribe({
      next: () => {
        if (run.params.ignitions) this.ignitions.set(run.params.ignitions);
        this.frames.set(run.frames); this.series.set(run.series); this.seed.set(run.params.seed);
        this.runId.set(run.id); this.hourIndex.set(run.params.hourIndex);
        this.frameIdx.set(0);
        this.draw();
        this.play();
      },
      error: () => { this.status.set('idle'); this.error.set(SERVER_ERROR); }
    });
  }

  private play(): void {
    this.clearTimer();
    this.status.set('running');
    this.timer = setInterval(() => this.tick(), 120);
  }

  private tick(): void {
    const last = this.frames().length - 1;
    const next = Math.min(this.frameIdx() + 1, last);
    this.frameIdx.set(next);
    this.draw();
    if (next >= last) { this.clearTimer(); this.status.set('finished'); }
  }

  private refreshHistory(): void {
    this.api.listRuns().subscribe((runs) => this.history.set(runs));
  }

  private clearTimer(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  /** Малює карту палива та поточний кадр пожежі на canvas (одна клітина = один піксель). */
  private draw(): void {
    const t = this.terrain();
    const canvas = this.mapCanvas?.nativeElement;
    if (!t || !canvas || !this.ctx) return;
    const n = t.size;
    if (canvas.width !== n) { canvas.width = n; canvas.height = n; this.image = null; }
    if (!this.image) this.image = this.ctx.createImageData(n, n);

    const px = this.image.data;
    const cells = this.frames()[this.frameIdx()]?.cells;
    for (let i = 0; i < n * n; i++) {
      let c = FUEL_COLORS[t.fuel.charCodeAt(i) - 48];
      const f = cells ? cells.charCodeAt(i) - 48 : 0;
      if (f === 1) c = BURNING_COLOR; else if (f === 2) c = BURNED_COLOR;
      const o = i * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
    }
    this.ctx.putImageData(this.image, 0, 0);
  }
}
