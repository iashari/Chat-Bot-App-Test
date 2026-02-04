import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  // Device type detection
  const isVerySmall = width < 320; // iPhone SE 1st gen, very old devices
  const isSmall = width >= 320 && width < 375; // iPhone SE 2nd/3rd gen, older Android
  const isMedium = width >= 375 && width < 414; // iPhone X/11/12/13/14
  const isLarge = width >= 414 && width < 768; // iPhone Plus/Max, larger Android
  const isTablet = width >= 768 && width < 1024; // iPad, Android tablets
  const isDesktop = width >= 1024; // Desktop web

  // Scale based on screen width with proper bounds
  const scale = (size) => {
    const ratio = width / BASE_WIDTH;
    const newSize = size * ratio;
    // More aggressive min for very small devices
    const minScale = isVerySmall ? size * 0.6 : size * 0.75;
    const maxScale = isDesktop ? size * 1.8 : isTablet ? size * 1.5 : size * 1.3;
    return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
  };

  // Vertical scale based on height
  const verticalScale = (size) => {
    const ratio = height / BASE_HEIGHT;
    const newSize = size * ratio;
    const minScale = isVerySmall ? size * 0.6 : size * 0.75;
    const maxScale = isDesktop ? size * 1.6 : size * 1.4;
    return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
  };

  // Moderate scaling - less aggressive, good for fonts
  const moderateScale = (size, factor = 0.5) => {
    const ratio = width / BASE_WIDTH;
    const newSize = size + (size * ratio - size) * factor;
    const minScale = isVerySmall ? size * 0.75 : size * 0.85;
    const maxScale = isDesktop ? size * 1.5 : size * 1.3;
    return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
  };

  // Font scale with better limits for readability
  const fontScale = (size) => {
    const scaleFactor = isVerySmall ? 0.2 : isSmall ? 0.25 : 0.3;
    const scaledSize = moderateScale(size, scaleFactor);
    const minSize = isVerySmall ? size * 0.75 : size * 0.85;
    const maxSize = isDesktop ? size * 1.4 : size * 1.25;
    return Math.max(minSize, Math.min(maxSize, scaledSize));
  };

  // Icon scale
  const iconScale = (size) => {
    const scaleFactor = isVerySmall ? 0.25 : isSmall ? 0.3 : 0.4;
    const scaledSize = moderateScale(size, scaleFactor);
    const minSize = isVerySmall ? size * 0.7 : size * 0.8;
    const maxSize = isDesktop ? size * 1.5 : size * 1.3;
    return Math.max(minSize, Math.min(maxSize, scaledSize));
  };

  // Get responsive padding based on screen size
  const getPadding = () => {
    if (isDesktop) return 40;
    if (isTablet) return 32;
    if (isLarge) return 24;
    if (isMedium) return 20;
    if (isSmall) return 16;
    return 12; // Very small
  };

  // Get responsive gap based on screen size
  const getGap = () => {
    if (isDesktop) return 20;
    if (isTablet) return 16;
    if (isLarge) return 14;
    if (isMedium) return 12;
    if (isSmall) return 10;
    return 8;
  };

  // Get responsive border radius
  const getRadius = (size) => {
    if (isVerySmall) return Math.round(size * 0.7);
    if (isSmall) return Math.round(size * 0.85);
    if (isTablet || isDesktop) return Math.round(size * 1.2);
    return size;
  };

  // Get max content width for centering on large screens
  const getMaxWidth = () => {
    if (Platform.OS === 'web') {
      if (isDesktop) return 600;
      if (isTablet) return 500;
    }
    return '100%';
  };

  // Get container style for centering content
  const getContainerStyle = () => {
    if (Platform.OS === 'web' && (isTablet || isDesktop)) {
      return {
        maxWidth: getMaxWidth(),
        width: '100%',
        alignSelf: 'center',
      };
    }
    return { width: '100%' };
  };

  // Get responsive values object for common UI elements
  const getResponsiveValues = () => ({
    // Container
    containerPadding: getPadding(),
    formMaxWidth: isDesktop ? 600 : isTablet ? 500 : 400,

    // Typography
    fontXs: fontScale(10),
    fontSm: fontScale(12),
    fontMd: fontScale(14),
    fontLg: fontScale(16),
    fontXl: fontScale(20),
    fontXxl: fontScale(24),
    fontDisplay: fontScale(32),

    // Icons
    iconXs: iconScale(14),
    iconSm: iconScale(18),
    iconMd: iconScale(22),
    iconLg: iconScale(26),
    iconXl: iconScale(32),

    // Input
    inputHeight: verticalScale(isVerySmall ? 44 : isSmall ? 48 : 52),
    inputRadius: getRadius(isVerySmall ? 8 : isSmall ? 10 : 14),
    inputIconSize: iconScale(isVerySmall ? 28 : isSmall ? 32 : 40),
    inputPadding: isVerySmall ? 6 : isSmall ? 8 : 12,

    // Button
    buttonHeight: verticalScale(isVerySmall ? 40 : isSmall ? 44 : 48),
    buttonRadius: getRadius(isVerySmall ? 8 : isSmall ? 10 : 14),

    // Spacing
    gapXs: isVerySmall ? 4 : isSmall ? 6 : 8,
    gapSm: isVerySmall ? 6 : isSmall ? 8 : 10,
    gapMd: isVerySmall ? 8 : isSmall ? 10 : 12,
    gapLg: isVerySmall ? 10 : isSmall ? 12 : 16,
    gapXl: isVerySmall ? 14 : isSmall ? 16 : 20,

    // Card
    cardRadius: getRadius(isVerySmall ? 12 : isSmall ? 16 : 20),
    cardPadding: isVerySmall ? 10 : isSmall ? 12 : 16,

    // Avatar
    avatarSm: scale(isVerySmall ? 28 : isSmall ? 32 : 36),
    avatarMd: scale(isVerySmall ? 36 : isSmall ? 40 : 48),
    avatarLg: scale(isVerySmall ? 48 : isSmall ? 56 : 64),
  });

  return {
    width,
    height,
    scale,
    verticalScale,
    moderateScale,
    fontScale,
    iconScale,
    getPadding,
    getGap,
    getRadius,
    isVerySmall,
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    isDesktop,
    getMaxWidth,
    getContainerStyle,
    getResponsiveValues,
  };
};

export default useResponsive;
