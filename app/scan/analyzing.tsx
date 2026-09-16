import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { apiClient } from '../../services/api/apiClient';
import { HistoryStorageService } from '../../services/storage/historyStorage';

const { width } = Dimensions.get('window');
const IMAGE_WIDTH = width - 48;
const IMAGE_HEIGHT = 220;

export default function AnalyzingScreen() {
  const params = useLocalSearchParams<{ imageUri?: string }>();
  const rawImageUri = params.imageUri ? decodeURIComponent(params.imageUri) : null;

  const [status, setStatus] = useState<'analyzing' | 'error'>('analyzing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepText, setStepText] = useState('Initializing AI Neural Pipeline...');
  const progressAnim = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    let isCancelled = false;

    const runAnalysis = async () => {
      if (!rawImageUri) {
        setStatus('error');
        setErrorMessage('No image was provided for analysis. Please capture or upload a fish photo.');
        return;
      }

      try {
        setStatus('analyzing');
        setErrorMessage(null);

        // Step 1: Preprocessing
        setStepText('Reading & Preprocessing Image (224×224 Normalization)...');
        Animated.timing(progressAnim, {
          toValue: 0.25,
          duration: 400,
          useNativeDriver: false,
        }).start();

        // Step 2: Running TFLite inference via backend
        setTimeout(() => {
          if (!isCancelled) {
            setStepText('Running Model 1 (Species) & Model 2 (Freshness)...');
            Animated.timing(progressAnim, {
              toValue: 0.65,
              duration: 800,
              useNativeDriver: false,
            }).start();
          }
        }, 300);

        // Call live backend ML endpoint
        const result = await apiClient.analyzeImage(rawImageUri);

        if (isCancelled) return;

        // Step 3: Morphometrics & biomass estimation
        setStepText('Computing Morphometric Biomass & Allometric Growth...');
        Animated.timing(progressAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: false,
        }).start();

        // Step 4: Persist scan result to backend and local history
        await HistoryStorageService.saveScan(result);

        if (isCancelled) return;

        Animated.timing(progressAnim, {
          toValue: 1.0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          // Navigate to results screen with fresh scan data
          router.replace({
            pathname: '/results/[id]',
            params: {
              id: result.id,
              scanData: encodeURIComponent(JSON.stringify(result)),
            },
          });
        });
      } catch (err: any) {
        if (isCancelled) return;
        console.error('[AnalyzingScreen error]:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Inference failed. Could not analyze image.');
      }
    };

    runAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [rawImageUri]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#1D2A24" />
        </TouchableOpacity>
        <Text style={styles.brandTitle}>FishLens AI</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        {/* Selected Fish Image Preview */}
        {rawImageUri ? (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: rawImageUri }}
              style={styles.fishImage}
              resizeMode="cover"
            />
            {status === 'analyzing' && (
              <View style={styles.scanningOverlay}>
                <View style={styles.scanningBeam} />
              </View>
            )}
          </View>
        ) : null}

        {status === 'analyzing' ? (
          /* Analyzing State Card */
          <View style={styles.card}>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.title}>Analyzing Specimen</Text>
            <Text style={styles.subtitle}>{stepText}</Text>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <View style={styles.modelBadgeRow}>
              <View style={styles.modelBadge}>
                <Text style={styles.modelBadgeText}>Model 1: Species TFLite</Text>
              </View>
              <View style={styles.modelBadge}>
                <Text style={styles.modelBadgeText}>Model 2: Freshness TFLite</Text>
              </View>
              <View style={styles.modelBadge}>
                <Text style={styles.modelBadgeText}>Model 3: Morphometrics</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Error State Card (No silent fallback!) */
          <View style={styles.card}>
            <View style={styles.errorIconCircle}>
              <Feather name="alert-triangle" size={32} color="#C62828" />
            </View>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorSubtitle}>
              {errorMessage || 'An error occurred while running the ML pipeline.'}
            </Text>

            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setStatus('analyzing');
                  setErrorMessage(null);
                  router.replace({
                    pathname: '/scan/analyzing',
                    params: { imageUri: encodeURIComponent(rawImageUri || '') },
                  });
                }}
                activeOpacity={0.88}
              >
                <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Retry Analysis</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.replace('/scan')}
                activeOpacity={0.85}
              >
                <Feather name="image" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Select Another Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...Typography.brandTitle,
    fontSize: 18,
    color: '#244535',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  imageCard: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECE4D7',
    alignSelf: 'center',
    backgroundColor: '#EAE5DB',
    marginBottom: 20,
    position: 'relative',
  },
  fishImage: {
    width: '100%',
    height: '100%',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36, 69, 53, 0.15)',
  },
  scanningBeam: {
    height: 3,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    ...Typography.h2Serif,
    fontSize: 20,
    color: '#1C2922',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: '#556960',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    minHeight: 36,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#ECE7DE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  modelBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  modelBadge: {
    backgroundColor: '#F1F8F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  modelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#256029',
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    ...Typography.h2Serif,
    fontSize: 20,
    color: '#C62828',
    marginBottom: 6,
  },
  errorSubtitle: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: '#556960',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorActions: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonText: {
    ...Typography.buttonText,
    color: '#FFFFFF',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#DFD8CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 24,
  },
  secondaryButtonText: {
    ...Typography.buttonText,
    color: Colors.primary,
    fontSize: 14,
  },
});
