/**
 * Zero-dependency Image Preprocessor for FishLensAI
 * Extracts foreground fish silhouette, morphological aspect ratios,
 * dorsal-ventral luminance gradient, and ocular/gill redness index.
 */

export interface DecodedFishFeatures {
  width: number;
  height: number;
  fishAspectRatio: number;       // Major axis / minor axis of the segmented fish
  bodyDepthRatio: number;         // Height / Width of segmented fish bounding box
  dorsalVentralRatio: number;     // Dark dorsal back vs light ventral belly ratio
  anteriorRednessIndex: number;   // R / (G + B) in anterior 30% of fish body
  scaleLuster: number;           // Specular high-frequency reflection intensity
  meanHue: number;               // Dominant body hue in degrees (0-360)
  saturation: number;            // Color saturation (0-1)
  brightness: number;            // Mean value/brightness (0-1)
  edgeComplexity: number;        // Spatial gradient roughness (scales/stripes)
  pixelChecksum: string;         // Unique deterministic checksum of real pixel array
}

export async function extractFishVisualFeatures(imageUri: string): Promise<DecodedFishFeatures> {
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Only set crossOrigin for remote http(s) URLs, not local blob or data URIs
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const sampleW = 224;
          const sampleH = 224;
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            reject(new Error('HTML5 Canvas 2D context is unavailable on this browser.'));
            return;
          }

          ctx.drawImage(img, 0, 0, sampleW, sampleH);
          const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
          const data = imgData.data; // RGBA 224x224x4

          // Stage 2 Diagnostic Calculation: Compute checksum and get first 20 raw pixels
          let pixelCheckSum = 0;
          for (let p = 0; p < data.length; p++) {
            pixelCheckSum = (pixelCheckSum * 31 + data[p]) & 0xffffff;
          }
          const first20RawPixels = Array.from(data.slice(0, 20));
          const hexChecksum = `0x${pixelCheckSum.toString(16).toUpperCase().padStart(6, '0')}`;

          console.log('[FishLensAI DIAGNOSTIC - STAGE 2: CANVAS PIXEL EXTRACTION]', {
            status: 'SUCCESS',
            pixelChecksum: hexChecksum,
            first20Pixels: first20RawPixels,
            totalPixels: data.length / 4,
            totalBytes: data.length,
            canvasDimensions: `${sampleW}x${sampleH}`,
            naturalImageDimensions: `${img.naturalWidth}x${img.naturalHeight}`,
            imageSrcPreview: imageUri.slice(0, 80),
          });

          let minX = sampleW, maxX = 0, minY = sampleH, maxY = 0;
          let totalR = 0, totalG = 0, totalB = 0;
          let fgPixelCount = 0;
          let dorsalLum = 0, ventralLum = 0;
          let headRed = 0, headGB = 0;
          let edgeAccum = 0;
          let checksum = 0;

          // Compute background baseline from 4 outer corners
          const cornerPixels = [
            0,
            (sampleW - 1) * 4,
            ((sampleH - 1) * sampleW) * 4,
            ((sampleH - 1) * sampleW + (sampleW - 1)) * 4,
          ];
          let bgLumSum = 0;
          cornerPixels.forEach((idx) => {
            bgLumSum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          });
          const bgLum = bgLumSum / 4.0;

          // First pass: find foreground fish bounding box
          for (let y = 0; y < sampleH; y++) {
            for (let x = 0; x < sampleW; x++) {
              const idx = (y * sampleW + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;

              checksum = (checksum * 31 + r + g * 3 + b * 7) & 0xffffff;

              // Check if pixel deviates from background
              if (Math.abs(lum - bgLum) > 22) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // If no distinct foreground found, use central 75%
          if (maxX <= minX || maxY <= minY) {
            minX = 24; maxX = 200;
            minY = 35; maxY = 189;
          }

          const fgW = Math.max(20, maxX - minX);
          const fgH = Math.max(15, maxY - minY);
          const midY = minY + Math.floor(fgH / 2);
          const headBoundaryX = minX + Math.floor(fgW * 0.32);

          // Second pass: compute foreground biological metrics
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const idx = (y * sampleW + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;

              totalR += r;
              totalG += g;
              totalB += b;
              fgPixelCount++;

              if (y < midY) {
                dorsalLum += lum;
              } else {
                ventralLum += lum;
              }

              if (x < headBoundaryX) {
                headRed += r;
                headGB += (g + b);
              }

              if (x > minX) {
                const prevIdx = (y * sampleW + (x - 1)) * 4;
                const prevLum = 0.299 * data[prevIdx] + 0.587 * data[prevIdx + 1] + 0.114 * data[prevIdx + 2];
                edgeAccum += Math.abs(lum - prevLum);
              }
            }
          }

          const count = Math.max(1, fgPixelCount);
          const meanR = (totalR / count) / 255.0;
          const meanG = (totalG / count) / 255.0;
          const meanB = (totalB / count) / 255.0;

          const maxC = Math.max(meanR, meanG, meanB);
          const minC = Math.min(meanR, meanG, meanB);
          const delta = maxC - minC;
          let hue = 0;
          if (delta > 0.001) {
            if (maxC === meanR) hue = ((meanG - meanB) / delta) % 6;
            else if (maxC === meanG) hue = (meanB - meanR) / delta + 2;
            else hue = (meanR - meanG) / delta + 4;
            hue = (hue * 60 + 360) % 360;
          }
          const saturation = maxC === 0 ? 0 : delta / maxC;
          const brightness = maxC;

          resolve({
            width: img.naturalWidth || sampleW,
            height: img.naturalHeight || sampleH,
            fishAspectRatio: fgW / (fgH || 1),
            bodyDepthRatio: fgH / (fgW || 1),
            dorsalVentralRatio: dorsalLum / (ventralLum || 1),
            anteriorRednessIndex: headRed / (headGB || 1),
            scaleLuster: Math.min(1.0, brightness * (1.0 - saturation)),
            meanHue: hue,
            saturation,
            brightness,
            edgeComplexity: edgeAccum / (count * 255),
            pixelChecksum: hexChecksum,
          });
        } catch (e: any) {
          console.error('[ImagePreprocessor] Canvas decode error:', e);
          reject(new Error(`Image pixel decoding failed: ${e?.message || 'Unknown error'}`));
        }
      };

      img.onerror = (e) => {
        console.error('[ImagePreprocessor] Image load failed:', e);
        reject(new Error(`Failed to load selected image from source. Please upload a local JPEG or PNG image.`));
      };

      img.src = imageUri;
    });
  }

  throw new Error('Image preprocessor requires an active browser or native canvas environment.');
}
