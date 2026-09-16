import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface BoundingBoxOverlayProps {
  speciesName?: string;
  confidence?: number;
  statusText?: string;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  speciesName,
  confidence,
  statusText = 'Align fish within viewfinder',
}) => {
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Top Status Pill */}
      <View style={styles.topStatusContainer}>
        <View style={styles.statusPill}>
          <View style={styles.greenDot} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* Target Reticle & Bounding Box */}
      <View style={styles.centerTargetArea}>
        {/* Outer Corner brackets */}
        <View style={styles.reticleCorners}>
          {/* Top-Left */}
          <View style={[styles.corner, styles.cornerTL]} />
          {/* Top-Right */}
          <View style={[styles.corner, styles.cornerTR]} />
          {/* Bottom-Left */}
          <View style={[styles.corner, styles.cornerBL]} />
          {/* Bottom-Right */}
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* Inner Bounding Box with Label (rendered only when an actual species is detected) */}
        {speciesName ? (
          <View style={styles.fishBox}>
            <View style={styles.labelPill}>
              <Text style={styles.labelEmoji}>🐟</Text>
              <Text style={styles.labelText}>
                {speciesName} {confidence !== undefined ? `• ${confidence}%` : ''}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topStatusContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E35',
  },
  centerTargetArea: {
    width: 290,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#4ADE80',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 10,
  },
  fishBox: {
    width: 220,
    height: 150,
    borderWidth: 1.5,
    borderColor: 'rgba(234, 179, 8, 0.65)',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  labelPill: {
    position: 'absolute',
    top: -14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6DCBF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  labelEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2922',
  },
});

export default BoundingBoxOverlay;
