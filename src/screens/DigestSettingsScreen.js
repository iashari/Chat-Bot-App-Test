import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Clock,
  Sparkles,
  Save,
  Star,
  Check,
  X,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { getDigestSettings, updateDigestSettings, triggerTestDigest } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

const AVAILABLE_TOPICS = [
  'Technology',
  'Business',
  'Sports',
  'Entertainment',
  'Science',
  'Health',
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');

const DigestSettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { showNotification } = useNotification();
  const [enabled, setEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState('08:00');
  const [selectedTopics, setSelectedTopics] = useState(['Technology', 'Science']);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings();
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await getDigestSettings();
      if (result.success && result.settings) {
        setEnabled(!!result.settings.enabled);
        setDigestTime(result.settings.digest_time || '08:00');
        setCustomPrompt(result.settings.custom_prompt || '');
        try {
          const topics = JSON.parse(result.settings.topics || '["Technology","Science"]');
          setSelectedTopics(topics);
        } catch (e) {
          setSelectedTopics(['Technology', 'Science']);
        }
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDigestSettings({
        enabled: enabled ? 1 : 0,
        digest_time: digestTime,
        topics: JSON.stringify(selectedTopics),
        custom_prompt: customPrompt,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestDigest = async () => {
    setGenerating(true);
    try {
      // Save current settings first
      await updateDigestSettings({
        enabled: enabled ? 1 : 0,
        digest_time: digestTime,
        topics: JSON.stringify(selectedTopics),
        custom_prompt: customPrompt,
      });
      const result = await triggerTestDigest();
      if (result.success) {
        // Show global in-app notification banner
        showNotification(
          result.digest.title,
          'Your daily news digest is ready. Tap to read.',
          result.digest.id
        );
      }
    } catch (error) {
      console.error('Test digest error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTopic = (topic) => {
    setHasChanges(true);
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const GlassCard = ({ children, style }) => {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.glassCard, styles.glassCardWeb, style]}>
          {children}
        </View>
      );
    }
    return (
      <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.glassCard, style]}>
        <View style={styles.glassCardInner}>{children}</View>
      </BlurView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient background */}
      <View style={styles.ambientBackground}>
        <LinearGradient colors={[theme.gradient1 + '40', 'transparent']} style={styles.ambientGradient1} />
        <LinearGradient colors={[theme.gradient2 + '30', 'transparent']} style={styles.ambientGradient2} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Digest Settings</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: contentAnim }}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Enable Toggle */}
            <View style={styles.section}>
              <GlassCard>
                <View style={styles.settingRow}>
                  <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.settingIcon}>
                    <Sparkles size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>Daily AI Digest</Text>
                    <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                      Receive AI-generated news summaries
                    </Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(val) => { setEnabled(val); setHasChanges(true); }}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </GlassCard>
            </View>

            {/* Time Picker */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>DELIVERY TIME</Text>
              <GlassCard>
                <TouchableOpacity style={styles.settingRow} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
                  <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.settingIcon}>
                    <Clock size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>Digest Time</Text>
                    <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                      Daily at {digestTime}
                    </Text>
                  </View>
                  <Text style={[styles.timeDisplay, { color: theme.primary }]}>{digestTime}</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>

            {/* Topic Chips */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>TOPICS</Text>
              <GlassCard>
                <Text style={[styles.chipSectionTitle, { color: theme.text }]}>Select topics for your digest</Text>
                <View style={styles.chipContainer}>
                  {AVAILABLE_TOPICS.map(topic => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <TouchableOpacity
                        key={topic}
                        onPress={() => toggleTopic(topic)}
                        activeOpacity={0.7}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={[theme.gradient1, theme.gradient2]}
                            style={styles.chip}
                          >
                            <Text style={styles.chipTextSelected}>{topic}</Text>
                            <Check size={14} color="#FFFFFF" />
                          </LinearGradient>
                        ) : (
                          <View style={[styles.chip, styles.chipUnselected]}>
                            <Text style={[styles.chipText, { color: theme.textMuted }]}>{topic}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassCard>
            </View>

            {/* Custom Prompt */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CUSTOM PROMPT (OPTIONAL)</Text>
              <GlassCard>
                <TextInput
                  style={[styles.promptInput, { color: theme.text, borderColor: 'rgba(255,255,255,0.15)' }]}
                  placeholder="E.g., Focus on AI startups and funding news..."
                  placeholderTextColor={theme.textMuted}
                  value={customPrompt}
                  onChangeText={(text) => { setCustomPrompt(text); setHasChanges(true); }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </GlassCard>
            </View>

            {/* Generate Test Digest Button */}
            <View style={styles.section}>
              <TouchableOpacity onPress={handleTestDigest} disabled={generating} activeOpacity={0.8}>
                <LinearGradient
                  colors={generating ? ['#666', '#555'] : ['#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.testButton}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Star size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.testButtonText}>
                    {generating ? 'Generating Digest...' : 'Generate Test Digest Now'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.testHint, { color: theme.textMuted }]}>
                Uses Gemini AI with Google Grounding for real-time news
              </Text>
            </View>

            {/* Save Button */}
            {hasChanges && (
              <View style={styles.section}>
                <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={styles.saveButton}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Save size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
          <View style={[styles.modalContent, Platform.OS === 'web' && styles.modalContentWeb]}>
            <View style={[styles.modalHandle, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Time</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Choose when to receive your daily digest
            </Text>
            <ScrollView style={styles.timeGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.timeGridInner}>
                {HOURS.map(hour => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => { setDigestTime(hour); setHasChanges(true); setShowTimePicker(false); }}
                    activeOpacity={0.7}
                  >
                    {digestTime === hour ? (
                      <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.timeOption}>
                        <Text style={styles.timeOptionTextSelected}>{hour}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.timeOption, styles.timeOptionUnselected]}>
                        <Text style={[styles.timeOptionText, { color: theme.text }]}>{hour}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: screenWidth >= 768 ? 'center' : 'stretch' },
  ambientBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ambientGradient1: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150 },
  ambientGradient2: { position: 'absolute', bottom: 200, left: -100, width: 250, height: 250, borderRadius: 125 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollView: { flex: 1, width: '100%', maxWidth: screenWidth >= 768 ? 600 : '100%' },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  glassCard: { borderRadius: 20, overflow: 'hidden' },
  glassCardWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
  },
  glassCardInner: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingDesc: { fontSize: 13, marginTop: 2 },
  timeDisplay: { fontSize: 16, fontWeight: '700' },
  chipSectionTitle: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  chipUnselected: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipTextSelected: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  promptInput: {
    minHeight: 80,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  testButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  testHint: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: 'rgba(25, 25, 35, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalContentWeb: { backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  timeGrid: { maxHeight: 300 },
  timeGridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  timeOption: { width: 75, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  timeOptionUnselected: { backgroundColor: 'rgba(255,255,255,0.08)' },
  timeOptionText: { fontSize: 15, fontWeight: '500' },
  timeOptionTextSelected: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default DigestSettingsScreen;
