import { Platform } from 'react-native';
import { FishAnalysisResult, FishSpecies } from '../ai/types';

// Default API URL (localhost on web, 10.0.2.2 on Android emulator, or LAN IP)
const getApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private token: string | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // 1. Health Check
  public async checkHealth(): Promise<{ status: string; database: any }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch (err: any) {
      return { status: 'unreachable', database: { connected: false, error: err.message } };
    }
  }

  // 2. Species Data
  public async getSpecies(): Promise<FishSpecies[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/species`, {
        headers: this.getHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((item: any) => ({
          id: item.id,
          commonName: item.common_name,
          scientificName: item.scientific_name,
          family: item.family,
          diet: item.diet,
          nativeRegion: item.native_region,
          commercialValue: item.commercial_value,
          culinaryNotes: item.culinary_notes,
          optimalTempC: item.optimal_temp_c,
          shelfLifeDays: item.shelf_life_days,
          aCoeff: Number(item.a_coeff),
          bCoeff: Number(item.b_coeff),
          defaultLengthCm: Number(item.default_length_cm),
          sampleImageUri: item.sample_image_uri,
        }));
      }
      return [];
    } catch (err) {
      console.warn('[ApiClient] Failed to fetch species from backend:', err);
      return [];
    }
  }

  // 3. Save Scan Result
  public async saveScan(scan: FishAnalysisResult): Promise<boolean> {
    try {
      const payload = {
        id: scan.id,
        species_id: scan.species.id,
        species_name: scan.species.commonName,
        species_scientific_name: scan.species.scientificName,
        species_confidence: scan.confidence,
        freshness_status: scan.freshness.status,
        freshness_score: scan.freshness.score,
        freshness_confidence: scan.freshness.score / 100,
        length_cm: scan.morphometrics.lengthCm,
        width_cm: scan.morphometrics.widthCm,
        estimated_weight_kg: scan.morphometrics.estimatedWeightKg,
        estimated_volume_cm3: scan.morphometrics.estimatedVolumeCm3,
        allometric_formula: scan.morphometrics.allometricFormula,
        image_uri: scan.imageUri,
        bounding_box: scan.boundingBox,
        model_info: scan.modelInfo,
        timestamp: scan.timestamp,
      };

      const res = await fetch(`${API_BASE_URL}/scans`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn('[ApiClient] Failed to save scan to backend:', err);
      return false;
    }
  }

  // 4. Get Scan History
  public async getScanHistory(): Promise<FishAnalysisResult[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/scans`, {
        headers: this.getHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((row: any): FishAnalysisResult => ({
          id: row.id,
          timestamp: row.created_at,
          formattedDate: new Date(row.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          imageUri: row.image_uri,
          species: {
            id: row.species_id || 'unknown',
            commonName: row.species_name,
            scientificName: row.species_scientific_name || '',
            family: 'N/A',
            diet: 'N/A',
            nativeRegion: 'N/A',
            commercialValue: 'N/A',
            culinaryNotes: 'N/A',
            optimalTempC: '0°C to 4°C',
            shelfLifeDays: 4,
            aCoeff: 0.0125,
            bCoeff: 3.02,
            defaultLengthCm: row.length_cm || 30,
            sampleImageUri: row.image_uri,
          },
          confidence: Number(row.species_confidence) || 0,
          freshness: {
            status: row.freshness_status,
            score: Number(row.freshness_score) || 0,
          },
          morphometrics: {
            lengthCm: Number(row.length_cm) || 0,
            widthCm: Number(row.width_cm) || 0,
            estimatedWeightKg: Number(row.estimated_weight_kg) || 0,
            estimatedVolumeCm3: Number(row.estimated_volume_cm3) || 0,
            referenceScaling: 'Reference metric calibrated',
            allometricFormula: row.allometric_formula || 'W = a × L^b',
          },
          boundingBox: row.bounding_box || { x: 0, y: 0, width: 1, height: 1 },
          isMockInference: false,
          modelInfo: row.model_info || {
            engineName: 'FishLensAI Backend',
            modelArchitecture: 'MobileNetV3',
            latencyMs: 0,
          },
        }));
      }
      return [];
    } catch (err) {
      console.warn('[ApiClient] Failed to fetch scan history from backend:', err);
      return [];
    }
  }

  // 5. Delete Scan
  public async deleteScan(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/scans/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn(`[ApiClient] Failed to delete scan ${id} from backend:`, err);
      return false;
    }
  }

  // 6. Clear History
  public async clearHistory(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/scans`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn('[ApiClient] Failed to clear history on backend:', err);
      return false;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
