import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { FishAnalysisResult } from '../../services/ai/types';
import StatusBadge from '../../components/StatusBadge';
import { HistoryStorageService, INITIAL_SEEDED_SCANS } from '../../services/storage/historyStorage';

export default function AnalysisDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; scanData?: string }>();
  const [scan, setScan] = useState<FishAnalysisResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDetailsData = async () => {
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

    loadDetailsData();

    return () => {
      isMounted = false;
    };
  }, [params.id, params.scanData]);

  if (!scan) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading biological details...</Text>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `FishLensAI Biological Report: ${scan.species.commonName} (${scan.species.scientificName})\nFreshness: ${scan.freshness.status} (${scan.freshness.score}%)\nLength: ${scan.morphometrics.lengthCm} cm | Weight: ~${scan.morphometrics.estimatedWeightKg} kg\nOptimal Storage: ${scan.species.optimalTempC}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Biological Details</Text>

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
        {/* Header Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSpeciesName}>{scan.species.commonName}</Text>
              <Text style={styles.heroScientificName}>
                {scan.species.scientificName}
              </Text>
            </View>
            <StatusBadge status={scan.freshness.status} size="medium" />
          </View>
          <Text style={styles.familyText}>Family: {scan.species.family}</Text>
        </View>

        {/* Section 1: Taxonomy & Ecology */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="book-open" size={18} color={Colors.primary} style={styles.headerIcon} />
            <Text style={styles.cardTitle}>Taxonomy & Ecological Profile</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Native Habitat</Text>
            <Text style={styles.detailValue}>{scan.species.nativeRegion}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dietary Niche</Text>
            <Text style={styles.detailValue}>{scan.species.diet}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Commercial Value</Text>
            <Text style={styles.detailValue}>{scan.species.commercialValue}</Text>
          </View>
        </View>

        {/* Section 2: Allometric Morphometrics */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calculator-variant-outline" size={18} color={Colors.primary} style={styles.headerIcon} />
            <Text style={styles.cardTitle}>Morphometrics & Biomass Calculation</Text>
          </View>

          <View style={styles.formulaBox}>
            <Text style={styles.formulaLabel}>Allometric Growth Equation:</Text>
            <Text style={styles.formulaEquation}>
              W = {scan.species.aCoeff} × L^{scan.species.bCoeff}
            </Text>
            <Text style={styles.formulaNotes}>
              Derived from allometric weight-length coefficient curves for{' '}
              {scan.species.commonName}.
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Length</Text>
            <Text style={styles.detailValue}>{scan.morphometrics.lengthCm} cm</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Width / Girth</Text>
            <Text style={styles.detailValue}>{scan.morphometrics.widthCm} cm</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Biomass Weight</Text>
            <Text style={styles.detailValue}>
              ~{scan.morphometrics.estimatedWeightKg} kg
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Volume Displacement</Text>
            <Text style={styles.detailValue}>
              ~{scan.morphometrics.estimatedVolumeCm3} cm³
            </Text>
          </View>
        </View>

        {/* Section 4: Culinary & Storage Advice */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="restaurant-outline" size={18} color={Colors.primary} style={styles.headerIcon} />
            <Text style={styles.cardTitle}>Culinary & Preservation Guide</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Optimal Temp</Text>
            <Text style={styles.detailValue}>{scan.species.optimalTempC}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Shelf Life</Text>
            <Text style={styles.detailValue}>
              {scan.species.shelfLifeDays} days (Refrigerated)
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={styles.detailLabel}>Culinary Notes</Text>
            <Text style={[styles.detailValue, { marginTop: 4, textAlign: 'left' }]}>
              {scan.species.culinaryNotes}
            </Text>
          </View>
        </View>

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.88}
        >
          <Text style={styles.doneButtonText}>Return to Home</Text>
        </TouchableOpacity>
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
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    marginTop: 6,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroSpeciesName: {
    ...Typography.h1Serif,
    fontSize: 22,
    color: '#1C2922',
  },
  heroScientificName: {
    fontStyle: 'italic',
    fontSize: 14,
    color: '#65776E',
    marginTop: 2,
  },
  familyText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerIcon: {
    marginRight: 8,
  },
  cardTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#1D2A24',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F3EC',
  },
  detailLabel: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: '#65776E',
    flex: 1,
  },
  detailValue: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: '#1D2A24',
    flex: 1.2,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFE7',
    marginVertical: 8,
  },
  formulaBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDE7DC',
    marginBottom: 12,
  },
  formulaLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: '#65776E',
  },
  formulaEquation: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginVertical: 4,
  },
  formulaNotes: {
    ...Typography.caption,
    fontSize: 10,
    color: '#8E9E97',
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  doneButtonText: {
    ...Typography.buttonText,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
