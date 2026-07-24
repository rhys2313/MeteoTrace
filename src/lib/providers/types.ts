export type ProviderHealth = "LIVE" | "DEGRADED" | "OFFLINE" | "FALLBACK" | "PUBLIC_VIEW_ONLY";

export type ProviderProduct = {
  id: string;
  title: string;
  abstract?: string;
  supportedTimes: string[];
  coverage: string;
  attribution: string;
  legend: string[];
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
