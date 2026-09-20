import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const SCANS_DIRECTORY = `${FileSystem.documentDirectory || ''}scans/`;

export class ImageStorageService {
  /**
   * Persists a transient image URI (from ImagePicker or Camera cache)
   * into the app's document directory so it survives Android cache eviction.
   */
  static async persistImage(transientUri: string): Promise<string> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return transientUri;
    }

    try {
      // Ensure the scans directory exists
      const dirInfo = await FileSystem.getInfoAsync(SCANS_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(SCANS_DIRECTORY, { intermediates: true });
      }

      // Generate a unique persistent filename
      const cleanName = transientUri.split('/').pop() || `fish_${Date.now()}.jpg`;
      const fileName = `scan_${Date.now()}_${cleanName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const targetUri = `${SCANS_DIRECTORY}${fileName}`;

      // Copy from transient picker/cache path to permanent app documents path
      await FileSystem.copyAsync({
        from: transientUri,
        to: targetUri,
      });

      console.log('[ImageStorageService] Successfully persisted image to:', targetUri);
      return targetUri;
    } catch (err) {
      console.warn('[ImageStorageService] Failed to persist image, falling back to original URI:', err);
      return transientUri;
    }
  }

  /**
   * Converts an image URI (file://, blob:, or remote) into a Base64 data URL
   * suitable for transmitting across the network to the backend AI engine.
   */
  static async getBase64Data(imageUri: string): Promise<string> {
    // If it's already a base64 data URI, return as-is
    if (imageUri.startsWith('data:')) {
      return imageUri;
    }

    // Native file URI
    if (Platform.OS !== 'web' && (imageUri.startsWith('file://') || imageUri.startsWith('/'))) {
      try {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = imageUri.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
      } catch (err) {
        console.warn('[ImageStorageService] Error reading file as base64 with FileSystem:', err);
      }
    }

    // Web blob or remote URI
    try {
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('[ImageStorageService] Error converting blob/fetch to base64:', err);
      return imageUri;
    }
  }
}

export default ImageStorageService;
