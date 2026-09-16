import {
  IFishInferenceEngine,
  FishAnalysisResult,
  AnalysisProgressEvent,
  FreshnessStatus,
} from './types';
import { SPECIES_DATABASE } from '../database/speciesData';

export class MockFishInferenceEngine implements IFishInferenceEngine {
  engineName = 'Mock Neural Engine v1.0 (MobileNetV4 + Allometric Morphometrics)';

  async analyzeImage(
    imageUri: string,
    onProgress?: (event: AnalysisProgressEvent) => void
  ): Promise<FishAnalysisResult> {
    const startTime = Date.now();

    // 7 South Asian MVP species
    const speciesKeys = [
      'rohu',
      'catla',
      'tilapia',
      'hilsa',
      'mrigal',
      'indian_mackerel',
      'pomfret',
    ];
    const chosenKey = speciesKeys[Math.floor(Math.random() * speciesKeys.length)] || 'rohu';
    const species = SPECIES_DATABASE[chosenKey] || SPECIES_DATABASE.rohu;

    // Simulate Step 1: Fish detection
    onProgress?.({
      step: 'detecting_fish',
      progressPercent: 20,
      statusMessage: 'Scanning frame for fish contours...',
    });
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Simulate Step 2: Species identification
    onProgress?.({
      step: 'identifying_species',
      progressPercent: 45,
      statusMessage: `Matching morphology: ${species.commonName} (${species.scientificName})`,
    });
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Simulate Step 3: Freshness organoleptic assessment
    onProgress?.({
      step: 'checking_freshness',
      progressPercent: 70,
      statusMessage: 'Assessing ocular clarity, gill saturation, and scale sheen...',
    });
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Simulate Step 4: Dimension measurement
    onProgress?.({
      step: 'measuring_dimensions',
      progressPercent: 88,
      statusMessage: 'Computing pixel-to-metric bounding box scale...',
    });
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Simulate Step 5: Biomass / weight estimation
    onProgress?.({
      step: 'estimating_weight',
      progressPercent: 98,
      statusMessage: 'Applying allometric length-weight equation W = a*L^b...',
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Calculate length, weight, volume
    const lengthCm = species.defaultLengthCm + (Math.floor(Math.random() * 5) - 2);
    const widthCm = Math.round(lengthCm * 0.28 * 10) / 10;
    
    // W in grams = a * (L in cm)^b -> Convert to kg
    const weightGrams = species.aCoeff * Math.pow(lengthCm, species.bCoeff);
    const estimatedWeightKg = Math.round((weightGrams / 1000) * 10) / 10 || 1.2;
    const estimatedVolumeCm3 = Math.round(Math.PI * Math.pow(widthCm / 2, 2) * lengthCm * 0.7);

    // Pick freshness
    const freshnessProfiles: Array<{
      status: FreshnessStatus;
      score: number;
      eyes: { score: number; clarity: string; description: string };
      gills: { score: number; color: string; description: string };
      skin: { score: number; texture: string; description: string };
      odor: string;
    }> = [
      {
        status: 'Fresh',
        score: 96,
        eyes: { score: 95, clarity: 'Crystal Clear', description: 'Cornea transparent, pupil jet black, convex lens.' },
        gills: { score: 92, color: 'Vibrant Bright Red', description: 'Bright uniform red, no mucus or discoloration.' },
        skin: { score: 96, texture: 'Firm & Highly Elastic', description: 'Glossy iridescent sheen, scales firmly adherent.' },
        odor: 'Clean fresh aquatic scent (Zero TMA/TVB-N)'
      },
      {
        status: 'Moderate',
        score: 72,
        eyes: { score: 70, clarity: 'Slightly Cloudy', description: 'Slight loss of corneal convexity, mild clouding.' },
        gills: { score: 68, color: 'Pale Pinkish Brown', description: 'Slight mucus accumulation, fading pigment.' },
        skin: { score: 74, texture: 'Moderately Firm', description: 'Loss of metallic sheen, slight scale looseness.' },
        odor: 'Mild fishy amine aroma (Acceptable for cooking)'
      },
      {
        status: 'Spoiled',
        score: 34,
        eyes: { score: 30, clarity: 'Sunken & Opaque', description: 'Deeply sunken eye orbits with milky opaque film.' },
        gills: { score: 28, color: 'Dull Brownish Gray', description: 'Thick cloudy slime, sour putrefaction odors.' },
        skin: { score: 35, texture: 'Soft & Flaccid', description: 'Indentations remain when pressed, scales easily shed.' },
        odor: 'Strong putrid trimethylamine (Unsafe for consumption)'
      }
    ];

    // Select profile (Fresh by default for successful catch)
    const profile = freshnessProfiles[0];

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    onProgress?.({
      step: 'completed',
      progressPercent: 100,
      statusMessage: 'Inference complete!',
    });

    const result: FishAnalysisResult = {
      id: `scan_${Date.now()}`,
      timestamp: today.toISOString(),
      formattedDate,
      imageUri,
      species,
      confidence: 0.94,
      freshness: {
        status: profile.status,
        score: profile.score,
        organoleptic: {
          eyes: profile.eyes,
          gills: profile.gills,
          skin: profile.skin,
          odorIndex: profile.odor,
        },
      },
      morphometrics: {
        lengthCm,
        widthCm,
        estimatedWeightKg,
        estimatedVolumeCm3,
        referenceScaling: 'Reference metric calibrated (1px = 0.52mm)',
        allometricFormula: `W = ${species.aCoeff} × L^${species.bCoeff}`,
      },
      boundingBox: {
        x: 0.15,
        y: 0.22,
        width: 0.7,
        height: 0.55,
      },
      isMockInference: true,
      modelInfo: {
        engineName: this.engineName,
        modelArchitecture: 'MobileNetV4-Backbone + Dual-Head (Species / Organoleptic)',
        latencyMs: Date.now() - startTime,
      },
    };

    return result;
  }
}
