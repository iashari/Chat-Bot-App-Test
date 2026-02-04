import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const TypingIndicator = ({ typingText = 'Thinking...', topicGradient, topicGlow }) => {
  const { theme } = useTheme();
  const gradientColors = topicGradient || [theme.gradient1, theme.gradient2];
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const animateDot = (dot, delay) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    };

    Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]).start();
  }, [dot1, dot2, dot3]);

  const renderDot = (animValue, index) => {
    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });

    const scale = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.2],
    });

    return (
      <Animated.View
        key={index}
        style={{
          transform: [{ translateY }, { scale }],
        }}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.dot}
        />
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeIn }]}>
      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.aiBubble,
              borderColor: theme.aiBubbleBorder,
            },
          ]}
        >
          {renderDot(dot1, 0)}
          {renderDot(dot2, 1)}
          {renderDot(dot3, 2)}
        </View>
        <Text style={[styles.typingText, { color: theme.textMuted }]}>{typingText}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 24,
    marginVertical: 6,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bubbleWrapper: {
    alignItems: 'flex-start',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typingText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default TypingIndicator;
