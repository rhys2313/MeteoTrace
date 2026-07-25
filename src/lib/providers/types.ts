export type ProviderHealth = "LIVE" | "DEGRADED" | "OFFLINE" | "FALLBACK" | "PUBLIC_VIEW_ONLY";

export type ProviderProduct = {
  id: string;
  title: string;
  abstract?: string;
  supportedTimes: string[];
  coverage: string;
  attribution: string;
  legend: string[];
  group?: "overview" | "infrared" | "cloud" | "precipitation" | "convection" | "lightning" | "other";
  recommended?: boolean;
  crs?: string[];
  timeDimension?: string;
  boundingBox?: { crs?: string; values: [number, number, number, number] };
  styles?: Array<{ name?: string; title?: string; legendUrl?: string }>;
  operations?: string[];
  interfaces?: { wms: boolean; wcs: boolean; wfs: boolean; getFeatureInfo: boolean };
  productInfoUrl?: string;
  updateInterval?: string;
  spatialResolution?: string;
  units?: string;
  dataKind?: "visualization" | "algorithmic_estimate" | "measurement";
  limitations?: string;
};

export type ProviderStatus = {
  healthStatus: ProviderHealth;
  lastSuccessfulRequest?: string;
  failureReason?: string;
  fallbackProvider?: string;
};

/** A provider adapter never exposes an arbitrary upstream URL to the client. */
export interface WeatherDataProvider {
  readonly id: string;
  getStatus(): Promise<ProviderStatus>;
  getProducts(): Promise<ProviderProduct[]>;
  getAvailableTimes(productId: string): Promise<string[]>;
  getLegend(productId: string): Promise<string[]>;
}
