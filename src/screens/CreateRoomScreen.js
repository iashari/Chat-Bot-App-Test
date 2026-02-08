import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, FlatList, Image, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft, Search, Check, Users, Plus, X, Sparkles, UserPlus,
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

const CreateRoomScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [roomName, setRoomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const sectionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(sectionAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
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
        setSearchResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user.id]);

  const toggleUser = (profile) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === profile.id);
      if (exists) return prev.filter(u => u.id !== profile.id);
      return [...prev, profile];
    });
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      setErrorMsg('Please select at least one member.');
      return;
    }

    setCreating(true);
    setErrorMsg('');

    try {
      const isDirect = selectedUsers.length === 1 && !roomName.trim();

      if (isDirect) {
        const otherUserId = selectedUsers[0].id;
        const { data: myMemberships } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', user.id);

        if (myMemberships && myMemberships.length > 0) {
          const myRoomIds = myMemberships.map(m => m.room_id);
          const { data: directRooms } = await supabase
            .from('rooms')
            .select('id')
            .in('id', myRoomIds)
            .eq('is_direct', true);

          if (directRooms) {
            for (const dr of directRooms) {
              const { data: otherMember } = await supabase
                .from('room_members')
                .select('user_id')
                .eq('room_id', dr.id)
                .eq('user_id', otherUserId)
                .maybeSingle();

              if (otherMember) {
                navigation.replace('RoomChat', {
                  roomId: dr.id,
                  roomName: selectedUsers[0].full_name,
                });
                return;
              }
            }
          }
        }
      }

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: isDirect ? null : (roomName.trim() || `Group (${selectedUsers.length + 1})`),
          is_direct: isDirect,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) throw new Error('Room create failed: ' + roomError.message);

      const members = [
        { room_id: room.id, user_id: user.id },
        ...selectedUsers.map(u => ({ room_id: room.id, user_id: u.id })),
      ];

      const { error: memberError } = await supabase
        .from('room_members')
        .insert(members);

      if (memberError) throw new Error('Add members failed: ' + memberError.message);

      navigation.replace('RoomChat', {
        roomId: room.id,
        roomName: isDirect ? selectedUsers[0].full_name : room.name,
      });
    } catch (error) {
      console.error('Create room error:', error);
      setErrorMsg(error.message || 'Failed to create room.');
    } finally {
      setCreating(false);
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
    const isSelected = selectedUsers.some(u => u.id === item.id);

    return (
      <TouchableOpacity
        onPress={() => toggleUser(item)}
        activeOpacity={0.7}
      >
        {Platform.OS === 'web' ? (
          <View style={[
            styles.userCard, styles.userCardWeb,
            { borderColor: isSelected ? theme.primary : theme.glassBorder },
            isSelected && { backgroundColor: theme.primaryGlass },
          ]}>
            <UserCardContent item={item} isSelected={isSelected} />
          </View>
        ) : (
          <BlurView
            intensity={30}
            tint={isDarkMode ? 'dark' : 'light'}
            style={[styles.userCard, { overflow: 'hidden' }]}
          >
            <View style={[
              styles.userCardInner,
              { borderColor: isSelected ? theme.primary : theme.glassBorder },
              isSelected && { backgroundColor: theme.primaryGlass },
            ]}>
              <UserCardContent item={item} isSelected={isSelected} />
            </View>
          </BlurView>
        )}
      </TouchableOpacity>
    );
  };

  const UserCardContent = ({ item, isSelected }) => (
    <View style={styles.userCardRow}>
      <Image
        source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || 'U')}&background=6B4EFF&color=fff&size=64` }}
        style={styles.userAvatar}
      />
      <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
        {item.full_name || 'Unknown User'}
      </Text>
      {isSelected ? (
        <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={[styles.checkBadge, styles.glowIcon]}>
          <Check size={scale(14)} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.uncheckBadge, { borderColor: theme.glassBorder }]} />
      )}
    </View>
  );

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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create Room</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={creating || selectedUsers.length === 0}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : selectedUsers.length > 0 ? (
              <LinearGradient
                colors={[theme.gradient1, theme.gradient2]}
                style={[styles.createPill, styles.glowIcon]}
              >
                <Text style={styles.createPillText}>Create</Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.createText, { color: theme.textMuted }]}>Create</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: sectionAnim }}>
          {/* Room Name Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>ROOM NAME (optional for DM)</Text>
            <View style={[styles.glassInput, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <Users size={scale(18)} color={theme.textMuted} />
              <TextInput
                style={[styles.inputText, { color: theme.text }]}
                placeholder="Enter room name..."
                placeholderTextColor={theme.placeholder}
                value={roomName}
                onChangeText={setRoomName}
              />
            </View>
          </View>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, paddingHorizontal: scale(20) }]}>
                SELECTED ({selectedUsers.length})
              </Text>
              <FlatList
                horizontal
                data={selectedUsers}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.selectedList}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.selectedChip} onPress={() => toggleUser(item)}>
                    <View style={[styles.chipAvatarWrap, { borderColor: theme.primary }]}>
                      <Image
                        source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || 'U')}&background=6B4EFF&color=fff&size=64` }}
                        style={styles.chipAvatar}
                      />
                      <View style={[styles.chipRemove, { backgroundColor: theme.error }]}>
                        <X size={scale(8)} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={1}>
                      {item.full_name?.split(' ')[0] || 'User'}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Search */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>ADD MEMBERS</Text>
            <View style={[styles.glassInput, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <Search size={scale(18)} color={theme.textMuted} />
              <TextInput
                style={[styles.inputText, { color: theme.text }]}
                placeholder="Search by name..."
                placeholderTextColor={theme.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={scale(16)} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Error */}
          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.error }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Results */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderUser}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searchQuery.trim() ? (
                  <View style={styles.emptyContainer}>
                    <UserPlus size={scale(24)} color={theme.textMuted} />
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      No users found
                    </Text>
                  </View>
                ) : null
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

  // Ambient
  ambientBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute', top: scale(-100), right: scale(-80),
    width: scale(250), height: scale(250), borderRadius: scale(125), opacity: 0.5,
  },
  ambientGradient2: {
    position: 'absolute', bottom: scale(100), left: scale(-80),
    width: scale(200), height: scale(200), borderRadius: scale(100), opacity: 0.35,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(14),
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700' },
  createPill: {
    paddingHorizontal: scale(18), paddingVertical: scale(8),
    borderRadius: scale(14),
  },
  createPillText: { color: '#FFFFFF', fontSize: moderateScale(14), fontWeight: '700' },
  createText: { fontSize: moderateScale(16), fontWeight: '600' },

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

  // Sections
  section: { paddingHorizontal: scale(20), paddingTop: scale(16) },
  sectionLabel: {
    fontSize: moderateScale(11), fontWeight: '600',
    letterSpacing: 1, marginBottom: scale(10),
  },
  glassInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: scale(16),
    paddingHorizontal: scale(14), height: scale(48), gap: scale(10),
  },
  inputText: { flex: 1, fontSize: moderateScale(15) },

  // Selected users
  selectedSection: { paddingTop: scale(16) },
  selectedList: { paddingHorizontal: scale(20), gap: scale(12) },
  selectedChip: { alignItems: 'center', gap: scale(4), width: scale(64) },
  chipAvatarWrap: {
    borderWidth: 2, borderRadius: scale(16), padding: scale(2),
  },
  chipAvatar: { width: scale(44), height: scale(44), borderRadius: scale(14) },
  chipRemove: {
    position: 'absolute', top: -scale(2), right: -scale(2),
    width: scale(16), height: scale(16), borderRadius: scale(8),
    alignItems: 'center', justifyContent: 'center',
  },
  chipName: { fontSize: moderateScale(11), fontWeight: '500', textAlign: 'center' },

  // Search results
  loadingContainer: { padding: scale(20), alignItems: 'center' },
  resultsList: { paddingHorizontal: scale(20), paddingTop: scale(8), paddingBottom: scale(40) },

  // User card
  userCard: { borderRadius: scale(16), marginBottom: scale(8), overflow: 'hidden' },
  userCardWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.3)',
    backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
    borderWidth: 1, padding: scale(12),
  },
  userCardInner: {
    padding: scale(12), borderRadius: scale(16),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  userCardRow: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: scale(44), height: scale(44), borderRadius: scale(14), marginRight: scale(12) },
  userName: { flex: 1, fontSize: moderateScale(15), fontWeight: '500' },
  checkBadge: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    alignItems: 'center', justifyContent: 'center',
  },
  uncheckBadge: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    borderWidth: 2,
  },

  // Empty & Error
  emptyContainer: { alignItems: 'center', padding: scale(40), gap: scale(10) },
  emptyText: { textAlign: 'center', fontSize: moderateScale(14) },
  errorContainer: { paddingHorizontal: scale(20), paddingTop: scale(10) },
  errorText: { fontSize: moderateScale(13), fontWeight: '500', textAlign: 'center' },
});

export default CreateRoomScreen;
