export interface BoundingBox { west: number; east: number; south: number; north: number; }

export interface FirePoint {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  acq_date: string;
  acq_time: string;
  confidence: 'l' | 'n' | 'h';
  frp: number;
}

export interface DemSummary {
  resolution_m: number;
  elevation_min: number;
  elevation_max: number;
  mean_slope_deg: number;
}

export interface WeatherHour {
  time: string;
  u10: number;   // зональна складова вітру, м/с
  v10: number;   // меридіональна складова вітру, м/с
  rh: number;    // відносна вологість, %
}

export const BBOX: BoundingBox = { west: 30.40, east: 30.60, south: 50.40, north: 50.50 };

export const FIRMS: FirePoint[] = [
  { latitude: 50.451, longitude: 30.521, bright_ti4: 345.2, acq_date: '2026-07-14', acq_time: '11:42', confidence: 'h', frp: 14.8 },
  { latitude: 50.453, longitude: 30.526, bright_ti4: 331.4, acq_date: '2026-07-14', acq_time: '11:42', confidence: 'n', frp: 6.1 },
  { latitude: 50.448, longitude: 30.517, bright_ti4: 338.0, acq_date: '2026-07-14', acq_time: '11:42', confidence: 'n', frp: 8.3 }
];

export const DEM: DemSummary = { resolution_m: 30, elevation_min: 98, elevation_max: 187, mean_slope_deg: 6.5 };

export const WEATHER: WeatherHour[] = [
  { time: '2026-07-14T09:00:00Z', u10: 1.8,  v10: -0.6, rh: 52 },
  { time: '2026-07-14T12:00:00Z', u10: 6.5,  v10: -2.0, rh: 34 },
  { time: '2026-07-14T15:00:00Z', u10: 11.0, v10: -4.5, rh: 24 },
  { time: '2026-07-14T18:00:00Z', u10: 4.2,  v10:  1.5, rh: 41 }
];
