import { Dimensions, PixelRatio } from 'react-native';

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Get current dimensions (for dynamic updates)
export const getScreenDimensions = () => Dimensions.get('window');

// Horizontal scale based on screen width
export const wp = (widthPercent) => {
  const screenWidth = Dimensions.get('window').width;
  return PixelRatio.roundToNearestPixel((screenWidth * widthPercent) / 100);
};

// Vertical scale based on screen height
export const hp = (heightPercent) => {
  const screenHeight = Dimensions.get('window').height;
  return PixelRatio.roundToNearestPixel((screenHeight * heightPercent) / 100);
};

// Scale based on width ratio
export const scale = (size) => {
  const screenWidth = Dimensions.get('window').width;
  return (screenWidth / BASE_WIDTH) * size;
};

// Scale based on height ratio
export const verticalScale = (size) => {
  const screenHeight = Dimensions.get('window').height;
  return (screenHeight / BASE_HEIGHT) * size;
};

// Moderate scale - less aggressive scaling for text and small elements
export const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

// Moderate vertical scale
export const moderateVerticalScale = (size, factor = 0.5) => {
  return size + (verticalScale(size) - size) * factor;
};

// Font scale with limits to prevent too small/large text
export const fontScale = (size) => {
  const scaledSize = moderateScale(size, 0.3);
  const minSize = size * 0.8;
  const maxSize = size * 1.4;
  return Math.max(minSize, Math.min(maxSize, scaledSize));
};

// Icon scale
export const iconScale = (size) => {
  const scaledSize = moderateScale(size, 0.4);
  const minSize = size * 0.85;
  const maxSize = size * 1.3;
  return Math.max(minSize, Math.min(maxSize, scaledSize));
};

// Device type helpers
export const isSmallDevice = () => Dimensions.get('window').width < 375;
export const isMediumDevice = () => {
  const width = Dimensions.get('window').width;
  return width >= 375 && width < 768;
};
export const isLargeDevice = () => Dimensions.get('window').width >= 768;
export const isTablet = () => Dimensions.get('window').width >= 600;

// Get responsive value based on device size
export const responsiveValue = (small, medium, large) => {
  if (isSmallDevice()) return small;
  if (isLargeDevice()) return large;
  return medium;
};

// Spacing helpers
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
};

// Border radius helpers
export const radius = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  round: scale(100),
};

// Common responsive sizes
export const sizes = {
  // Icons
  iconXs: iconScale(14),
  iconSm: iconScale(18),
  iconMd: iconScale(22),
  iconLg: iconScale(26),
  iconXl: iconScale(32),

  // Buttons
  buttonHeight: verticalScale(48),
  buttonHeightSm: verticalScale(40),
  buttonHeightLg: verticalScale(56),

  // Inputs
  inputHeight: verticalScale(52),
  inputIconSize: scale(40),

  // Avatar
  avatarSm: scale(32),
  avatarMd: scale(44),
  avatarLg: scale(56),
  avatarXl: scale(80),

  // Header
  headerHeight: verticalScale(56),
};

// Font sizes
export const fonts = {
  xs: fontScale(11),
  sm: fontScale(13),
  md: fontScale(15),
  lg: fontScale(17),
  xl: fontScale(20),
  xxl: fontScale(24),
  xxxl: fontScale(32),
  display: fontScale(40),
};

export default {
  wp,
  hp,
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
  fontScale,
  iconScale,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isTablet,
  responsiveValue,
  spacing,
  radius,
  sizes,
  fonts,
};
