import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import apiClient from '../services/api/apiClient';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [emailOrUser, setEmailOrUser] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (isRegister) {
      if (!username.trim() || !email.trim() || !password) {
        setErrorMessage('Please fill in all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      setLoading(true);
      try {
        const result = await apiClient.register(username.trim(), email.trim(), password);
        setLoading(false);

        if (result.success) {
          Alert.alert('Welcome to FishLensAI', `Account created successfully for ${username}!`, [
            { text: 'Continue', onPress: () => router.replace('/(tabs)/home') },
          ]);
        } else {
          setErrorMessage(result.message || 'Registration failed. Please try again.');
        }
      } catch (err: any) {
        setLoading(false);
        setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
      }
    } else {
      if (!emailOrUser.trim() || !password) {
        setErrorMessage('Please enter your email or username and password.');
        return;
      }

      setLoading(true);
      try {
        const result = await apiClient.login(emailOrUser.trim(), password);
        setLoading(false);

        if (result.success) {
          router.replace('/(tabs)/home');
        } else {
          setErrorMessage(result.message || 'Invalid credentials. Please try again.');
        }
      } catch (err: any) {
        setLoading(false);
        setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
      }
    }
  };

  const handleContinueAsGuest = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C1B2F" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Brand Logo */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadgeContainer}>
                <View style={styles.decorativeAccent} />
                <Image
                  source={require('../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandTitle}>FishLens AI</Text>
              <Text style={styles.brandSubtitle}>
                {isRegister
                  ? 'Create an account to track your fish scans'
                  : 'Sign in to access your scan history and cloud sync'}
              </Text>
            </View>

            {/* Segmented Mode Switcher */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, !isRegister && styles.segmentBtnActive]}
                onPress={() => {
                  setIsRegister(false);
                  setErrorMessage(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, !isRegister && styles.segmentTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, isRegister && styles.segmentBtnActive]}
                onPress={() => {
                  setIsRegister(true);
                  setErrorMessage(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorCard}>
                <Feather name="alert-circle" size={16} color="#FF6B6B" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.formCard}>
              {isRegister ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="user" size={18} color="#73AA87" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. saniasagheer"
                        placeholderTextColor="#5C7268"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={username}
                        onChangeText={setUsername}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="mail" size={18} color="#73AA87" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. user@fishlensai.app"
                        placeholderTextColor="#5C7268"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email or Username</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={18} color="#73AA87" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Username or Email"
                      placeholderTextColor="#5C7268"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={emailOrUser}
                      onChangeText={setEmailOrUser}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#73AA87" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter password"
                    placeholderTextColor="#5C7268"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color="#73AA87"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {isRegister && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="check-circle" size={18} color="#73AA87" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor="#5C7268"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#0C1B2F" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>
                      {isRegister ? 'Create Account' : 'Sign In'}
                    </Text>
                    <Feather name="arrow-right" size={18} color="#0C1B2F" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Guest Access Alternative */}
            <View style={styles.footerSection}>
              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleContinueAsGuest}
                activeOpacity={0.7}
              >
                <Text style={styles.guestButtonText}>Continue as Guest →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadgeContainer: {
    width: 90,
    height: 90,
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativeAccent: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#1F3C47',
    top: 6,
    left: 6,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 22,
    zIndex: 2,
  },
  brandTitle: {
    ...Typography.brandTitle,
    fontSize: 26,
    color: '#FAF6F0',
    marginBottom: 6,
  },
  brandSubtitle: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: '#8A9E96',
    textAlign: 'center',
    maxWidth: 280,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#172A40',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#243A52',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#73AA87',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A9E96',
  },
  segmentTextActive: {
    color: '#0C1B2F',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    flex: 1,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#132438',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F3C47',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBDAD3',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C1B2F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#243A52',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FAF6F0',
    fontSize: 14,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#73AA87',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0C1B2F',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  guestButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  guestButtonText: {
    color: '#73AA87',
    fontSize: 14,
    fontWeight: '600',
  },
});
