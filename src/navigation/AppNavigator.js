import React from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MessageCircle, User } from 'lucide-react-native';

import ConversationListScreen from '../screens/ConversationListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Helper function to determine if tab bar should be visible
const getTabBarVisibility = (route) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'ConversationList';
  if (routeName === 'ChatDetail') {
    return 'none';
  }
  return 'flex';
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack (Login/Register)
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Chat Stack (inside Main Tab)
const ChatStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationList" component={ConversationListScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </Stack.Navigator>
  );
};

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { width, height } = useWindowDimensions();

  // Responsive values
  const isVerySmall = width < 320;
  const isSmall = width >= 320 && width < 375;
  const isTablet = width >= 768;

  const rs = {
    tabBarHeight: isVerySmall ? 50 : isSmall ? 54 : isTablet ? 70 : 60,
    tabBarRadius: isVerySmall ? 25 : isSmall ? 27 : isTablet ? 35 : 30,
    tabBarBottom: Platform.OS === 'ios'
      ? (isVerySmall ? 16 : isSmall ? 20 : isTablet ? 40 : 30)
      : (isVerySmall ? 12 : isSmall ? 16 : isTablet ? 30 : 20),
    tabBarHorizontal: isVerySmall ? 40 : isSmall ? 50 : isTablet ? '30%' : 60,
    activeIconSize: isVerySmall ? 36 : isSmall ? 40 : isTablet ? 52 : 44,
    iconSize: isVerySmall ? 16 : isSmall ? 18 : isTablet ? 24 : 20,
  };

  const icons = {
    Chats: MessageCircle,
    Profile: User,
  };

  // Check if we should hide the tab bar (when on ChatDetail screen)
  const currentRoute = state.routes[state.index];
  const { options } = descriptors[currentRoute.key];

  // Check both the computed visibility and options
  const tabBarDisplay = getTabBarVisibility(currentRoute);
  const styleDisplay = options.tabBarStyle?.display;

  if (tabBarDisplay === 'none' || styleDisplay === 'none') {
    return null;
  }

  const tabBarStyle = {
    position: 'absolute',
    bottom: rs.tabBarBottom,
    left: typeof rs.tabBarHorizontal === 'string' ? rs.tabBarHorizontal : rs.tabBarHorizontal,
    right: typeof rs.tabBarHorizontal === 'string' ? rs.tabBarHorizontal : rs.tabBarHorizontal,
    height: rs.tabBarHeight,
    maxWidth: isTablet ? 400 : 300,
    alignSelf: 'center',
  };

  const activeIconStyle = {
    width: rs.activeIconSize,
    height: rs.activeIconSize,
    borderRadius: rs.activeIconSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  };

  const tabItemStyle = {
    flex: 1,
    height: rs.tabBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const glassStyle = {
    flex: 1,
    borderRadius: rs.tabBarRadius,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  };

  return (
    <View style={tabBarStyle}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            glassStyle,
            {
              backgroundColor: 'rgba(30, 30, 40, 0.4)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              shadowColor: theme.glowColor || '#A78BFA',
            },
          ]}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const Icon = icons[route.name];

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={tabItemStyle}
                  activeOpacity={0.7}
                >
                  {isFocused ? (
                    <LinearGradient
                      colors={[theme.gradient1, theme.gradient2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={activeIconStyle}
                    >
                      <Icon size={rs.iconSize} color="#FFFFFF" strokeWidth={2.5} />
                    </LinearGradient>
                  ) : (
                    <Icon size={rs.iconSize} color={theme.tabInactive} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <BlurView
          intensity={80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[glassStyle, { overflow: 'hidden' }]}
        >
          <View style={[{ flex: 1, borderRadius: rs.tabBarRadius, borderWidth: 1 }, { borderColor: 'rgba(255, 255, 255, 0.15)' }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
              {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const Icon = icons[route.name];

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    style={tabItemStyle}
                    activeOpacity={0.7}
                  >
                    {isFocused ? (
                      <LinearGradient
                        colors={[theme.gradient1, theme.gradient2]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={activeIconStyle}
                      >
                        <Icon size={rs.iconSize} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                    ) : (
                      <Icon size={rs.iconSize} color={theme.tabInactive} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </BlurView>
      )}
    </View>
  );
};

// Main Tab Navigator (authenticated)
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatStack}
        options={({ route }) => ({
          tabBarStyle: { display: getTabBarVisibility(route) },
        })}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Loading Screen
const LoadingScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.gradient1, theme.gradient2]}
        style={styles.loadingLogo}
      >
        <MessageCircle size={40} color="#FFFFFF" />
      </LinearGradient>
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
    </View>
  );
};

const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
