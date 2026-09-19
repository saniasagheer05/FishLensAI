import { Platform } from 'react-native';
import { FishAnalysisResult, FishSpecies, FreshnessStatus } from '../ai/types';
import { SPECIES_DATABASE } from '../database/speciesData';

import { AuthStorage } from '../auth/authStorage';

// Default API URL (from EXPO_PUBLIC_API_URL or environment, fallback to localhost)
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export let API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private token: string | null = null;
  private baseUrl: string = API_BASE_URL;

  constructor() {
    // Attempt asynchronous retrieval of stored token
    AuthStorage.getToken().then((tok) => {
      if (tok) {
        this.token = tok;
      }
    }).catch(() => {});
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
    API_BASE_URL = this.baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    // Ensure token is loaded from SecureStore if null
    if (!this.token) {
      try {
        const stored = await AuthStorage.getToken();
        if (stored) {
          this.token = stored;
        }
      } catch {}
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // 0. Authentication API
  public async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; data?: { user: any; token: string }; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const json = await res.json();
      if (json.success && json.data?.token) {
        this.setToken(json.data.token);
        await AuthStorage.saveToken(json.data.token);
        if (json.data.user) {
          await AuthStorage.saveUser(json.data.user);
        }
      }
      return json;
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during registration' };
    }
  }

  public async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; data?: { user: any; token: string }; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.includes('@') ? identifier : undefined,
          username: !identifier.includes('@') ? identifier : undefined,
          password,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.token) {
        this.setToken(json.data.token);
        await AuthStorage.saveToken(json.data.token);
        if (json.data.user) {
          await AuthStorage.saveUser(json.data.user);
        }
      }
      return json;
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during login' };
    }
  }

  public async getProfile(): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/auth/profile`, { headers });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // 1. Health Check
  public async checkHealth(): Promise<{ status: string; database: any }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return await res.json();
    } catch (err: any) {
      return { status: 'unreachable', database: { connected: false, error: err.message } };
    }
  }

  // 2. Species Data
  public async getSpecies(): Promise<FishSpecies[]> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/species`, {
        headers,
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
      const headers = await this.getHeaders();
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

      const res = await fetch(`${this.baseUrl}/scans`, {
        method: 'POST',
        headers,
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
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/scans`, {
        headers,
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((row: any): FishAnalysisResult => {
          const spId = (row.species_id || '').toLowerCase();
          const spMeta = SPECIES_DATABASE[spId] || {
            id: spId || 'unknown',
            commonName: row.species_name,
            scientificName: row.species_scientific_name || '',
            family: 'Cyprinidae',
            diet: 'Aquatic feeder',
            nativeRegion: 'South Asian waters',
            commercialValue: 'Commercial food fish',
            culinaryNotes: '',
            optimalTempC: '0°C to 4°C',
            shelfLifeDays: 4,
            aCoeff: 0.0125,
            bCoeff: 3.02,
            defaultLengthCm: Number(row.length_cm) || 30,
            sampleImageUri: row.image_uri,
          };

          const rawStatus = (row.freshness_status || 'Moderate').toLowerCase();
          const normStatus: FreshnessStatus =
            rawStatus === 'fresh' ? 'Fresh' : rawStatus === 'spoiled' ? 'Spoiled' : 'Moderate';

          return {
            id: row.id,
            timestamp: row.created_at,
            formattedDate: new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            imageUri: row.image_uri,
            species: {
              ...spMeta,
              commonName: row.species_name || spMeta.commonName,
              scientificName: row.species_scientific_name || spMeta.scientificName,
            },
            confidence: Number(row.species_confidence) || 0,
            freshness: {
              status: normStatus,
              score: Number(row.freshness_score) || 0,
            },
            morphometrics: {
              lengthCm: Number(row.length_cm) || 0,
              widthCm: Number(row.width_cm) || 0,
              estimatedWeightKg: Number(row.estimated_weight_kg) || 0,
              estimatedVolumeCm3: Number(row.estimated_volume_cm3) || 0,
              referenceScaling: 'Reference metric calibrated',
              allometricFormula: row.allometric_formula || 'W = a × L^b',
              validationStatus: 'Unvalidated / Experimental Computer Vision Prior',
            },
            boundingBox: row.bounding_box || { x: 0, y: 0, width: 1, height: 1 },
            isMockInference: false,
            modelInfo: row.model_info || {
              engineName: 'FishLensAI Backend',
              modelArchitecture: 'MobileNetV3',
              latencyMs: 0,
            },
          };
        });
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
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/scans/${id}`, {
        method: 'DELETE',
        headers,
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
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/scans`, {
        method: 'DELETE',
        headers,
      });
      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn('[ApiClient] Failed to clear history on backend:', err);
      return false;
    }
  }

  // 7. Analyze Image via Backend ML Pipeline (TFLite Model 1 + Model 2 + Model 3)
  public async analyzeImage(imageUri: string): Promise<FishAnalysisResult> {
    let payloadUri = imageUri;

    // Convert blob URL to base64 if running on web
    if (imageUri.startsWith('blob:')) {
      try {
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        payloadUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('[ApiClient] Failed to convert blob to base64, passing original:', err);
      }
    }

    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/scans/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image_uri: payloadUri }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Analysis failed with HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.message || 'Analysis did not return valid result data');
    }

    const raw = json.data;
    const speciesId = (raw.species?.id || 'unknown').toLowerCase();
    const speciesMeta = SPECIES_DATABASE[speciesId] || {
      id: speciesId,
      commonName: raw.species?.commonName || speciesId,
      scientificName: raw.species?.scientificName || '',
      family: 'Unknown Family',
      diet: 'Aquatic feeder',
      nativeRegion: 'South Asian waters',
      commercialValue: 'Commercial food fish',
      culinaryNotes: 'Rich flavor, best prepared according to traditional regional methods.',
      optimalTempC: '0°C to 4°C',
      shelfLifeDays: 3,
      aCoeff: 0.0125,
      bCoeff: 3.02,
      defaultLengthCm: raw.morphometrics?.lengthCm || 30,
      sampleImageUri: imageUri,
    };

    const result: FishAnalysisResult = {
      id: raw.id || `scan-${Date.now()}`,
      timestamp: raw.timestamp || new Date().toISOString(),
      formattedDate: new Date(raw.timestamp || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      imageUri: imageUri,
      species: {
        ...speciesMeta,
        commonName: raw.species?.commonName || speciesMeta.commonName,
        scientificName: raw.species?.scientificName || speciesMeta.scientificName,
        probabilities: raw.species?.probabilities,
      },
      confidence: Number(raw.species?.confidence) || 0,
      freshness: {
        status: raw.freshness?.status || 'Moderate',
        score: Number(raw.freshness?.score) || 50,
        confidence: Number(raw.freshness?.confidence) || 0,
        probabilities: raw.freshness?.probabilities,
      },
      morphometrics: {
        lengthCm: Number(raw.morphometrics?.lengthCm) || 0,
        widthCm: Number(raw.morphometrics?.widthCm) || 0,
        estimatedWeightKg: Number(raw.morphometrics?.estimatedWeightKg) || 0,
        estimatedVolumeCm3: Number(raw.morphometrics?.estimatedVolumeCm3) || 0,
        referenceScaling: raw.morphometrics?.referenceScaling || 'coin_calibration_inr_5',
        allometricFormula: raw.morphometrics?.allometricFormula || 'W = a × L^b',
        validationStatus: raw.morphometrics?.validationStatus || 'Unvalidated / Experimental Computer Vision Prior',
      },
      boundingBox: raw.boundingBox || { x: 0, y: 0, width: 1, height: 1 },
      isMockInference: false,
      modelInfo: {
        engineName: 'FishLensAI TFLite Engine',
        modelArchitecture: 'MobileNetV3 (Species & Freshness) + CV Morphometrics',
        latencyMs: 0,
      },
    };

    return result;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
