import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Calendar,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { getDigestById } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

const TOPIC_COLORS = {
  Technology: '#6366F1',
  Business: '#10B981',
  Sports: '#F59E0B',
  Entertainment: '#EC4899',
  Science: '#3B82F6',
  Health: '#EF4444',
};

// Simple markdown renderer
const renderMarkdown = (text, theme) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} style={mdStyles.list}>
          {listItems.map((item, i) => (
            <View key={i} style={mdStyles.listItem}>
              <Text style={[mdStyles.bullet, { color: theme.primary }]}>{'\u2022'}</Text>
              <Text style={[mdStyles.listText, { color: theme.text }]}>{renderInline(item, theme)}</Text>
            </View>
          ))}
        </View>
      );
      listItems = [];
    }
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<View key={`space-${i}`} style={{ height: 8 }} />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <Text key={`h3-${i}`} style={[mdStyles.h3, { color: theme.text }]}>
          {renderInline(trimmed.slice(4), theme)}
        </Text>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <Text key={`h2-${i}`} style={[mdStyles.h2, { color: theme.text }]}>
          {renderInline(trimmed.slice(3), theme)}
        </Text>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <Text key={`h1-${i}`} style={[mdStyles.h1, { color: theme.text }]}>
          {renderInline(trimmed.slice(2), theme)}
        </Text>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      inList = true;
      const content = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      listItems.push(content);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <Text key={`p-${i}`} style={[mdStyles.paragraph, { color: theme.text }]}>
        {renderInline(trimmed, theme)}
      </Text>
    );
  }

  flushList();
  return elements;
};

// Render inline bold/italic
const renderInline = (text, theme) => {
  const parts = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Text key={`bold-${match.index}`} style={{ fontWeight: '700' }}>
        {match[1]}
      </Text>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const mdStyles = {
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 12, marginTop: 16 },
  h2: { fontSize: 19, fontWeight: '700', marginBottom: 10, marginTop: 14 },
  h3: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  paragraph: { fontSize: 15, lineHeight: 23, marginBottom: 8 },
  list: { marginBottom: 8 },
  listItem: { flexDirection: 'row', marginBottom: 6, paddingLeft: 4 },
  bullet: { fontSize: 16, marginRight: 8, marginTop: 1 },
  listText: { fontSize: 15, lineHeight: 22, flex: 1 },
};

const DigestDetailScreen = ({ route, navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { digestId } = route.params;
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDigest();
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [digestId]);

  const loadDigest = async () => {
    try {
      const result = await getDigestById(digestId);
      if (result.success) {
        setDigest(result.digest);
      }
    } catch (error) {
      console.error('Load digest error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const GlassCard = ({ children, style }) => {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.glassCard, styles.glassCardWeb, style]}>{children}</View>
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

  if (!digest) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Digest not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  let topics = [];
  let sources = [];
  try { topics = JSON.parse(digest.topics || '[]'); } catch (e) {}
  try { sources = JSON.parse(digest.sources || '[]'); } catch (e) {}

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
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Digest</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: contentAnim }}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Title & Meta */}
            <View style={styles.section}>
              <Text style={[styles.digestTitle, { color: theme.text }]}>{digest.title}</Text>

              <View style={styles.metaRow}>
                <Calendar size={14} color={theme.textMuted} />
                <Text style={[styles.metaText, { color: theme.textMuted }]}>
                  {formatFullDate(digest.created_at)}
                </Text>
              </View>

              {topics.length > 0 && (
                <View style={styles.topicTags}>
                  {topics.map(topic => (
                    <View
                      key={topic}
                      style={[styles.topicTag, { backgroundColor: (TOPIC_COLORS[topic] || theme.primary) + '20' }]}
                    >
                      <Text style={[styles.topicTagText, { color: TOPIC_COLORS[topic] || theme.primary }]}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.section}>
              <GlassCard>
                <View style={styles.contentBody}>
                  {renderMarkdown(digest.content, theme)}
                </View>
              </GlassCard>
            </View>

            {/* Sources */}
            {sources.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>SOURCES</Text>
                <GlassCard>
                  {sources.map((source, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.sourceItem,
                        index < sources.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
                      ]}
                      onPress={() => {
                        if (source.url) Linking.openURL(source.url);
                      }}
                      activeOpacity={0.7}
                    >
                      <Globe size={16} color={theme.primary} />
                      <Text style={[styles.sourceTitle, { color: theme.text }]} numberOfLines={2}>
                        {source.title || source.url}
                      </Text>
                      <ExternalLink size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                  ))}
                </GlassCard>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  scrollView: { flex: 1, width: '100%', maxWidth: screenWidth >= 768 ? 600 : '100%' },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  digestTitle: { fontSize: 24, fontWeight: '800', lineHeight: 32, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  metaText: { fontSize: 13, fontWeight: '500' },
  topicTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  topicTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  topicTagText: { fontSize: 12, fontWeight: '600' },
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
  contentBody: {},
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  sourceTitle: { flex: 1, fontSize: 14, fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
});

export default DigestDetailScreen;
