import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Newspaper, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const InAppNotification = ({ visible, title, body, onPress, onDismiss, duration = 6000 }) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const onPressRef = useRef(onPress);
  const onDismissRef = useRef(onDismiss);

  // Keep refs updated so callbacks work even after unmount
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      // Reset position
      slideAnim.setValue(-150);
      opacityAnim.setValue(0);

      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss (just visual, don't call onDismiss to avoid unmount)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        animateOut(() => {
          if (onDismissRef.current) onDismissRef.current();
        });
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const animateOut = (callback) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    animateOut(() => {
      if (onDismissRef.current) onDismissRef.current();
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Call onPress IMMEDIATELY, then animate out
    if (onPressRef.current) onPressRef.current();
    animateOut(() => {});
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.touchable}>
        <View
          style={[
            styles.content,
            Platform.OS === 'web' && styles.contentWeb,
          ]}
        >
          {/* App icon */}
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            style={styles.iconContainer}
          >
            <Newspaper size={18} color="#FFFFFF" />
          </LinearGradient>

          {/* Text content */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.appName}>Daily AI Digest</Text>
              <Text style={styles.timeText}>now</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{title || 'New Digest Available'}</Text>
            <Text style={styles.body} numberOfLines={2}>{body || 'Your daily news digest is ready. Tap to read.'}</Text>
          </View>

          {/* Action indicator */}
          <View style={styles.actionIndicator}>
            <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Dismiss button */}
      <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={14} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 45, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  contentWeb: {
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  actionIndicator: {
    marginLeft: 8,
  },
  dismissButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 42,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InAppNotification;
