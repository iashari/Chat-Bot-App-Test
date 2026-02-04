import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  ScrollView,
  Animated,
  Modal,
  Image,
  Alert,
  Vibration,
  Platform,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Plus,
  MessageSquare,
  Bot,
  Code2,
  Palette,
  Calculator,
  BarChart3,
  GraduationCap,
  Mic,
  FileText,
  Search,
  X,
  Sparkles,
  ArrowRight,
  Zap,
  Pin,
  Trash2,
  VolumeX,
  MoreHorizontal,
  Filter,
  Bell,
  BellOff,
} from 'lucide-react-native';

const iconMap = {
  Bot: Bot,
  Code2: Code2,
  Palette: Palette,
  Calculator: Calculator,
  BarChart3: BarChart3,
  GraduationCap: GraduationCap,
  Mic: Mic,
  FileText: FileText,
  Sparkles: Sparkles,
  MessageSquare: MessageSquare,
};

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getChats, createChat, deleteChat, updateChat } from '../services/api';
import useResponsive from '../hooks/useResponsive';
import CustomAlert from '../components/CustomAlert';

// Base dimensions for scaling (module-level for StyleSheet)
const BASE_WIDTH = 393;
const { width: screenWidth } = Dimensions.get('window');

// Module-level scale functions for StyleSheet.create()
const scale = (size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const newSize = size * ratio;
  const minScale = size * 0.7;
  const maxScale = size * 1.5;
  return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
};

const moderateScale = (size, factor = 0.5) => {
  const ratio = screenWidth / BASE_WIDTH;
  const newSize = size + (size * ratio - size) * factor;
  const minScale = size * 0.85;
  const maxScale = size * 1.3;
  return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
};

const ConversationListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width, getPadding, isTablet, getContainerStyle } = useResponsive();
  const [conversations, setConversations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mutedChats, setMutedChats] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatPrompt, setNewChatPrompt] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState('general');
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  // Preset system prompt templates
  const promptTemplates = [
    {
      id: 'general',
      name: 'General Assistant',
      icon: 'Bot',
      color: '#6F00FF',
      prompt: 'You are a helpful AI assistant. Be concise, accurate, and friendly. Answer questions clearly and provide useful information.',
    },
    {
      id: 'coder',
      name: 'Code Helper',
      icon: 'Code2',
      color: '#10B981',
      prompt: 'You are an expert programming assistant. Help with code debugging, writing clean code, explaining concepts, and best practices. Provide code examples when helpful.',
    },
    {
      id: 'creative',
      name: 'Creative Writer',
      icon: 'Palette',
      color: '#F59E0B',
      prompt: 'You are a creative writing assistant. Help with stories, poems, scripts, and creative content. Be imaginative, engaging, and help bring ideas to life.',
    },
    {
      id: 'tutor',
      name: 'Study Tutor',
      icon: 'GraduationCap',
      color: '#3B82F6',
      prompt: 'You are a patient and knowledgeable tutor. Explain concepts clearly, break down complex topics, and help with learning. Use examples and analogies to make things easier to understand.',
    },
    {
      id: 'analyst',
      name: 'Data Analyst',
      icon: 'BarChart3',
      color: '#EC4899',
      prompt: 'You are a data analysis expert. Help analyze data, explain statistics, suggest visualizations, and provide insights. Be precise and data-driven in your responses.',
    },
    {
      id: 'custom',
      name: 'Custom',
      icon: 'Sparkles',
      color: '#8B5CF6',
      prompt: '',
    },
  ];

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Load chats from backend on mount
  const loadChats = async () => {
    setRefreshing(true);
    const result = await getChats();
    if (!result.error) {
      // Transform backend data to match app format
      const transformedChats = result.chats.map(chat => ({
        ...chat,
        timestamp: chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
        isOnline: true,
      }));
      setConversations(transformedChats);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadChats();

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
      Animated.timing(filterAnim, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Filter conversations based on active filter
  const getFilteredConversations = () => {
    let filtered = conversations;

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (activeFilter) {
      case 'pinned':
        return filtered.filter(c => c.isPinned);
      case 'unread':
        return filtered.filter(c => c.unread > 0);
      default:
        return filtered;
    }
  };

  const filteredConversations = getFilteredConversations();
  const pinnedConversations = conversations.filter(c => c.isPinned);
  const recentConversations = conversations.filter(c => !c.isPinned);

  const onRefresh = useCallback(() => {
    loadChats();
  }, []);

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatDetail', { conversation });
  };

  const handleNewChat = () => {
    setNewChatName('');
    setNewChatPrompt('');
    setSelectedPromptId('general');
    setShowNewChatModal(true);
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat name');
      return;
    }

    // Get selected template
    const selectedTemplate = promptTemplates.find(t => t.id === selectedPromptId);
    const finalPrompt = selectedPromptId === 'custom'
      ? newChatPrompt.trim()
      : selectedTemplate?.prompt || '';

    // Create chat in backend
    const result = await createChat(
      newChatName.trim(),
      finalPrompt || 'You are a helpful AI assistant. Be concise, accurate, and friendly.',
      selectedTemplate?.icon || 'MessageSquare',
      selectedTemplate?.color || theme.primary
    );

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    const newChat = {
      ...result.chat,
      timestamp: 'Now',
      isOnline: true,
    };

    setConversations(prev => [newChat, ...prev]);
    setShowNewChatModal(false);
    navigation.navigate('ChatDetail', { conversation: newChat });
  };

  const handleDeleteChat = (chat) => {
    const chatToDelete = chat || selectedChat;
    if (!chatToDelete) return;

    setShowChatMenu(false);
    setAlertConfig({
      visible: true,
      title: 'Delete Chat',
      message: `Are you sure you want to delete "${chatToDelete.name}"? This action cannot be undone.`,
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            const result = await deleteChat(chatToDelete.id);
            if (!result.error) {
              setConversations(prev => prev.filter(c => c.id !== chatToDelete.id));
            } else {
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: result.error,
                type: 'error',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            }
          },
        },
      ],
    });
  };

  const handleLongPress = (chat) => {
    Vibration.vibrate(50);
    setSelectedChat(chat);
    setShowChatMenu(true);
  };

  const handlePinChat = async () => {
    const newPinStatus = !selectedChat.isPinned;
    // Update in backend
    const result = await updateChat(selectedChat.id, { isPinned: newPinStatus });
    if (!result.error) {
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedChat.id ? { ...c, isPinned: newPinStatus } : c
        )
      );
    }
    setShowChatMenu(false);
  };

  const handleMuteChat = () => {
    if (mutedChats.includes(selectedChat.id)) {
      setMutedChats(prev => prev.filter(id => id !== selectedChat.id));
    } else {
      setMutedChats(prev => [...prev, selectedChat.id]);
    }
    setShowChatMenu(false);
  };

  const filters = [
    { key: 'all', label: 'All', count: conversations.length },
    { key: 'pinned', label: 'Pinned', count: pinnedConversations.length },
    { key: 'unread', label: 'Unread', count: conversations.filter(c => c.unread > 0).length },
  ];

  const quickActions = [
    { icon: Bot, label: 'General', templateId: 'general', chatName: 'General Assistant' },
    { icon: Code2, label: 'Code', templateId: 'coder', chatName: 'Code Helper' },
    { icon: Palette, label: 'Creative', templateId: 'creative', chatName: 'Creative Writer' },
    { icon: GraduationCap, label: 'Study', templateId: 'tutor', chatName: 'Study Tutor' },
    { icon: BarChart3, label: 'Analyst', templateId: 'analyst', chatName: 'Data Analyst' },
    { icon: Sparkles, label: 'Custom', templateId: 'custom', chatName: 'Custom' },
  ];

  const handleQuickAction = (action) => {
    setNewChatName(action.chatName);
    setNewChatPrompt('');
    setSelectedPromptId(action.templateId);
    setShowNewChatModal(true);
  };

  const GlassContainer = ({ children, style, noPadding }) => {
    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            styles.glassCard,
            styles.glassCardWeb,
            {
              borderColor: theme.glassBorder,
            },
            !noPadding && { padding: 14 },
            style,
          ]}
        >
          {children}
        </View>
      );
    }
    return (
      <BlurView
        intensity={60}
        tint={theme.background === '#0A0A0F' ? 'dark' : 'light'}
        style={[styles.glassCard, style]}
      >
        <View
          style={[
            styles.glassInner,
            {
              backgroundColor: 'rgba(30, 30, 45, 0.3)',
              borderColor: theme.glassBorder,
            },
            !noPadding && { padding: 14 },
          ]}
        >
          {children}
        </View>
      </BlurView>
    );
  };

  // Dynamic responsive values
  const responsivePadding = getPadding();
  const responsiveStyles = {
    header: { paddingHorizontal: responsivePadding, paddingTop: scale(16), paddingBottom: scale(24) },
    section: { paddingHorizontal: responsivePadding, marginBottom: scale(32) },
    heroCard: { padding: scale(24), borderRadius: scale(24) },
    fontSize: { title: moderateScale(18), body: moderateScale(14), small: moderateScale(12) },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient background gradients for glass effect */}
      <View style={styles.ambientBackground}>
        <LinearGradient
          colors={[theme.gradientGlass1 || theme.gradient1, 'transparent']}
          style={styles.ambientGradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[theme.gradientGlass2 || theme.gradient2, 'transparent']}
          style={styles.ambientGradient2}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scale(120) }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.greeting, { color: theme.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'User'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.8}
            >
              <GlassContainer style={styles.searchBtn}>
                <Search size={20} color={theme.textSecondary} />
              </GlassContainer>
            </TouchableOpacity>
          </Animated.View>

          {/* Hero Card with Glass Effect */}
          <Animated.View
            style={[
              styles.heroSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity onPress={handleNewChat} activeOpacity={0.9}>
              <LinearGradient
                colors={[theme.gradient1, theme.gradient2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, styles.heroGlow]}
              >
                {/* Glass overlay on gradient */}
                <View style={styles.heroGlassOverlay} />
                <View style={styles.heroContent}>
                  <View style={styles.heroIconWrap}>
                    <Sparkles size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.heroText}>
                    <Text style={styles.heroTitle}>Start New Chat</Text>
                    <Text style={styles.heroSubtitle}>Ask me anything, I'm here to help</Text>
                  </View>
                </View>
                <View style={styles.heroButton}>
                  <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

        {/* Filter Tabs - Glass Style */}
        <Animated.View
          style={[
            styles.filterSection,
            { opacity: filterAnim }
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.8}
              >
                {activeFilter === filter.key ? (
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={[styles.filterTab, styles.filterTabActive, styles.filterGlow]}
                  >
                    <Text style={styles.filterTextActive}>{filter.label}</Text>
                    {filter.count > 0 && (
                      <View style={styles.filterCountActive}>
                        <Text style={styles.filterCountTextActive}>{filter.count}</Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[styles.filterTab, styles.filterTabGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                    <Text style={[styles.filterText, { color: theme.textSecondary }]}>{filter.label}</Text>
                    {filter.count > 0 && (
                      <View style={[styles.filterCount, { backgroundColor: theme.glassHighlight }]}>
                        <Text style={[styles.filterCountText, { color: theme.textSecondary }]}>{filter.count}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Quick Actions - Glass Style */}
        <View style={styles.quickSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
                style={styles.quickCardWrapper}
              >
                <GlassContainer style={styles.quickCard}>
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={[styles.quickIconWrap, styles.iconGlow]}
                  >
                    <action.icon size={22} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={[styles.quickLabel, { color: theme.text }]}>{action.label}</Text>
                </GlassContainer>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pinned Chats - Glass Style */}
        {activeFilter === 'all' && pinnedConversations.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Pin size={18} color={theme.primary} />
                <Text style={[styles.sectionTitleNoBtm, { color: theme.text }]}>Pinned</Text>
              </View>
            </View>

            {pinnedConversations.map((chat) => {
              const IconComp = iconMap[chat.icon] || Bot;
              const isMuted = mutedChats.includes(chat.id);
              return (
                <TouchableOpacity
                  key={chat.id}
                  onPress={() => handleConversationPress(chat)}
                  onLongPress={() => handleLongPress(chat)}
                  activeOpacity={0.7}
                  delayLongPress={300}
                >
                  <GlassContainer style={styles.chatCard} noPadding>
                    <View style={styles.chatCardInner}>
                      <View style={styles.chatIconWrapper}>
                        <LinearGradient
                          colors={[theme.gradient1, theme.gradient2]}
                          style={[styles.chatIcon, styles.iconGlow]}
                        >
                          <IconComp size={20} color="#FFFFFF" />
                        </LinearGradient>
                        {chat.isOnline && (
                          <View style={[styles.onlineIndicator, { borderColor: theme.glass }]} />
                        )}
                      </View>
                      <View style={styles.chatInfo}>
                        <View style={styles.chatNameRow}>
                          <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
                            {chat.name}
                          </Text>
                          {isMuted && <BellOff size={12} color={theme.textMuted} />}
                        </View>
                        <Text style={[styles.chatMessage, { color: theme.textMuted }]} numberOfLines={1}>
                          {chat.lastMessage}
                        </Text>
                      </View>
                      <View style={styles.chatMeta}>
                        <Text style={[styles.chatTime, { color: theme.textMuted }]}>{chat.timestamp}</Text>
                        {chat.unread > 0 && (
                          <LinearGradient
                            colors={[theme.gradient1, theme.gradient2]}
                            style={[styles.unreadBadge, styles.badgeGlow]}
                          >
                            <Text style={styles.unreadText}>{chat.unread}</Text>
                          </LinearGradient>
                        )}
                      </View>
                    </View>
                  </GlassContainer>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent Chats - Glass Style */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {activeFilter === 'all' ? 'Recent Chats' :
               activeFilter === 'pinned' ? 'Pinned Chats' : 'Unread Chats'}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {(activeFilter === 'all' ? recentConversations : filteredConversations).slice(0, 5).map((chat) => {
            const IconComp = iconMap[chat.icon] || Bot;
            const isMuted = mutedChats.includes(chat.id);
            return (
              <TouchableOpacity
                key={chat.id}
                onPress={() => handleConversationPress(chat)}
                onLongPress={() => handleLongPress(chat)}
                activeOpacity={0.7}
                delayLongPress={300}
              >
                <GlassContainer style={styles.chatCard} noPadding>
                  <View style={styles.chatCardInner}>
                    <View style={styles.chatIconWrapper}>
                      <LinearGradient
                        colors={[theme.gradient1, theme.gradient2]}
                        style={[styles.chatIcon, styles.iconGlow]}
                      >
                        <IconComp size={20} color="#FFFFFF" />
                      </LinearGradient>
                      {chat.isOnline && (
                        <View style={[styles.onlineIndicator, { borderColor: theme.glass }]} />
                      )}
                    </View>
                    <View style={styles.chatInfo}>
                      <View style={styles.chatNameRow}>
                        <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
                          {chat.name}
                        </Text>
                        {chat.isPinned && activeFilter !== 'pinned' && (
                          <Pin size={12} color={theme.primary} />
                        )}
                        {isMuted && <BellOff size={12} color={theme.textMuted} />}
                      </View>
                      <Text style={[styles.chatMessage, { color: theme.textMuted }]} numberOfLines={1}>
                        {chat.lastMessage}
                      </Text>
                    </View>
                    <View style={styles.chatMeta}>
                      <Text style={[styles.chatTime, { color: theme.textMuted }]}>{chat.timestamp}</Text>
                      {chat.unread > 0 && (
                        <LinearGradient
                          colors={[theme.gradient1, theme.gradient2]}
                          style={[styles.unreadBadge, styles.badgeGlow]}
                        >
                          <Text style={styles.unreadText}>{chat.unread}</Text>
                        </LinearGradient>
                      )}
                    </View>
                  </View>
                </GlassContainer>
              </TouchableOpacity>
            );
          })}

          {filteredConversations.length === 0 && activeFilter !== 'all' && (
            <GlassContainer style={styles.emptyFilter}>
              <Filter size={48} color={theme.textMuted} />
              <Text style={[styles.emptyFilterText, { color: theme.textMuted }]}>
                No {activeFilter} chats
              </Text>
            </GlassContainer>
          )}
        </View>

        {/* Capabilities - Glass Style */}
        <View style={styles.capabilitiesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What I can do</Text>
          <View style={styles.capabilitiesGrid}>
            {[
              { icon: Zap, title: 'Fast Responses', desc: 'Get instant answers' },
              { icon: Code2, title: 'Code Helper', desc: 'Debug & write code' },
              { icon: FileText, title: 'Content Writer', desc: 'Create any content' },
              { icon: Sparkles, title: 'Creative Ideas', desc: 'Brainstorm together' },
            ].map((item, index) => (
              <GlassContainer key={index} style={styles.capabilityCard}>
                <LinearGradient
                  colors={[theme.gradient1, theme.gradient2]}
                  style={[styles.capabilityIcon, styles.iconGlow]}
                >
                  <item.icon size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.capabilityTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.capabilityDesc, { color: theme.textMuted }]}>{item.desc}</Text>
              </GlassContainer>
            ))}
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>

      {/* Search Modal - Glass Style */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.searchHeader}>
              <View style={[styles.searchInputWrap, styles.glassInput, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                <Search size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search chats..."
                  placeholderTextColor={theme.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                }}
                style={styles.cancelBtn}
              >
                <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.searchResults}>
              {filteredConversations.map((chat) => {
                const IconComp = iconMap[chat.icon] || Bot;
                return (
                  <TouchableOpacity
                    key={chat.id}
                    onPress={() => {
                      setShowSearchModal(false);
                      setSearchQuery('');
                      handleConversationPress(chat);
                    }}
                  >
                    <GlassContainer style={styles.searchResultItem} noPadding>
                      <View style={styles.searchResultInner}>
                        <LinearGradient
                          colors={[theme.gradient1, theme.gradient2]}
                          style={[styles.searchResultIcon, styles.iconGlow]}
                        >
                          <IconComp size={18} color="#FFFFFF" />
                        </LinearGradient>
                        <View style={styles.searchResultInfo}>
                          <Text style={[styles.searchResultName, { color: theme.text }]}>{chat.name}</Text>
                          <Text style={[styles.searchResultMsg, { color: theme.textMuted }]} numberOfLines={1}>
                            {chat.lastMessage}
                          </Text>
                        </View>
                        <ArrowRight size={18} color={theme.textSecondary} />
                      </View>
                    </GlassContainer>
                  </TouchableOpacity>
                );
              })}
              {filteredConversations.length === 0 && (
                <GlassContainer style={styles.noResults}>
                  <Search size={48} color={theme.textMuted} />
                  <Text style={[styles.noResultsText, { color: theme.textMuted }]}>No results found</Text>
                </GlassContainer>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Chat Action Menu Modal - Glass Style */}
      <Modal
        visible={showChatMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChatMenu(false)}
      >
        <TouchableOpacity
          style={styles.chatMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowChatMenu(false)}
        >
          <View style={[
            styles.chatMenuModal,
            {
              backgroundColor: Platform.OS === 'web'
                ? 'rgba(15, 15, 25, 0.85)'
                : theme.glass,
              borderColor: theme.glassBorder,
              borderWidth: 1,
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              shadowColor: theme.shadowColor,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.4,
              shadowRadius: 24,
              elevation: 20,
            }
          ]}>
            {/* Handle bar */}
            <View style={[styles.chatMenuHandle, { backgroundColor: theme.glassHighlight }]} />

            {selectedChat && (
              <>
                {/* Chat header */}
                <View style={styles.chatMenuHeader}>
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={[styles.chatMenuIcon, styles.iconGlow]}
                  >
                    {(() => {
                      const IconComp = iconMap[selectedChat.icon] || Bot;
                      return <IconComp size={20} color="#FFFFFF" />;
                    })()}
                  </LinearGradient>
                  <Text style={[styles.chatMenuTitle, { color: theme.text }]} numberOfLines={1}>
                    {selectedChat.name}
                  </Text>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: theme.glassBorder, marginVertical: 12 }} />

                {/* Action items */}
                <TouchableOpacity
                  style={[styles.chatMenuActionRow, { backgroundColor: `${theme.primary}10` }]}
                  onPress={handlePinChat}
                >
                  <View style={[styles.chatMenuActionIconSmall, { backgroundColor: `${theme.primary}25` }]}>
                    <Pin size={16} color={theme.primary} />
                  </View>
                  <Text style={[styles.chatMenuActionText, { color: theme.text }]}>
                    {selectedChat.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chatMenuActionRow, { backgroundColor: `${theme.primary}10` }]}
                  onPress={handleMuteChat}
                >
                  <View style={[styles.chatMenuActionIconSmall, { backgroundColor: `${theme.primary}25` }]}>
                    {mutedChats.includes(selectedChat.id) ? (
                      <Bell size={16} color={theme.primary} />
                    ) : (
                      <BellOff size={16} color={theme.primary} />
                    )}
                  </View>
                  <Text style={[styles.chatMenuActionText, { color: theme.text }]}>
                    {mutedChats.includes(selectedChat.id) ? 'Unmute Chat' : 'Mute Chat'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chatMenuActionRow, { backgroundColor: 'rgba(248, 113, 113, 0.08)' }]}
                  onPress={() => handleDeleteChat()}
                >
                  <View style={[styles.chatMenuActionIconSmall, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]}>
                    <Trash2 size={16} color="#F87171" />
                  </View>
                  <Text style={[styles.chatMenuActionText, { color: '#F87171' }]}>
                    Delete Chat
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* New Chat Modal - Glass Style */}
      <Modal
        visible={showNewChatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.newChatOverlay}>
          <ScrollView contentContainerStyle={styles.newChatScrollContent} showsVerticalScrollIndicator={false}>
            {Platform.OS === 'web' ? (
              <View style={[styles.newChatModal, styles.newChatModalGlass, { borderColor: theme.glassBorder }]}>
                <View style={[styles.modalHandle, { backgroundColor: theme.glassHighlight }]} />
                <Text style={[styles.newChatTitle, { color: theme.text }]}>Create New Chat</Text>

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Chat Name</Text>
                <TextInput
                  style={[styles.newChatInput, styles.newChatInputGlass, { borderColor: theme.glassBorder, color: theme.text }]}
                  placeholder="Enter chat name..."
                  placeholderTextColor={theme.placeholder}
                  value={newChatName}
                  onChangeText={setNewChatName}
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select AI Personality</Text>
                <View style={styles.promptTemplatesGrid}>
                  {promptTemplates.map((template) => {
                    const TemplateIcon = iconMap[template.icon] || Bot;
                    const isSelected = selectedPromptId === template.id;
                    return (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.promptTemplateCard,
                          styles.promptTemplateCardGlass,
                          { borderColor: isSelected ? template.color : theme.glassBorder },
                          isSelected && { borderWidth: 2, backgroundColor: `${template.color}15` },
                        ]}
                        onPress={() => setSelectedPromptId(template.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <View style={[styles.promptTemplateCheck, { backgroundColor: template.color }]}>
                            <Text style={styles.promptTemplateCheckText}>✓</Text>
                          </View>
                        )}
                        <TemplateIcon size={28} color={isSelected ? template.color : theme.textSecondary} />
                        <Text style={[styles.promptTemplateName, { color: isSelected ? template.color : theme.text }]}>
                          {template.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedPromptId === 'custom' && (
                  <>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 8 }]}>Custom Instructions</Text>
                    <TextInput
                      style={[styles.newChatInput, styles.newChatInputGlass, styles.newChatPromptInput, { borderColor: theme.glassBorder, color: theme.text }]}
                      placeholder="Enter custom instructions for the AI..."
                      placeholderTextColor={theme.placeholder}
                      value={newChatPrompt}
                      onChangeText={setNewChatPrompt}
                      multiline
                      numberOfLines={4}
                    />
                  </>
                )}

                <View style={styles.newChatButtons}>
                  <TouchableOpacity
                    style={[styles.newChatBtn, styles.newChatBtnGlass, { borderColor: theme.glassBorder }]}
                    onPress={() => setShowNewChatModal(false)}
                  >
                    <Text style={[styles.newChatBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.newChatBtnWrapper}
                    onPress={handleCreateChat}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.gradient1, theme.gradient2]}
                      style={styles.newChatBtnGradient}
                    >
                      <Text style={[styles.newChatBtnText, { color: '#FFFFFF' }]}>Create</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <BlurView
                intensity={60}
                tint={theme.background === '#0A0A0F' ? 'dark' : 'light'}
                style={[styles.newChatModal, styles.newChatModalBlur]}
              >
                <View style={[styles.newChatModalInner, { borderColor: theme.glassBorder }]}>
                  <View style={[styles.modalHandle, { backgroundColor: theme.glassHighlight }]} />
                  <Text style={[styles.newChatTitle, { color: theme.text }]}>Create New Chat</Text>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Chat Name</Text>
                  <TextInput
                    style={[styles.newChatInput, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.glassBorder, color: theme.text }]}
                    placeholder="Enter chat name..."
                    placeholderTextColor={theme.placeholder}
                    value={newChatName}
                    onChangeText={setNewChatName}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select AI Personality</Text>
                  <View style={styles.promptTemplatesGrid}>
                    {promptTemplates.map((template) => {
                      const TemplateIcon = iconMap[template.icon] || Bot;
                      const isSelected = selectedPromptId === template.id;
                      return (
                        <TouchableOpacity
                          key={template.id}
                          style={[
                            styles.promptTemplateCard,
                            { backgroundColor: isSelected ? `${template.color}15` : 'rgba(255,255,255,0.08)', borderColor: isSelected ? template.color : theme.glassBorder },
                            isSelected && { borderWidth: 2 },
                          ]}
                          onPress={() => setSelectedPromptId(template.id)}
                          activeOpacity={0.7}
                        >
                          {isSelected && (
                            <View style={[styles.promptTemplateCheck, { backgroundColor: template.color }]}>
                              <Text style={styles.promptTemplateCheckText}>✓</Text>
                            </View>
                          )}
                          <TemplateIcon size={28} color={isSelected ? template.color : theme.textSecondary} />
                          <Text style={[styles.promptTemplateName, { color: isSelected ? template.color : theme.text }]}>
                            {template.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedPromptId === 'custom' && (
                    <>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 8 }]}>Custom Instructions</Text>
                      <TextInput
                        style={[styles.newChatInput, styles.newChatPromptInput, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.glassBorder, color: theme.text }]}
                        placeholder="Enter custom instructions for the AI..."
                        placeholderTextColor={theme.placeholder}
                        value={newChatPrompt}
                        onChangeText={setNewChatPrompt}
                        multiline
                        numberOfLines={4}
                      />
                    </>
                  )}

                  <View style={styles.newChatButtons}>
                    <TouchableOpacity
                      style={[styles.newChatBtn, styles.newChatBtnGlass, { borderColor: theme.glassBorder }]}
                      onPress={() => setShowNewChatModal(false)}
                    >
                      <Text style={[styles.newChatBtnText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.newChatBtnWrapper}
                      onPress={handleCreateChat}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[theme.gradient1, theme.gradient2]}
                        style={styles.newChatBtnGradient}
                      >
                        <Text style={[styles.newChatBtnText, { color: '#FFFFFF' }]}>Create</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            )}
          </ScrollView>
        </View>
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
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  // Ambient background for glass effect
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute',
    top: scale(-100),
    left: scale(-100),
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    opacity: 0.6,
  },
  ambientGradient2: {
    position: 'absolute',
    top: scale(200),
    right: scale(-100),
    width: scale(250),
    height: scale(250),
    borderRadius: scale(125),
    opacity: 0.4,
  },
  scrollContent: {
    paddingBottom: scale(120),
    paddingHorizontal: scale(4),
  },
  // Glass card styles
  glassCard: {
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  glassCardWeb: {
    backgroundColor: 'rgba(30, 30, 45, 0.5)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
  },
  glassInner: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    paddingTop: scale(16),
    paddingBottom: scale(24),
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  userName: {
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  searchBtn: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  heroSection: {
    paddingHorizontal: scale(24),
    marginBottom: scale(32),
  },
  heroCard: {
    borderRadius: scale(24),
    padding: scale(24),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroGlow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.5,
    shadowRadius: scale(20),
    elevation: 15,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
    flex: 1,
  },
  heroIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: scale(4),
  },
  heroSubtitle: {
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.8)',
  },
  heroButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: scale(24),
    marginBottom: scale(28),
  },
  filterScroll: {
    gap: scale(12),
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    gap: scale(8),
  },
  filterTabGlass: {
    borderWidth: 1,
  },
  filterTabActive: {
    borderWidth: 0,
  },
  filterGlow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(10),
    elevation: 8,
  },
  filterText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  filterTextActive: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterCount: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  filterCountText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  filterCountTextActive: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickSection: {
    paddingHorizontal: scale(24),
    marginBottom: scale(32),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    marginBottom: scale(16),
  },
  sectionTitleNoBtm: {
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: scale(10),
  },
  quickCardWrapper: {
    width: '31.5%',
  },
  quickCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: scale(14),
    gap: scale(10),
    borderRadius: scale(16),
  },
  iconGlow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(8),
    elevation: 6,
  },
  quickIconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  recentSection: {
    paddingHorizontal: scale(24),
    marginBottom: scale(32),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  seeAll: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(16),
  },
  chatCard: {
    borderRadius: scale(18),
    marginBottom: scale(12),
  },
  chatCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    gap: scale(14),
  },
  chatIconWrapper: {
    position: 'relative',
  },
  chatIcon: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(4),
  },
  chatName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    flex: 1,
  },
  chatMessage: {
    fontSize: moderateScale(13),
  },
  chatMeta: {
    alignItems: 'flex-end',
    gap: scale(6),
  },
  chatActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  deleteBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTime: {
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(6),
  },
  badgeGlow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.5,
    shadowRadius: scale(6),
    elevation: 4,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  capabilitiesSection: {
    paddingHorizontal: scale(24),
    marginBottom: scale(32),
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  capabilityCard: {
    width: screenWidth >= 768 ? '30%' : '47%',
    borderRadius: scale(18),
    gap: scale(10),
  },
  capabilityIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  capabilityTitle: {
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  capabilityDesc: {
    fontSize: moderateScale(12),
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(24),
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    gap: scale(12),
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    height: scale(50),
    borderRadius: scale(25),
    gap: scale(12),
    borderWidth: 1,
  },
  glassInput: {
    backdropFilter: 'blur(20px)',
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(16),
    padding: 0,
  },
  cancelBtn: {
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    borderRadius: 16,
    marginBottom: 10,
  },
  searchResultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  searchResultIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchResultMsg: {
    fontSize: 13,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyFilter: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyFilterText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chatMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatMenuModal: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 20,
    paddingBottom: 24,
    marginHorizontal: 20,
    maxWidth: 340,
    width: '100%',
    alignSelf: 'center',
  },
  chatMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  chatMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  chatMenuActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  chatMenuActionIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMenuActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // New Chat Modal styles - Glass Style
  newChatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  newChatModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  newChatModalGlass: {
    backgroundColor: 'rgba(25, 25, 35, 0.95)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  newChatModalBlur: {
    borderRadius: 20,
  },
  newChatModalInner: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderWidth: 1,
    borderRadius: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  newChatTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
  },
  newChatInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  newChatInputGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  newChatPromptInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  promptTemplatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  promptTemplateCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  promptTemplateCardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  promptTemplateName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  promptTemplateCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTemplateCheckText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  newChatButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  newChatBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtnWrapper: {
    flex: 1,
  },
  newChatBtnGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  newChatBtnGradient: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ConversationListScreen;
