import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BoundingBoxOverlay from '../../components/BoundingBoxOverlay';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { ImageStorageService } from '../../services/storage/imageStorage';

export default function CameraScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      if (cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          const persistentUri = await ImageStorageService.persistImage(photo.uri);
          router.push({
            pathname: '/scan/analyzing',
            params: { imageUri: encodeURIComponent(persistentUri) },
          });
          return;
        }
      }
    } catch (e) {
      console.warn('Camera takePictureAsync error:', e);
    } finally {
      setIsCapturing(false);
    }

    // On Web or when camera is not available, open file gallery picker directly
    await handlePickFromGallery();
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const persistentUri = await ImageStorageService.persistImage(asset.uri);
        router.push({
          pathname: '/scan/analyzing',
          params: { imageUri: encodeURIComponent(persistentUri) },
        });
      }
    } catch (e) {
      console.error('Gallery pick error:', e);
    }
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      {/* Real Camera View with Web / Permission Fallback */}
      {Platform.OS !== 'web' && permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          enableTorch={flash === 'on'}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#0B1526' },
          ]}
        />
      )}

      <SafeAreaView style={styles.hudContainer} edges={['top', 'bottom']}>
        {/* Top Header Bar (Matching Stitch media_1787595880627.png) */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Scan Fish</Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={toggleFacing}
            activeOpacity={0.7}
          >
            <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Live HUD Reticle */}
        <BoundingBoxOverlay statusText="Align fish within viewfinder" />

        {/* Bottom Control Bar */}
        <View style={styles.bottomControls}>
          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.secondaryControl}
            onPress={handlePickFromGallery}
            activeOpacity={0.8}
          >
            <Feather name="image" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={styles.shutterOuterRing}
            onPress={handleCapture}
            activeOpacity={0.85}
          >
            <View style={styles.shutterInnerButton} />
          </TouchableOpacity>

          {/* Flash Toggle */}
          <TouchableOpacity
            style={styles.secondaryControl}
            onPress={toggleFlash}
            activeOpacity={0.8}
          >
            {flash === 'on' ? (
              <Ionicons name="flash" size={22} color="#FBBF24" />
            ) : (
              <Ionicons name="flash-off" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hudContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    ...Typography.h2Serif,
    fontSize: 20,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingBottom: 24,
    zIndex: 10,
  },
  secondaryControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  shutterOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shutterInnerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
});
