import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { FishAnalysisResult } from '../services/ai/types';
import StatusBadge from './StatusBadge';

interface FishCardProps {
  scan: FishAnalysisResult;
  onPress: () => void;
}

export const FishCard: React.FC<FishCardProps> = ({ scan, onPress }) => {
  const displayName = scan.species.scientificName 
    ? `${scan.species.commonName} (${scan.species.scientificName})`
    : scan.species.commonName;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Image 
        source={{ uri: scan.imageUri || scan.species.sampleImageUri }} 
        style={styles.thumbnail} 
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.speciesName} numberOfLines={1}>
            {displayName}
          </Text>
          <StatusBadge status={scan.freshness.status} size="small" />
        </View>

        <Text style={styles.weightText}>
          Weight: {scan.morphometrics.estimatedWeightKg} kg
        </Text>

        <View style={styles.dateRow}>
          <Feather name="calendar" size={12} color={Colors.textMuted} style={styles.calendarIcon} />
          <Text style={styles.dateText}>{scan.formattedDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: Colors.surfaceMuted,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  speciesName: {
    ...Typography.bodyBold,
    fontSize: 15,
    flex: 1,
    marginRight: 8,
    color: Colors.text,
  },
  weightText: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 4,
  },
  dateText: {
    ...Typography.caption,
    fontSize: 11,
  },
});

export default FishCard;
