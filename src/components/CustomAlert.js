import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react-native';

const CustomAlert = ({ visible, title, message, buttons = [], type = 'info', onClose }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isSmall = width < 375;
  const modalWidth = Math.min(width * 0.85, 360);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = (onPress) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onPress) onPress();
      if (onClose) onClose();
    });
  };

  const getIcon = () => {
    const iconSize = isSmall ? 32 : 40;
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color="#4ADE80" />;
      case 'error':
        return <XCircle size={iconSize} color="#F87171" />;
      case 'warning':
        return <AlertTriangle size={iconSize} color="#FBBF24" />;
      default:
        return <Info size={iconSize} color={theme.primary} />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(74, 222, 128, 0.15)';
      case 'error':
        return 'rgba(248, 113, 113, 0.15)';
      case 'warning':
        return 'rgba(251, 191, 36, 0.15)';
      default:
        return `${theme.primary}20`;
    }
  };

  const defaultButtons = [{ text: 'OK', style: 'default' }];
  const displayButtons = buttons.length > 0 ? buttons : defaultButtons;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => handleClose()}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={() => handleClose()}>
          <View />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              width: modalWidth,
              backgroundColor: Platform.OS === 'web' ? 'rgba(20, 20, 30, 0.95)' : theme.surface,
              borderColor: theme.glassBorder,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: getIconBgColor(),
                width: isSmall ? 56 : 68,
                height: isSmall ? 56 : 68,
                borderRadius: isSmall ? 18 : 22,
              },
            ]}
          >
            {getIcon()}
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontSize: isSmall ? 17 : 20,
              },
            ]}
          >
            {title}
          </Text>

          {/* Message */}
          <Text
            style={[
              styles.message,
              {
                color: theme.textSecondary,
                fontSize: isSmall ? 13 : 14,
              },
            ]}
          >
            {message}
          </Text>

          {/* Buttons */}
          <View style={[styles.buttonRow, { gap: 10 }]}>
            {displayButtons.map((btn, index) => {
              const isPrimary = btn.style !== 'cancel';
              const isLastButton = index === displayButtons.length - 1;

              if (isPrimary || isLastButton || displayButtons.length === 1) {
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleClose(btn.onPress)}
                    activeOpacity={0.8}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={
                        type === 'error' && isPrimary
                          ? ['#F87171', '#DC2626']
                          : type === 'success' && isPrimary
                          ? ['#4ADE80', '#22C55E']
                          : [theme.gradient1, theme.gradient2]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.button,
                        {
                          height: isSmall ? 42 : 46,
                          borderRadius: isSmall ? 10 : 12,
                        },
                      ]}
                    >
                      <Text style={[styles.buttonTextPrimary, { fontSize: isSmall ? 13 : 15 }]}>
                        {btn.text}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleClose(btn.onPress)}
                  activeOpacity={0.7}
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {
                      flex: 1,
                      height: isSmall ? 42 : 46,
                      borderRadius: isSmall ? 10 : 12,
                      borderColor: theme.glassBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonTextCancel,
                      { color: theme.textSecondary, fontSize: isSmall ? 13 : 15 },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 25,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonTextCancel: {
    fontWeight: '600',
  },
});

export default CustomAlert;
