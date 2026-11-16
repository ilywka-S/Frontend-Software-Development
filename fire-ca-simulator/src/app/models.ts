// Типи відповідей серверної частини (REST API).

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
export interface FirmsResponse { product: string; bbox: BoundingBox; points: FirePoint[]; }

export interface DemSummary {
  product: string;
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
export interface WeatherResponse { product: string; hours: WeatherHour[]; }

/** Клітина сітки (x - стовпець, y - рядок). */
export interface Cell { x: number; y: number; }

/** Карта палива: рядок із size*size символів (0 вода, 1 трава, 2 ліс, 3 густий ліс). */
export interface TerrainResponse {
  mapId: number; mapIds: number[]; size: number; bbox: BoundingBox; cellAreaHa: number;
  fuel: string;
  firmsCells: Cell[];      // гарячі точки FIRMS, переведені в клітини цієї карти
}

export interface Stats { step: number; burning: number; burned: number; percent: number; areaHa: number; }

export interface RunParams {
  hourIndex: number; steps: number; seed: number;
  mapId?: number; ignitions?: Cell[];      // у старих записах історії цих полів немає
  time: string; windSpeed: number; u10: number; v10: number; rh: number;
}

/** Кадр симуляції: рядок із size*size символів (0 не горить, 1 горить, 2 згоріла). */
export interface Frame { step: number; cells: string; }

export interface RunRecord { id: string; createdAt: string; params: RunParams; summary: Stats; series: Stats[]; }
export interface RunResult extends RunRecord { frames: Frame[]; }
