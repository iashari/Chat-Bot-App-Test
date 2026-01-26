import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Sparkles } from 'lucide-react-native';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import { useTheme } from '../context/ThemeContext';

const ChatDetailScreen = ({ route, navigation }) => {
  const { conversation } = route.params;
  const { theme } = useTheme();
  const [messages, setMessages] = useState(conversation.messages || []);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const [newMessageId, setNewMessageId] = useState(null);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const simulateAIResponse = () => {
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const aiResponses = [
        "That's an interesting question! Let me help you with that.",
        "I understand what you're looking for. Here's my suggestion...",
        "Great question! Based on my knowledge, I would recommend...",
        "I'm happy to assist with that. Here's what I think...",
        "Thanks for asking! Let me explain this in detail...",
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const newAIMessage = {
        id: Date.now().toString(),
        text: randomResponse,
        isUser: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setNewMessageId(newAIMessage.id);
      setMessages((prev) => [...prev, newAIMessage]);
    }, 1500);
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setNewMessageId(newMessage.id);
    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    simulateAIResponse();
  };

  const renderMessage = ({ item }) => (
    <ChatBubble
      message={item.text}
      isUser={item.isUser}
      time={item.time}
      animated={item.id === newMessageId}
    />
  );

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceElevated }]}>
        <Sparkles size={48} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Start a conversation
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Ask me anything - I'm here to help!
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {conversation.name}
          </Text>
          <Text style={[styles.headerStatus, { color: theme.primary }]}>
            Online
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.emptyList,
          ]}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          ListEmptyComponent={renderEmptyChat}
        />

        <View style={[styles.inputWrapper, { backgroundColor: theme.headerBackground }]}>
          <View style={[styles.inputContainer, {
            backgroundColor: theme.inputBackground,
            borderColor: theme.inputBorder,
          }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Message AI assistant..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() ? theme.primary : 'transparent',
                },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Send
                size={20}
                color={inputText.trim() ? '#ffffff' : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyList: {
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
    lineHeight: 22,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatDetailScreen;
