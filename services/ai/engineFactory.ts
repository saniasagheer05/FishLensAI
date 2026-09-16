import { IFishInferenceEngine } from './types';
import { MockFishInferenceEngine } from './mockEngine';
import { TFLiteInferenceEngine } from './tfliteEngine';

export type EngineType = 'mock' | 'tflite';

class FishInferenceFactory {
  private static mockEngine = new MockFishInferenceEngine();
  private static tfliteEngine = new TFLiteInferenceEngine();

  public static getEngine(type: EngineType = 'tflite'): IFishInferenceEngine {
    if (type === 'mock') {
      return this.mockEngine;
    }
    return this.tfliteEngine;
  }
}

export default FishInferenceFactory;
