import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator, Animated, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft, Search, MessageCircle, X, UserPlus, Sparkles, Circle,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Responsive scaling
const BASE_WIDTH = 393;
const { width: screenWidth } = Dimensions.get('window');

const scale = (size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const newSize = size * ratio;
  return Math.round(Math.min(Math.max(newSize, size * 0.7), size * 1.5));
};

const moderateScale = (size, factor = 0.5) => {
  const ratio = screenWidth / BASE_WIDTH;
  const newSize = size + (size * ratio - size) * factor;
  return Math.round(Math.min(Math.max(newSize, size * 0.85), size * 1.3));
};

const UserSearchScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(null);

  // NEW: Online presence
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const presenceRef = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef({});

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(listAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Online presence tracking
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('user-search-presence', {
      config: { presence: { key: user.id } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUserIds(new Set(Object.keys(state)));
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: user.id, online_at: new Date().toISOString() });
      }
    });
    presenceRef.current = channel;
    return () => {
      if (presenceRef.current) {
        presenceRef.current.untrack();
        supabase.removeChannel(presenceRef.current);
        presenceRef.current = null;
      }
    };
  }, [user]);

  const getItemAnim = (id) => {
    if (!itemAnims.current[id]) {
      itemAnims.current[id] = new Animated.Value(0);
      Animated.spring(itemAnims.current[id], {
        toValue: 1, friction: 8, tension: 50, useNativeDriver: true,
      }).start();
    }
    return itemAnims.current[id];
  };

  // Search
  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', user.id)
            .limit(30);
          if (error) throw error;
          setResults(data || []);
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .ilike('full_name', `%${searchQuery}%`)
          .limit(20);
        if (error) throw error;
        itemAnims.current = {};
        setResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user.id]);

  const startDM = async (otherUser) => {
    setStarting(otherUser.id);

    try {
      const { data: myRooms } = await supabase
        .from('room_members')
        .select('room_id, rooms!inner(id, is_direct)')
        .eq('user_id', user.id)
        .eq('rooms.is_direct', true);

      if (myRooms) {
        for (const room of myRooms) {
          const { data: otherMember } = await supabase
            .from('room_members')
            .select('user_id')
            .eq('room_id', room.room_id)
            .eq('user_id', otherUser.id)
            .single();

          if (otherMember) {
            navigation.navigate('RoomChat', {
              roomId: room.room_id,
              roomName: otherUser.full_name,
            });
            return;
          }
        }
      }

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ name: null, is_direct: true, created_by: user.id })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: memberError } = await supabase
        .from('room_members')
        .insert([
          { room_id: room.id, user_id: user.id },
          { room_id: room.id, user_id: otherUser.id },
        ]);

      if (memberError) throw memberError;

      navigation.navigate('RoomChat', {
        roomId: room.id,
        roomName: otherUser.full_name,
      });
    } catch (error) {
      console.error('Start DM error:', error);
    } finally {
      setStarting(null);
    }
  };

  // Glass button
  const GlassButton = ({ children, style, onPress }) => {
    if (Platform.OS === 'web') {
      return (
        <TouchableOpacity
          style={[styles.glassBtn, styles.glassBtnWeb, { borderColor: theme.glassBorder }, style]}
          onPress={onPress}
        >
          {children}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={onPress} style={style}>
        <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={styles.glassBtn}>
          <View style={[styles.glassBtnInner, { borderColor: theme.glassBorder }]}>
            {children}
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }) => {
    const animValue = getItemAnim(item.id);

    return (
      <Animated.View style={{
        opacity: animValue,
        transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }],
      }}>
        {Platform.OS === 'web' ? (
          <View style={[styles.userCard, styles.userCardWeb, { borderColor: theme.glassBorder }]}>
            <UserCardContent item={item} />
          </View>
        ) : (
          <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={[styles.userCard, { overflow: 'hidden' }]}>
            <View style={[styles.userCardInner, { borderColor: theme.glassBorder }]}>
              <UserCardContent item={item} />
            </View>
          </BlurView>
        )}
      </Animated.View>
    );
  };

  const UserCardContent = ({ item }) => {
    const isOnline = onlineUserIds.has(item.id);
    return (
    <View style={styles.userCardRow}>
      <View>
        <Image
          source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || 'U')}&background=6B4EFF&color=fff&size=64` }}
          style={styles.userAvatar}
        />
        {isOnline && (
          <View style={[styles.onlineDot, { borderColor: theme.background }]} />
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
          {item.full_name || 'Unknown User'}
        </Text>
        <View style={styles.userStatusRow}>
          {isOnline ? (
            <View style={styles.onlineStatusBadge}>
              <Circle size={scale(6)} color="#22C55E" fill="#22C55E" />
              <Text style={[styles.userSub, { color: '#22C55E' }]}>Online now</Text>
            </View>
          ) : (
            <Text style={[styles.userSub, { color: theme.textMuted }]}>Tap to start chatting</Text>
          )}
        </View>
      </View>
      {starting === item.id ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <TouchableOpacity
          onPress={() => startDM(item)}
          disabled={starting === item.id}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.gradient1, theme.gradient2]}
            style={[styles.dmBtn, styles.glowIcon]}
          >
            <MessageCircle size={scale(16)} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient background */}
      <View style={styles.ambientBackground}>
        <LinearGradient
          colors={[theme.gradientGlass1 || 'rgba(196, 181, 253, 0.3)', 'transparent']}
          style={styles.ambientGradient1}
          start={{ x: 0.5, y: 0 }} end={{ x: 0, y: 1 }}
        />
        <LinearGradient
          colors={[theme.gradientGlass2 || 'rgba(139, 92, 246, 0.3)', 'transparent']}
          style={styles.ambientGradient2}
          start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <GlassButton onPress={() => navigation.goBack()}>
            <ArrowLeft size={scale(20)} color={theme.text} />
          </GlassButton>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Find Users</Text>
          <View style={{ width: scale(40) }} />
        </Animated.View>

        {/* Search */}
        <Animated.View style={[styles.searchSection, { opacity: fadeAnim }]}>
          <View style={[styles.searchInput, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Search size={scale(18)} color={theme.textMuted} />
            <TextInput
              style={[styles.searchTextInput, { color: theme.text }]}
              placeholder="Search users by name..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={scale(16)} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Results */}
        <Animated.View style={[styles.flex, { opacity: listAnim }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderUser}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={[styles.emptyIcon, styles.glowIcon]}
                  >
                    <UserPlus size={scale(28)} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {searchQuery.trim() ? 'No users found' : 'Find people to chat with'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                    {searchQuery.trim()
                      ? 'Try a different name'
                      : 'Search for users to start a conversation'
                    }
                  </Text>
                </View>
              }
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  // Ambient
  ambientBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute', top: scale(-80), left: scale(-60),
    width: scale(250), height: scale(250), borderRadius: scale(125), opacity: 0.5,
  },
  ambientGradient2: {
    position: 'absolute', bottom: scale(150), right: scale(-80),
    width: scale(220), height: scale(220), borderRadius: scale(110), opacity: 0.4,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(14),
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700' },

  // Glass button
  glassBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  glassBtnWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderWidth: 1,
  },
  glassBtnInner: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: scale(20),
  },
  glowIcon: {
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4, shadowRadius: scale(10), elevation: 8,
  },

  // Search
  searchSection: { paddingHorizontal: scale(20), paddingTop: scale(8), paddingBottom: scale(8) },
  searchInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: scale(16),
    paddingHorizontal: scale(14), height: scale(48), gap: scale(10),
  },
  searchTextInput: { flex: 1, fontSize: moderateScale(15) },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Results
  resultsList: { paddingHorizontal: scale(20), paddingTop: scale(8), paddingBottom: scale(40) },

  // User card
  userCard: { borderRadius: scale(18), marginBottom: scale(10), overflow: 'hidden' },
  userCardWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.3)',
    backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
    borderWidth: 1, padding: scale(14),
  },
  userCardInner: {
    padding: scale(14), borderRadius: scale(18),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  userCardRow: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: scale(48), height: scale(48), borderRadius: scale(16), marginRight: scale(14) },
  onlineDot: {
    position: 'absolute', bottom: -1, right: scale(12),
    width: scale(12), height: scale(12), borderRadius: scale(6),
    backgroundColor: '#22C55E', borderWidth: 2,
  },
  userStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: scale(2) },
  onlineStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  userInfo: { flex: 1 },
  userName: { fontSize: moderateScale(16), fontWeight: '600' },
  userSub: { fontSize: moderateScale(12), marginTop: scale(2) },
  dmBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(14),
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: {
    width: scale(72), height: scale(72), borderRadius: scale(22),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(16),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', marginBottom: scale(6) },
  emptySubtext: { fontSize: moderateScale(13), textAlign: 'center' },
});

export default UserSearchScreen;
