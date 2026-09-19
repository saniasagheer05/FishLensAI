import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStorage } from '../services/auth/authStorage';

export default function WelcomeScreen() {
  const handleEnter = async () => {
    try {
      const isAuth = await AuthStorage.isAuthenticated();
      if (isAuth) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  };

  useEffect(() => {
    // Listen for physical/virtual keyboard ENTER key on web and desktop
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleEnter();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C1B2F" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          {/* Logo Container with decorative offset outline matching Stitch media_1788789401818.png */}
          <View style={styles.logoWrapper}>
            {/* Background offset decorative accent outline */}
            <View style={styles.decorativeAccent} />

            {/* Main FishLens AI Badge */}
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* App Title */}
          <Text style={styles.title}>FishLens AI</Text>

          {/* App Subtitle */}
          <Text style={styles.subtitle}>Identify. Assess. Estimate.</Text>
        </View>

        {/* Bottom ENTER Action Prompt */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.enterButton}
            onPress={handleEnter}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Press Enter to continue to home"
          >
            <Text style={styles.enterButtonText}>Press ENTER</Text>
            <View style={styles.keyBadge}>
              <Text style={styles.keyBadgeSymbol}>↵</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1B2F',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    position: 'relative',
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativeAccent: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#1F3C47',
    top: 14,
    left: 14,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 30,
    zIndex: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FAF6F0',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, serif',
    }),
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#73AA87',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  bottomSection: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  enterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    gap: 10,
  },
  enterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  keyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBadgeSymbol: {
    color: '#73AA87',
    fontSize: 14,
    fontWeight: '700',
  },
});
