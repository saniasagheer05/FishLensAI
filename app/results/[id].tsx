import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import StatusBadge from '../../components/StatusBadge';
import MetricCard from '../../components/MetricCard';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { FishAnalysisResult } from '../../services/ai/types';
import { HistoryStorageService, INITIAL_SEEDED_SCANS } from '../../services/storage/historyStorage';

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ id?: string; scanData?: string }>();
  const [scan, setScan] = useState<FishAnalysisResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadScanData = async () => {
      // 1. Check URL scanData param (if passed)
      if (params.scanData) {
        try {
          const raw = typeof params.scanData === 'string' ? decodeURIComponent(params.scanData) : params.scanData;
          const parsed = JSON.parse(raw);
          if (parsed && isMounted) {
            setScan(parsed);
            return;
          }
        } catch (e) {
          console.warn('Could not parse scanData param, falling back to storage:', e);
        }
      }

      // 2. Check persistent storage by ID
      if (params.id) {
        const found = await HistoryStorageService.getScanById(params.id);
        if (found && isMounted) {
          setScan(found);
          return;
        }
      }

      // 3. Fallback to latest history entry
      const history = await HistoryStorageService.getHistory();
      if (history.length > 0 && isMounted) {
        setScan(history[0]);
        return;
      }

      // 4. Fallback to first seeded scan
      if (isMounted) {
        setScan(INITIAL_SEEDED_SCANS[0]);
      }
    };

    loadScanData();

    return () => {
      isMounted = false;
    };
  }, [params.id, params.scanData]);

  if (!scan) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading scan results...</Text>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `FishLensAI Scan: ${scan.species.commonName} (${scan.species.scientificName}) - Status: ${scan.freshness.status} (Score: ${scan.freshness.score}%) - Weight: ~${scan.morphometrics.estimatedWeightKg} kg`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewDetails = () => {
    router.push({
      pathname: '/results/details',
      params: { id: scan.id, scanData: encodeURIComponent(JSON.stringify(scan)) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Analysis Result</Text>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Feather name="share-2" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanned Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: scan.imageUri || scan.species.sampleImageUri }}
            style={styles.fishImage}
            resizeMode="cover"
          />
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(scan.confidence * 100)}%
            </Text>
          </View>
        </View>

        {/* Species & Freshness Banner */}
        <View style={styles.mainResultCard}>
          <View style={styles.resultHeaderRow}>
            <View style={styles.speciesTitleBlock}>
              <Text style={styles.speciesName}>{scan.species.commonName}</Text>
              <Text style={styles.scientificName}>
                {scan.species.scientificName}
              </Text>
            </View>
            <StatusBadge status={scan.freshness.status} size="large" />
          </View>

          {/* Freshness Index Score Bar */}
          <View style={styles.freshnessScoreContainer}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Freshness Index</Text>
              <Text style={styles.scoreValue}>{scan.freshness.score}/100</Text>
            </View>
            <View style={styles.scoreTrack}>
              <View
                style={[
                  styles.scoreFill,
                  {
                    width: `${scan.freshness.score}%`,
                    backgroundColor:
                      scan.freshness.score >= 80
                        ? Colors.primary
                        : scan.freshness.score >= 50
                        ? '#D9822B'
                        : '#D14343',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Morphometrics Cards */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Morphometrics & Biomass</Text>
          <View style={styles.experimentalBadge}>
            <Feather name="info" size={11} color="#856404" style={{ marginRight: 4 }} />
            <Text style={styles.experimentalBadgeText}>Experimental Prior</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Length"
              value={`${scan.morphometrics.lengthCm} cm`}
              subValue="Estimated"
              icon={<Feather name="maximize-2" size={16} color={Colors.primary} />}
            />
            <MetricCard
              label="Body Width"
              value={`${scan.morphometrics.widthCm} cm`}
              subValue="Aspect Ratio"
              icon={<Feather name="minimize-2" size={16} color={Colors.primary} />}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Est. Weight"
              value={`~${scan.morphometrics.estimatedWeightKg} kg`}
              subValue={scan.morphometrics.allometricFormula}
              icon={<MaterialCommunityIcons name="scale-bathroom" size={16} color={Colors.primary} />}
            />
            <MetricCard
              label="Est. Volume"
              value={`~${scan.morphometrics.estimatedVolumeCm3} cm³`}
              subValue="Calculated"
              icon={<Feather name="box" size={16} color={Colors.primary} />}
            />
          </View>
        </View>

        {/* Allometric Formula & Reference Scaling */}
        <View style={styles.formulaCard}>
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Allometric Model:</Text>
            <Text style={styles.formulaValue}>{scan.morphometrics.allometricFormula}</Text>
          </View>
          <View style={[styles.formulaRow, { marginTop: 4 }]}>
            <Text style={styles.formulaLabel}>Reference Scaling:</Text>
            <Text style={styles.formulaScaling}>{scan.morphometrics.referenceScaling}</Text>
          </View>
        </View>

        {/* Model 3 Unvalidated Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Feather name="alert-circle" size={16} color="#856404" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={styles.disclaimerText}>
            <Text style={{ fontWeight: '700' }}>Unvalidated CV Prior:</Text> Single-camera 2D biomass and volume estimates are experimental priors based on geometric contours and allometric growth curves, not a certified scale reading.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsBlock}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={handleViewDetails}
            activeOpacity={0.88}
          >
            <Text style={styles.detailsButtonText}>View Full Biological Details</Text>
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanAnotherButton}
            onPress={() => router.replace('/scan')}
            activeOpacity={0.85}
          >
            <Feather name="camera" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.scanAnotherText}>Scan Another Fish</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    ...Typography.brandTitle,
    fontSize: 17,
    color: '#1F2E27',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECE5DB',
    position: 'relative',
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: '#E7E2D8',
  },
  fishImage: {
    width: '100%',
    height: '100%',
  },
  confidencePill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(23, 38, 30, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mainResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    marginBottom: 16,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  speciesTitleBlock: {
    flex: 1,
    marginRight: 10,
  },
  speciesName: {
    ...Typography.h1Serif,
    fontSize: 22,
    color: '#1C2922',
  },
  scientificName: {
    fontStyle: 'italic',
    fontSize: 13,
    color: '#65776E',
    marginTop: 2,
  },
  freshnessScoreContainer: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDE7DD',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreLabel: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: '#1D2A24',
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  scoreTrack: {
    height: 8,
    backgroundColor: '#E5DFD4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeader: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: '#1D2A24',
  },
  experimentalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  experimentalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#856404',
  },
  metricsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formulaCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDE7DC',
    marginBottom: 12,
  },
  formulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formulaLabel: {
    fontSize: 12,
    color: '#65776E',
  },
  formulaValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  formulaScaling: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334D41',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFDE7',
    borderWidth: 1,
    borderColor: '#FFF59D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#795548',
    lineHeight: 16,
  },
  actionsBlock: {
    gap: 12,
  },
  detailsButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsButtonText: {
    ...Typography.buttonText,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 6,
  },
  scanAnotherButton: {
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DFD8CC',
  },
  scanAnotherText: {
    ...Typography.buttonText,
    color: Colors.primary,
    fontSize: 15,
  },
});
