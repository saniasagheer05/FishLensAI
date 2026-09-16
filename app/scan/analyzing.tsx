import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';

const { width } = Dimensions.get('window');
const IMAGE_WIDTH = width - 48;
const IMAGE_HEIGHT = 220;

export default function AnalyzingScreen() {
  const params = useLocalSearchParams<{ imageUri?: string }>();
  const rawImageUri = params.imageUri ? decodeURIComponent(params.imageUri) : null;

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
          </View>
        ) : null}

        {/* Standby Status Card */}
        <View style={styles.standbyCard}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="layers-off" size={28} color={Colors.primary} />
          </View>

          <Text style={styles.standbyTitle}>Models Disintegrated</Text>
          <Text style={styles.standbyBadge}>Frontend Standby Mode</Text>

          <Text style={styles.standbyDescription}>
            All 3 machine learning models (Model 1 Species, Model 2 Freshness, and Model 3 Morphometrics)
            have been cleanly disconnected from the frontend app runtime.
          </Text>

          <View style={styles.safetyBox}>
            <Feather name="shield" size={16} color="#2E7D32" style={{ marginRight: 8 }} />
            <Text style={styles.safetyText}>
              All trained checkpoints & weights remain safe in `ml/models/` for later reintegration.
            </Text>
          </View>

          {/* Navigation Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(tabs)/home')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryButtonText}>Return to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/scan')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Choose Another Image</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  fishImage: {
    width: '100%',
    height: '100%',
  },
  standbyCard: {
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
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  standbyTitle: {
    ...Typography.h2Serif,
    fontSize: 20,
    color: '#1C2922',
    marginBottom: 4,
    textAlign: 'center',
  },
  standbyBadge: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 14,
  },
  standbyDescription: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: '#556960',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8F3',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  safetyText: {
    ...Typography.caption,
    fontSize: 11,
    color: '#256029',
    flex: 1,
    lineHeight: 15,
  },
  actionButtonsRow: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Typography.buttonText,
    color: Colors.primary,
    fontSize: 14,
  },
});
