import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { FreshnessStatus } from '../services/ai/types';

interface StatusBadgeProps {
  status: FreshnessStatus;
  size?: 'small' | 'medium' | 'large';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const isFresh = status === 'Fresh';
  const isModerate = status === 'Moderate';
  
  const badgeConfig = isFresh 
    ? Colors.status.fresh 
    : isModerate 
    ? Colors.status.moderate 
    : Colors.status.spoiled;

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: badgeConfig.bg, borderColor: badgeConfig.border },
      isLarge && styles.badgeLarge,
      isSmall && styles.badgeSmall,
    ]}>
      <Text style={[
        styles.text,
        { color: badgeConfig.text },
        isLarge && styles.textLarge,
        isSmall && styles.textSmall,
      ]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
  textLarge: {
    fontSize: 14,
  },
});

export default StatusBadge;
