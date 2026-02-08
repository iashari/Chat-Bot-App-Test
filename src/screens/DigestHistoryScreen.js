import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Newspaper,
  Settings,
  RefreshCw,
  ChevronRight,
  Circle,
  Trash2,
  Bookmark,
  Share2,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { getDigests, deleteDigest, toggleBookmarkDigest } from '../services/api';
import CustomAlert from '../components/CustomAlert';

const { width: screenWidth } = Dimensions.get('window');

const TOPIC_COLORS = {
  Technology: '#6366F1',
  Business: '#10B981',
  Sports: '#F59E0B',
  Entertainment: '#EC4899',
  Science: '#3B82F6',
  Health: '#EF4444',
};

const DigestHistoryScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { dismissNotification, refreshUnreadCount } = useNotification();
  const [digests, setDigests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(listAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      dismissNotification();
      loadDigests();
      refreshUnreadCount();
    }, [])
  );

  const loadDigests = async () => {
    try {
      const result = await getDigests();
      if (result.success) {
        setDigests(result.digests || []);
      }
    } catch (error) {
      console.error('Load digests error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDigests();
  }, []);

  const handleDelete = (digest) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Digest',
      message: `Are you sure you want to delete this digest? This action cannot be undone.`,
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const result = await deleteDigest(digest.id);
              if (result.success) {
                setDigests(prev => prev.filter(d => d.id !== digest.id));
              }
            } catch (error) {
              console.error('Delete digest error:', error);
            }
          },
        },
      ],
    });
  };

  const handleBookmark = async (digest) => {
    try {
      const result = await toggleBookmarkDigest(digest.id);
      if (result.success) {
        setDigests(prev => prev.map(d => d.id === digest.id ? { ...d, is_bookmarked: result.digest.is_bookmarked } : d));
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const handleShareDigest = async (digest) => {
    const contentPreview = digest.content
      ? digest.content.replace(/[#*_\[\]]/g, '').substring(0, 300) + '...'
      : '';
    try {
      await Share.share({
        title: digest.title,
        message: `${digest.title}\n\n${contentPreview}\n\nShared from AI Chat App - Daily Digest`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const GlassCard = ({ children, style, onPress }) => {
    const content = Platform.OS === 'web' ? (
      <View style={[styles.glassCard, styles.glassCardWeb, style]}>{children}</View>
    ) : (
      <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.glassCard, style]}>
        <View style={styles.glassCardInner}>{children}</View>
      </BlurView>
    );

    if (onPress) {
      return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
    }
    return content;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.emptyIcon}>
        <Newspaper size={40} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Digests Yet</Text>
      <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
        Set up your Daily AI Digest to receive AI-generated news summaries
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('DigestSettings')} activeOpacity={0.8}>
        <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.emptyButton}>
          <Settings size={18} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Configure Digest</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const getContentHeadline = (content) => {
    if (!content) return '';
    const cleaned = content.replace(/^#+\s*/gm, '').replace(/[*_\[\]]/g, '');
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    return lines[0]?.substring(0, 100) || '';
  };

  const renderDigestItem = (digest, index) => {
    let topics = [];
    try {
      topics = JSON.parse(digest.topics || '[]');
    } catch (e) {
      topics = [];
    }

    const contentHeadline = getContentHeadline(digest.content);

    return (
      <Animated.View
        key={digest.id}
        style={[
          styles.digestItem,
          {
            opacity: listAnim,
            transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <GlassCard onPress={() => navigation.navigate('DigestDetail', { digestId: digest.id })}>
          <View style={styles.digestContent}>
            {/* Subheadline: Daily Digest - Date */}
            <View style={styles.digestSubtitleRow}>
              {!digest.is_read && (
                <Circle size={6} color={theme.primary} fill={theme.primary} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.digestSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {digest.title}
              </Text>
            </View>

            {/* Headline: actual news content */}
            <View style={styles.digestHeader}>
              <Text style={[styles.digestTitle, { color: theme.text }]} numberOfLines={2}>
                {contentHeadline}
              </Text>
              <ChevronRight size={18} color={theme.textMuted} />
            </View>

            <View style={styles.digestFooter}>
              <View style={styles.digestTags}>
                {topics.slice(0, 2).map(topic => (
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
              <View style={styles.digestFooterRight}>
                <Text style={[styles.digestDate, { color: theme.textMuted }]}>
                  {formatDate(digest.created_at)}
                </Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); handleBookmark(digest); }}
                  style={styles.actionButton}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Bookmark size={14} color={digest.is_bookmarked ? '#F59E0B' : theme.textMuted} fill={digest.is_bookmarked ? '#F59E0B' : 'none'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); handleShareDigest(digest); }}
                  style={styles.actionButton}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Share2 size={14} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); handleDelete(digest); }}
                  style={styles.actionButton}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

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
          <View>
            <Text style={[styles.subheadline, { color: theme.textMuted }]}>Daily Digest</Text>
            <Text style={[styles.headline, { color: theme.text }]}>AI News</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.headerButton} activeOpacity={0.7}>
              <RefreshCw size={20} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('DigestSettings')}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <Settings size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {!loading && digests.length === 0 ? (
            renderEmptyState()
          ) : (
            digests.map((digest, index) => renderDigestItem(digest, index))
          )}
        </ScrollView>
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
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: screenWidth >= 768 ? 'center' : 'stretch' },
  ambientBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ambientGradient1: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150 },
  ambientGradient2: { position: 'absolute', bottom: 200, left: -100, width: 250, height: 250, borderRadius: 125 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  subheadline: { fontSize: 13, fontWeight: '500', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollView: { flex: 1, width: '100%', maxWidth: screenWidth >= 768 ? 600 : '100%' },
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
  digestItem: { paddingHorizontal: 24, marginBottom: 12 },
  digestContent: {},
  digestSubtitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  digestSubtitle: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  digestHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  digestTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  digestPreview: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  digestFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  digestFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  actionButton: { padding: 4 },
  digestTags: { flexDirection: 'row', gap: 6, flex: 1, overflow: 'hidden' },
  topicTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  topicTagText: { fontSize: 11, fontWeight: '600' },
  digestDate: { fontSize: 12, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

export default DigestHistoryScreen;
