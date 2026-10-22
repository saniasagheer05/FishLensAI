import React, { useState, useEffect } from 'react';
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

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleRequestResetOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = resetEmail.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage('Please enter your registered Gmail or email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.forgotPassword(targetEmail);
      if (result.success) {
        setSuccessMessage('A single-use 6-digit verification code has been sent to your email.');
        setForgotStep('verify');
        setCooldownSeconds(60);
      } else {
        setErrorMessage(result.message || 'Unable to send password reset code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = resetEmail.trim().toLowerCase();
    const cleanOtp = resetOtp.trim();

    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setErrorMessage('Verification code must be exactly 6 digits.');
      return;
    }
    if (!newPassword) {
      setErrorMessage('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.resetPassword(targetEmail, cleanOtp, newPassword);
      if (result.success) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been securely updated. You can now sign in with your new password.',
          [
            {
              text: 'Sign In Now',
              onPress: () => {
                setIsForgotPassword(false);
                setForgotStep('request');
                setEmailOrUser(targetEmail);
                setPassword('');
                setResetOtp('');
                setNewPassword('');
                setConfirmNewPassword('');
                setErrorMessage(null);
                setSuccessMessage(null);
              },
            },
          ]
        );
      } else {
        setErrorMessage(result.message || 'Failed to reset password. Please check the code and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setForgotStep('request');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

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
        if (result.success) {
          Alert.alert('Welcome to FishLensAI', `Account created successfully for ${username}!`, [
            { text: 'Continue', onPress: () => router.replace('/(tabs)/home') },
          ]);
        } else {
          setErrorMessage(result.message || 'Registration failed. Please try again.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!emailOrUser.trim() || !password) {
        setErrorMessage('Please enter your email or username and password.');
        return;
      }

      setLoading(true);
      try {
        const result = await apiClient.login(emailOrUser.trim(), password);
        if (result.success) {
          router.replace('/(tabs)/home');
        } else {
          setErrorMessage(result.message || 'Invalid credentials. Please try again.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
      } finally {
        setLoading(false);
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
              <Text style={styles.brandTitle}>
                {isForgotPassword ? 'Reset Password' : 'FishLens AI'}
              </Text>
              <Text style={styles.brandSubtitle}>
                {isForgotPassword
                  ? forgotStep === 'request'
                    ? 'Enter your registered Gmail or email to receive a 6-digit reset code'
                    : `Enter the code sent to ${resetEmail} and your new password`
                  : isRegister
                  ? 'Create an account to track your fish scans'
                  : 'Sign in to access your scan history and cloud sync'}
              </Text>
            </View>

            {/* Back to Sign In button when in Forgot Password mode */}
            {isForgotPassword ? (
              <TouchableOpacity
                style={styles.backButtonRow}
                onPress={handleBackToLogin}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={16} color="#73AA87" />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            ) : (
              /* Segmented Mode Switcher (Sign In vs Register) */
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
            )}

            {/* Success Banner */}
            {successMessage ? (
              <View style={styles.successCard}>
                <Feather name="check-circle" size={16} color="#73AA87" style={styles.successIcon} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorCard}>
                <Feather name="alert-circle" size={16} color="#FF6B6B" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Form Fields Card */}
            <View style={styles.formCard}>
              {isForgotPassword ? (
                /* ================= FORGOT PASSWORD FLOW ================= */
                forgotStep === 'request' ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Registered Email Address</Text>
                      <View style={styles.inputWrapper}>
                        <Feather name="mail" size={18} color="#73AA87" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. user@gmail.com"
                          placeholderTextColor="#5C7268"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          value={resetEmail}
                          onChangeText={setResetEmail}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                      onPress={handleRequestResetOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0C1B2F" size="small" />
                      ) : (
                        <>
                          <Feather name="send" size={16} color="#0C1B2F" />
                          <Text style={styles.submitButtonText}>Send Reset Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Step 2: Enter OTP Code & New Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                      <View style={styles.inputWrapper}>
                        <Feather name="shield" size={18} color="#73AA87" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.otpInput]}
                          placeholder="123456"
                          placeholderTextColor="#5C7268"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={resetOtp}
                          onChangeText={setResetOtp}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>New Password</Text>
                      <View style={styles.inputWrapper}>
                        <Feather name="lock" size={18} color="#73AA87" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="At least 6 characters"
                          placeholderTextColor="#5C7268"
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          value={newPassword}
                          onChangeText={setNewPassword}
                        />
                        <TouchableOpacity
                          onPress={() => setShowNewPassword(!showNewPassword)}
                          style={styles.eyeButton}
                        >
                          <Feather
                            name={showNewPassword ? 'eye-off' : 'eye'}
                            size={18}
                            color="#73AA87"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Confirm New Password</Text>
                      <View style={styles.inputWrapper}>
                        <Feather name="check-circle" size={18} color="#73AA87" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Re-enter new password"
                          placeholderTextColor="#5C7268"
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          value={confirmNewPassword}
                          onChangeText={setConfirmNewPassword}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                      onPress={handleConfirmResetPassword}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0C1B2F" size="small" />
                      ) : (
                        <>
                          <Feather name="check" size={18} color="#0C1B2F" />
                          <Text style={styles.submitButtonText}>Reset Password</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Resend OTP & Change Email Row */}
                    <View style={styles.resendRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setForgotStep('request');
                          setResetOtp('');
                          setErrorMessage(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.changeEmailLink}>Edit email</Text>
                      </TouchableOpacity>

                      {cooldownSeconds > 0 ? (
                        <Text style={styles.resendTextDisabled}>
                          Resend in {cooldownSeconds}s
                        </Text>
                      ) : (
                        <TouchableOpacity
                          onPress={handleRequestResetOtp}
                          disabled={loading}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.resendLink}>Resend Code</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )
              ) : isRegister ? (
                /* ================= REGISTER FLOW ================= */
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
                        <Text style={styles.submitButtonText}>Create Account</Text>
                        <Feather name="arrow-right" size={18} color="#0C1B2F" />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                /* ================= SIGN IN FLOW ================= */
                <>
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

                  {/* Forgot Password Link */}
                  <View style={styles.forgotPasswordRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsForgotPassword(true);
                        setForgotStep('request');
                        if (emailOrUser.includes('@')) {
                          setResetEmail(emailOrUser.trim());
                        }
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

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
                        <Text style={styles.submitButtonText}>Sign In</Text>
                        <Feather name="arrow-right" size={18} color="#0C1B2F" />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  forgotPasswordLink: {
    color: '#73AA87',
    fontSize: 13,
    fontWeight: '600',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 14,
    gap: 8,
  },
  backButtonText: {
    color: '#73AA87',
    fontSize: 14,
    fontWeight: '600',
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(115, 170, 135, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(115, 170, 135, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    color: '#73AA87',
    fontSize: 13,
    flex: 1,
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  resendTextDisabled: {
    color: '#5C7268',
    fontSize: 13,
  },
  resendLink: {
    color: '#73AA87',
    fontSize: 13,
    fontWeight: '600',
  },
  changeEmailLink: {
    color: '#8A9E96',
    fontSize: 13,
  },
});
