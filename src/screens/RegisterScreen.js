import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';
import {
  scale,
  verticalScale,
  moderateScale,
  fontScale,
  iconScale,
} from '../utils/responsive';

const RegisterScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { register } = useAuth();
  const { width, height } = useWindowDimensions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  // Responsive values based on screen width
  const isVerySmall = width < 320;
  const isSmall = width >= 320 && width < 375;
  const isMedium = width >= 375 && width < 768;
  const isLarge = width >= 768;

  const rs = {
    // Container
    containerPadding: isVerySmall ? 12 : isSmall ? 16 : isLarge ? 40 : 24,
    formMaxWidth: isLarge ? 480 : 400,

    // Header
    backButtonSize: isVerySmall ? 36 : isSmall ? 40 : isLarge ? 56 : 48,
    backIconSize: isVerySmall ? 16 : isSmall ? 18 : isLarge ? 24 : 20,
    headerTitleSize: isVerySmall ? 20 : isSmall ? 22 : isLarge ? 32 : 28,
    headerSubtitleSize: isVerySmall ? 11 : isSmall ? 12 : isLarge ? 16 : 14,

    // Input
    inputHeight: isVerySmall ? 44 : isSmall ? 48 : isLarge ? 60 : 52,
    inputRadius: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 16 : 14,
    inputIconBoxSize: isVerySmall ? 28 : isSmall ? 32 : isLarge ? 48 : 40,
    inputIconSize: isVerySmall ? 14 : isSmall ? 16 : isLarge ? 24 : 20,
    inputFontSize: isVerySmall ? 12 : isSmall ? 13 : isLarge ? 17 : 15,
    inputPadding: isVerySmall ? 6 : isSmall ? 8 : isLarge ? 14 : 12,

    // Button
    buttonHeight: isVerySmall ? 40 : isSmall ? 44 : isLarge ? 56 : 48,
    buttonRadius: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 16 : 14,
    buttonFontSize: isVerySmall ? 13 : isSmall ? 14 : isLarge ? 18 : 16,

    // Spacing
    headerMarginBottom: isVerySmall ? 16 : isSmall ? 20 : isLarge ? 40 : 32,
    inputMarginBottom: isVerySmall ? 10 : isSmall ? 12 : isLarge ? 18 : 14,
    sectionGap: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 20 : 14,
    formPadding: isVerySmall ? 12 : isSmall ? 16 : isLarge ? 32 : 24,

    // Card
    cardRadius: isVerySmall ? 14 : isSmall ? 18 : isLarge ? 32 : 24,

    // Features
    featureCheckSize: isVerySmall ? 18 : isSmall ? 20 : isLarge ? 28 : 24,
    featureCheckIconSize: isVerySmall ? 10 : isSmall ? 11 : isLarge ? 14 : 12,
    featureFontSize: isVerySmall ? 11 : isSmall ? 12 : isLarge ? 16 : 14,
    featureGap: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 16 : 12,

    // Footer
    footerFontSize: isVerySmall ? 12 : isSmall ? 13 : isLarge ? 17 : 15,

    // Error
    errorFontSize: isVerySmall ? 9 : isSmall ? 10 : isLarge ? 13 : 11,

    // Strength bar
    strengthBarHeight: isVerySmall ? 3 : isSmall ? 3 : isLarge ? 5 : 4,
    strengthFontSize: isVerySmall ? 10 : isSmall ? 11 : isLarge ? 14 : 12,
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const formSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formSlide, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const passwordStrength = () => {
    if (!password) return { level: 0, text: '', color: theme.textMuted };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: strength, text: 'Weak', color: theme.error };
    if (strength <= 3) return { level: strength, text: 'Medium', color: '#F59E0B' };
    return { level: strength, text: 'Strong', color: theme.success };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await register(email, password, name);
    setIsLoading(false);

    if (result.success) {
      setAlertConfig({
        visible: true,
        title: 'Account Created!',
        message: 'Your account has been created successfully. Welcome aboard!',
        type: 'success',
        buttons: [{ text: 'Get Started', style: 'default' }],
      });
    } else if (result.error && result.error.toLowerCase().includes('already exists')) {
      setAlertConfig({
        visible: true,
        title: 'Account Already Exists',
        message: 'An account with this email already exists. Please sign in instead.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.goBack() },
        ],
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Registration Failed',
        message: result.error || 'Please try again',
        type: 'error',
        buttons: [{ text: 'Try Again', style: 'default' }],
      });
    }
  };

  const strength = passwordStrength();

  const renderInput = (icon, placeholder, value, onChangeText, options = {}) => {
    const Icon = icon;
    const { isPassword, showPasswordState, togglePassword, error, keyboardType } = options;

    return (
      <View style={[styles.inputWrapper, { marginBottom: rs.inputMarginBottom }]}>
        <View style={[
          styles.inputContainer,
          {
            borderColor: error ? theme.error : theme.glassBorder,
            borderRadius: rs.inputRadius,
            minHeight: rs.inputHeight,
            backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.08)' : theme.glass,
          }
        ]}>
          <View style={[
            styles.inputIconBox,
            {
              backgroundColor: `${theme.primary}20`,
              width: rs.inputIconBoxSize,
              height: rs.inputIconBoxSize,
              borderRadius: rs.inputRadius - 4,
              marginLeft: rs.inputPadding / 2,
            }
          ]}>
            <Icon size={rs.inputIconSize} color={theme.primary} />
          </View>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                fontSize: rs.inputFontSize,
                paddingHorizontal: rs.inputPadding,
              }
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.placeholder}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isPassword && !showPasswordState}
            autoCapitalize={isPassword ? 'none' : (keyboardType === 'email-address' ? 'none' : 'words')}
            autoCorrect={false}
            keyboardType={keyboardType || 'default'}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={togglePassword}
              style={[
                styles.eyeButton,
                {
                  backgroundColor: `${theme.primary}20`,
                  width: rs.inputIconBoxSize,
                  height: rs.inputIconBoxSize,
                  borderRadius: rs.inputRadius - 4,
                  marginRight: rs.inputPadding / 2,
                }
              ]}
            >
              {showPasswordState ? (
                <EyeOff size={rs.inputIconSize} color={theme.primary} />
              ) : (
                <Eye size={rs.inputIconSize} color={theme.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text style={[styles.errorText, { color: theme.error, fontSize: rs.errorFontSize }]}>
            {error}
          </Text>
        )}
      </View>
    );
  };

  const renderForm = () => (
    <>
      {/* Name Input */}
      {renderInput(User, 'Full name', name, setName, { error: errors.name })}

      {/* Email Input */}
      {renderInput(Mail, 'Email address', email, setEmail, {
        error: errors.email,
        keyboardType: 'email-address'
      })}

      {/* Password Input */}
      {renderInput(Lock, 'Password', password, setPassword, {
        isPassword: true,
        showPasswordState: showPassword,
        togglePassword: () => setShowPassword(!showPassword),
        error: errors.password,
      })}

      {/* Password Strength Indicator */}
      {password.length > 0 && (
        <View style={[styles.strengthContainer, { marginBottom: rs.sectionGap, gap: rs.inputPadding }]}>
          <View style={[styles.strengthBars, { gap: 4 }]}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor: i <= strength.level ? strength.color : theme.glassBorder,
                    height: rs.strengthBarHeight,
                  }
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthText, { color: strength.color, fontSize: rs.strengthFontSize }]}>
            {strength.text}
          </Text>
        </View>
      )}

      {/* Confirm Password Input */}
      {renderInput(Lock, 'Confirm password', confirmPassword, setConfirmPassword, {
        isPassword: true,
        showPasswordState: showConfirmPassword,
        togglePassword: () => setShowConfirmPassword(!showConfirmPassword),
        error: errors.confirmPassword,
      })}

      <TouchableOpacity
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.8}
        style={{ marginTop: rs.sectionGap }}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.registerButton,
            {
              height: rs.buttonHeight,
              borderRadius: rs.buttonRadius,
            }
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={[styles.registerButtonText, { fontSize: rs.buttonFontSize }]}>
                Create Account
              </Text>
              <ArrowRight size={rs.inputIconSize} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Features */}
      <View style={[styles.features, { marginTop: rs.sectionGap * 1.5, gap: rs.featureGap }]}>
        {[
          'Unlimited AI conversations',
          'Personalized chat experience',
          'Secure & private',
        ].map((feature, index) => (
          <View key={index} style={[styles.featureRow, { gap: rs.inputPadding }]}>
            <LinearGradient
              colors={[theme.gradient1, theme.gradient2]}
              style={[
                styles.featureCheck,
                {
                  width: rs.featureCheckSize,
                  height: rs.featureCheckSize,
                  borderRadius: rs.featureCheckSize / 3,
                }
              ]}
            >
              <Check size={rs.featureCheckIconSize} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.featureText, { color: theme.textMuted, fontSize: rs.featureFontSize }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background */}
      <LinearGradient
        colors={[theme.background, `${theme.gradient1}10`, theme.background]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: rs.containerPadding }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  marginBottom: rs.headerMarginBottom,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <View style={[
                  styles.backButtonInner,
                  {
                    width: rs.backButtonSize,
                    height: rs.backButtonSize,
                    borderRadius: rs.backButtonSize / 3,
                    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.1)' : theme.glass,
                    borderColor: theme.glassBorder,
                  }
                ]}>
                  <ArrowLeft size={rs.backIconSize} color={theme.text} />
                </View>
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: theme.text, fontSize: rs.headerTitleSize }]}>
                  Create Account
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontSize: rs.headerSubtitleSize }]}>
                  Join us and start chatting with AI
                </Text>
              </View>
            </Animated.View>

            {/* Register Form */}
            <Animated.View
              style={[
                styles.formSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: formSlide }],
                  maxWidth: rs.formMaxWidth,
                },
              ]}
            >
              {Platform.OS === 'web' ? (
                <View style={[
                  styles.formCard,
                  {
                    borderColor: theme.glassBorder,
                    borderRadius: rs.cardRadius,
                    padding: rs.formPadding,
                    backgroundColor: 'rgba(30, 30, 40, 0.5)',
                  }
                ]}>
                  {renderForm()}
                </View>
              ) : (
                <BlurView
                  intensity={60}
                  tint={isDarkMode ? 'dark' : 'light'}
                  style={[styles.formCardBlur, { borderRadius: rs.cardRadius }]}
                >
                  <View style={[
                    styles.formCardInner,
                    {
                      borderColor: theme.glassBorder,
                      borderRadius: rs.cardRadius,
                      padding: rs.formPadding,
                    }
                  ]}>
                    {renderForm()}
                  </View>
                </BlurView>
              )}
            </Animated.View>

            {/* Login Link */}
            <View style={[styles.loginLink, { marginTop: rs.sectionGap * 1.5, marginBottom: rs.sectionGap }]}>
              <Text style={[styles.loginLinkText, { color: theme.textMuted, fontSize: rs.footerFontSize }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[styles.loginLinkAction, { color: theme.primary, fontSize: rs.footerFontSize }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {},
  formSection: {
    width: '100%',
    alignSelf: 'center',
  },
  formCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  formCardBlur: {
    overflow: 'hidden',
  },
  formCardInner: {
    borderWidth: 1,
  },
  inputWrapper: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
  },
  eyeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
  },
  strengthBar: {
    flex: 1,
    borderRadius: 2,
  },
  strengthText: {
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  features: {},
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureCheck: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontWeight: '500',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {},
  loginLinkAction: {
    fontWeight: '700',
  },
});

export default RegisterScreen;
