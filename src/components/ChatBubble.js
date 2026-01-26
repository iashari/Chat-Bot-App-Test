import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ChatBubble = ({ message, isUser, time, animated = false }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(animated ? 0.8 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animated, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubbleColor }]
            : [styles.aiBubble, {
                backgroundColor: theme.aiBubbleColor || theme.aiBubble,
                borderColor: theme.border,
                borderWidth: 1,
              }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: isUser ? theme.userBubbleText : theme.aiBubbleText },
          ]}
        >
          {message}
        </Text>
        <Text
          style={[
            styles.timestamp,
            {
              color: isUser
                ? 'rgba(255,255,255,0.6)'
                : theme.textSecondary,
            },
          ]}
        >
          {time}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  aiBubble: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
});

export default ChatBubble;
