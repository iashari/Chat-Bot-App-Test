import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Animated, Vibration, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MessageSquare, Copy, ThumbsUp, ThumbsDown, RefreshCw, Heart, Flame, Laugh, Bookmark, Share2, Check, CheckCheck, ImageIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import useResponsive from '../hooks/useResponsive';

const ChatBubble = ({ message, isUser, time, isLast, status = 'read', hasImage, imageUri, isStreaming, isError, topicTheme, topicIcon }) => {
  const { theme } = useTheme();
  const { width, scale, moderateScale, isTablet, isDesktop, isVerySmall, isSmall } = useResponsive();

  // Responsive sizes for very small devices
  const rs = {
    bubblePaddingH: isVerySmall ? 12 : isSmall ? 14 : 18,
    bubblePaddingV: isVerySmall ? 10 : isSmall ? 12 : 14,
    bubbleRadius: isVerySmall ? 16 : isSmall ? 18 : 22,
    bubbleRadiusSmall: isVerySmall ? 4 : 6,
    fontSize: isVerySmall ? 13 : isSmall ? 14 : 15,
    lineHeight: isVerySmall ? 19 : isSmall ? 20 : 22,
    timestampSize: isVerySmall ? 9 : isSmall ? 10 : 11,
    avatarSize: isVerySmall ? 28 : isSmall ? 32 : 36,
    avatarRadius: isVerySmall ? 9 : isSmall ? 10 : 12,
    avatarIconSize: isVerySmall ? 12 : isSmall ? 14 : 16,
    marginH: isVerySmall ? 16 : isSmall ? 20 : 24,
    marginV: isVerySmall ? 6 : isSmall ? 7 : 8,
    actionPadH: isVerySmall ? 8 : isSmall ? 10 : 12,
    actionPadV: isVerySmall ? 6 : isSmall ? 7 : 8,
    actionRadius: isVerySmall ? 8 : isSmall ? 9 : 10,
    actionIconSize: isVerySmall ? 12 : isSmall ? 13 : 14,
    gap: isVerySmall ? 4 : isSmall ? 5 : 6,
  };
  const [liked, setLiked] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [showReactions, setShowReactions] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const reactionAnim = useRef(new Animated.Value(0)).current;

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Streaming cursor blink animation
  const cursorAnim = useRef(new Animated.Value(1)).current;
  // Streaming dots pulse animation
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Blinking cursor animation for streaming
  useEffect(() => {
    if (isStreaming) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(cursorAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      blink.start();

      // Pulsing dots with staggered delay
      const dots = Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dot1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot1Anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot3Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );
      dots.start();

      return () => {
        blink.stop();
        dots.stop();
        cursorAnim.setValue(1);
        dot1Anim.setValue(0.3);
        dot2Anim.setValue(0.3);
        dot3Anim.setValue(0.3);
      };
    }
  }, [isStreaming]);

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Copied!', 'Message copied to clipboard');
    }
  };

  const handleLike = (value) => {
    setLiked(liked === value ? null : value);
  };

  const toggleReactions = () => {
    Vibration.vibrate(30);
    setShowReactions(!showReactions);
    Animated.spring(reactionAnim, {
      toValue: showReactions ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const addReaction = (emoji) => {
    if (reactions.includes(emoji)) {
      setReactions(reactions.filter(r => r !== emoji));
    } else {
      setReactions([...reactions, emoji]);
    }
    setShowReactions(false);
    Animated.spring(reactionAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    Vibration.vibrate(30);
  };

  const reactionEmojis = [
    { icon: Heart, color: '#EF4444', name: 'heart' },
    { icon: Flame, color: '#F97316', name: 'fire' },
    { icon: Laugh, color: '#FBBF24', name: 'laugh' },
    { icon: ThumbsUp, color: theme.primary, name: 'thumbsup' },
  ];

  // Calculate responsive bubble max width
  const getBubbleMaxWidth = () => {
    if (Platform.OS === 'web') {
      if (isDesktop) return Math.min(width * 0.5, 500);
      if (isTablet) return Math.min(width * 0.6, 450);
      if (isVerySmall) return width * 0.85;
      return width * 0.78;
    }
    if (isVerySmall) return width * 0.88;
    if (isSmall) return width * 0.85;
    return width * 0.8;
  };

  // Animated button press
  const ActionButton = ({ children, onPress, isActive, activeColor }) => {
    const btnScaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(btnScaleAnim, {
        toValue: 0.9,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(btnScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: btnScaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.actionButtonGlass,
            {
              backgroundColor: theme.glass || theme.surface,
              borderColor: theme.glassBorder,
              paddingHorizontal: rs.actionPadH,
              paddingVertical: rs.actionPadV,
              borderRadius: rs.actionRadius,
            },
            isActive && { backgroundColor: activeColor || theme.primaryGlass || theme.primarySoft }
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SIDE_PADDING = isVerySmall ? 16 : isSmall ? 20 : 24;

  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.userContainer,
          {
            marginVertical: rs.marginV,
            paddingLeft: SIDE_PADDING,
            paddingRight: SIDE_PADDING,
            opacity: fadeAnim,
            transform: [
              { translateX: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={topicTheme?.gradient || [theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.bubble,
            styles.userBubble,
            styles.userBubbleShadow,
            {
              maxWidth: getBubbleMaxWidth(),
              paddingHorizontal: rs.bubblePaddingH,
              paddingVertical: rs.bubblePaddingV,
              borderRadius: rs.bubbleRadius,
              borderBottomRightRadius: rs.bubbleRadiusSmall,
              shadowColor: topicTheme?.glow || '#A78BFA',
            }
          ]}
        >
          {/* Display image if present */}
          {hasImage && imageUri && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUri }}
                style={[styles.messageImage, { borderRadius: rs.avatarRadius }]}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <ImageIcon size={rs.avatarIconSize} color="#FFFFFF" />
              </View>
            </View>
          )}
          <Text style={[
            styles.messageText,
            {
              color: '#FFFFFF',
              fontSize: rs.fontSize,
              lineHeight: rs.lineHeight,
            }
          ]}>
            {message}
          </Text>
          <View style={[styles.userTimestampRow, { marginTop: rs.gap, gap: rs.gap - 2 }]}>
            <Text style={[styles.timestamp, { color: 'rgba(255,255,255,0.7)', fontSize: rs.timestampSize }]}>
              {time}
            </Text>
            {status === 'sent' && <Check size={rs.actionIconSize} color="rgba(255,255,255,0.7)" />}
            {status === 'delivered' && <CheckCheck size={rs.actionIconSize} color="rgba(255,255,255,0.7)" />}
            {status === 'read' && <CheckCheck size={rs.actionIconSize} color="#4ADE80" />}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.aiMessageWrapper,
        {
          marginBottom: rs.marginV + 2,
          paddingLeft: SIDE_PADDING,
          paddingRight: SIDE_PADDING,
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={[styles.container, styles.aiContainer]}>
        <TouchableOpacity
          onLongPress={toggleReactions}
          activeOpacity={0.9}
          delayLongPress={300}
          style={{ maxWidth: getBubbleMaxWidth() }}
        >
          {Platform.OS === 'web' ? (
            <View
              style={[
                styles.bubble,
                styles.aiBubble,
                styles.aiBubbleGlass,
                {
                  backgroundColor: theme.glass || theme.aiBubble,
                  borderColor: theme.glassBorder || theme.aiBubbleBorder,
                  paddingHorizontal: rs.bubblePaddingH,
                  paddingVertical: rs.bubblePaddingV,
                  borderRadius: rs.bubbleRadius,
                  borderBottomLeftRadius: rs.bubbleRadiusSmall,
                },
              ]}
            >
              <Text style={[
                styles.messageText,
                {
                  color: isError ? '#EF4444' : theme.aiBubbleText,
                  fontSize: rs.fontSize,
                  lineHeight: rs.lineHeight,
                }
              ]}>
                {message}
              </Text>
              {isStreaming && (
                <Animated.Text style={{ color: topicTheme?.accent || theme.primary, opacity: cursorAnim, fontSize: rs.fontSize, marginTop: -2 }}>▊</Animated.Text>
              )}
              <View style={[styles.userTimestampRow, { marginTop: rs.gap, gap: rs.gap }]}>
                {isStreaming && (
                  <View style={styles.streamingIndicator}>
                    <Animated.View style={[styles.streamingDot, { opacity: dot1Anim, backgroundColor: topicTheme?.accent || '#A78BFA' }]} />
                    <Animated.View style={[styles.streamingDot, { opacity: dot2Anim, backgroundColor: topicTheme?.accent || '#A78BFA' }]} />
                    <Animated.View style={[styles.streamingDot, { opacity: dot3Anim, backgroundColor: topicTheme?.accent || '#A78BFA' }]} />
                  </View>
                )}
                <Text style={[
                  styles.timestamp,
                  {
                    color: theme.textMuted,
                    fontSize: rs.timestampSize,
                  }
                ]}>
                  {isStreaming ? 'typing...' : time}
                </Text>
              </View>
            </View>
          ) : (
            <BlurView
              intensity={15}
              tint={theme.background === '#0A0A0F' ? 'dark' : 'light'}
              style={[
                styles.bubble,
                styles.aiBubble,
                styles.aiBubbleBlur,
                {
                  borderRadius: rs.bubbleRadius,
                  borderBottomLeftRadius: rs.bubbleRadiusSmall,
                }
              ]}
            >
              <View style={[
                styles.aiBubbleInner,
                {
                  borderColor: theme.glassBorder || theme.aiBubbleBorder,
                  paddingHorizontal: rs.bubblePaddingH,
                  paddingVertical: rs.bubblePaddingV,
                  borderRadius: rs.bubbleRadius,
                  borderBottomLeftRadius: rs.bubbleRadiusSmall,
                }
              ]}>
                <Text style={[
                  styles.messageText,
                  {
                    color: isError ? '#EF4444' : theme.aiBubbleText,
                    fontSize: rs.fontSize,
                    lineHeight: rs.lineHeight,
                  }
                ]}>
                  {message}
                </Text>
                {isStreaming && (
                  <Animated.Text style={{ color: topicTheme?.accent || theme.primary, opacity: cursorAnim, fontSize: rs.fontSize, marginTop: -2 }}>▊</Animated.Text>
                )}
                <View style={[styles.userTimestampRow, { marginTop: rs.gap, gap: rs.gap }]}>
                  {isStreaming && (
                    <View style={styles.streamingIndicator}>
                      <Animated.View style={[styles.streamingDot, { opacity: dot1Anim, backgroundColor: topicTheme?.accent || '#A78BFA' }]} />
                      <Animated.View style={[styles.streamingDot, { opacity: dot2Anim, backgroundColor: topicTheme?.accent || '#A78BFA' }]} />
                      <Animated.View style={[styles.streamingDot, { opacity: dot3Anim, backgroundColor: topicTheme?.accent || '#A78BFA' }]} />
                    </View>
                  )}
                  <Text style={[
                    styles.timestamp,
                    {
                      color: theme.textMuted,
                      fontSize: rs.timestampSize,
                    }
                  ]}>
                    {isStreaming ? 'typing...' : time}
                  </Text>
                </View>
              </View>
            </BlurView>
          )}

          {/* Reactions Display */}
          {reactions.length > 0 && (
            <View style={[styles.reactionsDisplay, { backgroundColor: theme.glass || theme.surface, borderColor: theme.glassBorder }]}>
              {reactionEmojis
                .filter(r => reactions.includes(r.name))
                .map((r, i) => (
                  <r.icon key={i} size={14} color={r.color} />
                ))}
            </View>
          )}

          {/* Reaction Picker */}
          {showReactions && (
            <Animated.View
              style={[
                styles.reactionPicker,
                {
                  backgroundColor: theme.glass || theme.surface,
                  borderColor: theme.glassBorder,
                  opacity: reactionAnim,
                  transform: [{
                    scale: reactionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                },
              ]}
            >
              {reactionEmojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reactionBtn,
                    reactions.includes(emoji.name) && { backgroundColor: `${emoji.color}20` },
                  ]}
                  onPress={() => addReaction(emoji.name)}
                >
                  <emoji.icon size={20} color={emoji.color} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={[
        styles.actionsContainer,
        {
          marginLeft: 0,
          marginTop: rs.gap,
          gap: rs.gap,
          maxWidth: getBubbleMaxWidth(),
        }
      ]}>
        <ActionButton
          onPress={handleCopy}
          isActive={copied}
        >
          <Copy size={rs.actionIconSize} color={copied ? theme.primary : theme.textMuted} />
          {copied && <Text style={[styles.actionText, { color: theme.primary, fontSize: rs.timestampSize }]}>Copied!</Text>}
        </ActionButton>

        <ActionButton
          onPress={() => handleLike('up')}
          isActive={liked === 'up'}
        >
          <ThumbsUp size={rs.actionIconSize} color={liked === 'up' ? theme.primary : theme.textMuted} />
        </ActionButton>

        <ActionButton
          onPress={() => handleLike('down')}
          isActive={liked === 'down'}
          activeColor="rgba(239, 68, 68, 0.1)"
        >
          <ThumbsDown size={rs.actionIconSize} color={liked === 'down' ? '#EF4444' : theme.textMuted} />
        </ActionButton>

        <ActionButton
          onPress={handleSave}
          isActive={isSaved}
        >
          <Bookmark size={rs.actionIconSize} color={isSaved ? theme.primary : theme.textMuted} fill={isSaved ? theme.primary : 'transparent'} />
        </ActionButton>

        <ActionButton
          onPress={() => Alert.alert('Regenerate', 'This would regenerate the response')}
        >
          <RefreshCw size={rs.actionIconSize} color={theme.textMuted} />
        </ActionButton>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  aiMessageWrapper: {
    // Dynamic values applied inline
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
    marginHorizontal: 0,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  bubble: {
    minWidth: 60,
    flexShrink: 1,
  },
  userBubble: {
    // borderBottomRightRadius applied inline
  },
  userBubbleShadow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  aiBubble: {
    overflow: 'hidden',
  },
  aiBubbleGlass: {
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(15px)',
    } : {}),
  },
  aiBubbleBlur: {
    // borderRadius applied inline
  },
  aiBubbleInner: {
    borderWidth: 1,
  },
  messageText: {
    letterSpacing: 0.2,
    flexWrap: 'wrap',
    flexShrink: 1,
    ...(Platform.OS === 'web' ? {
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      whiteSpace: 'pre-wrap',
    } : {}),
  },
  timestamp: {
    alignSelf: 'flex-end',
    fontWeight: '500',
  },
  userTimestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonGlass: {
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '600',
  },
  reactionsDisplay: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  reactionPicker: {
    position: 'absolute',
    top: -50,
    left: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 4,
    borderWidth: 1,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  messageImage: {
    width: 200,
    height: 150,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 6,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
  },
});

// Note: streamingDot color is static in StyleSheet but topic accent is applied via inline style in ChatDetailScreen

export default ChatBubble;
