import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { HistoryStorageService } from '../../services/storage/historyStorage';

export default function SettingsScreen() {
  const [isMetric, setIsMetric] = useState(true);
  const [showLiveReticle, setShowLiveReticle] = useState(true);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Scan History',
      'Are you sure you want to delete all saved fish scans? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await HistoryStorageService.clearHistory();
            Alert.alert('Success', 'Scan history cleared.');
          },
        },
      ]
    );
  };

  const handleResetHistory = async () => {
    await HistoryStorageService.clearHistory();
    await HistoryStorageService.getHistory();
    Alert.alert('Success', 'Sample history restored.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Section 1: Measurement Units */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="maximize-2" size={18} color={Colors.primary} style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Measurement Units</Text>
                <Text style={styles.settingSubtitle}>
                  {isMetric ? 'Metric (Centimeters / Kilograms)' : 'Imperial (Inches / Pounds)'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={() => setIsMetric(!isMetric)}
              activeOpacity={0.8}
            >
              <Text style={styles.unitToggleText}>{isMetric ? 'Metric' : 'Imperial'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, styles.borderTop]}>
            <View style={styles.settingInfo}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Live HUD Bounding Box</Text>
                <Text style={styles.settingSubtitle}>
                  Show species identification tag on camera
                </Text>
              </View>
            </View>
            <Switch
              value={showLiveReticle}
              onValueChange={setShowLiveReticle}
              trackColor={{ false: '#E2DBD0', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 2: AI Neural Engine Status */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Neural Engine Status</Text>

          <View style={styles.engineCard}>
            <View style={styles.engineHeader}>
              <MaterialCommunityIcons name="cpu-64-bit" size={22} color={Colors.primary} />
              <View style={styles.engineBadge}>
                <Text style={styles.engineBadgeText}>MVP Mode</Text>
              </View>
            </View>

            <Text style={styles.engineTitle}>Neural Engine Standby</Text>
            <Text style={styles.engineSubtitle}>
              Modular interface for Species Classification, Freshness Quality Assessment, and Morphometric Biomass Estimation.
            </Text>

            <View style={styles.engineDivider} />

            <Text style={styles.tfliteNotice}>
              • Architecture is modular and decoupled via `IFishInferenceEngine`. Model checkpoints and weights are stored in `ml/models/`.
            </Text>
          </View>
        </View>

        {/* Section 3: Data Management */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Data Management</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleResetHistory}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Feather name="refresh-cw" size={18} color={Colors.primary} style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Reset Sample History</Text>
                <Text style={styles.settingSubtitle}>
                  Reload initial Rohu, Catla, Tilapia, and Hilsa scans
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, styles.borderTop]}
            onPress={handleClearHistory}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Feather name="trash-2" size={18} color="#D14343" style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingTitle, { color: '#D14343' }]}>
                  Clear All History
                </Text>
                <Text style={styles.settingSubtitle}>
                  Remove all scans from local storage
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 4: About */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>About</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="info" size={18} color={Colors.textMuted} style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>FishLensAI Mobile</Text>
                <Text style={styles.settingSubtitle}>Version 1.0.0 (Expo SDK 51 + TypeScript)</Text>
              </View>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  screenTitle: {
    ...Typography.h1Serif,
    fontSize: 23,
    color: '#1D2A24',
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    marginBottom: 16,
  },
  sectionHeader: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#1D2A24',
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F2EDE4',
    marginTop: 8,
    paddingTop: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    ...Typography.bodyMedium,
    fontSize: 14,
    color: '#1D2A24',
  },
  settingSubtitle: {
    ...Typography.caption,
    fontSize: 12,
    color: '#65776E',
    marginTop: 2,
  },
  unitToggle: {
    backgroundColor: '#E5F2EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  engineCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDE7DD',
  },
  engineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  engineBadge: {
    backgroundColor: '#E5F2EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  engineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  engineTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#1D2A24',
    marginBottom: 4,
  },
  engineSubtitle: {
    ...Typography.bodyRegular,
    fontSize: 12,
    color: '#65776E',
    lineHeight: 17,
  },
  engineDivider: {
    height: 1,
    backgroundColor: '#EAE4D9',
    marginVertical: 10,
  },
  tfliteNotice: {
    ...Typography.caption,
    fontSize: 11,
    color: '#76887F',
    lineHeight: 16,
  },
});
