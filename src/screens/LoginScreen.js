import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  MessageSquare,
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
  isSmallDevice,
  isLargeDevice,
} from '../utils/responsive';

const LoginScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { login, signInWithGoogle, signInWithMagicLink } = useAuth();
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { width, height } = useWindowDimensions();


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  // Responsive values - support all device sizes
  const isVerySmall = width < 320;
  const isSmall = width >= 320 && width < 375;
  const isMedium = width >= 375 && width < 768;
  const isLarge = width >= 768;

  const rs = {
    // Container
    containerPadding: isVerySmall ? 10 : isSmall ? 14 : isLarge ? 40 : 24,
    formMaxWidth: isLarge ? 480 : 400,

    // Logo
    logoSize: isVerySmall ? 44 : isSmall ? 50 : isLarge ? 80 : 60,
    logoRadius: isVerySmall ? 12 : isSmall ? 14 : isLarge ? 22 : 18,
    logoIconSize: isVerySmall ? 20 : isSmall ? 22 : isLarge ? 36 : 28,

    // Typography
    appNameSize: isVerySmall ? 18 : isSmall ? 20 : isLarge ? 32 : 24,
    taglineSize: isVerySmall ? 10 : isSmall ? 11 : isLarge ? 16 : 13,
    formTitleSize: isVerySmall ? 16 : isSmall ? 18 : isLarge ? 28 : 22,
    formSubtitleSize: isVerySmall ? 10 : isSmall ? 11 : isLarge ? 15 : 13,
    inputFontSize: isVerySmall ? 12 : isSmall ? 13 : isLarge ? 17 : 15,
    buttonFontSize: isVerySmall ? 13 : isSmall ? 14 : isLarge ? 18 : 16,
    errorFontSize: isVerySmall ? 9 : isSmall ? 10 : 11,

    // Input
    inputHeight: isVerySmall ? 42 : isSmall ? 46 : isLarge ? 58 : 52,
    inputRadius: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 16 : 14,
    inputIconBoxSize: isVerySmall ? 28 : isSmall ? 32 : isLarge ? 46 : 38,
    inputIconSize: isVerySmall ? 14 : isSmall ? 16 : isLarge ? 22 : 18,
    inputPadding: isVerySmall ? 6 : isSmall ? 8 : isLarge ? 14 : 10,

    // Button
    buttonHeight: isVerySmall ? 40 : isSmall ? 44 : isLarge ? 54 : 48,
    buttonRadius: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 16 : 14,

    // Spacing
    logoMarginBottom: isVerySmall ? 12 : isSmall ? 16 : isLarge ? 32 : 20,
    formPadding: isVerySmall ? 12 : isSmall ? 16 : isLarge ? 32 : 24,
    inputMarginBottom: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 16 : 12,
    sectionGap: isVerySmall ? 8 : isSmall ? 10 : isLarge ? 18 : 14,

    // Card
    cardRadius: isVerySmall ? 14 : isSmall ? 18 : isLarge ? 32 : 24,

    // Footer
    featureIconSize: isVerySmall ? 12 : isSmall ? 14 : isLarge ? 20 : 16,
    featureFontSize: isVerySmall ? 9 : isSmall ? 10 : isLarge ? 14 : 12,
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const formSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(formSlide, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      setAlertConfig({
        visible: true,
        title: 'Welcome Back!',
        message: 'Login successful! Enjoy chatting with AI.',
        type: 'success',
        buttons: [{ text: 'Let\'s Go', style: 'default' }],
      });
    } else if (result.code === 'USER_NOT_FOUND') {
      setAlertConfig({
        visible: true,
        title: 'No Account Found',
        message: "You don't have an account with this email. Would you like to create one?",
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Account', onPress: () => navigation.navigate('Register') },
        ],
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Login Failed',
        message: result.error || 'Please check your credentials',
        type: 'error',
        buttons: [{ text: 'Try Again', style: 'default' }],
      });
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    // On web this redirects the page to Google — loading resets on page reload
    if (result && !result.success) {
      setGoogleLoading(false);
      setAlertConfig({
        visible: true,
        title: 'Google Sign-In Failed',
        message: result.error || 'Could not sign in with Google',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email for magic link' });
      return;
    }

    setMagicLinkLoading(true);
    const result = await signInWithMagicLink(email);
    setMagicLinkLoading(false);

    if (result.success) {
      setAlertConfig({
        visible: true,
        title: 'Magic Link Sent!',
        message: result.message || 'Check your email for the login link.',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Magic Link Failed',
        message: result.error || 'Could not send magic link',
        type: 'error',
        buttons: [{ text: 'Try Again', style: 'default' }],
      });
    }
  };

  const renderForm = () => (
    <>
      <Text style={[styles.formTitle, { color: theme.text, fontSize: rs.formTitleSize }]}>
        Welcome Back
      </Text>
      <Text style={[styles.formSubtitle, { color: theme.textMuted, fontSize: rs.formSubtitleSize, marginBottom: rs.sectionGap }]}>
        Sign in to continue your conversations
      </Text>

      {/* Email Input */}
      <View style={[styles.inputWrapper, { marginBottom: rs.inputMarginBottom }]}>
        <View style={[
          styles.inputContainer,
          {
            borderColor: errors.email ? theme.error : theme.glassBorder,
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
            <Mail size={rs.inputIconSize} color={theme.primary} />
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
            placeholder="Email address"
            placeholderTextColor={theme.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>
        {errors.email && (
          <Text style={[styles.errorText, { color: theme.error, fontSize: rs.errorFontSize }]}>
            {errors.email}
          </Text>
        )}
      </View>

      {/* Password Input */}
      <View style={[styles.inputWrapper, { marginBottom: rs.inputMarginBottom }]}>
        <View style={[
          styles.inputContainer,
          {
            borderColor: errors.password ? theme.error : theme.glassBorder,
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
            <Lock size={rs.inputIconSize} color={theme.primary} />
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
            placeholder="Password"
            placeholderTextColor={theme.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
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
            {showPassword ? (
              <EyeOff size={rs.inputIconSize} color={theme.primary} />
            ) : (
              <Eye size={rs.inputIconSize} color={theme.primary} />
            )}
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={[styles.errorText, { color: theme.error, fontSize: rs.errorFontSize }]}>
            {errors.password}
          </Text>
        )}
      </View>

      <TouchableOpacity style={[styles.forgotButton, { marginBottom: rs.sectionGap }]}>
        <Text style={[styles.forgotText, { color: theme.primary, fontSize: rs.formSubtitleSize }]}>
          Forgot password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.loginButton,
            {
              height: rs.buttonHeight,
              borderRadius: rs.buttonRadius,
            }
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size={isSmall ? 'small' : 'small'} />
          ) : (
            <>
              <Text style={[styles.loginButtonText, { fontSize: rs.buttonFontSize }]}>Sign In</Text>
              <ArrowRight size={rs.inputIconSize} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={[styles.dividerRow, { marginVertical: rs.sectionGap }]}>
        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
        <Text style={[styles.dividerText, { color: theme.textMuted, fontSize: rs.formSubtitleSize }]}>or</Text>
        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
      </View>

      <TouchableOpacity
        style={[
          styles.registerButton,
          {
            borderColor: theme.glassBorder,
            height: rs.buttonHeight,
            borderRadius: rs.buttonRadius,
          }
        ]}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={[styles.registerButtonText, { color: theme.text, fontSize: rs.buttonFontSize - 2 }]}>
          Create new account
        </Text>
      </TouchableOpacity>

      {/* Google Sign-In Button (Bonus) */}
      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={googleLoading}
        activeOpacity={0.8}
        style={[
          styles.socialButton,
          {
            borderColor: theme.glassBorder,
            height: rs.buttonHeight,
            borderRadius: rs.buttonRadius,
            marginTop: rs.inputMarginBottom,
          }
        ]}
      >
        {googleLoading ? (
          <ActivityIndicator color={theme.text} size="small" />
        ) : (
          <>
            <Text style={{ fontSize: rs.inputIconSize }}>G</Text>
            <Text style={[styles.socialButtonText, { color: theme.text, fontSize: rs.buttonFontSize - 2 }]}>
              Sign in with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Magic Link Button (Bonus) */}
      <TouchableOpacity
        onPress={handleMagicLink}
        disabled={magicLinkLoading}
        activeOpacity={0.8}
        style={[
          styles.socialButton,
          {
            borderColor: theme.glassBorder,
            height: rs.buttonHeight,
            borderRadius: rs.buttonRadius,
            marginTop: rs.inputMarginBottom,
          }
        ]}
      >
        {magicLinkLoading ? (
          <ActivityIndicator color={theme.text} size="small" />
        ) : (
          <>
            <Mail size={rs.inputIconSize} color={theme.primary} />
            <Text style={[styles.socialButtonText, { color: theme.text, fontSize: rs.buttonFontSize - 2 }]}>
              Send Magic Link
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Subtle Background Gradient */}
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
            {/* Logo Section */}
            <Animated.View
              style={[
                styles.logoSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: logoScale }],
                  marginBottom: rs.logoMarginBottom,
                },
              ]}
            >
              <LinearGradient
                colors={[theme.gradient1, theme.gradient2]}
                style={[
                  styles.logoContainer,
                  {
                    width: rs.logoSize,
                    height: rs.logoSize,
                    borderRadius: rs.logoRadius,
                  }
                ]}
              >
                <Sparkles size={rs.logoIconSize} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.appName, { color: theme.text, fontSize: rs.appNameSize }]}>
                AI Chat
              </Text>
              <Text style={[styles.tagline, { color: theme.textMuted, fontSize: rs.taglineSize }]}>
                Your intelligent conversation partner
              </Text>
            </Animated.View>

            {/* Login Form */}
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

            {/* Footer */}
            <View style={[styles.footer, { marginTop: rs.sectionGap }]}>
              <View style={[styles.featuresRow, { gap: scale(20) }]}>
                {[
                  { icon: MessageSquare, text: 'Smart Chat' },
                  { icon: Sparkles, text: 'AI Powered' },
                ].map((item, index) => (
                  <View key={index} style={[styles.featureItem, { gap: scale(6) }]}>
                    <item.icon size={rs.featureIconSize} color={theme.primary} />
                    <Text style={[styles.featureText, { color: theme.textMuted, fontSize: rs.featureFontSize }]}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
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
    justifyContent: 'center',
    paddingVertical: 20,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 10,
  },
  appName: {
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 2,
  },
  tagline: {
    fontWeight: '500',
  },
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
  formTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  formSubtitle: {
    textAlign: 'center',
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
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontWeight: '500',
  },
  registerButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontWeight: '600',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 10,
  },
  socialButtonText: {
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontWeight: '500',
  },
});

export default LoginScreen;
