import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ConversationItem = ({ conversation, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
            {conversation.timestamp}
          </Text>
        </View>
        <Text
          style={[styles.lastMessage, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {conversation.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
});

export default ConversationItem;
