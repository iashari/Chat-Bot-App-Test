import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity, Animated, useWindowDimensions, Modal, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  User,
  Shield,
  HelpCircle,
  LogOut,
  Moon,
  Bell,
  Globe,
  Crown,
  ChevronRight,
  MessageCircle,
  Clock,
  CreditCard,
  Lock,
  Edit3,
  Star,
  Zap,
  Brain,
  Sparkles,
  Bot,
  HardDrive,
  Trash2,
  X,
  Check,
  Info,
  Mail,
  Phone,
  Camera,
  Newspaper,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import useResponsive from '../hooks/useResponsive';
import CustomAlert from '../components/CustomAlert';

const { width: screenWidth } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { width, scale, moderateScale, isVerySmall, isSmall, isTablet } = useResponsive();
  const [showAIModeModal, setShowAIModeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedAIMode, setSelectedAIMode] = useState('balanced');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  // Responsive values for all device sizes
  const rs = {
    containerPadding: isVerySmall ? 12 : isSmall ? 16 : isTablet ? 32 : 24,
    avatarSize: isVerySmall ? 70 : isSmall ? 80 : isTablet ? 110 : 90,
    avatarRadius: isVerySmall ? 28 : isSmall ? 32 : isTablet ? 44 : 36,
    nameSize: isVerySmall ? 18 : isSmall ? 20 : isTablet ? 28 : 24,
    emailSize: isVerySmall ? 12 : isSmall ? 13 : isTablet ? 16 : 14,
    sectionTitleSize: isVerySmall ? 11 : isSmall ? 12 : isTablet ? 15 : 13,
    itemTitleSize: isVerySmall ? 13 : isSmall ? 14 : isTablet ? 18 : 16,
    itemDescSize: isVerySmall ? 11 : isSmall ? 12 : isTablet ? 14 : 13,
    iconSize: isVerySmall ? 18 : isSmall ? 20 : isTablet ? 26 : 22,
    cardPadding: isVerySmall ? 12 : isSmall ? 14 : isTablet ? 20 : 16,
    cardRadius: isVerySmall ? 14 : isSmall ? 16 : isTablet ? 24 : 20,
    gap: isVerySmall ? 10 : isSmall ? 12 : isTablet ? 18 : 14,
    badgeSize: isVerySmall ? 16 : isSmall ? 18 : isTablet ? 24 : 20,
  };

  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-20)).current;
  const profileAnim = useRef(new Animated.Value(0)).current;
  const profileScaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(profileAnim, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.spring(profileScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    setAlertConfig({
      visible: true,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout() },
      ],
    });
  };

  const stats = [
    { icon: MessageCircle, value: '156', label: 'Chats' },
    { icon: Star, value: '2.8k', label: 'Messages' },
    { icon: Clock, value: '48h', label: 'Saved' },
  ];

  const aiModes = [
    {
      id: 'creative',
      name: 'Creative',
      desc: 'More imaginative and expressive responses',
      icon: Sparkles,
      color: '#EC4899',
    },
    {
      id: 'balanced',
      name: 'Balanced',
      desc: 'Best mix of creativity and accuracy',
      icon: Brain,
      color: theme.primary,
    },
    {
      id: 'precise',
      name: 'Precise',
      desc: 'More factual and concise responses',
      icon: Zap,
      color: '#22C55E',
    },
  ];

  const languages = [
    { id: 'en', name: 'English', flag: '🇺🇸' },
    { id: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'fr', name: 'Français', flag: '🇫🇷' },
    { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { id: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  const storageUsed = 2.4;
  const storageTotal = 5;
  const storagePercentage = (storageUsed / storageTotal) * 100;

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Cache Cleared', 'Your cache has been cleared successfully.') },
      ]
    );
  };

  const handleSubscription = () => {
    Alert.alert(
      'Subscription',
      'You are currently on the PRO plan.\n\nPlan: PRO Monthly\nNext billing: March 1, 2026\nPrice: $9.99/month',
      [
        { text: 'Cancel Subscription', style: 'destructive' },
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const handleSecurity = () => {
    Alert.alert(
      'Security Settings',
      'Choose a security option:',
      [
        { text: 'Change Password', onPress: () => Alert.alert('Change Password', 'Password change feature coming soon.') },
        { text: 'Two-Factor Auth', onPress: () => Alert.alert('2FA', 'Two-factor authentication coming soon.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Settings',
      'Choose a privacy option:',
      [
        { text: 'Delete All Data', style: 'destructive', onPress: () => Alert.alert('Delete Data', 'This would delete all your data.') },
        { text: 'Export Data', onPress: () => Alert.alert('Export', 'Your data export has been initiated.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Help Center',
      'How can we help you?',
      [
        { text: 'FAQs', onPress: () => Alert.alert('FAQs', 'Frequently asked questions would open here.') },
        { text: 'Contact Support', onPress: () => Alert.alert('Contact', 'Email: support@aichat.com') },
        { text: 'Report Bug', onPress: () => Alert.alert('Report', 'Bug report feature coming soon.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Glass card component matching navbar style
  const GlassCard = ({ children, style, onPress }) => {
    const content = (
      <>
        {Platform.OS === 'web' ? (
          <View style={[styles.glassCard, styles.glassCardWeb, style]}>
            {children}
          </View>
        ) : (
          <BlurView
            intensity={60}
            tint={isDarkMode ? 'dark' : 'light'}
            style={[styles.glassCard, style]}
          >
            <View style={styles.glassCardInner}>
              {children}
            </View>
          </BlurView>
        )}
      </>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient background */}
      <View style={styles.ambientBackground}>
        <LinearGradient
          colors={[theme.gradient1 + '40', 'transparent']}
          style={styles.ambientGradient1}
        />
        <LinearGradient
          colors={[theme.gradient2 + '30', 'transparent']}
          style={styles.ambientGradient2}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: headerAnim, transform: [{ translateY: headerSlideAnim }] }
            ]}
          >
            <View>
              <Text style={[styles.greeting, { color: theme.textMuted }]}>Your Account</Text>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
            </View>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View
            style={[
              styles.profileSection,
              {
                opacity: profileAnim,
                transform: [{ scale: profileScaleAnim }]
              }
            ]}
          >
            <GlassCard onPress={() => setShowEditProfileModal(true)}>
              <View style={styles.profileContent}>
                <View style={styles.avatarSection}>
                  <View style={styles.avatarWrapper}>
                    <LinearGradient
                      colors={[theme.gradient1, theme.gradient2]}
                      style={styles.avatarBorder}
                    >
                      <Image source={{ uri: (user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6B4EFF&color=fff&size=128&bold=true`) }} style={styles.avatar} />
                    </LinearGradient>
                  </View>
                  <TouchableOpacity
                    style={styles.editBadgeWrapper}
                    onPress={() => Alert.alert('Change Photo', 'Photo change feature coming soon.')}
                  >
                    <LinearGradient
                      colors={[theme.gradient1, theme.gradient2]}
                      style={styles.editBadge}
                    >
                      <Camera size={12} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]}>{(user?.name || 'User')}</Text>
                  <Text style={[styles.userEmail, { color: theme.textMuted }]}>{(user?.email || 'No email')}</Text>

                  <LinearGradient
                    colors={[theme.gradient1 + '30', theme.gradient2 + '30']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.proBadge}
                  >
                    <Crown size={12} color={theme.primary} />
                    <Text style={[styles.proBadgeText, { color: theme.primary }]}>PRO</Text>
                  </LinearGradient>
                </View>

                <ChevronRight size={20} color={theme.textMuted} />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Stats Row */}
          <View style={styles.statsSection}>
            <GlassCard>
              <View style={styles.statsRow}>
                {stats.map((stat, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => Alert.alert(stat.label, `You have ${stat.value} ${stat.label.toLowerCase()}.`)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={[theme.gradient1, theme.gradient2]}
                        style={styles.statIconBg}
                      >
                        <stat.icon size={18} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{stat.label}</Text>
                    </TouchableOpacity>
                    {index < stats.length - 1 && (
                      <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </GlassCard>
          </View>

          {/* AI Mode Selector */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>AI ASSISTANT</Text>
            <GlassCard onPress={() => setShowAIModeModal(true)}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <Bot size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>AI Mode</Text>
                  <Text style={[styles.settingValue, { color: theme.textMuted }]}>
                    {aiModes.find(m => m.id === selectedAIMode)?.name}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>
          </View>

          {/* Storage Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>STORAGE</Text>
            <GlassCard>
              <View style={styles.storageContent}>
                <View style={styles.settingRow}>
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={styles.settingIcon}
                  >
                    <HardDrive size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>Storage Used</Text>
                    <Text style={[styles.settingValue, { color: theme.textMuted }]}>
                      {storageUsed} GB of {storageTotal} GB
                    </Text>
                  </View>
                </View>
                <View style={[styles.storageBarBg, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.storageBar, { width: `${storagePercentage}%` }]}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.clearCacheBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                  onPress={handleClearCache}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={theme.error} />
                  <Text style={[styles.clearCacheText, { color: theme.error }]}>Clear Cache</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>

          {/* Preferences Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>PREFERENCES</Text>

            {/* Dark Mode Toggle */}
            <GlassCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <Moon size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.settingLabel, { color: theme.text, flex: 1 }]}>Dark Mode</Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: theme.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
            </GlassCard>

            {/* Notifications Toggle */}
            <GlassCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <Bell size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.settingLabel, { color: theme.text, flex: 1 }]}>Notifications</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: theme.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
            </GlassCard>

            {/* Daily AI Digest */}
            <GlassCard style={styles.settingCard} onPress={() => navigation.navigate('Digest')}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={['#F59E0B', '#EF4444']}
                  style={styles.settingIcon}
                >
                  <Newspaper size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Daily AI Digest</Text>
                  <Text style={[styles.settingValue, { color: theme.textMuted }]}>AI news summaries</Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>

            {/* Language */}
            <GlassCard style={styles.settingCard} onPress={() => setShowLanguageModal(true)}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <Globe size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Language</Text>
                  <Text style={[styles.settingValue, { color: theme.textMuted }]}>
                    {languages.find(l => l.id === selectedLanguage)?.name}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>

            {/* Privacy */}
            <GlassCard style={styles.settingCard} onPress={handlePrivacy}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <Lock size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.settingLabel, { color: theme.text, flex: 1 }]}>Privacy</Text>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>
          </View>

          {/* Account Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>ACCOUNT</Text>

            <GlassCard style={styles.settingCard} onPress={() => setShowEditProfileModal(true)}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <User size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.settingLabel, { color: theme.text, flex: 1 }]}>Edit Profile</Text>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>

            <GlassCard style={styles.settingCard} onPress={handleSubscription}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <CreditCard size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Subscription</Text>
                  <Text style={[styles.settingValue, { color: theme.primary }]}>PRO Plan</Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>

            <GlassCard style={styles.settingCard} onPress={handleSecurity}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <Shield size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.settingLabel, { color: theme.text, flex: 1 }]}>Security</Text>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>

            <GlassCard style={styles.settingCard} onPress={handleHelp}>
              <View style={styles.settingRow}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={styles.settingIcon}
                >
                  <HelpCircle size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.settingLabel, { color: theme.text, flex: 1 }]}>Help Center</Text>
                <ChevronRight size={18} color={theme.textMuted} />
              </View>
            </GlassCard>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Version */}
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            Version 1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* AI Mode Modal */}
      <Modal
        visible={showAIModeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAIModeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAIModeModal(false)}
        >
          <View style={[styles.modalContent, Platform.OS === 'web' && styles.modalContentWeb]}>
            <View style={[styles.modalHandle, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>AI Mode</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Choose how your AI assistant responds
            </Text>

            {aiModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  { backgroundColor: 'rgba(255,255,255,0.05)' },
                  selectedAIMode === mode.id && { borderColor: mode.color, borderWidth: 2 },
                ]}
                onPress={() => {
                  setSelectedAIMode(mode.id);
                  setShowAIModeModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modeOptionIcon, { backgroundColor: `${mode.color}20` }]}>
                  <mode.icon size={22} color={mode.color} />
                </View>
                <View style={styles.modeOptionInfo}>
                  <Text style={[styles.modeOptionName, { color: theme.text }]}>{mode.name}</Text>
                  <Text style={[styles.modeOptionDesc, { color: theme.textMuted }]}>{mode.desc}</Text>
                </View>
                {selectedAIMode === mode.id && (
                  <View style={[styles.modeCheck, { backgroundColor: mode.color }]}>
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={[styles.modalContent, Platform.OS === 'web' && styles.modalContentWeb]}>
            <View style={[styles.modalHandle, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Language</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Select your preferred language
            </Text>

            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.langOption,
                  { backgroundColor: 'rgba(255,255,255,0.05)' },
                  selectedLanguage === lang.id && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  setSelectedLanguage(lang.id);
                  setShowLanguageModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langName, { color: theme.text }]}>{lang.name}</Text>
                {selectedLanguage === lang.id && (
                  <View style={[styles.modeCheck, { backgroundColor: theme.primary }]}>
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditProfileModal(false)}
        >
          <View style={[styles.modalContent, Platform.OS === 'web' && styles.modalContentWeb]}>
            <View style={[styles.modalHandle, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profile Info</Text>

            <View style={styles.profileInfoRow}>
              <User size={20} color={theme.textMuted} />
              <View style={styles.profileInfoContent}>
                <Text style={[styles.profileInfoLabel, { color: theme.textMuted }]}>Name</Text>
                <Text style={[styles.profileInfoValue, { color: theme.text }]}>{(user?.name || 'User')}</Text>
              </View>
            </View>

            <View style={styles.profileInfoRow}>
              <Mail size={20} color={theme.textMuted} />
              <View style={styles.profileInfoContent}>
                <Text style={[styles.profileInfoLabel, { color: theme.textMuted }]}>Email</Text>
                <Text style={[styles.profileInfoValue, { color: theme.text }]}>{(user?.email || 'No email')}</Text>
              </View>
            </View>

            <View style={styles.profileInfoRow}>
              <Phone size={20} color={theme.textMuted} />
              <View style={styles.profileInfoContent}>
                <Text style={[styles.profileInfoLabel, { color: theme.textMuted }]}>Phone</Text>
                <Text style={[styles.profileInfoValue, { color: theme.text }]}>+1 234 567 8900</Text>
              </View>
            </View>

            <View style={styles.profileInfoRow}>
              <Crown size={20} color={theme.primary} />
              <View style={styles.profileInfoContent}>
                <Text style={[styles.profileInfoLabel, { color: theme.textMuted }]}>Plan</Text>
                <Text style={[styles.profileInfoValue, { color: theme.primary }]}>PRO Member</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => {
                setShowEditProfileModal(false);
                Alert.alert('Edit Profile', 'Profile editing feature coming soon.');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.gradient1, theme.gradient2]}
                style={styles.editProfileBtnGradient}
              >
                <Edit3 size={18} color="#FFFFFF" />
                <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  safeArea: {
    flex: 1,
    alignItems: screenWidth >= 768 ? 'center' : 'stretch',
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ambientGradient1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  ambientGradient2: {
    position: 'absolute',
    bottom: 200,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  scrollView: {
    flex: 1,
    width: '100%',
    maxWidth: screenWidth >= 768 ? 600 : '100%',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // Glass card styles matching navbar
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassCardWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
  },
  glassCardInner: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  profileSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
  },
  avatarWrapper: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarBorder: {
    width: 68,
    height: 68,
    borderRadius: 20,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 17,
  },
  editBadgeWrapper: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  editBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 10,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  settingsSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 14,
    marginLeft: 4,
  },
  settingCard: {
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 13,
    marginTop: 2,
  },
  storageContent: {},
  storageBarBg: {
    height: 8,
    borderRadius: 4,
    marginVertical: 16,
    overflow: 'hidden',
  },
  storageBar: {
    height: '100%',
    borderRadius: 4,
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  clearCacheText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 100,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(25, 25, 35, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalContentWeb: {
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modeOptionInfo: {
    flex: 1,
  },
  modeOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeOptionDesc: {
    fontSize: 13,
  },
  modeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langFlag: {
    fontSize: 24,
    marginRight: 14,
  },
  langName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  profileInfoContent: {
    flex: 1,
    marginLeft: 14,
  },
  profileInfoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  profileInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editProfileBtn: {
    marginTop: 24,
  },
  editProfileBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;
