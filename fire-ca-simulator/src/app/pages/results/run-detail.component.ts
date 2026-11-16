import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { RunRecord, Stats } from '../../models';

// геометрія SVG-діаграми
const W = 600, H = 220, LEFT = 48, RIGHT = 12, TOP = 12, BOTTOM = 28;
const DIRECTIONS = ['схід', 'південний схід', 'південь', 'південний захід',
                    'захід', 'північний захід', 'північ', 'північний схід'];

@Component({
  selector: 'app-run-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './run-detail.component.html'
})
export class RunDetailComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly run = signal<RunRecord | null>(null);
  readonly error = signal('');

  readonly direction = computed(() => {
    const p = this.run()?.params;
    if (!p) return '';
    const deg = (Math.atan2(-p.v10, p.u10) * 180 / Math.PI + 360) % 360;
    return DIRECTIONS[Math.round(deg / 45) % 8];
  });

  readonly lastStep = computed(() => Math.max(0, (this.run()?.series.length ?? 1) - 1));
  readonly maxPercent = computed(() => this.maxOf((s) => s.percent));
  readonly maxBurning = computed(() => this.maxOf((s) => s.burning));
  readonly percentLine = computed(() => this.line((s) => s.percent, this.maxPercent()));
  readonly burningLine = computed(() => this.line((s) => s.burning, this.maxBurning()));

  readonly bottomY = H - BOTTOM;
  readonly rightX = W - RIGHT;
  readonly left = LEFT;
  readonly top = TOP;
  readonly width = W;
  readonly height = H;

  constructor() {
    this.api.getRun(this.id).subscribe({
      next: (r) => this.run.set(r),
      error: (e) => this.error.set(e?.status === 404 ? 'Запуск не знайдено.' : 'Не вдалося отримати дані із сервера.')
    });
  }

  remove(): void {
    this.api.deleteRun(this.id).subscribe({
      next: () => this.router.navigate(['/simulator/results']),
      error: () => this.error.set('Не вдалося видалити запуск.')
    });
  }

  private maxOf(pick: (s: Stats) => number): number {
    const series = this.run()?.series ?? [];
    return Math.max(1, ...series.map(pick));
  }

  private line(pick: (s: Stats) => number, maxY: number): string {
    const series = this.run()?.series ?? [];
    const maxX = Math.max(1, series.length - 1);
    return series
      .map((s, i) => {
        const x = LEFT + (i / maxX) * (W - LEFT - RIGHT);
        const y = H - BOTTOM - (pick(s) / maxY) * (H - TOP - BOTTOM);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
