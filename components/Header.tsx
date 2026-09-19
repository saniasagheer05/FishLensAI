import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';

interface HeaderProps {
  title?: string;
  onAvatarPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'FishLens AI',
  onAvatarPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <Text style={styles.titleText}>{title}</Text>
      </View>

      <TouchableOpacity 
        style={styles.avatarButton} 
        onPress={onAvatarPress}
        activeOpacity={0.8}
        accessibilityLabel="Profile"
      >
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' }} 
          style={styles.avatarImage} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  titleText: {
    ...Typography.brandTitle,
    fontSize: 18,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});

export default Header;
