import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const MenuItem = ({ icon: Icon, label, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
          <Icon size={20} color={theme.primary} />
        </View>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      </View>
      <ChevronRight size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContent: {
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
  label: {
    fontSize: 16,
  },
});

export default MenuItem;
