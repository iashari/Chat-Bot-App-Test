import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  FlatList, Image, ActivityIndicator, Animated, Dimensions,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft, Users, Edit3, LogOut, Crown, Circle,
  Check, X, Sparkles, UserPlus, Shield,
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

const RoomInfoScreen = ({ route, navigation }) => {
  const { roomId, roomName: initialRoomName } = route.params;
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const channelRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Load room data
  const loadRoom = useCallback(async () => {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      setRoom(roomData);
      setNewName(roomData.name || '');

      const { data: memberData, error: memberError } = await supabase
        .from('room_members')
        .select('user_id, joined_at, profiles(id, full_name, avatar_url)')
        .eq('room_id', roomId);

      if (memberError) throw memberError;
      setMembers(memberData || []);
    } catch (error) {
      console.error('Error loading room:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();

    // Presence tracking for online status
    const channel = supabase.channel(`room-info:${roomId}`, {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUsers(Object.keys(state));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: user.id, online_at: new Date().toISOString() });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, user.id, loadRoom]);

  const isAdmin = room?.created_by === user.id;

  // Save room name
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ name: newName.trim() })
        .eq('id', roomId);

      if (error) throw error;
      setRoom(prev => ({ ...prev, name: newName.trim() }));
      setEditing(false);
    } catch (error) {
      console.error('Error updating room name:', error);
    } finally {
      setSaving(false);
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('room_members')
                .delete()
                .eq('room_id', roomId)
                .eq('user_id', user.id);

              if (error) throw error;
              navigation.popToTop();
            } catch (error) {
              console.error('Error leaving room:', error);
            }
          },
        },
      ]
    );
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
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

  // Glass card
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

  const renderMember = ({ item }) => {
    const online = isUserOnline(item.user_id);
    const isCreator = room?.created_by === item.user_id;
    const isCurrentUser = item.user_id === user.id;

    return (
      <View style={styles.memberRow}>
        <View style={styles.memberAvatarWrap}>
          <Image
            source={{ uri: item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.profiles?.full_name || 'U')}&background=6B4EFF&color=fff&size=64` }}
            style={styles.memberAvatar}
          />
          <View style={[
            styles.memberOnlineDot,
            { backgroundColor: online ? '#22C55E' : theme.offline || 'rgba(255,255,255,0.3)', borderColor: theme.background },
          ]} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
              {item.profiles?.full_name || 'Unknown'}
            </Text>
            {isCurrentUser && (
              <Text style={[styles.youBadge, { color: theme.textMuted }]}>(you)</Text>
            )}
          </View>
          <Text style={[styles.memberStatus, { color: online ? '#22C55E' : theme.textMuted }]}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
        {isCreator && (
          <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.adminBadge}>
            <Crown size={scale(10)} color="#FFFFFF" />
            <Text style={styles.adminText}>Admin</Text>
          </LinearGradient>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  const displayName = room?.is_direct
    ? members.find(m => m.user_id !== user.id)?.profiles?.full_name || initialRoomName
    : room?.name || initialRoomName;

  const onlineCount = members.filter(m => isUserOnline(m.user_id)).length;

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
          <GlassButton onPress={() => navigation.goBack()}>
            <ArrowLeft size={scale(20)} color={theme.text} />
          </GlassButton>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Room Info</Text>
          <View style={{ width: scale(40) }} />
        </Animated.View>

        <Animated.ScrollView
          style={{ flex: 1, opacity: contentAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Room avatar & name */}
          <View style={styles.profileSection}>
            <LinearGradient
              colors={[theme.gradient1, theme.gradient2]}
              style={[styles.roomAvatarLarge, styles.glowIcon]}
            >
              <Users size={scale(36)} color="#FFFFFF" />
            </LinearGradient>

            {editing ? (
              <View style={styles.editNameRow}>
                <View style={[styles.editInput, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                  <TextInput
                    style={[styles.editInputText, { color: theme.text }]}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    placeholder="Room name"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
                <TouchableOpacity onPress={handleSaveName} disabled={saving}>
                  <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.editActionBtn}>
                    {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Check size={scale(16)} color="#FFFFFF" />}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditing(false); setNewName(room?.name || ''); }}>
                  <View style={[styles.editActionBtn, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
                    <X size={scale(16)} color={theme.text} />
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={[styles.roomNameLarge, { color: theme.text }]}>
                  {displayName}
                </Text>
                {isAdmin && !room?.is_direct && (
                  <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
                    <Edit3 size={scale(14)} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={[styles.roomMeta, { color: theme.textMuted }]}>
              {room?.is_direct ? 'Direct Message' : 'Group Room'} · Created {formatDate(room?.created_at)}
            </Text>

            <View style={styles.statsRow}>
              <View style={[styles.statChip, { backgroundColor: theme.primarySoft }]}>
                <Users size={scale(12)} color={theme.primary} />
                <Text style={[styles.statText, { color: theme.primary }]}>{members.length} members</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Circle size={scale(8)} color="#22C55E" fill="#22C55E" />
                <Text style={[styles.statText, { color: '#22C55E' }]}>{onlineCount} online</Text>
              </View>
            </View>
          </View>

          {/* Members */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Members</Text>
            <Text style={[styles.sectionCount, { color: theme.textMuted }]}>{members.length}</Text>
          </View>

          <GlassCard style={styles.membersCard}>
            {members.map((member, index) => (
              <View key={member.user_id}>
                {renderMember({ item: member })}
                {index < members.length - 1 && (
                  <View style={[styles.memberDivider, { backgroundColor: theme.glassBorder }]} />
                )}
              </View>
            ))}
          </GlassCard>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity onPress={handleLeaveRoom} activeOpacity={0.7}>
              <GlassCard>
                <View style={styles.actionRow}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <LogOut size={scale(18)} color="#EF4444" />
                  </View>
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>Leave Room</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Ambient
  ambientBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute', top: scale(-100), left: scale(-80),
    width: scale(280), height: scale(280), borderRadius: scale(140), opacity: 0.5,
  },
  ambientGradient2: {
    position: 'absolute', bottom: scale(50), right: scale(-80),
    width: scale(220), height: scale(220), borderRadius: scale(110), opacity: 0.35,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(14),
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700' },

  // Glass
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
  glassCard: { borderRadius: scale(20), overflow: 'hidden' },
  glassCardWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1, padding: scale(4),
  },
  glassInner: {
    padding: scale(4), borderRadius: scale(20),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  glowIcon: {
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.4, shadowRadius: scale(14), elevation: 10,
  },

  scrollContent: { paddingBottom: scale(40) },

  // Profile section
  profileSection: {
    alignItems: 'center', paddingVertical: scale(24), paddingHorizontal: scale(20),
  },
  roomAvatarLarge: {
    width: scale(80), height: scale(80), borderRadius: scale(24),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(16),
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  roomNameLarge: { fontSize: moderateScale(24), fontWeight: '700' },
  editBtn: { padding: scale(6) },
  editNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingHorizontal: scale(20), width: '100%',
  },
  editInput: {
    flex: 1, borderWidth: 1, borderRadius: scale(14),
    paddingHorizontal: scale(14), height: scale(44),
  },
  editInputText: { flex: 1, fontSize: moderateScale(16) },
  editActionBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    alignItems: 'center', justifyContent: 'center',
  },
  roomMeta: { fontSize: moderateScale(13), marginTop: scale(6) },
  statsRow: { flexDirection: 'row', gap: scale(10), marginTop: scale(14) },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  statText: { fontSize: moderateScale(12), fontWeight: '600' },

  // Members section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: scale(24), paddingTop: scale(8), paddingBottom: scale(10),
  },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '700' },
  sectionCount: { fontSize: moderateScale(13), fontWeight: '500' },
  membersCard: { marginHorizontal: scale(20), marginBottom: scale(20) },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: scale(12), paddingHorizontal: scale(12),
  },
  memberAvatarWrap: { marginRight: scale(12) },
  memberAvatar: { width: scale(44), height: scale(44), borderRadius: scale(14) },
  memberOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: scale(12), height: scale(12), borderRadius: scale(6),
    borderWidth: 2,
  },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  memberName: { fontSize: moderateScale(15), fontWeight: '600' },
  youBadge: { fontSize: moderateScale(12) },
  memberStatus: { fontSize: moderateScale(12), marginTop: scale(1) },
  memberDivider: { height: 0.5, marginLeft: scale(56) },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    paddingHorizontal: scale(8), paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  adminText: { color: '#FFFFFF', fontSize: moderateScale(10), fontWeight: '700' },

  // Actions
  actionsSection: { paddingHorizontal: scale(20), paddingTop: scale(4) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: scale(12),
    paddingVertical: scale(10), paddingHorizontal: scale(8),
  },
  actionIcon: {
    width: scale(36), height: scale(36), borderRadius: scale(12),
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { fontSize: moderateScale(15), fontWeight: '600' },
});

export default RoomInfoScreen;
