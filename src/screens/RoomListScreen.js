import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Image, Animated, Dimensions,
  TextInput, RefreshControl, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Users, Plus, MessageCircle, User, Search, X, Sparkles,
  UserPlus, Clock, Pin, Hash, LogOut, BellOff, Bell,
  Trash2, MoreHorizontal, Circle,
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

const RoomListScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // NEW: Online presence tracking
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const presenceChannelRef = useRef(null);

  // NEW: Long-press action sheet
  const [actionRoom, setActionRoom] = useState(null);
  const actionSheetAnim = useRef(new Animated.Value(0)).current;

  // NEW: Muted rooms (local state)
  const [mutedRooms, setMutedRooms] = useState(new Set());

  // NEW: Pinned rooms (local state)
  const [pinnedRooms, setPinnedRooms] = useState(new Set());

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef({});

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: showSearch ? 1 : 0, duration: 300, useNativeDriver: false,
    }).start();
  }, [showSearch]);

  // Action sheet animation
  useEffect(() => {
    Animated.spring(actionSheetAnim, {
      toValue: actionRoom ? 1 : 0,
      friction: 8, tension: 65,
      useNativeDriver: true,
    }).start();
  }, [actionRoom]);

  const getItemAnim = (id) => {
    if (!itemAnims.current[id]) {
      itemAnims.current[id] = new Animated.Value(0);
      Animated.spring(itemAnims.current[id], {
        toValue: 1, friction: 8, tension: 50, useNativeDriver: true,
      }).start();
    }
    return itemAnims.current[id];
  };

  // ===== ONLINE PRESENCE =====
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global-presence', {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const ids = new Set(Object.keys(state));
      setOnlineUserIds(ids);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: user.id, online_at: new Date().toISOString() });
      }
    });

    presenceChannelRef.current = channel;
    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [user]);

  const fetchRooms = useCallback(async () => {
    if (!user) return;

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const roomIds = memberData.map(m => m.room_id);
      if (roomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .in('id', roomIds)
        .order('created_at', { ascending: false });

      if (roomError) throw roomError;

      const roomsWithDetails = await Promise.all(
        roomData.map(async (room) => {
          const { data: members } = await supabase
            .from('room_members')
            .select('user_id, profiles(id, full_name, avatar_url)')
            .eq('room_id', room.id);

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, profiles(full_name)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_id', user.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          // Calculate streak
          let streak = 0;
          try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: streakData } = await supabase
              .from('messages')
              .select('sender_id, created_at')
              .eq('room_id', room.id)
              .gte('created_at', thirtyDaysAgo.toISOString())
              .order('created_at', { ascending: false });

            if (streakData && streakData.length > 0) {
              const dailySenders = {};
              streakData.forEach(msg => {
                const day = new Date(msg.created_at).toISOString().split('T')[0];
                if (!dailySenders[day]) dailySenders[day] = new Set();
                dailySenders[day].add(msg.sender_id);
              });
              const today = new Date();
              for (let i = 0; i < 30; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const dayKey = checkDate.toISOString().split('T')[0];
                const senders = dailySenders[dayKey];
                if (senders && senders.size >= 2) {
                  streak++;
                } else if (i === 0) {
                  continue;
                } else {
                  break;
                }
              }
            }
          } catch (e) { /* streak is optional */ }

          let displayName = room.name;
          let dmUser = null;
          if (room.is_direct && members) {
            const otherMember = members.find(m => m.user_id !== user.id);
            displayName = otherMember?.profiles?.full_name || room.name || 'Direct Message';
            dmUser = otherMember;
          }

          return {
            ...room,
            displayName,
            members: members || [],
            lastMessage: lastMsg?.[0] || null,
            unreadCount: unreadCount || 0,
            dmUser,
            streak,
          };
        })
      );

      // Sort: pinned first, then by recent messages
      roomsWithDetails.sort((a, b) => {
        const aPinned = pinnedRooms.has(a.id) ? 1 : 0;
        const bPinned = pinnedRooms.has(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        const aTime = a.lastMessage?.created_at || a.created_at;
        const bTime = b.lastMessage?.created_at || b.created_at;
        return new Date(bTime) - new Date(aTime);
      });

      setRooms(roomsWithDetails);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, pinnedRooms]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchRooms(); });
    return unsubscribe;
  }, [navigation, fetchRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    itemAnims.current = {};
    fetchRooms();
  }, [fetchRooms]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  // Filter rooms by search
  const filteredRooms = searchQuery.trim()
    ? rooms.filter(r => r.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : rooms;

  // ===== ROOM ACTIONS =====
  const openRoomActions = useCallback((room) => {
    setActionRoom(room);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const togglePinRoom = useCallback(() => {
    if (!actionRoom) return;
    const newSet = new Set(pinnedRooms);
    if (newSet.has(actionRoom.id)) newSet.delete(actionRoom.id);
    else newSet.add(actionRoom.id);
    setPinnedRooms(newSet);
    setActionRoom(null);
  }, [actionRoom, pinnedRooms]);

  const toggleMuteRoom = useCallback(() => {
    if (!actionRoom) return;
    const newSet = new Set(mutedRooms);
    if (newSet.has(actionRoom.id)) newSet.delete(actionRoom.id);
    else newSet.add(actionRoom.id);
    setMutedRooms(newSet);
    setActionRoom(null);
  }, [actionRoom, mutedRooms]);

  const leaveRoom = useCallback(async () => {
    if (!actionRoom) return;

    const doLeave = async () => {
      try {
        await supabase
          .from('room_members')
          .delete()
          .eq('room_id', actionRoom.id)
          .eq('user_id', user.id);

        setRooms(prev => prev.filter(r => r.id !== actionRoom.id));
      } catch (err) {
        console.error('Leave room error:', err);
      }
      setActionRoom(null);
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to leave this room?')) {
        await doLeave();
      } else {
        setActionRoom(null);
      }
    } else {
      Alert.alert(
        'Leave Room',
        `Are you sure you want to leave "${actionRoom.displayName}"?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setActionRoom(null) },
          { text: 'Leave', style: 'destructive', onPress: doLeave },
        ]
      );
    }
  }, [actionRoom, user.id]);

  // Glass container
  const GlassCard = ({ children, style }) => {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.glassCard, styles.glassCardWeb, { borderColor: theme.glassBorder }, style]}>
          {children}
        </View>
      );
    }
    return (
      <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={[styles.glassCard, style]}>
        <View style={[styles.glassInner, { borderColor: theme.glassBorder }]}>
          {children}
        </View>
      </BlurView>
    );
  };

  const renderRoom = ({ item, index }) => {
    const memberCount = item.members?.length || 0;
    const avatars = item.members
      ?.filter(m => m.user_id !== user.id)
      ?.slice(0, 3)
      ?.map(m => m.profiles) || [];
    const animValue = getItemAnim(item.id);
    const isPinned = pinnedRooms.has(item.id);
    const isMuted = mutedRooms.has(item.id);

    // Check if DM user is online
    const isDmOnline = item.is_direct && item.dmUser && onlineUserIds.has(item.dmUser.user_id);

    return (
      <Animated.View style={{
        opacity: animValue,
        transform: [
          { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
      }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('RoomChat', { roomId: item.id, roomName: item.displayName })}
          onLongPress={() => openRoomActions(item)}
          delayLongPress={500}
        >
          <GlassCard>
            <View style={styles.roomContent}>
              {/* Avatar with online indicator */}
              <View style={styles.roomAvatar}>
                {item.is_direct && avatars[0] ? (
                  <View>
                    <Image
                      source={{ uri: avatars[0]?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatars[0]?.full_name || 'U')}&background=6B4EFF&color=fff&size=64` }}
                      style={styles.avatarImage}
                    />
                    {isDmOnline && (
                      <View style={[styles.onlineDot, { borderColor: theme.background }]} />
                    )}
                  </View>
                ) : (
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    style={[styles.groupAvatarGradient, styles.glowIcon]}
                  >
                    <Users size={scale(20)} color="#FFFFFF" />
                  </LinearGradient>
                )}
              </View>

              {/* Info */}
              <View style={styles.roomInfo}>
                <View style={styles.roomHeader}>
                  <View style={styles.roomNameRow}>
                    {isPinned && <Pin size={scale(12)} color={theme.primary} />}
                    <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                      {item.displayName || 'Unnamed Room'}
                    </Text>
                    {item.streak > 0 && (
                      <View style={styles.roomStreakBadge}>
                        <Text style={styles.roomStreakEmoji}>🔥</Text>
                        <Text style={styles.roomStreakNum}>{item.streak}</Text>
                      </View>
                    )}
                    {isMuted && <BellOff size={scale(12)} color={theme.textMuted} />}
                  </View>
                  <View style={styles.roomMeta}>
                    {item.lastMessage && (
                      <Text style={[styles.timeText, { color: theme.textMuted }]}>
                        {formatTime(item.lastMessage.created_at)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.roomSubrow}>
                  <Text style={[styles.lastMessage, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.lastMessage
                      ? `${item.lastMessage.profiles?.full_name || 'Someone'}: ${item.lastMessage.content}`
                      : 'No messages yet'}
                  </Text>
                  <View style={styles.roomBadges}>
                    {/* Online indicator for DMs */}
                    {isDmOnline && (
                      <View style={[styles.onlineBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Circle size={scale(6)} color="#22C55E" fill="#22C55E" />
                        <Text style={[styles.onlineBadgeText, { color: '#22C55E' }]}>Online</Text>
                      </View>
                    )}
                    {!item.is_direct && (
                      <View style={[styles.memberBadge, { backgroundColor: theme.primarySoft }]}>
                        <User size={scale(9)} color={theme.primary} />
                        <Text style={[styles.memberCount, { color: theme.primary }]}>{memberCount}</Text>
                      </View>
                    )}
                    {item.unreadCount > 0 && !isMuted && (
                      <LinearGradient
                        colors={[theme.gradient1, theme.gradient2]}
                        style={[styles.unreadBadge, styles.badgeGlow]}
                      >
                        <Text style={styles.unreadText}>
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient background */}
      <View style={styles.ambientBackground}>
        <LinearGradient
          colors={[theme.gradientGlass1 || 'rgba(196, 181, 253, 0.3)', 'transparent']}
          style={styles.ambientGradient1}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[theme.gradientGlass2 || 'rgba(139, 92, 246, 0.3)', 'transparent']}
          style={styles.ambientGradient2}
          start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.greeting, { color: theme.textMuted }]}>Real-time</Text>
              {onlineUserIds.size > 0 && (
                <View style={styles.globalOnline}>
                  <Circle size={scale(6)} color="#22C55E" fill="#22C55E" />
                  <Text style={[styles.globalOnlineText, { color: '#22C55E' }]}>
                    {onlineUserIds.size} online
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Rooms</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={[styles.headerBtn, Platform.OS === 'web'
                ? [styles.headerBtnWeb, { borderColor: theme.glassBorder }]
                : {}
              ]}
            >
              {showSearch ? (
                <X size={scale(18)} color={theme.text} />
              ) : (
                <Search size={scale(18)} color={theme.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('UserSearch')}
              style={[styles.headerBtn, Platform.OS === 'web'
                ? [styles.headerBtnWeb, { borderColor: theme.glassBorder }]
                : {}
              ]}
            >
              <UserPlus size={scale(18)} color={theme.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Search bar */}
        <Animated.View style={[
          styles.searchBar,
          {
            height: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, scale(56)] }),
            opacity: searchAnim,
            overflow: 'hidden',
          },
        ]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Search size={scale(16)} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search rooms..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={showSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={scale(16)} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={[styles.loadingIcon, styles.glowIcon]}>
              <Sparkles size={scale(28)} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading rooms...</Text>
          </View>
        ) : filteredRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[theme.gradient1, theme.gradient2]}
              style={[styles.emptyIcon, styles.glowIcon]}
            >
              <MessageCircle size={scale(32)} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery.trim() ? 'No rooms found' : 'No rooms yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              {searchQuery.trim()
                ? 'Try a different search'
                : 'Create a room or find users to start chatting'
              }
            </Text>
            {!searchQuery.trim() && (
              <View style={styles.emptyActions}>
                <TouchableOpacity onPress={() => navigation.navigate('CreateRoom')} activeOpacity={0.8}>
                  <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={[styles.emptyBtn, styles.glowIcon]}>
                    <Plus size={scale(16)} color="#FFFFFF" />
                    <Text style={styles.emptyBtnText}>Create Room</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('UserSearch')} activeOpacity={0.8}>
                  <View style={[styles.emptyBtnOutline, { borderColor: theme.glassBorder }]}>
                    <UserPlus size={scale(16)} color={theme.primary} />
                    <Text style={[styles.emptyBtnOutlineText, { color: theme.primary }]}>Find Users</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            renderItem={renderRoom}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
          />
        )}
      </SafeAreaView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, styles.glowIcon]}
        onPress={() => navigation.navigate('CreateRoom')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          style={styles.fabGradient}
        >
          <Plus size={scale(22)} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ===== ROOM ACTION SHEET ===== */}
      <Modal
        visible={!!actionRoom}
        transparent
        animationType="none"
        onRequestClose={() => setActionRoom(null)}
      >
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setActionRoom(null)}
        >
          <Animated.View style={[
            styles.actionSheet,
            {
              transform: [{
                translateY: actionSheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
              opacity: actionSheetAnim,
            },
          ]}>
            {Platform.OS === 'web' ? (
              <View style={[styles.actionSheetInner, styles.actionSheetWeb, { borderColor: theme.glassBorder }]}>
                <RoomActionSheetContent />
              </View>
            ) : (
              <BlurView intensity={80} tint="dark" style={[styles.actionSheetInner, { overflow: 'hidden' }]}>
                <View style={[styles.actionSheetBorder, { borderColor: theme.glassBorder }]}>
                  <RoomActionSheetContent />
                </View>
              </BlurView>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  function RoomActionSheetContent() {
    if (!actionRoom) return null;
    const isPinned = pinnedRooms.has(actionRoom.id);
    const isMuted = mutedRooms.has(actionRoom.id);

    return (
      <View style={styles.actionSheetItems}>
        <View style={styles.actionSheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme.textMuted }]} />
        </View>

        {/* Room name preview */}
        <View style={[styles.actionPreview, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
          <Text style={[styles.actionPreviewTitle, { color: theme.text }]} numberOfLines={1}>
            {actionRoom.displayName}
          </Text>
          <Text style={[styles.actionPreviewSub, { color: theme.textMuted }]}>
            {actionRoom.is_direct ? 'Direct Message' : `${actionRoom.members?.length || 0} members`}
          </Text>
        </View>

        <TouchableOpacity style={styles.actionItem} onPress={togglePinRoom}>
          <Pin size={scale(20)} color={theme.text} />
          <Text style={[styles.actionItemText, { color: theme.text }]}>
            {isPinned ? 'Unpin Room' : 'Pin to Top'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={toggleMuteRoom}>
          {isMuted ? (
            <Bell size={scale(20)} color={theme.text} />
          ) : (
            <BellOff size={scale(20)} color={theme.text} />
          )}
          <Text style={[styles.actionItemText, { color: theme.text }]}>
            {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, styles.actionItemDanger]}
          onPress={leaveRoom}
        >
          <LogOut size={scale(20)} color="#EF4444" />
          <Text style={[styles.actionItemText, { color: '#EF4444' }]}>Leave Room</Text>
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // Ambient
  ambientBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute', top: scale(-100), left: scale(-100),
    width: scale(300), height: scale(300), borderRadius: scale(150), opacity: 0.6,
  },
  ambientGradient2: {
    position: 'absolute', top: scale(200), right: scale(-100),
    width: scale(250), height: scale(250), borderRadius: scale(125), opacity: 0.4,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: scale(24), paddingTop: scale(20), paddingBottom: scale(16),
  },
  headerLeft: {},
  headerTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
  },
  greeting: { fontSize: moderateScale(13), fontWeight: '500', marginBottom: scale(2) },
  globalOnline: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: scale(8), paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  globalOnlineText: { fontSize: moderateScale(10), fontWeight: '600' },
  headerTitle: { fontSize: moderateScale(28), fontWeight: '700', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: scale(8) },
  headerBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderWidth: 1,
  },

  // Search
  searchBar: { paddingHorizontal: scale(20), marginBottom: scale(4) },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: scale(16),
    paddingHorizontal: scale(14), height: scale(46), gap: scale(10),
  },
  searchInput: { flex: 1, fontSize: moderateScale(14) },

  // Glow
  glowIcon: {
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4, shadowRadius: scale(10), elevation: 8,
  },
  badgeGlow: {
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.5, shadowRadius: scale(6), elevation: 4,
  },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingIcon: {
    width: scale(64), height: scale(64), borderRadius: scale(20),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(16),
  },
  loadingText: { fontSize: moderateScale(14) },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(40) },
  emptyIcon: {
    width: scale(80), height: scale(80), borderRadius: scale(24),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(22), fontWeight: '700', marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), textAlign: 'center', marginBottom: scale(24) },
  emptyActions: { flexDirection: 'row', gap: scale(12) },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(20), paddingVertical: scale(12),
    borderRadius: scale(16), gap: scale(8),
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: moderateScale(14), fontWeight: '600' },
  emptyBtnOutline: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(20), paddingVertical: scale(12),
    borderRadius: scale(16), gap: scale(8), borderWidth: 1,
  },
  emptyBtnOutlineText: { fontSize: moderateScale(14), fontWeight: '600' },

  // List
  listContent: { paddingHorizontal: scale(20), paddingBottom: scale(120) },

  // Glass card
  glassCard: { borderRadius: scale(20), marginBottom: scale(10), overflow: 'hidden' },
  glassCardWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1, padding: scale(16),
  },
  glassInner: {
    padding: scale(16), borderRadius: scale(20),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  // Room content
  roomContent: { flexDirection: 'row', alignItems: 'center' },
  roomAvatar: { marginRight: scale(14) },
  avatarImage: { width: scale(50), height: scale(50), borderRadius: scale(16) },
  groupAvatarGradient: {
    width: scale(50), height: scale(50), borderRadius: scale(16),
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: scale(14), height: scale(14), borderRadius: scale(7),
    backgroundColor: '#22C55E', borderWidth: 2.5,
  },
  roomInfo: { flex: 1 },
  roomHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: scale(4),
  },
  roomNameRow: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
    marginRight: scale(8), gap: scale(4),
  },
  roomName: { fontSize: moderateScale(16), fontWeight: '600', flexShrink: 1 },
  roomStreakBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 120, 20, 0.15)',
    borderColor: 'rgba(255, 120, 20, 0.3)',
    borderWidth: 1,
    paddingHorizontal: scale(5),
    paddingVertical: scale(1),
    borderRadius: scale(8),
    gap: scale(2),
  },
  roomStreakEmoji: { fontSize: moderateScale(10) },
  roomStreakNum: { fontSize: moderateScale(10), fontWeight: '800', color: '#FF7814' },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  timeText: { fontSize: moderateScale(12), fontWeight: '500' },
  roomSubrow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  lastMessage: { fontSize: moderateScale(13), flex: 1, marginRight: scale(8) },
  roomBadges: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },

  // Online badge
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(3),
    paddingHorizontal: scale(6), paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  onlineBadgeText: { fontSize: moderateScale(9), fontWeight: '700' },

  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(3),
    paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(8),
  },
  memberCount: { fontSize: moderateScale(10), fontWeight: '700' },
  unreadBadge: {
    minWidth: scale(20), height: scale(20), borderRadius: scale(10),
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(6),
  },
  unreadText: { color: '#FFFFFF', fontSize: moderateScale(10), fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: scale(100), right: scale(24),
  },
  fabGradient: {
    width: scale(56), height: scale(56), borderRadius: scale(18),
    alignItems: 'center', justifyContent: 'center',
  },

  // Action sheet
  actionOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    marginHorizontal: scale(12),
    marginBottom: Platform.OS === 'ios' ? scale(30) : scale(12),
  },
  actionSheetInner: {
    borderRadius: scale(24), overflow: 'hidden',
  },
  actionSheetWeb: {
    backgroundColor: 'rgba(20, 20, 35, 0.95)',
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    borderWidth: 1,
  },
  actionSheetBorder: {
    borderWidth: 1, borderRadius: scale(24), overflow: 'hidden',
  },
  actionSheetItems: {
    paddingBottom: scale(8),
  },
  actionSheetHandle: {
    alignItems: 'center', paddingVertical: scale(10),
  },
  handleBar: {
    width: scale(36), height: scale(4), borderRadius: scale(2), opacity: 0.4,
  },
  actionPreview: {
    paddingHorizontal: scale(20), paddingVertical: scale(12),
    borderBottomWidth: 1,
  },
  actionPreviewTitle: { fontSize: moderateScale(16), fontWeight: '600' },
  actionPreviewSub: { fontSize: moderateScale(12), marginTop: scale(2) },
  actionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(20), paddingVertical: scale(14),
    gap: scale(14),
  },
  actionItemText: { fontSize: moderateScale(16), fontWeight: '500' },
  actionItemDanger: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: scale(4),
  },
});

export default RoomListScreen;
