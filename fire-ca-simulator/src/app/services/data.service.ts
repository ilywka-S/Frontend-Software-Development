import { Injectable } from '@angular/core';
import { BBOX, DEM, FIRMS, WEATHER } from '../data/mock-data';

const CONFIDENCE: Record<string, string> = { l: 'низька', n: 'номінальна', h: 'висока' };

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly bbox = BBOX;
  readonly firms = FIRMS;
  readonly dem = DEM;
  readonly weather = WEATHER;

  confidenceLabel(code: string): string {
    return CONFIDENCE[code] ?? code;
  }
}
