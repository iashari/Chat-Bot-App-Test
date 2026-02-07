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
  ScrollView,
  Animated,
  Modal,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Send,
  Mic,
  Paperclip,
  Bot,
  Wand2,
  Code2,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Palette,
  Calculator,
  Languages,
  BarChart3,
  GraduationCap,
  Camera,
  X,
  Trash2,
  Share2,
  Info,
  Volume2,
  VolumeX,
  Flag,
  Download,
  MicOff,
  Sparkles,
  Zap,
} from 'lucide-react-native';

const iconMap = {
  Bot: Bot,
  Code2: Code2,
  Palette: Palette,
  Calculator: Calculator,
  Languages: Languages,
  BarChart3: BarChart3,
  GraduationCap: GraduationCap,
  Sparkles: Sparkles,
  Wand2: Wand2,
  Mic: Mic,
  FileText: FileText,
};

import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import CustomAlert from '../components/CustomAlert';
import { useTheme } from '../context/ThemeContext';
import { sendMessage, sendMessageStream, sendMessageWithImage, getChatById as fetchChatById, clearChatMessages } from '../services/api';
import useResponsive from '../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Base dimensions for scaling (module-level for StyleSheet)
const BASE_WIDTH = 393;
const { width: screenWidth } = Dimensions.get('window');

// Module-level scale functions for StyleSheet.create()
const scale = (size) => {
  const ratio = screenWidth / BASE_WIDTH;
  const newSize = size * ratio;
  const minScale = size * 0.7;
  const maxScale = size * 1.5;
  return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
};

const moderateScale = (size, factor = 0.5) => {
  const ratio = screenWidth / BASE_WIDTH;
  const newSize = size + (size * ratio - size) * factor;
  const minScale = size * 0.85;
  const maxScale = size * 1.3;
  return Math.round(Math.min(Math.max(newSize, minScale), maxScale));
};

const ChatDetailScreen = ({ route, navigation }) => {
  const { conversation } = route.params;
  const { theme } = useTheme();
  const { width, getPadding, isTablet, isDesktop } = useResponsive();
  const [messages, setMessages] = useState(conversation.messages || []);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });
  const [showScrollButton, setShowScrollButton] = useState(false);
  const flatListRef = useRef(null);
  const recognitionRef = useRef(null);
  const hasInitialScrolled = useRef(false);
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;

  const headerAnim = useRef(new Animated.Value(0)).current;
  const emptyAnim = useRef(new Animated.Value(0)).current;
  const emptyScaleAnim = useRef(new Animated.Value(0.9)).current;
  const recordingAnim = useRef(new Animated.Value(1)).current;

  // Consistent purple gradient theme across entire app
  const topicTheme = {
    gradient: [theme.gradient1, theme.gradient2],
    accent: theme.primary,
    ambient1: theme.gradientGlass1 || 'rgba(196, 181, 253, 0.3)',
    ambient2: theme.gradientGlass2 || 'rgba(139, 92, 246, 0.3)',
    glow: '#A78BFA',
  };

  // Load saved messages from backend on mount
  useEffect(() => {
    const loadMessages = async () => {
      if (conversation.id) {
        const result = await fetchChatById(conversation.id);
        if (result.chat && result.chat.messages && result.chat.messages.length > 0) {
          const loaded = result.chat.messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.is_user === 1 || msg.is_user === true,
            time: msg.time || '',
            hasImage: !!msg.image_data,
            imageUri: msg.image_data || null,
          }));
          setMessages(loaded);
          // Scroll to bottom after messages load with animation
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        }
      }
    };
    loadMessages();

    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Show empty state animation when no messages
  useEffect(() => {
    if (messages.length === 0) {
      Animated.parallel([
        Animated.timing(emptyAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.spring(emptyScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [messages.length]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      recordingAnim.setValue(1);
    }
  }, [isRecording]);

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 100);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      if (!hasInitialScrolled.current) {
        hasInitialScrolled.current = true;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      } else {
        scrollToBottom();
      }
    }
  }, [messages, isTyping]);

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    Animated.timing(scrollButtonAnim, {
      toValue: showScrollButton ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollButton]);

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollButton(distanceFromBottom > 150);
  };

  const handleScrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
  };

  const getAIResponse = async (userMessage, imageBase64 = null, currentMessages = null) => {
    setIsTyping(true);
    setShowSuggestions(false);
    setStreamingText('');

    // Use passed history or fall back to current state
    const historyToSend = (currentMessages || messages).filter(
      msg => msg.text && msg.text.trim() && !msg.isStreaming && !msg.isError
    );

    const aiMessageId = `ai-${Date.now()}`;

    try {
      // Use streaming if enabled and no image (streaming with image can be slower)
      if (useStreaming && Platform.OS === 'web' && !imageBase64) {
        // Add placeholder message for streaming
        const placeholderMessage = {
          id: aiMessageId,
          text: '',
          isUser: false,
          isStreaming: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, placeholderMessage]);
        setIsTyping(false); // Hide TypingIndicator since streaming bubble handles it

        // Stream response
        const result = await sendMessageStream(
          userMessage,
          historyToSend,
          conversation.systemPrompt || '',
          conversation.id,
          (chunk, fullText) => {
            // Update the streaming message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId ? { ...msg, text: fullText } : msg
              )
            );
            setStreamingText(fullText);
          }
        );

        setIsTyping(false);

        if (result.error) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, text: result.error, isStreaming: false, isError: true }
                : msg
            )
          );
          return;
        }

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, text: result.response, isStreaming: false }
              : msg
          )
        );
      } else {
        // Non-streaming request (with image support)
        let result;
        if (imageBase64) {
          result = await sendMessageWithImage(
            userMessage,
            imageBase64,
            historyToSend,
            conversation.systemPrompt || '',
            conversation.id
          );
        } else {
          result = await sendMessage(
            userMessage,
            historyToSend,
            conversation.systemPrompt || '',
            conversation.id
          );
        }

        setIsTyping(false);

        if (result.error) {
          let errorText = 'Something went wrong. Please try again.';
          const errorLower = result.error.toLowerCase();
          if (errorLower.includes('rate') || errorLower.includes('limit') || errorLower.includes('quota') || errorLower.includes('429')) {
            errorText = 'Rate limit reached. Please wait a moment and try again.';
          } else if (errorLower.includes('fetch') || errorLower.includes('network') || errorLower.includes('connect')) {
            errorText = 'Connection error. Please check your internet.';
          }

          const errorMessage = {
            id: aiMessageId,
            text: errorText,
            isUser: false,
            isError: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }

        // Add AI response to messages
        const aiMessage = {
          id: aiMessageId,
          text: result.response,
          isUser: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      setIsTyping(false);
      const errorMessage = {
        id: aiMessageId,
        text: 'Connection error. Please check your internet.',
        isUser: false,
        isError: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleSend = () => {
    if (inputText.trim() === '' && !selectedImage) return;
    const userText = inputText.trim() || (selectedImage ? 'What do you see in this image?' : '');

    const newMessage = {
      id: `user-${Date.now()}`,
      text: userText,
      isUser: true,
      hasImage: !!selectedImage,
      imageUri: selectedImage?.uri,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Build the full history including this new message before sending
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText('');

    // Send with or without image, passing the updated history
    if (selectedImage) {
      getAIResponse(userText, selectedImage.base64, updatedMessages);
      setSelectedImage(null);
    } else {
      getAIResponse(userText, null, updatedMessages);
    }
  };

  const handlePromptSelect = (text) => {
    setInputText(text);
    setShowSuggestions(false);
  };

  const handleVoiceInput = () => {
    // Use Web Speech API for web platform
    if (Platform.OS === 'web') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setAlertConfig({ visible: true, title: 'Not Supported', message: 'Speech recognition is not supported in this browser.', type: 'warning', buttons: [{ text: 'OK' }] });
        return;
      }

      if (isRecording) {
        // Stop recording
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsRecording(false);
      } else {
        // Start recording
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInputText(transcript);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            setAlertConfig({ visible: true, title: 'Permission Denied', message: 'Please allow microphone access to use voice input.', type: 'error', buttons: [{ text: 'OK' }] });
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }
    } else {
      // For native platforms, show a message (would need expo-speech or similar)
      setAlertConfig({ visible: true, title: 'Voice Input', message: 'Voice input requires microphone permission on mobile devices.', type: 'info', buttons: [{ text: 'OK' }] });
    }
  };

  const handleAttachment = async (type) => {
    setShowAttachModal(false);

    try {
      let result;

      if (type === 'camera') {
        // Request camera permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setAlertConfig({ visible: true, title: 'Permission Denied', message: 'Camera permission is required to take photos.', type: 'error', buttons: [{ text: 'OK' }] });
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else if (type === 'gallery') {
        // Request gallery permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setAlertConfig({ visible: true, title: 'Permission Denied', message: 'Gallery permission is required to select images.', type: 'error', buttons: [{ text: 'OK' }] });
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else if (type === 'document') {
        // For documents, just show a message for now
        setAlertConfig({ visible: true, title: 'Coming Soon', message: 'Document upload will be available in a future update.', type: 'info', buttons: [{ text: 'OK' }] });
        return;
      }

      if (result && !result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;

        // Attach image to input - user can type a custom question then press send
        setSelectedImage({
          uri: asset.uri,
          base64: base64Image,
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setAlertConfig({ visible: true, title: 'Error', message: 'Failed to pick image. Please try again.', type: 'error', buttons: [{ text: 'OK' }] });
    }
  };

  const handleTool = (tool) => {
    setShowToolsModal(false);
    const prompts = {
      summarize: 'Summarize our conversation.',
      translate: 'Translate to Spanish.',
      simplify: 'Explain simpler.',
      expand: 'Elaborate more.',
    };
    if (prompts[tool]) setInputText(prompts[tool]);
  };

  const handleMenuOption = (option) => {
    setShowOptionsModal(false);
    switch (option) {
      case 'clear':
        setAlertConfig({
          visible: true,
          title: 'Clear Chat',
          message: 'Are you sure you want to clear all messages? This cannot be undone.',
          type: 'warning',
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', onPress: async () => {
              setMessages([]);
              if (conversation?.id) {
                await clearChatMessages(conversation.id);
              }
            }},
          ],
        });
        break;
      case 'mute':
        setIsMuted(!isMuted);
        break;
      default:
        setAlertConfig({ visible: true, title: option, message: `Action: ${option}`, type: 'info', buttons: [{ text: 'OK' }] });
    }
  };

  const renderMessage = ({ item, index }) => (
    <ChatBubble
      message={item.text}
      isUser={item.isUser}
      time={item.time}
      isLast={index === messages.length - 1}
      hasImage={item.hasImage}
      imageUri={item.imageUri}
      isStreaming={item.isStreaming}
      isError={item.isError}
      topicTheme={topicTheme}
      topicIcon={conversation.icon}
    />
  );

  // Topic-specific content
  const getTopicContent = () => {
    const icon = conversation.icon;
    const topicMap = {
      Code2: {
        typingText: 'Coding...',
        emptyTitle: 'Ready to Code',
        emptySubtitle: 'Ask me to write, debug, or explain code',
        placeholder: 'Describe what you want to code...',
        prompts: [
          { icon: Code2, text: 'Fix a bug', color: topicTheme.accent },
          { icon: FileText, text: 'Write a function', color: topicTheme.accent },
          { icon: Sparkles, text: 'Optimize code', color: topicTheme.gradient[1] },
          { icon: Wand2, text: 'Explain code', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Write a React component', 'Debug my code', 'Explain async/await', 'SQL query help'],
      },
      Palette: {
        typingText: 'Creating...',
        emptyTitle: 'Let\'s Create',
        emptySubtitle: 'Ask me about design, art, or creative ideas',
        placeholder: 'What should we create?',
        prompts: [
          { icon: Palette, text: 'Color palette', color: topicTheme.accent },
          { icon: Wand2, text: 'Design ideas', color: topicTheme.accent },
          { icon: Sparkles, text: 'UI inspiration', color: topicTheme.gradient[1] },
          { icon: FileText, text: 'Brand guide', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Design a logo concept', 'Color scheme ideas', 'UI layout tips', 'Font pairing'],
      },
      Calculator: {
        typingText: 'Calculating...',
        emptyTitle: 'Math & Numbers',
        emptySubtitle: 'Ask me to solve equations, analyze data, or calculate',
        placeholder: 'Enter a math problem...',
        prompts: [
          { icon: Calculator, text: 'Solve equation', color: topicTheme.accent },
          { icon: BarChart3, text: 'Analyze data', color: topicTheme.accent },
          { icon: FileText, text: 'Statistics', color: topicTheme.gradient[1] },
          { icon: Sparkles, text: 'Formula help', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Solve a quadratic equation', 'Calculate percentage', 'Statistics help', 'Convert units'],
      },
      Languages: {
        typingText: 'Translating...',
        emptyTitle: 'Language Helper',
        emptySubtitle: 'Translate, learn grammar, or practice languages',
        placeholder: 'Type something to translate...',
        prompts: [
          { icon: Languages, text: 'Translate text', color: topicTheme.accent },
          { icon: FileText, text: 'Grammar check', color: topicTheme.accent },
          { icon: GraduationCap, text: 'Learn phrases', color: topicTheme.gradient[1] },
          { icon: Sparkles, text: 'Pronunciation', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Translate to Spanish', 'Common Japanese phrases', 'English grammar rules', 'French vocabulary'],
      },
      BarChart3: {
        typingText: 'Analyzing...',
        emptyTitle: 'Data Analysis',
        emptySubtitle: 'Analyze trends, create charts, or interpret data',
        placeholder: 'What data do you want to analyze?',
        prompts: [
          { icon: BarChart3, text: 'Analyze trends', color: topicTheme.accent },
          { icon: FileText, text: 'Create report', color: topicTheme.accent },
          { icon: Calculator, text: 'Statistics', color: topicTheme.gradient[1] },
          { icon: Sparkles, text: 'Visualize data', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Analyze sales data', 'Create a chart', 'Statistical summary', 'Predict trends'],
      },
      GraduationCap: {
        typingText: 'Thinking...',
        emptyTitle: 'Study Buddy',
        emptySubtitle: 'Learn new topics, get explanations, or study smarter',
        placeholder: 'What do you want to learn?',
        prompts: [
          { icon: GraduationCap, text: 'Explain topic', color: topicTheme.accent },
          { icon: FileText, text: 'Summarize', color: topicTheme.accent },
          { icon: Sparkles, text: 'Quiz me', color: topicTheme.gradient[1] },
          { icon: Wand2, text: 'Study tips', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Explain quantum physics', 'History of Rome', 'Biology concepts', 'Study techniques'],
      },
      Wand2: {
        typingText: 'Imagining...',
        emptyTitle: 'Creative Writing',
        emptySubtitle: 'Write stories, poems, or brainstorm creative ideas',
        placeholder: 'What should I write about?',
        prompts: [
          { icon: Wand2, text: 'Write a story', color: topicTheme.accent },
          { icon: FileText, text: 'Write a poem', color: topicTheme.accent },
          { icon: Sparkles, text: 'Plot ideas', color: topicTheme.gradient[1] },
          { icon: Bot, text: 'Character design', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Write a short story', 'Create a poem', 'Story plot ideas', 'Character names'],
      },
      Mic: {
        typingText: 'Composing...',
        emptyTitle: 'Music & Audio',
        emptySubtitle: 'Talk about music, lyrics, or audio production',
        placeholder: 'Ask about music or lyrics...',
        prompts: [
          { icon: Mic, text: 'Write lyrics', color: topicTheme.accent },
          { icon: Sparkles, text: 'Song ideas', color: topicTheme.accent },
          { icon: FileText, text: 'Music theory', color: topicTheme.gradient[1] },
          { icon: Wand2, text: 'Chord progression', color: topicTheme.gradient[1] },
        ],
        suggestions: ['Write song lyrics', 'Chord progressions', 'Music theory basics', 'Genre comparison'],
      },
    };

    return topicMap[icon] || {
      typingText: 'Thinking...',
      emptyTitle: 'How can I help you?',
      emptySubtitle: 'Start a conversation or choose a suggestion',
      placeholder: 'Ask me anything...',
      prompts: [
        { icon: Wand2, text: 'Write a story', color: topicTheme.accent },
        { icon: Code2, text: 'Help me code', color: topicTheme.gradient[1] },
        { icon: FileText, text: 'Summarize', color: topicTheme.accent },
        { icon: Sparkles, text: 'Creative ideas', color: topicTheme.gradient[1] },
      ],
      suggestions: ['What can you do?', 'Explain AI', 'Write a poem', 'Debug code'],
    };
  };

  const topicContent = getTopicContent();
  const quickPrompts = topicContent.prompts;
  const suggestions = topicContent.suggestions;
  const IconComponent = iconMap[conversation.icon] || Sparkles;
  const iconColor = conversation.iconColor || theme.primary;

  const renderEmptyChat = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: emptyAnim, transform: [{ scale: emptyScaleAnim }] }]}>
      <View style={styles.emptyIconWrap}>
        <LinearGradient colors={topicTheme.gradient} style={[styles.emptyIconGradient, { shadowColor: topicTheme.glow }]}>
          <IconComponent size={44} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{topicContent.emptyTitle}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {topicContent.emptySubtitle}
      </Text>

      <View style={styles.suggestionsWrap}>
        <Text style={[styles.suggestLabel, { color: theme.textMuted }]}>Try asking:</Text>
        <View style={styles.suggestPills}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.suggestPill, styles.floatingSmall, { backgroundColor: theme.surfaceSecondary }]}
              onPress={() => handlePromptSelect(s)}
            >
              <Text style={[styles.suggestText, { color: theme.textSecondary }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const GlassButton = ({ children, style, onPress }) => {
    if (Platform.OS === 'web') {
      return (
        <TouchableOpacity
          style={[
            styles.glassBtn,
            styles.glassBtnWeb,
            { borderColor: 'rgba(255, 255, 255, 0.15)' },
            style
          ]}
          onPress={onPress}
        >
          {children}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={onPress} style={style}>
        <BlurView intensity={theme.glassBlur || 20} tint={theme.background === '#0A0A0F' ? 'dark' : 'light'} style={styles.glassBtn}>
          <View style={[styles.glassBtnInner, { borderColor: theme.glassBorder }]}>
            {children}
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient background - topic themed */}
      <View style={styles.ambientBackground}>
        <LinearGradient
          colors={[topicTheme.ambient1, 'transparent']}
          style={styles.ambientGradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[topicTheme.ambient2, 'transparent']}
          style={styles.ambientGradient2}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header - Glass Style */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <GlassButton onPress={() => navigation.goBack()} style={styles.headerBtnWrap}>
            <ArrowLeft size={20} color={theme.text} />
          </GlassButton>

          <View style={styles.headerCenter}>
            <LinearGradient colors={topicTheme.gradient} style={[styles.avatarBox, styles.glowIcon, { shadowColor: topicTheme.glow }]}>
              <IconComponent size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{conversation.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: topicTheme.accent }]} />
                <Text style={[styles.statusText, { color: theme.textMuted }]}>Online</Text>
                <View style={[styles.modelBadge, { backgroundColor: `${topicTheme.accent}20`, borderColor: `${topicTheme.accent}40`, borderWidth: 1 }]}>
                  <Sparkles size={10} color={topicTheme.accent} />
                  <Text style={[styles.modelBadgeText, { color: topicTheme.accent }]}>AI</Text>
                </View>
              </View>
            </View>
          </View>

          <GlassButton onPress={() => setShowOptionsModal(true)} style={styles.headerBtnWrap}>
            <MoreVertical size={20} color={theme.text} />
          </GlassButton>
        </Animated.View>

      {/* Chat */}
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messageList, messages.length === 0 && styles.emptyList]}
          style={styles.flatListStyle}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => { if (messages.length > 0 && !showScrollButton) flatListRef.current?.scrollToEnd({ animated: true }); }}
          ListFooterComponent={isTyping ? <TypingIndicator typingText={topicContent.typingText} topicGradient={topicTheme.gradient} topicGlow={topicTheme.glow} /> : null}
          ListEmptyComponent={renderEmptyChat}
        />

        {isRecording && (
          <Animated.View style={[styles.recordingWrap, { transform: [{ scale: recordingAnim }] }]}>
            <LinearGradient colors={[theme.error, '#FF6B6B']} style={styles.recordingBadge}>
              <Mic size={16} color="#FFF" />
              <Text style={styles.recordingText}>Recording...</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={[styles.imagePreviewBar, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreviewThumb} />
            <Text style={[styles.imagePreviewText, { color: theme.text }]}>Type your question about this image</Text>
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.imagePreviewClose}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Animated.View style={[styles.scrollBottomBtn, { opacity: scrollButtonAnim, transform: [{ translateY: scrollButtonAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <TouchableOpacity onPress={handleScrollToBottom} activeOpacity={0.8}>
              <LinearGradient colors={[theme.gradient1, theme.gradient2]} style={styles.scrollBottomGradient}>
                <Text style={styles.scrollBottomText}>New messages ↓</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Input - Glass Style */}
        <View style={styles.inputSection}>
          {Platform.OS === 'web' ? (
            <View style={[styles.inputGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <View style={styles.inputWrapper}>
                <TouchableOpacity style={[styles.inputIconBtn, styles.inputIconGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]} onPress={() => setShowToolsModal(true)}>
                  <Zap size={20} color={topicTheme.accent} />
                </TouchableOpacity>

                <View style={[styles.inputContainer, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={isRecording ? "Listening..." : selectedImage ? "Ask about the image..." : topicContent.placeholder}
                    placeholderTextColor={theme.placeholder}
                    value={inputText}
                    onChangeText={setInputText}
                    maxLength={2000}
                    editable={!isRecording}
                  />
                  <TouchableOpacity style={styles.inputAttachBtn} onPress={() => setShowAttachModal(true)}>
                    <Paperclip size={18} color={selectedImage ? theme.primary : theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={(inputText.trim() || selectedImage) ? handleSend : handleVoiceInput} activeOpacity={0.8}>
                  {(inputText.trim() || selectedImage) ? (
                    <LinearGradient colors={topicTheme.gradient} style={[styles.sendBtn, styles.glowSend, { shadowColor: topicTheme.glow }]}>
                      <Send size={20} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.sendBtn, styles.inputIconGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                      {isRecording ? <MicOff size={20} color={theme.error} /> : <Mic size={20} color={theme.textSecondary} />}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputFooter}>
                {inputText.length > 0 ? (
                  <Text style={[styles.charCount, { color: inputText.length > 1800 ? theme.error : theme.textMuted }]}>
                    {inputText.length}/2000
                  </Text>
                ) : (
                  <View style={styles.poweredByRow}>
                    <Sparkles size={12} color={theme.textMuted} />
                    <Text style={[styles.poweredByText, { color: theme.textMuted }]}>Powered by AI</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <BlurView intensity={30} tint={theme.background === '#0A0A0F' ? 'dark' : 'light'} style={styles.inputBlur}>
              <View style={[styles.inputGlassInner, { borderColor: theme.glassBorder }]}>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity style={[styles.inputIconBtn, styles.inputIconGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]} onPress={() => setShowToolsModal(true)}>
                    <Zap size={20} color={topicTheme.accent} />
                  </TouchableOpacity>

                  <View style={[styles.inputContainer, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder={isRecording ? "Listening..." : selectedImage ? "Ask about the image..." : topicContent.placeholder}
                      placeholderTextColor={theme.placeholder}
                      value={inputText}
                      onChangeText={setInputText}
                      maxLength={2000}
                      editable={!isRecording}
                    />
                    <TouchableOpacity style={styles.inputAttachBtn} onPress={() => setShowAttachModal(true)}>
                      <Paperclip size={18} color={selectedImage ? theme.primary : theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={(inputText.trim() || selectedImage) ? handleSend : handleVoiceInput} activeOpacity={0.8}>
                    {(inputText.trim() || selectedImage) ? (
                      <LinearGradient colors={topicTheme.gradient} style={[styles.sendBtn, styles.glowSend, { shadowColor: topicTheme.glow }]}>
                        <Send size={20} color="#FFFFFF" />
                      </LinearGradient>
                    ) : (
                      <View style={[styles.sendBtn, styles.inputIconGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                        {isRecording ? <MicOff size={20} color={theme.error} /> : <Mic size={20} color={theme.textSecondary} />}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputFooter}>
                  {inputText.length > 0 ? (
                    <Text style={[styles.charCount, { color: inputText.length > 1800 ? theme.error : theme.textMuted }]}>
                      {inputText.length}/2000
                    </Text>
                  ) : (
                    <View style={styles.poweredByRow}>
                      <Sparkles size={12} color={theme.textMuted} />
                      <Text style={[styles.poweredByText, { color: theme.textMuted }]}>Powered by AI</Text>
                    </View>
                  )}
                </View>
              </View>
            </BlurView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={[
            styles.optionsModal,
            Platform.OS === 'web' ? styles.optionsModalGlassWeb : { backgroundColor: theme.surface },
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Options</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {[
              { icon: isMuted ? Volume2 : VolumeX, label: isMuted ? 'Unmute' : 'Mute', key: 'mute' },
              { icon: Share2, label: 'Share', key: 'share' },
              { icon: Download, label: 'Export', key: 'export' },
              { icon: Info, label: 'Info', key: 'info' },
              { icon: Flag, label: 'Report', key: 'report' },
              { icon: Trash2, label: 'Clear', key: 'clear', danger: true },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.optionItem} onPress={() => handleMenuOption(item.key)}>
                <item.icon size={20} color={item.danger ? theme.error : theme.text} />
                <Text style={[styles.optionText, { color: item.danger ? theme.error : theme.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Attachment Modal - Glass Style */}
      <Modal visible={showAttachModal} transparent animationType="slide" onRequestClose={() => setShowAttachModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAttachModal(false)}>
          {Platform.OS === 'web' ? (
            <View style={[
              styles.attachModal,
              {
                backgroundColor: 'rgba(15, 15, 25, 0.85)',
                borderTopWidth: 1,
                borderColor: theme.glassBorder,
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
              }
            ]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.glassHighlight }]} />
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 24 }]}>Attach</Text>
              <View style={styles.attachGrid}>
                {[
                  { icon: Camera, label: 'Camera', color: theme.primary, key: 'camera' },
                  { icon: ImageIcon, label: 'Gallery', color: theme.secondary || theme.primary, key: 'gallery' },
                  { icon: FileText, label: 'Document', color: theme.accent || theme.primary, key: 'document' },
                ].map((item, idx) => (
                  <TouchableOpacity key={idx} style={styles.attachItem} onPress={() => handleAttachment(item.key)}>
                    <LinearGradient colors={[item.color, `${item.color}99`]} style={[styles.attachIcon, styles.glowIcon]}>
                      <item.icon size={26} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.attachLabel, { color: theme.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <BlurView intensity={30} tint={theme.background === '#0A0A0F' ? 'dark' : 'light'} style={[styles.attachModal, { overflow: 'hidden', borderTopWidth: 1 }]}>
              <View style={[{ padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: theme.glassBorder }]}>
                <View style={[styles.modalHandle, { backgroundColor: theme.glassHighlight }]} />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 24 }]}>Attach</Text>
                <View style={styles.attachGrid}>
                  {[
                    { icon: Camera, label: 'Camera', color: theme.primary, key: 'camera' },
                    { icon: ImageIcon, label: 'Gallery', color: theme.secondary || theme.primary, key: 'gallery' },
                    { icon: FileText, label: 'Document', color: theme.accent || theme.primary, key: 'document' },
                  ].map((item, idx) => (
                    <TouchableOpacity key={idx} style={styles.attachItem} onPress={() => handleAttachment(item.key)}>
                      <LinearGradient colors={[item.color, `${item.color}99`]} style={[styles.attachIcon, styles.glowIcon]}>
                        <item.icon size={26} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={[styles.attachLabel, { color: theme.text }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </BlurView>
          )}
        </TouchableOpacity>
      </Modal>

      {/* Tools Modal - Glass Style */}
      <Modal visible={showToolsModal} transparent animationType="slide" onRequestClose={() => setShowToolsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowToolsModal(false)}>
          {Platform.OS === 'web' ? (
            <View style={[styles.attachModal, styles.modalGlass, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.glassHighlight }]} />
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 24 }]}>Quick Tools</Text>
              <View style={styles.attachGrid}>
                {[
                  { icon: FileText, label: 'Summarize', color: theme.primary, key: 'summarize' },
                  { icon: Languages, label: 'Translate', color: theme.secondary || theme.primary, key: 'translate' },
                  { icon: Sparkles, label: 'Simplify', color: theme.accent || theme.primary, key: 'simplify' },
                  { icon: Wand2, label: 'Expand', color: theme.primary, key: 'expand' },
                ].map((item, idx) => (
                  <TouchableOpacity key={idx} style={styles.attachItem} onPress={() => handleTool(item.key)}>
                    <LinearGradient colors={[item.color, `${item.color}99`]} style={[styles.attachIcon, styles.glowIcon]}>
                      <item.icon size={26} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.attachLabel, { color: theme.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <BlurView intensity={40} tint={theme.background === '#0A0A0F' ? 'dark' : 'light'} style={[styles.attachModal, styles.modalGlass]}>
              <View style={[styles.modalGlassInner, { borderColor: theme.glassBorder }]}>
                <View style={[styles.modalHandle, { backgroundColor: theme.glassHighlight }]} />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 24 }]}>Quick Tools</Text>
                <View style={styles.attachGrid}>
                  {[
                    { icon: FileText, label: 'Summarize', color: theme.primary, key: 'summarize' },
                    { icon: Languages, label: 'Translate', color: theme.secondary || theme.primary, key: 'translate' },
                    { icon: Sparkles, label: 'Simplify', color: theme.accent || theme.primary, key: 'simplify' },
                    { icon: Wand2, label: 'Expand', color: theme.primary, key: 'expand' },
                  ].map((item, idx) => (
                    <TouchableOpacity key={idx} style={styles.attachItem} onPress={() => handleTool(item.key)}>
                      <LinearGradient colors={[item.color, `${item.color}99`]} style={[styles.attachIcon, styles.glowIcon]}>
                        <item.icon size={26} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={[styles.attachLabel, { color: theme.text }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </BlurView>
          )}
        </TouchableOpacity>
      </Modal>
      </SafeAreaView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  // Ambient background for glass effect
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ambientGradient1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.6,
  },
  ambientGradient2: {
    position: 'absolute',
    bottom: 100,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.4,
  },
  // Glass button styles
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassBtnWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.4)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  glassBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 22,
  },
  // Glow effects
  glowIcon: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  glowSend: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  headerBtnWrap: {
    // wrapper for glass button
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: scale(12),
  },
  avatarBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    marginRight: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    marginBottom: scale(2),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(6),
  },
  statusText: {
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(10),
    marginLeft: scale(8),
    gap: scale(4),
  },
  modelBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  keyboardView: {
    flex: 1,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  messageList: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    flexGrow: 1,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  flatListStyle: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      overflowX: 'hidden',
    } : {}),
  },
  emptyList: { justifyContent: 'center' },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  emptyIconWrap: {
    marginBottom: scale(24),
  },
  emptyIconGradient: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: scale(12) },
    shadowOpacity: 0.4,
    shadowRadius: scale(20),
    elevation: 12,
  },
  emptyTitle: {
    fontSize: moderateScale(26),
    fontWeight: '700',
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: moderateScale(15),
    textAlign: 'center',
    marginBottom: scale(32),
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 18,
    paddingLeft: 10,
    paddingVertical: 10,
    borderRadius: 50,
    gap: 10,
  },
  promptIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsWrap: { width: '100%' },
  suggestLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suggestPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  suggestText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestBar: {
    paddingVertical: 8,
  },
  suggestBarContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  suggestBarItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  suggestBarText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recordingWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollBottomBtn: {
    alignSelf: 'center',
    marginBottom: 8,
    zIndex: 10,
  },
  scrollBottomGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  scrollBottomText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  inputSection: {
    paddingBottom: 8,
  },
  inputBlur: {
    overflow: 'hidden',
    borderTopWidth: 1,
  },
  inputGlass: {
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  inputGlassInner: {
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    gap: scale(12),
  },
  inputIconGlass: {
    borderWidth: 1,
  },
  inputFooter: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  poweredByText: {
    fontSize: 11,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  inputIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    height: 48,
  },
  inputAttachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 48,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    margin: 16,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
  },
  optionsModalGlassWeb: {
    backgroundColor: 'rgba(30, 30, 40, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  attachModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  attachItem: {
    alignItems: 'center',
    width: 80,
  },
  attachIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  attachLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Glass modal styles
  modalGlass: {
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  modalGlassInner: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  // Image preview styles
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  imagePreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  imagePreviewText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreviewClose: {
    padding: 8,
  },
});

export default ChatDetailScreen;
