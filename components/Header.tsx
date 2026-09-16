import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';

interface HeaderProps {
  title?: string;
  onMenuPress?: () => void;
  onAvatarPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'FishLens AI',
  onMenuPress,
  onAvatarPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={onMenuPress}
        accessibilityLabel="Menu"
        activeOpacity={0.7}
      >
        <Feather name="menu" size={22} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
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
