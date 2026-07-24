export type Coordinates = { lat: number; lon: number };

export type Area = Coordinates & { name: string; country?: string };

export type ProductId = "geocolour" | "ir105" | "cloudHeight" | "cloudTemperature" | "cloudType" | "lightning";

export type Product = {
  id: ProductId;
  name: string;
  shortName: string;
  description: string;
  interpretation: string;
  limitations: string;
  units: string;
  kind: "measurement" | "derived";
  legend: string[];
};

export type Frame = { id: string; time: string; label: string; index: number };

export type SatelliteMode = "DEMO" | "LIVE" | "UNAVAILABLE";
export type DataSource = "eumetsat" | "rainviewer" | "copernicus";
export type ComparisonMode = "split" | "horizontal" | "opacity" | "blink" | "difference";
export type SelectionMode = "point" | "bbox" | "view";

export type AnalysisStats = {
  mean: number;
  median: number;
  min: number;
  max: number;
  changedPixels: number;
  sampleSize: number;
};

export type MeteoCase = {
  id: string;
  title: string;
  area: Area;
  products: ProductId[];
  frameA: number;
  frameB: number;
  startTime: string;
  endTime: string;
  note: string;
  createdAt: string;
  mode: SatelliteMode;
  source?: DataSource;
  productId?: ProductId;
  selectionMode?: SelectionMode;
  bbox?: [number, number, number, number];
  tags?: string[];
  evidence?: string[];
  analysis?: AnalysisStats;
  schemaVersion?: 2;
};

export type TraceNode = {
  id: string;
  title: string;
  type: string;
  description: string;
  productId?: ProductId;
};
