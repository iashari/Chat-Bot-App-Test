import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const TypingIndicator = () => {
  const { theme } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot, delay) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    };

    Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ]).start();
  }, [dot1, dot2, dot3]);

  const renderDot = (animValue) => {
    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });

    return (
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: theme.textSecondary, transform: [{ translateY }] },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.aiBubble }]}>
      {renderDot(dot1)}
      {renderDot(dot2)}
      {renderDot(dot3)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    marginLeft: 16,
    marginVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
});

export default TypingIndicator;
