import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, icon }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {icon && <View style={styles.iconBox}>{icon}</View>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subValue && <Text style={styles.subValue}>{subValue}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 95,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBox: {
    marginRight: 6,
  },
  label: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  value: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.text,
  },
  subValue: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default MetricCard;
