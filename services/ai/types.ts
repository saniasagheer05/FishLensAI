export type FreshnessStatus = 'Fresh' | 'Moderate' | 'Spoiled';

export interface OrganolepticMetrics {
  eyes: {
    score: number; // 0 - 100
    clarity: string;
    description: string;
  };
  gills: {
    score: number; // 0 - 100
    color: string;
    description: string;
  };
  skin: {
    score: number; // 0 - 100
    texture: string;
    description: string;
  };
  odorIndex: string;
}

export interface Morphometrics {
  lengthCm: number;
  widthCm: number;
  estimatedWeightKg: number;
  estimatedVolumeCm3: number;
  referenceScaling: string;
  allometricFormula: string;
  validationStatus?: string;
}

export interface FishSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  diet: string;
  nativeRegion: string;
  commercialValue: string;
  culinaryNotes: string;
  optimalTempC: string;
  shelfLifeDays: number;
  aCoeff: number; // For W = a * L^b
  bCoeff: number;
  defaultLengthCm: number;
  sampleImageUri: string;
  probabilities?: Record<string, number>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FishAnalysisResult {
  id: string;
  timestamp: string;
  formattedDate: string;
  imageUri: string;
  species: FishSpecies;
  confidence: number; // e.g. 0.94
  freshness: {
    status: FreshnessStatus;
    score: number; // 0 - 100
    confidence?: number;
    probabilities?: Record<string, number>;
    organoleptic?: OrganolepticMetrics;
  };
  morphometrics: Morphometrics;
  boundingBox: BoundingBox;
  isMockInference: boolean;
  modelInfo: {
    engineName: string;
    modelArchitecture: string;
    latencyMs: number;
  };
}

export type AnalysisStep = 
  | 'detecting_fish'
  | 'identifying_species'
  | 'checking_freshness'
  | 'measuring_dimensions'
  | 'estimating_weight'
  | 'completed';

export interface AnalysisProgressEvent {
  step: AnalysisStep;
  progressPercent: number;
  statusMessage: string;
}

export interface IFishInferenceEngine {
  engineName: string;
  analyzeImage(
    imageUri: string,
    onProgress?: (event: AnalysisProgressEvent) => void
  ): Promise<FishAnalysisResult>;
}
