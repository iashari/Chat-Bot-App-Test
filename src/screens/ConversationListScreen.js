import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MessageCircle } from 'lucide-react-native';
import ConversationItem from '../components/ConversationItem';
import { conversations as initialConversations } from '../data/mockData';
import { useTheme } from '../context/ThemeContext';

const ConversationListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState(initialConversations);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setConversations(initialConversations);
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatDetail', { conversation });
  };

  const handleNewChat = () => {
    const newConversation = {
      id: Date.now().toString(),
      name: 'New Chat',
      avatar: 'https://ui-avatars.com/api/?name=AI&background=8F37FF&color=fff',
      lastMessage: 'Start a new conversation...',
      timestamp: 'Now',
      messages: [],
    };
    navigation.navigate('ChatDetail', { conversation: newConversation });
  };

  const renderItem = ({ item }) => (
    <ConversationItem
      conversation={item}
      onPress={() => handleConversationPress(item)}
    />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceElevated }]}>
        <MessageCircle size={48} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Start a new chat to begin
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
        <TouchableOpacity
          onPress={handleNewChat}
          style={[styles.newChatButton, { backgroundColor: theme.primary }]}
        >
          <Plus size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={renderEmptyList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
});

export default ConversationListScreen;
