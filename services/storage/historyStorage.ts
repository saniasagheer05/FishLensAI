import AsyncStorage from '@react-native-async-storage/async-storage';
import { FishAnalysisResult } from '../ai/types';
import { SPECIES_DATABASE } from '../database/speciesData';
import { apiClient } from '../api/apiClient';

const HISTORY_STORAGE_KEY = '@fishlens_scan_history_v1';

export const INITIAL_SEEDED_SCANS: FishAnalysisResult[] = [
  {
    id: 'seed-scan-1',
    timestamp: '2026-08-16T10:30:00.000Z',
    formattedDate: 'Aug 16, 2026',
    imageUri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    species: SPECIES_DATABASE.rohu,
    confidence: 0.94,
    freshness: {
      status: 'Fresh',
      score: 96,
      organoleptic: {
        eyes: { score: 95, clarity: 'Crystal Clear', description: 'Cornea transparent, convex lens' },
        gills: { score: 92, color: 'Vibrant Bright Red', description: 'Bright uniform red, no mucus' },
        skin: { score: 96, texture: 'Firm & Elastic', description: 'Glossy iridescent sheen' },
        odorIndex: 'Clean marine / fresh'
      }
    },
    morphometrics: {
      lengthCm: 38,
      widthCm: 10.6,
      estimatedWeightKg: 1.2,
      estimatedVolumeCm3: 1150,
      referenceScaling: 'Reference metric calibrated',
      allometricFormula: 'W = 0.0125 × L^3.02'
    },
    boundingBox: { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
    isMockInference: true,
    modelInfo: {
      engineName: 'Mock Neural Engine v1.0',
      modelArchitecture: 'MobileNetV4 + Dual Head',
      latencyMs: 1420
    }
  },
  {
    id: 'seed-scan-2',
    timestamp: '2026-08-15T14:15:00.000Z',
    formattedDate: 'Aug 15, 2026',
    imageUri: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=600&q=80',
    species: SPECIES_DATABASE.catla,
    confidence: 0.91,
    freshness: {
      status: 'Moderate',
      score: 72,
      organoleptic: {
        eyes: { score: 70, clarity: 'Slightly Cloudy', description: 'Mild corneal haze' },
        gills: { score: 68, color: 'Pale Pinkish Red', description: 'Fading color with light slime' },
        skin: { score: 74, texture: 'Moderately Firm', description: 'Slight loss of surface elasticity' },
        odorIndex: 'Mild amine aroma'
      }
    },
    morphometrics: {
      lengthCm: 48,
      widthCm: 13.4,
      estimatedWeightKg: 2.5,
      estimatedVolumeCm3: 2200,
      referenceScaling: 'Reference metric calibrated',
      allometricFormula: 'W = 0.0142 × L^2.98'
    },
    boundingBox: { x: 0.12, y: 0.18, width: 0.76, height: 0.64 },
    isMockInference: true,
    modelInfo: {
      engineName: 'Mock Neural Engine v1.0',
      modelArchitecture: 'MobileNetV4 + Dual Head',
      latencyMs: 1380
    }
  },
  {
    id: 'seed-scan-3',
    timestamp: '2026-08-12T09:45:00.000Z',
    formattedDate: 'Aug 12, 2026',
    imageUri: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=600&q=80',
    species: SPECIES_DATABASE.tilapia,
    confidence: 0.88,
    freshness: {
      status: 'Spoiled',
      score: 34,
      organoleptic: {
        eyes: { score: 30, clarity: 'Sunken & Opaque', description: 'Milky opaque film, sunken orbits' },
        gills: { score: 28, color: 'Dull Brownish Gray', description: 'Thick gray mucus layer' },
        skin: { score: 35, texture: 'Soft & Flaccid', description: 'Pitting on pressure, loose scales' },
        odorIndex: 'Strong putrid ammonia'
      }
    },
    morphometrics: {
      lengthCm: 25,
      widthCm: 7.0,
      estimatedWeightKg: 0.8,
      estimatedVolumeCm3: 720,
      referenceScaling: 'Reference metric calibrated',
      allometricFormula: 'W = 0.0189 × L^2.89'
    },
    boundingBox: { x: 0.15, y: 0.25, width: 0.7, height: 0.5 },
    isMockInference: true,
    modelInfo: {
      engineName: 'Mock Neural Engine v1.0',
      modelArchitecture: 'MobileNetV4 + Dual Head',
      latencyMs: 1510
    }
  },
  {
    id: 'seed-scan-4',
    timestamp: '2026-08-10T16:20:00.000Z',
    formattedDate: 'Aug 10, 2026',
    imageUri: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    species: SPECIES_DATABASE.hilsa,
    confidence: 0.95,
    freshness: {
      status: 'Fresh',
      score: 94,
      organoleptic: {
        eyes: { score: 94, clarity: 'Crystal Clear', description: 'Full bright convex eyes' },
        gills: { score: 90, color: 'Vibrant Ruby Red', description: 'Fresh clean aroma, bright ruby' },
        skin: { score: 95, texture: 'Silvery & Firm', description: 'Silver sheen, firmly attached scales' },
        odorIndex: 'Fresh buttery aquatic'
      }
    },
    morphometrics: {
      lengthCm: 36,
      widthCm: 9.8,
      estimatedWeightKg: 1.5,
      estimatedVolumeCm3: 1350,
      referenceScaling: 'Reference metric calibrated',
      allometricFormula: 'W = 0.0098 × L^3.12'
    },
    boundingBox: { x: 0.1, y: 0.22, width: 0.8, height: 0.56 },
    isMockInference: true,
    modelInfo: {
      engineName: 'Mock Neural Engine v1.0',
      modelArchitecture: 'MobileNetV4 + Dual Head',
      latencyMs: 1450
    }
  }
];

export class HistoryStorageService {
  static async getHistory(): Promise<FishAnalysisResult[]> {
    try {
      // 1. Attempt to fetch latest scan history from backend REST API
      const remoteHistory = await apiClient.getScanHistory();
      if (remoteHistory && remoteHistory.length > 0) {
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(remoteHistory));
        return remoteHistory;
      }

      // 2. Fallback to local device storage
      const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }

      // 3. Initialize with seed data if empty
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(INITIAL_SEEDED_SCANS));
      return INITIAL_SEEDED_SCANS;
    } catch (e) {
      console.warn('Error reading scan history, using local fallback:', e);
      try {
        const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        return stored ? JSON.parse(stored) : INITIAL_SEEDED_SCANS;
      } catch {
        return INITIAL_SEEDED_SCANS;
      }
    }
  }

  static async saveScan(scan: FishAnalysisResult): Promise<void> {
    try {
      // Save locally
      const history = await this.getHistory();
      const updated = [scan, ...history.filter((item) => item.id !== scan.id)];
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));

      // Sync to backend REST API
      await apiClient.saveScan(scan);
    } catch (e) {
      console.error('Error saving scan:', e);
    }
  }

  static async getScanById(id: string): Promise<FishAnalysisResult | null> {
    const history = await this.getHistory();
    return history.find((item) => item.id === id) || null;
  }

  static async deleteScan(id: string): Promise<void> {
    try {
      // Delete locally
      const history = await this.getHistory();
      const updated = history.filter((item) => item.id !== id);
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));

      // Delete on backend
      await apiClient.deleteScan(id);
    } catch (e) {
      console.error('Error deleting scan:', e);
    }
  }

  static async clearHistory(): Promise<void> {
    try {
      // Clear locally
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);

      // Clear on backend
      await apiClient.clearHistory();
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  }
}
