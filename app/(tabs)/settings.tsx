import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { HistoryStorageService } from '../../services/storage/historyStorage';
import { AuthStorage } from '../../services/auth/authStorage';
import apiClient from '../../services/api/apiClient';

export default function SettingsScreen() {
  const [isMetric, setIsMetric] = useState(true);
  const [showLiveReticle, setShowLiveReticle] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [backendUrl, setBackendUrl] = useState(apiClient.getBaseUrl());
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const checkUserStatus = async () => {
    const user = await AuthStorage.getUser();
    setCurrentUser(user);
    setBackendUrl(apiClient.getBaseUrl());
  };

  useFocusEffect(
    React.useCallback(() => {
      checkUserStatus();
    }, [])
  );

  const executeLogout = async () => {
    try {
      await AuthStorage.clearAuth();
      apiClient.setToken(null);
      setCurrentUser(null);
      router.replace('/login');
    } catch (e) {
      console.warn('Logout error:', e);
      router.replace('/login');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        executeLogout();
      }
      return;
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of FishLensAI?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: executeLogout,
        },
      ],
      { cancelable: true }
    );
  };

  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    setHealthStatus(null);
    try {
      const res = await apiClient.checkHealth();
      if (res.status === 'ok') {
        const dbMode = res.database?.mode || (res.database?.connected ? 'PostgreSQL Live' : 'Offline');
        setHealthStatus(`Online (${dbMode})`);
      } else {
        setHealthStatus(`Status: ${res.status || 'Degraded'} - ${res.message || 'Check URL'}`);
      }
    } catch (e: any) {
      setHealthStatus(`Unreachable: ${e.message}`);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSaveBackendUrl = () => {
    const trimmed = backendUrl.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Backend URL must start with http:// or https://');
      return;
    }
    apiClient.setBaseUrl(trimmed);
    setBackendUrl(trimmed);
    setIsEditingUrl(false);
    Alert.alert('Backend Updated', `API base URL set to:\n${trimmed}`);
    handleCheckHealth();
  };

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

        {/* Section 0: Account Management */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Account</Text>

          {currentUser ? (
            <View>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.avatarCircle}>
                    <Feather name="user" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>{currentUser.username || 'User'}</Text>
                    <Text style={styles.settingSubtitle}>{currentUser.email || 'Authenticated User'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.settingRow, styles.borderTop]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <Feather name="log-out" size={18} color="#D14343" style={styles.settingIcon} />
                  <View>
                    <Text style={[styles.settingTitle, { color: '#D14343' }]}>Sign Out</Text>
                    <Text style={styles.settingSubtitle}>Log out and return to sign in screen</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.avatarCircle}>
                    <Feather name="user-x" size={20} color="#8A9E96" />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>Guest Mode</Text>
                    <Text style={styles.settingSubtitle}>Local scan mode</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unitToggle}
                  onPress={() => router.push('/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unitToggleText}>Sign In / Register</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.settingRow, styles.borderTop]}
                onPress={executeLogout}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <Feather name="refresh-cw" size={18} color="#D14343" style={styles.settingIcon} />
                  <View>
                    <Text style={[styles.settingTitle, { color: '#D14343' }]}>Reset Auth Session</Text>
                    <Text style={styles.settingSubtitle}>Clear stored tokens and restart sign in</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Section 0b: Backend Connection Management */}
        <View style={styles.sectionCard}>
          <View style={styles.headerWithAction}>
            <Text style={styles.sectionHeader}>Backend Server</Text>
            <TouchableOpacity
              style={styles.smallActionBtn}
              onPress={handleCheckHealth}
              disabled={checkingHealth}
            >
              {checkingHealth ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.smallActionText}>Test Status</Text>
              )}
            </TouchableOpacity>
          </View>

          {healthStatus ? (
            <View style={[styles.statusBanner, healthStatus.includes('Online') ? styles.statusOk : styles.statusErr]}>
              <Feather
                name={healthStatus.includes('Online') ? 'check-circle' : 'alert-triangle'}
                size={14}
                color={healthStatus.includes('Online') ? '#2E7D32' : '#C62828'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.statusBannerText, healthStatus.includes('Online') ? { color: '#2E7D32' } : { color: '#C62828' }]}>
                {healthStatus}
              </Text>
            </View>
          ) : null}

          {isEditingUrl ? (
            <View style={styles.editUrlContainer}>
              <TextInput
                style={styles.urlInput}
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="https://your-backend.onrender.com/api"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.editUrlActions}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#ECE6DC' }]}
                  onPress={() => setIsEditingUrl(false)}
                >
                  <Text style={styles.smallBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                  onPress={handleSaveBackendUrl}
                >
                  <Text style={[styles.smallBtnText, { color: '#FFFFFF' }]}>Save URL</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.settingRow}>
              <View style={[styles.settingInfo, { flex: 1 }]}>
                <Feather name="globe" size={18} color={Colors.primary} style={styles.settingIcon} />
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.settingTitle}>API Base URL</Text>
                  <Text style={styles.urlDisplay} numberOfLines={1} ellipsizeMode="middle">
                    {backendUrl}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.unitToggle}
                onPress={() => setIsEditingUrl(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.unitToggleText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallActionBtn: {
    backgroundColor: '#E5F2EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusOk: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  statusErr: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  editUrlContainer: {
    marginTop: 6,
  },
  urlInput: {
    backgroundColor: '#F8F6F2',
    borderWidth: 1,
    borderColor: '#ECE6DC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1D2A24',
    marginBottom: 10,
  },
  editUrlActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D2A24',
  },
  urlDisplay: {
    ...Typography.caption,
    fontSize: 11,
    color: '#65776E',
    marginTop: 2,
  },
});
