import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Cell, DemSummary, FirmsResponse, RunRecord, RunResult, TerrainResponse, WeatherResponse
} from '../models';

const CONFIDENCE: Record<string, string> = { l: 'низька', n: 'номінальна', h: 'висока' };

/** Клієнт REST API серверної частини. Адреса /api проксіюється на бекенд (див. proxy.conf.json). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getFirms(): Observable<FirmsResponse> { return this.http.get<FirmsResponse>(`${this.base}/datasets/firms`); }
  getDem(mapId = 1): Observable<DemSummary> {
    return this.http.get<DemSummary>(`${this.base}/datasets/dem`, { params: { map: mapId } });
  }
  getWeather(): Observable<WeatherResponse> { return this.http.get<WeatherResponse>(`${this.base}/datasets/weather`); }
  getTerrain(mapId = 1): Observable<TerrainResponse> {
    return this.http.get<TerrainResponse>(`${this.base}/terrain`, { params: { map: mapId } });
  }

  runSimulation(hourIndex: number, mapId: number, ignitions: Cell[]): Observable<RunResult> {
    return this.http.post<RunResult>(`${this.base}/simulations`, { hourIndex, mapId, ignitions });
  }
  listRuns(): Observable<RunRecord[]> { return this.http.get<RunRecord[]>(`${this.base}/simulations`); }
  getRun(id: string): Observable<RunResult> { return this.http.get<RunResult>(`${this.base}/simulations/${id}`); }
  deleteRun(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/simulations/${id}`); }

  confidenceLabel(code: string): string { return CONFIDENCE[code] ?? code; }
}
