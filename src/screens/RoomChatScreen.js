import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
  Animated, Dimensions, Modal, Vibration, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Send, Users, Circle, Search, X, Image as ImageIcon,
  Camera, CornerUpLeft, ChevronDown, Info, Smile, Heart, Flame,
  ThumbsUp, Laugh, Frown, Sparkles, Paperclip, Hash,
  Copy, Trash2, Pin, Forward, BarChart3, Check, CheckCheck,
  AtSign, Star, Bookmark, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// Responsive scaling
const BASE_WIDTH = 393;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// Quick reaction emojis
const REACTIONS = [
  { key: 'like', emoji: '👍', icon: ThumbsUp },
  { key: 'heart', emoji: '❤️', icon: Heart },
  { key: 'laugh', emoji: '😂', icon: Laugh },
  { key: 'fire', emoji: '🔥', icon: Flame },
  { key: 'sad', emoji: '😢', icon: Frown },
];

// Celebration keywords
const CELEBRATION_KEYWORDS = [
  'congratulations', 'congrats', 'happy birthday', 'birthday',
  'celebrate', 'party', 'woohoo', 'yay', 'hurray', 'hooray',
  'amazing', 'awesome', 'well done', 'bravo', 'cheers',
];

const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🥳', '💜', '⭐', '🎆'];

const RoomChatScreen = ({ route, navigation }) => {
  const { roomId, roomName } = route.params;
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const flatListRef = useRef(null);

  // Core state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const channelRef = useRef(null);
  const isSubscribedRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Creative features state
  const [replyTo, setReplyTo] = useState(null);
  const [reactions, setReactions] = useState({});
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // NEW: Double-tap heart
  const lastTapRef = useRef({});
  const [floatingHearts, setFloatingHearts] = useState([]);

  // NEW: @Mention autocomplete
  const [mentionResults, setMentionResults] = useState([]);

  // NEW: Message action sheet
  const [actionMessage, setActionMessage] = useState(null);

  // NEW: Celebration confetti
  const [celebrationParticles, setCelebrationParticles] = useState([]);

  // NEW: Read receipts tracking
  const [readReceipts, setReadReceipts] = useState({});
  const lastReadSentRef = useRef(null);

  // NEW: Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState(new Set());
  const [showPinnedBar, setShowPinnedBar] = useState(false);

  // NEW: Chat streak
  const [chatStreak, setChatStreak] = useState(0);
  const streakAnim = useRef(new Animated.Value(0)).current;

  // Glass toast alert
  const [toastAlert, setToastAlert] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((title, message, type = 'error') => {
    setToastAlert({ title, message, type });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastAlert(null));
  }, [toastAnim]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const scrollBtnAnim = useRef(new Animated.Value(0)).current;
  const replyBarAnim = useRef(new Animated.Value(0)).current;
  const typingDotsAnim = useRef(new Animated.Value(0)).current;
  const actionSheetAnim = useRef(new Animated.Value(0)).current;
  const mentionAnim = useRef(new Animated.Value(0)).current;
  const messageAnims = useRef({});

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Typing dots animation loop
  useEffect(() => {
    if (typingUsers.length > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(typingDotsAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(typingDotsAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [typingUsers.length]);

  // Search bar animation
  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: showSearch ? 1 : 0, duration: 300, useNativeDriver: false,
    }).start();
  }, [showSearch]);

  // Scroll button animation
  useEffect(() => {
    Animated.timing(scrollBtnAnim, {
      toValue: showScrollButton ? 1 : 0, duration: 200, useNativeDriver: true,
    }).start();
  }, [showScrollButton]);

  // Reply bar animation
  useEffect(() => {
    Animated.timing(replyBarAnim, {
      toValue: replyTo ? 1 : 0, duration: 250, useNativeDriver: false,
    }).start();
  }, [replyTo]);

  // Action sheet animation
  useEffect(() => {
    Animated.spring(actionSheetAnim, {
      toValue: actionMessage ? 1 : 0,
      friction: 8, tension: 65,
      useNativeDriver: true,
    }).start();
  }, [actionMessage]);

  // Mention dropdown animation
  useEffect(() => {
    Animated.timing(mentionAnim, {
      toValue: mentionResults.length > 0 ? 1 : 0,
      duration: 200, useNativeDriver: false,
    }).start();
  }, [mentionResults.length]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Load members
  const loadMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select('user_id, profiles(id, full_name, avatar_url)')
        .eq('room_id', roomId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, [roomId]);

  // Calculate chat streak (consecutive days both parties sent messages)
  const calculateStreak = useCallback(async () => {
    try {
      // Get messages from the last 60 days for this room
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('room_id', roomId)
        .gte('created_at', sixtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setChatStreak(0);
        return;
      }

      // Group messages by date (YYYY-MM-DD) and track unique senders per day
      const dailySenders = {};
      data.forEach(msg => {
        const day = new Date(msg.created_at).toISOString().split('T')[0];
        if (!dailySenders[day]) dailySenders[day] = new Set();
        dailySenders[day].add(msg.sender_id);
      });

      // Count consecutive days (from today backwards) where 2+ unique senders chatted
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dayKey = checkDate.toISOString().split('T')[0];
        const senders = dailySenders[dayKey];
        if (senders && senders.size >= 2) {
          streak++;
        } else if (i === 0) {
          // Today might not have mutual messages yet, check yesterday
          continue;
        } else {
          break;
        }
      }
      setChatStreak(streak);

      // Animate streak badge in
      if (streak > 0) {
        Animated.spring(streakAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
      }
    } catch (err) {
      console.warn('Streak calc error:', err.message);
    }
  }, [roomId, streakAnim]);

  // Realtime channel
  useEffect(() => {
    loadMessages();
    loadMembers();
    calculateStreak();

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: user.id } },
    });

    // New messages
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      async (payload) => {
        const newMsg = payload.new;
        // Skip if we already have this message (from optimistic insert)
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return prev; // Will be handled below
        });

        const { data } = await supabase
          .from('messages')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('id', newMsg.id)
          .single();
        if (data) {
          setMessages(prev => {
            // Deduplicate: replace optimistic or skip if already exists with full data
            const exists = prev.find(m => m.id === data.id);
            if (exists) {
              return prev.map(m => m.id === data.id ? data : m);
            }
            return [...prev, data];
          });
          // Clear typing indicator for this sender (they sent a message, so they stopped typing)
          setTypingUsers(prev => prev.filter(u => u.userId !== data.sender_id));
          // Check for celebration keywords
          checkCelebration(data.content);
        }
      }
    );

    // Message deletes
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      }
    );

    // Typing (with auto-clear safety timeout)
    const typingClearTimers = {};
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, userName, isTyping } = payload.payload;
      if (userId === user.id) return;

      // Clear existing timeout for this user
      if (typingClearTimers[userId]) {
        clearTimeout(typingClearTimers[userId]);
        delete typingClearTimers[userId];
      }

      setTypingUsers(prev => {
        if (isTyping) {
          if (!prev.find(u => u.userId === userId)) return [...prev, { userId, userName }];
          return prev;
        }
        return prev.filter(u => u.userId !== userId);
      });

      // Auto-clear after 5s if no stop-typing broadcast received
      if (isTyping) {
        typingClearTimers[userId] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
          delete typingClearTimers[userId];
        }, 5000);
      }
    });

    // Reactions broadcast
    channel.on('broadcast', { event: 'reaction' }, (payload) => {
      const { messageId, reactionKey, reactorId, action } = payload.payload;
      setReactions(prev => {
        const msgReactions = { ...(prev[messageId] || {}) };
        const reactionList = [...(msgReactions[reactionKey] || [])];
        if (action === 'add') {
          if (!reactionList.includes(reactorId)) reactionList.push(reactorId);
        } else {
          const idx = reactionList.indexOf(reactorId);
          if (idx > -1) reactionList.splice(idx, 1);
        }
        if (reactionList.length === 0) {
          delete msgReactions[reactionKey];
        } else {
          msgReactions[reactionKey] = reactionList;
        }
        return { ...prev, [messageId]: msgReactions };
      });
    });

    // Read receipts broadcast — marks all messages up to lastReadMessageId
    channel.on('broadcast', { event: 'read_receipt' }, (payload) => {
      const { lastReadMessageId, readerId } = payload.payload;
      if (readerId !== user.id) {
        setReadReceipts(prev => {
          const updated = { ...prev };
          // Mark the specific message and all prior messages from current user as read
          setMessages(msgs => {
            let found = false;
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].id === lastReadMessageId) found = true;
              if (found && msgs[i].sender_id === user.id) {
                const readers = new Set(updated[msgs[i].id] || []);
                readers.add(readerId);
                updated[msgs[i].id] = [...readers];
              }
            }
            return msgs;
          });
          return updated;
        });
      }
    });

    // Pin broadcast
    channel.on('broadcast', { event: 'pin_message' }, (payload) => {
      const { messageId, action } = payload.payload;
      setPinnedMessages(prev => {
        const newSet = new Set(prev);
        if (action === 'pin') newSet.add(messageId);
        else newSet.delete(messageId);
        return newSet;
      });
    });

    // Presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const online = Object.keys(state).map(key => ({ userId: key, ...state[key]?.[0] }));
      setOnlineUsers(online);
    });

    channelRef.current = channel;

    channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        await channel.track({ userId: user.id, userName: user.name, online_at: new Date().toISOString() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Channel subscription issue:', status, err);
        // Retry subscription after a delay
        setTimeout(() => {
          if (channelRef.current) {
            channelRef.current.subscribe();
          }
        }, 3000);
      }
    });
    return () => {
      isSubscribedRef.current = false;
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, user.id, user.name, loadMessages, loadMembers]);

  // Send read receipt when viewing messages — mark all unread from others
  useEffect(() => {
    if (messages.length > 0 && channelRef.current && isSubscribedRef.current) {
      // Find the last message from someone else
      const otherMsgs = messages.filter(m => m.sender_id !== user.id);
      if (otherMsgs.length === 0) return;
      const lastOtherMsg = otherMsgs[otherMsgs.length - 1];
      // Don't re-send if we already sent receipt for this message
      if (lastReadSentRef.current === lastOtherMsg.id) return;
      lastReadSentRef.current = lastOtherMsg.id;
      channelRef.current.send({
        type: 'broadcast', event: 'read_receipt',
        payload: {
          roomId,
          lastReadMessageId: lastOtherMsg.id,
          readerId: user.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [messages.length, user.id, roomId]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ===== CELEBRATION CONFETTI =====
  const checkCelebration = useCallback((content) => {
    if (!content) return;
    const lower = content.toLowerCase();
    const isCelebration = CELEBRATION_KEYWORDS.some(kw => lower.includes(kw));
    if (isCelebration) {
      triggerCelebration();
    }
  }, []);

  const triggerCelebration = useCallback(() => {
    const particles = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
      x: Math.random() * screenWidth,
      delay: Math.random() * 600,
      duration: 2000 + Math.random() * 1500,
      size: 16 + Math.random() * 16,
      rotation: Math.random() * 360,
    }));
    setCelebrationParticles(particles);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCelebrationParticles([]), 4000);
  }, []);

  // ===== DOUBLE-TAP HEART =====
  const handleDoubleTap = useCallback((messageId) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[messageId] || 0;
    if (now - lastTap < 300) {
      // Double tap detected
      toggleReaction(messageId, 'heart');
      // Floating heart animation
      const heartId = Date.now();
      setFloatingHearts(prev => [...prev, { id: heartId, messageId }]);
      setTimeout(() => {
        setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
      }, 1500);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      lastTapRef.current[messageId] = 0;
    } else {
      lastTapRef.current[messageId] = now;
    }
  }, []);

  // ===== @MENTION AUTOCOMPLETE =====
  const handleTextChange = useCallback((text) => {
    setNewMessage(text);
    handleTyping();

    // Detect @mention
    const match = text.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      const filtered = members
        .filter(m =>
          m.user_id !== user.id &&
          (query === '' || m.profiles?.full_name?.toLowerCase().includes(query))
        )
        .slice(0, 5);
      setMentionResults(filtered);
    } else {
      setMentionResults([]);
    }
  }, [members, user.id, handleTyping]);

  const selectMention = useCallback((member) => {
    const name = member.profiles?.full_name || 'User';
    const updatedText = newMessage.replace(/@\w*$/, `@${name} `);
    setNewMessage(updatedText);
    setMentionResults([]);
  }, [newMessage]);

  // ===== MESSAGE ACTIONS =====
  const openActionSheet = useCallback((message) => {
    setActionMessage(message);
    setShowReactionPicker(null);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const copyMessage = useCallback(async () => {
    if (actionMessage?.content) {
      await Clipboard.setStringAsync(actionMessage.content);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    setActionMessage(null);
  }, [actionMessage]);

  const pinMessage = useCallback(() => {
    if (!actionMessage) return;
    const isPinned = pinnedMessages.has(actionMessage.id);
    const newSet = new Set(pinnedMessages);
    if (isPinned) newSet.delete(actionMessage.id);
    else newSet.add(actionMessage.id);
    setPinnedMessages(newSet);

    // Broadcast pin
    if (channelRef.current && isSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast', event: 'pin_message',
        payload: { messageId: actionMessage.id, action: isPinned ? 'unpin' : 'pin' },
      });
    }
    setActionMessage(null);
  }, [actionMessage, pinnedMessages]);

  const deleteMessage = useCallback(async () => {
    if (!actionMessage || actionMessage.sender_id !== user.id) return;
    try {
      await supabase.from('messages').delete().eq('id', actionMessage.id);
      setMessages(prev => prev.filter(m => m.id !== actionMessage.id));
    } catch (err) {
      console.error('Delete error:', err);
    }
    setActionMessage(null);
  }, [actionMessage, user.id]);

  // Typing broadcast
  const handleTyping = useCallback(() => {
    if (channelRef.current && isSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast', event: 'typing',
        payload: { userId: user.id, userName: user.name, isTyping: true },
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current && isSubscribedRef.current) {
          channelRef.current.send({
            type: 'broadcast', event: 'typing',
            payload: { userId: user.id, userName: user.name, isTyping: false },
          });
        }
      }, 2000);
    }
  }, [user.id, user.name]);

  // Send message
  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setMentionResults([]);
    setSending(true);

    if (channelRef.current && isSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast', event: 'typing',
        payload: { userId: user.id, userName: user.name, isTyping: false },
      });
    }

    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        try {
          const ext = selectedImage.uri.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${roomId}/${Date.now()}_${user.id}.${ext}`;
          const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

          let uploadError, uploadData;
          if (Platform.OS === 'web') {
            const response = await fetch(selectedImage.uri);
            const blob = await response.blob();
            ({ data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-images')
              .upload(fileName, blob, { contentType, upsert: true }));
          } else {
            // React Native: read as base64 then decode to ArrayBuffer
            const base64Data = await FileSystem.readAsStringAsync(selectedImage.uri, {
              encoding: 'base64',
            });
            const arrayBuffer = decode(base64Data);
            ({ data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-images')
              .upload(fileName, arrayBuffer, { contentType, upsert: true }));
          }

          if (uploadError) {
            console.warn('Image upload error:', uploadError.message);
            showToast('Upload Failed', uploadError.message, 'error');
          } else if (uploadData) {
            const { data: urlData } = supabase.storage
              .from('chat-images')
              .getPublicUrl(uploadData.path);
            imageUrl = urlData?.publicUrl;
          }
        } catch (imgErr) {
          console.warn('Image processing error:', imgErr.message);
          showToast('Image Error', imgErr.message, 'error');
        }
        setSelectedImage(null);
      }

      // Don't send if no content and image upload failed
      const finalContent = imageUrl ? (content || '📷 Photo') : content;
      if (!finalContent && !imageUrl) {
        setSending(false);
        return;
      }

      const messageData = {
        room_id: roomId,
        sender_id: user.id,
        content: finalContent || '📷 Photo',
      };

      // Add reply reference
      if (replyTo) {
        messageData.reply_to = replyTo.id;
        setReplyTo(null);
      }

      // Add image URL if present
      if (imageUrl) {
        messageData.image_url = imageUrl;
      }

      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*, profiles(id, full_name, avatar_url)')
        .single();

      if (error) {
        console.warn('Message insert error:', error.message);
        showToast('Send Failed', error.message, 'error');
        throw error;
      }

      // Optimistic insert: add the message to local state immediately
      if (insertedMsg) {
        setMessages(prev => {
          if (prev.find(m => m.id === insertedMsg.id)) return prev;
          return [...prev, insertedMsg];
        });
      }

      // Check celebration locally for own messages
      checkCelebration(content);
      // Recalculate streak after sending
      calculateStreak();
    } catch (error) {
      console.warn('Error sending message:', error);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  // Toggle reaction
  const toggleReaction = useCallback((messageId, reactionKey) => {
    const msgReactions = reactions[messageId] || {};
    const reactionList = msgReactions[reactionKey] || [];
    const hasReacted = reactionList.includes(user.id);

    // Broadcast the reaction
    if (channelRef.current && isSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast', event: 'reaction',
        payload: {
          messageId, reactionKey,
          reactorId: user.id,
          action: hasReacted ? 'remove' : 'add',
        },
      });
    }

    // Update local state
    setReactions(prev => {
      const msgR = { ...(prev[messageId] || {}) };
      const list = [...(msgR[reactionKey] || [])];
      if (hasReacted) {
        const idx = list.indexOf(user.id);
        if (idx > -1) list.splice(idx, 1);
      } else {
        list.push(user.id);
      }
      if (list.length === 0) delete msgR[reactionKey];
      else msgR[reactionKey] = list;
      return { ...prev, [messageId]: msgR };
    });

    setShowReactionPicker(null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reactions, user.id]);

  // Image picker
  const pickImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true, quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true, quality: 0.7,
        });
      }
      if (result && !result.canceled && result.assets?.[0]) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  // Search messages
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(m =>
      m.content?.toLowerCase().includes(q) ||
      m.profiles?.full_name?.toLowerCase().includes(q)
    );
  }, [searchQuery, messages]);

  const scrollToMessage = (messageId) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index > -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const isUserOnline = (userId) => onlineUsers.some(u => u.userId === userId);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Scroll handler
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollButton(distanceFromBottom > 150);
  };

  const onlineCount = onlineUsers.length;

  // Get the replied-to message content
  const getReplyPreview = (replyToId) => {
    const msg = messages.find(m => m.id === replyToId);
    if (!msg) return null;
    return msg;
  };

  // Get pinned messages list
  const pinnedMessagesList = useMemo(() => {
    return messages.filter(m => pinnedMessages.has(m.id));
  }, [messages, pinnedMessages]);

  // Render @mention highlighted text
  const renderMessageContent = (content, textColor) => {
    if (!content) return null;
    const parts = content.split(/(@\w+(?:\s\w+)?)/g);
    return (
      <Text style={[styles.messageText, { color: textColor }]}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <Text key={i} style={[styles.mentionHighlight, { color: '#C4B5FD' }]}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  // Glass components
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

  // Get message animation
  const getMessageAnim = (id) => {
    if (!messageAnims.current[id]) {
      messageAnims.current[id] = new Animated.Value(0);
      Animated.spring(messageAnims.current[id], {
        toValue: 1, friction: 8, tension: 60, useNativeDriver: true,
      }).start();
    }
    return messageAnims.current[id];
  };

  // ===== FLOATING HEART COMPONENT =====
  const FloatingHeart = ({ id }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: 1, duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          top: '30%',
          opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.2, 0.5, 1], outputRange: [0.3, 1.4, 1.1, 0.8] }) },
          ],
        }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: scale(42) }}>❤️</Text>
      </Animated.View>
    );
  };

  // ===== CONFETTI PARTICLE =====
  const ConfettiParticle = ({ particle }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration: particle.duration,
        delay: particle.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: particle.x,
          top: -30,
          opacity: anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, screenHeight + 50] }) },
            { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.rotation}deg`] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.6] }) },
          ],
        }}
      >
        <Text style={{ fontSize: particle.size }}>{particle.emoji}</Text>
      </Animated.View>
    );
  };

  // Render message
  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === user.id;
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);
    const showName = !isMe && showAvatar;
    const online = isUserOnline(item.sender_id);
    const msgReactions = reactions[item.id] || {};
    const replyMsg = item.reply_to ? getReplyPreview(item.reply_to) : null;
    const hasImage = !!item.image_url;
    const animValue = getMessageAnim(item.id);
    const isPinned = pinnedMessages.has(item.id);
    const receipts = readReceipts[item.id] || [];
    const isRead = isMe && receipts.length > 0;

    // Check if this message matches search
    const isSearchMatch = searchQuery.trim() && item.content?.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <Animated.View style={{
        opacity: animValue,
        transform: [
          { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
        ],
      }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleDoubleTap(item.id)}
          onLongPress={() => openActionSheet(item)}
          delayLongPress={400}
        >
          <View style={[styles.messageRow, isMe && styles.messageRowRight]}>
            {!isMe && (
              <View style={styles.avatarContainer}>
                {showAvatar ? (
                  <View>
                    <Image
                      source={{ uri: item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.profiles?.full_name || 'U')}&background=6B4EFF&color=fff&size=64` }}
                      style={styles.messageAvatar}
                    />
                    {online && <View style={[styles.onlineDot, { borderColor: theme.background }]} />}
                  </View>
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
              </View>
            )}

            <View style={[styles.messageBubbleWrapper, isMe && styles.messageBubbleWrapperRight]}>
              {showName && (
                <Text style={[styles.senderName, { color: theme.primary }]}>
                  {item.profiles?.full_name || 'Unknown'}
                </Text>
              )}

              {/* Pinned indicator */}
              {isPinned && (
                <View style={styles.pinnedIndicator}>
                  <Pin size={scale(10)} color={theme.primary} />
                  <Text style={[styles.pinnedText, { color: theme.primary }]}>Pinned</Text>
                </View>
              )}

              {/* Reply preview */}
              {replyMsg && (
                <TouchableOpacity
                  onPress={() => scrollToMessage(replyMsg.id)}
                  style={[styles.replyPreviewInBubble, { borderLeftColor: theme.primary }]}
                >
                  <Text style={[styles.replyPreviewName, { color: theme.primary }]} numberOfLines={1}>
                    {replyMsg.profiles?.full_name || 'Unknown'}
                  </Text>
                  <Text style={[styles.replyPreviewText, { color: theme.textMuted }]} numberOfLines={1}>
                    {replyMsg.content}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Message bubble */}
              <View
                style={[
                  styles.messageBubble,
                  isMe
                    ? [styles.myBubble, { shadowColor: '#A78BFA' }]
                    : [styles.otherBubble, { borderColor: theme.glassBorder }],
                  isSearchMatch && { borderColor: theme.primary, borderWidth: 2 },
                ]}
              >
                {isMe ? (
                  <LinearGradient
                    colors={[theme.gradient1, theme.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bubbleGradient}
                  >
                    {hasImage && (
                      <TouchableOpacity onPress={() => setImagePreview(item.image_url)}>
                        <Image source={{ uri: item.image_url }} style={styles.messageImage} />
                      </TouchableOpacity>
                    )}
                    {renderMessageContent(item.content, '#FFFFFF')}
                    <View style={styles.messageFooter}>
                      <Text style={[styles.messageTime, { color: 'rgba(255,255,255,0.6)' }]}>
                        {formatTime(item.created_at)}
                      </Text>
                      {/* Read receipt checkmarks */}
                      {isMe && (
                        <View style={styles.readReceipt}>
                          {isRead ? (
                            <CheckCheck size={scale(13)} color="rgba(255,255,255,0.8)" />
                          ) : (
                            <Check size={scale(13)} color="rgba(255,255,255,0.5)" />
                          )}
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.bubbleInner}>
                    {hasImage && (
                      <TouchableOpacity onPress={() => setImagePreview(item.image_url)}>
                        <Image source={{ uri: item.image_url }} style={styles.messageImage} />
                      </TouchableOpacity>
                    )}
                    {renderMessageContent(item.content, theme.text)}
                    <Text style={[styles.messageTime, { color: theme.textMuted }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Quick reply button */}
              <View style={[styles.messageActions, isMe && styles.messageActionsRight]}>
                <TouchableOpacity
                  onPress={() => setReplyTo(item)}
                  style={styles.quickReplyBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CornerUpLeft size={scale(12)} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Reactions display */}
              {Object.keys(msgReactions).length > 0 && (
                <View style={[styles.reactionsRow, isMe && styles.reactionsRowRight]}>
                  {Object.entries(msgReactions).map(([key, users]) => {
                    const reaction = REACTIONS.find(r => r.key === key);
                    if (!reaction || users.length === 0) return null;
                    const iReacted = users.includes(user.id);
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => toggleReaction(item.id, key)}
                        style={[
                          styles.reactionBadge,
                          { backgroundColor: iReacted ? theme.primarySoft : 'rgba(255,255,255,0.08)', borderColor: iReacted ? theme.primary : 'transparent' },
                        ]}
                      >
                        <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                        <Text style={[styles.reactionCount, { color: iReacted ? theme.primary : theme.textSecondary }]}>
                          {users.length}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Floating hearts from double-tap */}
        {floatingHearts.filter(h => h.messageId === item.id).map(heart => (
          <FloatingHeart key={heart.id} id={heart.id} />
        ))}
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
          start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }}
        />
      </View>

      {/* Celebration confetti overlay */}
      {celebrationParticles.length > 0 && (
        <View style={styles.celebrationOverlay} pointerEvents="none">
          {celebrationParticles.map(p => (
            <ConfettiParticle key={p.id} particle={p} />
          ))}
        </View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <GlassButton onPress={() => navigation.goBack()}>
            <ArrowLeft size={scale(20)} color={theme.text} />
          </GlassButton>

          <TouchableOpacity
            style={styles.headerCenter}
            onPress={() => navigation.navigate('RoomInfo', { roomId, roomName })}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[theme.gradient1, theme.gradient2]}
              style={[styles.headerAvatar, styles.glowIcon]}
            >
              <Users size={scale(18)} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerInfo}>
              <View style={styles.headerTitleRow}>
                <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                  {roomName || 'Chat Room'}
                </Text>
                {chatStreak > 0 && (
                  <Animated.View style={[
                    styles.streakBadge,
                    {
                      backgroundColor: 'rgba(255, 120, 20, 0.15)',
                      borderColor: 'rgba(255, 120, 20, 0.3)',
                      transform: [{ scale: streakAnim }],
                    },
                  ]}>
                    <Text style={styles.streakFireEmoji}>🔥</Text>
                    <Text style={styles.streakCount}>{chatStreak}</Text>
                  </Animated.View>
                )}
              </View>
              <View style={styles.headerSubrow}>
                {onlineCount > 0 && (
                  <>
                    <View style={styles.headerOnlineDot} />
                    <Text style={[styles.headerSubtext, { color: theme.textMuted }]}>
                      {onlineCount} online
                    </Text>
                  </>
                )}
                <View style={[styles.memberChip, { backgroundColor: theme.primarySoft, borderColor: `${theme.primary}40` }]}>
                  <Hash size={scale(9)} color={theme.primary} />
                  <Text style={[styles.memberChipText, { color: theme.primary }]}>{members.length}</Text>
                </View>
                {chatStreak >= 3 && (
                  <Text style={[styles.streakLabel, { color: theme.textMuted }]}>
                    {chatStreak >= 30 ? '🏆 Legendary' : chatStreak >= 14 ? '⭐ On Fire' : chatStreak >= 7 ? '💪 Strong' : '🔥 Streak'}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <GlassButton onPress={() => setShowSearch(!showSearch)}>
              <Search size={scale(18)} color={theme.text} />
            </GlassButton>
            <GlassButton onPress={() => navigation.navigate('RoomInfo', { roomId, roomName })}>
              <Info size={scale(18)} color={theme.text} />
            </GlassButton>
          </View>
        </Animated.View>

        {/* Pinned messages bar */}
        {pinnedMessagesList.length > 0 && (
          <TouchableOpacity
            style={[styles.pinnedBar, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
            onPress={() => {
              const firstPinned = pinnedMessagesList[0];
              if (firstPinned) scrollToMessage(firstPinned.id);
            }}
            activeOpacity={0.7}
          >
            <Pin size={scale(14)} color={theme.primary} />
            <Text style={[styles.pinnedBarText, { color: theme.text }]} numberOfLines={1}>
              {pinnedMessagesList.length} pinned message{pinnedMessagesList.length > 1 ? 's' : ''}
              {' — '}
              <Text style={{ color: theme.textMuted }}>{pinnedMessagesList[0]?.content}</Text>
            </Text>
            <ChevronDown size={scale(14)} color={theme.textMuted} />
          </TouchableOpacity>
        )}

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
              placeholder="Search messages..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={scale(16)} color={theme.textMuted} />
              </TouchableOpacity>
            )}
            <Text style={[styles.searchCount, { color: theme.textMuted }]}>
              {filteredSearchResults.length > 0 ? `${filteredSearchResults.length} found` : ''}
            </Text>
          </View>
          {/* Search results dropdown */}
          {filteredSearchResults.length > 0 && (
            <View style={[styles.searchResults, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
              {filteredSearchResults.slice(0, 4).map(msg => (
                <TouchableOpacity key={msg.id} style={styles.searchResultItem} onPress={() => scrollToMessage(msg.id)}>
                  <Text style={[styles.searchResultName, { color: theme.primary }]} numberOfLines={1}>
                    {msg.profiles?.full_name}
                  </Text>
                  <Text style={[styles.searchResultText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {msg.content}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.loadingIcon}>
                <Sparkles size={scale(28)} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[theme.gradient1, theme.gradient2]}
                style={[styles.emptyIcon, styles.glowIcon]}
              >
                <Sparkles size={scale(36)} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Start the conversation</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Send a message, photo, or react with emojis{'\n'}
                Double-tap to ❤️ • Long-press for actions • @mention friends
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={100}
              onContentSizeChange={() => {
                if (messages.length > 0 && !showScrollButton) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
              }}
            />
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <Animated.View style={[styles.typingContainer, { opacity: typingDotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]}>
              <View style={[styles.typingBubble, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                <View style={styles.typingDots}>
                  {[0, 1, 2].map(i => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.typingDot,
                        { backgroundColor: theme.primary },
                        {
                          transform: [{
                            scale: typingDotsAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: i === 1 ? [1, 1.4, 1] : [1, 0.8, 1],
                            }),
                          }],
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.typingText, { color: theme.textMuted }]}>
                  {typingUsers.map(u => u.userName).join(', ')}{' '}
                  {typingUsers.length === 1 ? 'is' : 'are'} typing
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Scroll to bottom */}
          {showScrollButton && (
            <Animated.View style={[styles.scrollBottomBtn, { opacity: scrollBtnAnim, transform: [{ translateY: scrollBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
              <TouchableOpacity
                onPress={() => { flatListRef.current?.scrollToEnd({ animated: true }); setShowScrollButton(false); }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={[styles.scrollBottomPill, styles.glowIcon]}>
                  <ChevronDown size={scale(16)} color="#FFFFFF" />
                  <Text style={styles.scrollBottomText}>New messages</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* @Mention autocomplete dropdown */}
          {mentionResults.length > 0 && (
            <Animated.View style={[
              styles.mentionDropdown,
              {
                maxHeight: mentionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, scale(200)] }),
                opacity: mentionAnim,
              },
            ]}>
              {Platform.OS === 'web' ? (
                <View style={[styles.mentionDropdownInner, styles.mentionDropdownWeb, { borderColor: theme.glassBorder }]}>
                  {mentionResults.map(member => (
                    <TouchableOpacity
                      key={member.user_id}
                      style={styles.mentionItem}
                      onPress={() => selectMention(member)}
                    >
                      <Image
                        source={{ uri: member.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles?.full_name || 'U')}&background=6B4EFF&color=fff&size=32` }}
                        style={styles.mentionAvatar}
                      />
                      <Text style={[styles.mentionName, { color: theme.text }]}>
                        {member.profiles?.full_name || 'User'}
                      </Text>
                      <AtSign size={scale(12)} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <BlurView intensity={50} tint={isDarkMode ? 'dark' : 'light'} style={styles.mentionDropdownInner}>
                  <View style={[styles.mentionDropdownBorder, { borderColor: theme.glassBorder }]}>
                    {mentionResults.map(member => (
                      <TouchableOpacity
                        key={member.user_id}
                        style={styles.mentionItem}
                        onPress={() => selectMention(member)}
                      >
                        <Image
                          source={{ uri: member.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles?.full_name || 'U')}&background=6B4EFF&color=fff&size=32` }}
                          style={styles.mentionAvatar}
                        />
                        <Text style={[styles.mentionName, { color: theme.text }]}>
                          {member.profiles?.full_name || 'User'}
                        </Text>
                        <AtSign size={scale(12)} color={theme.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </BlurView>
              )}
            </Animated.View>
          )}

          {/* Reply bar */}
          {replyTo && (
            <Animated.View style={[
              styles.replyBar,
              {
                height: replyBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, scale(52)] }),
                opacity: replyBarAnim,
              },
            ]}>
              <View style={[styles.replyBarInner, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                <View style={[styles.replyBarAccent, { backgroundColor: theme.primary }]} />
                <CornerUpLeft size={scale(14)} color={theme.primary} />
                <View style={styles.replyBarContent}>
                  <Text style={[styles.replyBarName, { color: theme.primary }]} numberOfLines={1}>
                    {replyTo.profiles?.full_name || 'Unknown'}
                  </Text>
                  <Text style={[styles.replyBarText, { color: theme.textMuted }]} numberOfLines={1}>
                    {replyTo.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
                  <X size={scale(16)} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Image preview */}
          {selectedImage && (
            <View style={[styles.imagePreviewBar, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreviewThumb} />
              <Text style={[styles.imagePreviewText, { color: theme.text }]}>Send photo</Text>
              <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.imagePreviewClose}>
                <X size={scale(16)} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input area */}
          <View style={styles.inputSection}>
            {Platform.OS === 'web' ? (
              <View style={[styles.inputGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    style={[styles.inputIconBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder, borderWidth: 1 }]}
                    onPress={() => pickImage('gallery')}
                  >
                    <ImageIcon size={scale(18)} color={theme.primary} />
                  </TouchableOpacity>

                  <View style={[styles.inputContainer, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Type a message... @ to mention"
                      placeholderTextColor={theme.placeholder}
                      value={newMessage}
                      onChangeText={handleTextChange}
                      multiline
                      maxLength={2000}
                    />
                    <TouchableOpacity
                      style={styles.inputAttachBtn}
                      onPress={() => pickImage('camera')}
                    >
                      <Camera size={scale(16)} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={(!newMessage.trim() && !selectedImage) || sending}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={(newMessage.trim() || selectedImage) ? [theme.gradient1, theme.gradient2] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)']}
                      style={[styles.sendBtn, (newMessage.trim() || selectedImage) && styles.glowSend]}
                    >
                      {sending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Send size={scale(18)} color={(newMessage.trim() || selectedImage) ? '#FFFFFF' : theme.textMuted} />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={styles.inputBlur}>
                <View style={[styles.inputGlassInner, { borderColor: theme.glassBorder }]}>
                  <View style={styles.inputWrapper}>
                    <TouchableOpacity
                      style={[styles.inputIconBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder, borderWidth: 1 }]}
                      onPress={() => pickImage('gallery')}
                    >
                      <ImageIcon size={scale(18)} color={theme.primary} />
                    </TouchableOpacity>

                    <View style={[styles.inputContainer, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Type a message... @ to mention"
                        placeholderTextColor={theme.placeholder}
                        value={newMessage}
                        onChangeText={handleTextChange}
                        multiline
                        maxLength={2000}
                      />
                      <TouchableOpacity
                        style={styles.inputAttachBtn}
                        onPress={() => pickImage('camera')}
                      >
                        <Camera size={scale(16)} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={(!newMessage.trim() && !selectedImage) || sending}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={(newMessage.trim() || selectedImage) ? [theme.gradient1, theme.gradient2] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)']}
                        style={[styles.sendBtn, (newMessage.trim() || selectedImage) && styles.glowSend]}
                      >
                        {sending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Send size={scale(18)} color={(newMessage.trim() || selectedImage) ? '#FFFFFF' : theme.textMuted} />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ===== MESSAGE ACTION SHEET (Glass Bottom Sheet) ===== */}
      <Modal
        visible={!!actionMessage}
        transparent
        animationType="none"
        onRequestClose={() => setActionMessage(null)}
      >
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setActionMessage(null)}
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
                <ActionSheetContent />
              </View>
            ) : (
              <BlurView intensity={80} tint="dark" style={[styles.actionSheetInner, { overflow: 'hidden' }]}>
                <View style={[styles.actionSheetBorder, { borderColor: theme.glassBorder }]}>
                  <ActionSheetContent />
                </View>
              </BlurView>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Image lightbox modal */}
      <Modal visible={!!imagePreview} transparent animationType="fade" onRequestClose={() => setImagePreview(null)}>
        <TouchableOpacity
          style={styles.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setImagePreview(null)}
        >
          <View style={styles.lightboxContainer}>
            <TouchableOpacity onPress={() => setImagePreview(null)} style={styles.lightboxClose}>
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {imagePreview && (
              <Image source={{ uri: imagePreview }} style={styles.lightboxImage} resizeMode="contain" />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== GLASS TOAST ALERT ===== */}
      {toastAlert && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
                { scale: toastAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.02, 1] }) },
              ],
            },
          ]}
        >
          {Platform.OS === 'web' ? (
            <View style={[styles.toastGlass, styles.toastGlassWeb, { borderColor: theme.glassBorder }]}>
              <View style={styles.toastContent}>
                <LinearGradient
                  colors={toastAlert.type === 'error' ? ['#FF6B6B', '#EE5A24'] : toastAlert.type === 'success' ? ['#2ECC71', '#27AE60'] : [theme.gradient1, theme.gradient2]}
                  style={styles.toastIconBg}
                >
                  {toastAlert.type === 'error' ? (
                    <AlertTriangle size={scale(16)} color="#FFF" />
                  ) : toastAlert.type === 'success' ? (
                    <CheckCircle size={scale(16)} color="#FFF" />
                  ) : (
                    <Info size={scale(16)} color="#FFF" />
                  )}
                </LinearGradient>
                <View style={styles.toastTextContainer}>
                  <Text style={[styles.toastTitle, { color: theme.text }]} numberOfLines={1}>{toastAlert.title}</Text>
                  <Text style={[styles.toastMessage, { color: theme.textMuted }]} numberOfLines={2}>{toastAlert.message}</Text>
                </View>
                <TouchableOpacity onPress={() => { toastAnim.setValue(0); setToastAlert(null); }} style={styles.toastDismiss}>
                  <X size={scale(14)} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.toastProgressBar, { backgroundColor: toastAlert.type === 'error' ? '#FF6B6B' : toastAlert.type === 'success' ? '#2ECC71' : theme.primary }]} />
            </View>
          ) : (
            <View style={[styles.toastGlass, styles.toastNativeBg, { borderColor: theme.glassBorder, backgroundColor: isDarkMode ? 'rgba(15, 10, 30, 0.92)' : 'rgba(240, 235, 255, 0.95)' }]}>
              <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={styles.toastContent}>
                <LinearGradient
                  colors={toastAlert.type === 'error' ? ['#FF6B6B', '#EE5A24'] : toastAlert.type === 'success' ? ['#2ECC71', '#27AE60'] : [theme.gradient1, theme.gradient2]}
                  style={styles.toastIconBg}
                >
                  {toastAlert.type === 'error' ? (
                    <AlertTriangle size={scale(16)} color="#FFF" />
                  ) : toastAlert.type === 'success' ? (
                    <CheckCircle size={scale(16)} color="#FFF" />
                  ) : (
                    <Info size={scale(16)} color="#FFF" />
                  )}
                </LinearGradient>
                <View style={styles.toastTextContainer}>
                  <Text style={[styles.toastTitle, { color: theme.text }]} numberOfLines={1}>{toastAlert.title}</Text>
                  <Text style={[styles.toastMessage, { color: theme.textMuted }]} numberOfLines={2}>{toastAlert.message}</Text>
                </View>
                <TouchableOpacity onPress={() => { toastAnim.setValue(0); setToastAlert(null); }} style={styles.toastDismiss}>
                  <X size={scale(14)} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.toastProgressBar, { backgroundColor: toastAlert.type === 'error' ? '#FF6B6B' : toastAlert.type === 'success' ? '#2ECC71' : theme.primary }]} />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );

  // Action sheet content component
  function ActionSheetContent() {
    if (!actionMessage) return null;
    const isOwnMessage = actionMessage.sender_id === user.id;
    const isPinned = pinnedMessages.has(actionMessage.id);

    return (
      <View style={styles.actionSheetItems}>
        {/* Handle bar */}
        <View style={styles.actionSheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme.textMuted }]} />
        </View>

        {/* Message preview */}
        <View style={[styles.actionPreview, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
          <Text style={[styles.actionPreviewText, { color: theme.textSecondary }]} numberOfLines={2}>
            {actionMessage.content}
          </Text>
        </View>

        {/* Quick reactions row */}
        <View style={styles.actionReactionsRow}>
          {REACTIONS.map(r => {
            const msgReactions = reactions[actionMessage.id] || {};
            const iReacted = (msgReactions[r.key] || []).includes(user.id);
            return (
              <TouchableOpacity
                key={r.key}
                onPress={() => {
                  toggleReaction(actionMessage.id, r.key);
                  setActionMessage(null);
                }}
                style={[
                  styles.actionReactionBtn,
                  iReacted && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                ]}
              >
                <Text style={styles.actionReactionEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            setReplyTo(actionMessage);
            setActionMessage(null);
          }}
        >
          <CornerUpLeft size={scale(20)} color={theme.text} />
          <Text style={[styles.actionItemText, { color: theme.text }]}>Reply</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={copyMessage}>
          <Copy size={scale(20)} color={theme.text} />
          <Text style={[styles.actionItemText, { color: theme.text }]}>Copy Text</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={pinMessage}>
          <Pin size={scale(20)} color={theme.text} />
          <Text style={[styles.actionItemText, { color: theme.text }]}>
            {isPinned ? 'Unpin Message' : 'Pin Message'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            const text = `"${actionMessage.content}" - ${actionMessage.profiles?.full_name || 'Unknown'}`;
            Clipboard.setStringAsync(text);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setActionMessage(null);
          }}
        >
          <Forward size={scale(20)} color={theme.text} />
          <Text style={[styles.actionItemText, { color: theme.text }]}>Copy as Quote</Text>
        </TouchableOpacity>

        {isOwnMessage && (
          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemDanger]}
            onPress={deleteMessage}
          >
            <Trash2 size={scale(20)} color="#EF4444" />
            <Text style={[styles.actionItemText, { color: '#EF4444' }]}>Delete Message</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  // Ambient background
  ambientBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute', top: scale(-80), right: scale(-60),
    width: scale(250), height: scale(250), borderRadius: scale(125), opacity: 0.5,
  },
  ambientGradient2: {
    position: 'absolute', bottom: scale(80), left: scale(-60),
    width: scale(200), height: scale(200), borderRadius: scale(100), opacity: 0.35,
  },

  // Glass button
  glassBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  glassBtnWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
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
  glowSend: {
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },

  // Celebration overlay
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, elevation: 9999,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), paddingVertical: scale(12),
    gap: scale(10),
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
  },
  headerAvatar: {
    width: scale(40), height: scale(40), borderRadius: scale(14),
    alignItems: 'center', justifyContent: 'center', marginRight: scale(10),
  },
  headerInfo: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  headerTitle: { fontSize: moderateScale(16), fontWeight: '700', flexShrink: 1 },
  headerSubrow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(2) },

  // Streak badge
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(7),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    borderWidth: 1,
    gap: scale(2),
  },
  streakFireEmoji: { fontSize: moderateScale(11) },
  streakCount: {
    fontSize: moderateScale(11),
    fontWeight: '800',
    color: '#FF7814',
  },
  streakLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  headerOnlineDot: {
    width: scale(7), height: scale(7), borderRadius: scale(4),
    backgroundColor: '#22C55E',
  },
  headerSubtext: { fontSize: moderateScale(11), fontWeight: '500' },
  memberChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(6), paddingVertical: scale(2),
    borderRadius: scale(8), borderWidth: 1, gap: scale(2),
  },
  memberChipText: { fontSize: moderateScale(10), fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: scale(6) },

  // Pinned bar
  pinnedBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: scale(16), marginBottom: scale(4),
    paddingHorizontal: scale(12), paddingVertical: scale(8),
    borderRadius: scale(12), borderWidth: 1, gap: scale(8),
  },
  pinnedBarText: { flex: 1, fontSize: moderateScale(12) },

  // Search bar
  searchBar: { paddingHorizontal: scale(16), marginBottom: scale(4) },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: scale(14),
    paddingHorizontal: scale(12), height: scale(42), gap: scale(8),
  },
  searchInput: { flex: 1, fontSize: moderateScale(14) },
  searchCount: { fontSize: moderateScale(11) },
  searchResults: {
    marginTop: scale(4), borderWidth: 1, borderRadius: scale(12),
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingHorizontal: scale(12), paddingVertical: scale(8),
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  searchResultName: { fontSize: moderateScale(12), fontWeight: '600' },
  searchResultText: { fontSize: moderateScale(12), marginTop: scale(1) },

  // Loading & Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingIcon: {
    width: scale(64), height: scale(64), borderRadius: scale(20),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(16),
  },
  loadingText: { fontSize: moderateScale(14) },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(40) },
  emptyIcon: {
    width: scale(80), height: scale(80), borderRadius: scale(24),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(22), fontWeight: '700', marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), textAlign: 'center', lineHeight: moderateScale(20) },

  // Messages
  messageList: { paddingHorizontal: scale(14), paddingTop: scale(10), paddingBottom: scale(8) },
  messageRow: { flexDirection: 'row', marginBottom: scale(6), alignItems: 'flex-end' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarContainer: { marginRight: scale(8), width: scale(32) },
  messageAvatar: { width: scale(32), height: scale(32), borderRadius: scale(10) },
  avatarPlaceholder: { width: scale(32), height: scale(32) },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: scale(10), height: scale(10), borderRadius: scale(5),
    backgroundColor: '#22C55E', borderWidth: 2,
  },
  messageBubbleWrapper: { maxWidth: '78%' },
  messageBubbleWrapperRight: { alignItems: 'flex-end' },
  senderName: { fontSize: moderateScale(11), fontWeight: '600', marginBottom: scale(2), marginLeft: scale(4) },

  // Pinned indicator
  pinnedIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    marginBottom: scale(2), marginLeft: scale(4),
  },
  pinnedText: { fontSize: moderateScale(10), fontWeight: '600' },

  // Reply preview in bubble
  replyPreviewInBubble: {
    borderLeftWidth: 2, paddingLeft: scale(8), marginBottom: scale(4),
    marginLeft: scale(4), paddingVertical: scale(2),
  },
  replyPreviewName: { fontSize: moderateScale(11), fontWeight: '600' },
  replyPreviewText: { fontSize: moderateScale(11) },

  // Bubbles
  messageBubble: { borderRadius: scale(18), overflow: 'hidden' },
  myBubble: {
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.2, shadowRadius: scale(6), elevation: 3,
  },
  otherBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  bubbleGradient: {
    paddingHorizontal: scale(14), paddingVertical: scale(10),
  },
  bubbleInner: {
    paddingHorizontal: scale(14), paddingVertical: scale(10),
  },
  messageText: { fontSize: moderateScale(15), lineHeight: moderateScale(21) },
  mentionHighlight: { fontWeight: '700' },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: scale(4), gap: scale(4),
  },
  messageTime: { fontSize: moderateScale(10), alignSelf: 'flex-end' },
  readReceipt: { marginLeft: scale(2) },
  messageImage: {
    width: scale(200), height: scale(150), borderRadius: scale(12),
    marginBottom: scale(6),
  },

  // Message actions
  messageActions: {
    flexDirection: 'row', marginTop: scale(2), marginLeft: scale(4),
  },
  messageActionsRight: { justifyContent: 'flex-end', marginRight: scale(4) },
  quickReplyBtn: { padding: scale(4) },

  // Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(4), marginTop: scale(4), marginLeft: scale(4) },
  reactionsRowRight: { justifyContent: 'flex-end', marginRight: scale(4) },
  reactionBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(8), paddingVertical: scale(3),
    borderRadius: scale(12), borderWidth: 1, gap: scale(3),
  },
  reactionEmoji: { fontSize: moderateScale(14) },
  reactionCount: { fontSize: moderateScale(11), fontWeight: '600' },

  // @Mention dropdown
  mentionDropdown: {
    paddingHorizontal: scale(16), marginBottom: scale(4), overflow: 'hidden',
  },
  mentionDropdownInner: {
    borderRadius: scale(16), overflow: 'hidden',
  },
  mentionDropdownWeb: {
    backgroundColor: 'rgba(25, 25, 40, 0.95)',
    backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
    borderWidth: 1,
  },
  mentionDropdownBorder: {
    borderWidth: 1, borderRadius: scale(16), overflow: 'hidden',
  },
  mentionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(14), paddingVertical: scale(10),
    gap: scale(10),
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  mentionAvatar: {
    width: scale(30), height: scale(30), borderRadius: scale(10),
  },
  mentionName: { flex: 1, fontSize: moderateScale(14), fontWeight: '500' },

  // Typing indicator
  typingContainer: { paddingHorizontal: scale(20), paddingBottom: scale(6) },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(14), paddingVertical: scale(8),
    borderRadius: scale(16), borderWidth: 1, alignSelf: 'flex-start', gap: scale(8),
  },
  typingDots: { flexDirection: 'row', gap: scale(4) },
  typingDot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
  typingText: { fontSize: moderateScale(12) },

  // Scroll to bottom
  scrollBottomBtn: { alignSelf: 'center', marginBottom: scale(6), zIndex: 10 },
  scrollBottomPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(14), paddingVertical: scale(8),
    borderRadius: scale(20), gap: scale(4),
  },
  scrollBottomText: { color: '#FFFFFF', fontSize: moderateScale(12), fontWeight: '600' },

  // Reply bar
  replyBar: { paddingHorizontal: scale(16), overflow: 'hidden' },
  replyBarInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(12), paddingVertical: scale(8),
    borderRadius: scale(14), borderWidth: 1, gap: scale(8),
  },
  replyBarAccent: { width: scale(3), height: scale(28), borderRadius: scale(2) },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: moderateScale(12), fontWeight: '600' },
  replyBarText: { fontSize: moderateScale(12) },
  replyBarClose: { padding: scale(4) },

  // Image preview
  imagePreviewBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(12), paddingVertical: scale(8),
    marginHorizontal: scale(16), marginBottom: scale(4),
    borderRadius: scale(14), borderWidth: 1, gap: scale(10),
  },
  imagePreviewThumb: { width: scale(44), height: scale(44), borderRadius: scale(10) },
  imagePreviewText: { flex: 1, fontSize: moderateScale(14), fontWeight: '500' },
  imagePreviewClose: { padding: scale(6) },

  // Input area
  inputSection: { paddingBottom: Platform.OS === 'ios' ? 0 : scale(8) },
  inputBlur: { overflow: 'hidden', borderTopWidth: 1 },
  inputGlass: { borderTopWidth: 1 },
  inputGlassInner: { borderTopWidth: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(14), paddingVertical: scale(10),
    gap: scale(8),
  },
  inputIconBtn: {
    width: scale(42), height: scale(42), borderRadius: scale(21),
    alignItems: 'center', justifyContent: 'center',
  },
  inputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: scale(22), borderWidth: 1,
    paddingLeft: scale(14), paddingRight: scale(6), minHeight: scale(42),
  },
  input: { flex: 1, fontSize: moderateScale(14), paddingVertical: 0, maxHeight: scale(80) },
  inputAttachBtn: {
    width: scale(32), height: scale(32), borderRadius: scale(16),
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtn: {
    width: scale(42), height: scale(42), borderRadius: scale(21),
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
    paddingHorizontal: scale(20), paddingVertical: scale(10),
    borderBottomWidth: 1,
  },
  actionPreviewText: { fontSize: moderateScale(13), fontStyle: 'italic' },
  actionReactionsRow: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: scale(12), gap: scale(8),
  },
  actionReactionBtn: {
    width: scale(48), height: scale(48), borderRadius: scale(16),
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'transparent',
  },
  actionReactionEmoji: { fontSize: moderateScale(24) },
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

  // Lightbox
  lightboxOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxContainer: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: scale(50), right: scale(20), zIndex: 10, padding: scale(10) },
  lightboxImage: { width: '90%', height: '70%' },

  // Glass Toast Alert
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? scale(60) : scale(40),
    left: scale(16),
    right: scale(16),
    zIndex: 9999,
    elevation: 9999,
  },
  toastGlass: {
    borderRadius: scale(16),
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  toastGlassWeb: {
    backgroundColor: 'rgba(15, 10, 30, 0.94)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
  },
  toastNativeBg: {
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    gap: scale(10),
  },
  toastIconBg: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  toastMessage: {
    fontSize: moderateScale(11),
    marginTop: scale(1),
    lineHeight: moderateScale(15),
  },
  toastDismiss: {
    padding: scale(6),
    borderRadius: scale(10),
  },
  toastProgressBar: {
    height: scale(3),
    borderBottomLeftRadius: scale(16),
    borderBottomRightRadius: scale(16),
    opacity: 0.6,
  },
});

export default RoomChatScreen;
