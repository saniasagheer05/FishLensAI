import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';

export default function HomeScreen() {
  const handleStartScan = () => {
    router.push('/scan');
  };

  const handleUploadImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Needed',
          'FishLensAI needs access to your gallery to analyze fish photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const selectedUri = asset.uri;
        console.log('[FishLensAI DIAGNOSTIC - STAGE 1: IMAGE SELECTION/UPLOAD (Home)]', {
          name: asset.fileName || (asset as any).name || 'unknown_filename',
          size: asset.fileSize || (asset as any).size || 'unknown_size',
          type: asset.mimeType || (asset as any).type || 'image',
          uriLength: selectedUri.length,
          uriPreview: selectedUri.slice(0, 80),
        });
        router.push({
          pathname: '/scan/analyzing',
          params: { imageUri: encodeURIComponent(selectedUri) },
        });
      }
    } catch (e) {
      console.error('Gallery pick error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        onAvatarPress={() => router.push('/(tabs)/settings')}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Graphic (Matching Stitch circular sage illustration) */}
        <View style={styles.heroSection}>
          <View style={styles.sageCircle}>
            <View style={styles.innerCircleIcon}>
              <Ionicons name="sparkles" size={34} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.mainTitle}>Analyze Your Catch</Text>
          <Text style={styles.subTitle}>
            Instantly identify species, assess freshness, and estimate weight using advanced AI.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartScan}
              activeOpacity={0.88}
            >
              <Feather name="camera" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Start Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleUploadImage}
              activeOpacity={0.85}
            >
              <Feather name="image" size={19} color={Colors.primary} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* "What we analyze" section */}
        <View style={styles.analyzeSection}>
          <Text style={styles.sectionTitle}>What we analyze</Text>

          {/* Feature 1: Species */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#F6EEDB' }]}>
              <MaterialCommunityIcons name="fish" size={22} color="#C4973B" />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Species</Text>
              <Text style={styles.featureDescription}>
                Accurate identification across 100+ local varieties
              </Text>
            </View>
          </View>

          {/* Feature 2: Freshness */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#E5F2EB' }]}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Freshness</Text>
              <Text style={styles.featureDescription}>
                Real-time quality assessment of eyes, gills, and skin
              </Text>
            </View>
          </View>

          {/* Feature 3: Dimensions & Weight */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EAEFF8' }]}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color="#3B71CA" />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Biomass & Weight</Text>
              <Text style={styles.featureDescription}>
                Computer vision morphometrics and condition factor scaling
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  sageCircle: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    backgroundColor: '#759B85',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#759B85',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  innerCircleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    ...Typography.h1Serif,
    fontSize: 25,
    color: '#1D2A24',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    ...Typography.bodyRegular,
    fontSize: 14,
    color: '#65776E',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    ...Typography.buttonText,
    color: '#FFFFFF',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  secondaryButtonText: {
    ...Typography.buttonText,
    color: Colors.primary,
    fontSize: 15,
  },
  analyzeSection: {
    marginTop: 14,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: '#1D2A24',
    marginBottom: 14,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECE7DE',
    alignItems: 'center',
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#1D2A24',
    marginBottom: 2,
  },
  featureDescription: {
    ...Typography.caption,
    fontSize: 12,
    color: '#65776E',
    lineHeight: 16,
  },
});
