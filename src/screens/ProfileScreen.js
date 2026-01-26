import React from 'react';
import { View, Text, Image, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Shield,
  HelpCircle,
  LogOut,
  Moon,
  Bell,
  Globe,
} from 'lucide-react-native';
import MenuItem from '../components/MenuItem';
import { userProfile } from '../data/mockData';
import { useTheme } from '../context/ThemeContext';

const ProfileScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const handleMenuPress = (item) => {
    Alert.alert(item, `You tapped on ${item}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileSection, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatarContainer, { borderColor: theme.primary }]}>
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{userProfile.name}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>
            {userProfile.email}
          </Text>
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PREFERENCES
          </Text>
          <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View
              style={[
                styles.darkModeRow,
                { borderBottomColor: theme.border },
              ]}
            >
              <View style={styles.darkModeLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
                  <Moon size={20} color={theme.primary} />
                </View>
                <Text style={[styles.darkModeLabel, { color: theme.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={'#ffffff'}
              />
            </View>
            <MenuItem
              icon={Bell}
              label="Notifications"
              onPress={() => handleMenuPress('Notifications')}
            />
            <MenuItem
              icon={Globe}
              label="Language"
              onPress={() => handleMenuPress('Language')}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ACCOUNT
          </Text>
          <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MenuItem
              icon={User}
              label="Account Settings"
              onPress={() => handleMenuPress('Account Settings')}
            />
            <MenuItem
              icon={Shield}
              label="Privacy & Security"
              onPress={() => handleMenuPress('Privacy')}
            />
            <MenuItem
              icon={HelpCircle}
              label="Help Center"
              onPress={() => handleMenuPress('Help Center')}
            />
          </View>

          <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 24 }]}>
            <MenuItem
              icon={LogOut}
              label="Logout"
              onPress={handleLogout}
            />
          </View>

          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  avatarContainer: {
    padding: 4,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  darkModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  darkModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  darkModeLabel: {
    fontSize: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
  },
});

export default ProfileScreen;
