import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { AnalysisStep } from '../services/ai/types';

interface AnalysisChecklistProps {
  currentStep: AnalysisStep;
}

interface StepItem {
  key: AnalysisStep;
  label: string;
}

const STEPS: StepItem[] = [
  { key: 'detecting_fish', label: 'Fish detected' },
  { key: 'identifying_species', label: 'Species identified' },
  { key: 'checking_freshness', label: 'Checking freshness' },
  { key: 'measuring_dimensions', label: 'Measuring dimensions' },
  { key: 'estimating_weight', label: 'Estimating weight' },
];

export const AnalysisChecklist: React.FC<AnalysisChecklistProps> = ({ currentStep }) => {
  const stepOrder: AnalysisStep[] = [
    'detecting_fish',
    'identifying_species',
    'checking_freshness',
    'measuring_dimensions',
    'estimating_weight',
    'completed',
  ];

  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <View style={styles.cardContainer}>
      {STEPS.map((item, index) => {
        const isFinished = currentIndex > index || currentStep === 'completed';
        const isCurrent = currentIndex === index && currentStep !== 'completed';
        const isPending = currentIndex < index;

        return (
          <View key={item.key} style={styles.stepRow}>
            <View style={styles.iconWrapper}>
              {isFinished ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              ) : isCurrent ? (
                <View style={styles.activeDotContainer}>
                  <View style={styles.activeDot} />
                </View>
              ) : (
                <Feather name="circle" size={18} color={Colors.textMuted} />
              )}
            </View>

            <Text
              style={[
                styles.stepText,
                isFinished && styles.stepTextFinished,
                isCurrent && styles.stepTextActive,
                isPending && styles.stepTextPending,
              ]}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#EDE7DC',
    marginTop: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconWrapper: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  activeDotContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3E5D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C07724',
  },
  stepText: {
    ...Typography.bodyMedium,
    fontSize: 14,
  },
  stepTextFinished: {
    color: Colors.text,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#9C621E',
    fontWeight: '600',
  },
  stepTextPending: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
});

export default AnalysisChecklist;
