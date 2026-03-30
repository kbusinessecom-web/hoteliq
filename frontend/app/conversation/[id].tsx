import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import Button from '../../components/Button';
import CanalBadge from '../../components/CanalBadge';
import EmojiPicker from '../../components/EmojiPicker';
import TemplatesPicker from '../../components/TemplatesPicker';
import MentionPicker from '../../components/MentionPicker';
import AIInsightCard from '../../components/AIInsightCard';
import api from '../../services/api';
import websocketService from '../../services/websocket';
import { Conversation, Message, MessageDirection, MessageAuthor, MessageType, Guest, AISuggestion, User, ConversationInsight, InsightStatus } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showGuestPanel, setShowGuestPanel] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [hotelName, setHotelName] = useState<string>('');
  const [insights, setInsights] = useState<ConversationInsight[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [isAnalyzingInsights, setIsAnalyzingInsights] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  useEffect(() => {
    loadConversation();
    loadTeamMembers();
    loadInsights();
    registerPushNotifications();
    
    // Setup WebSocket listeners
    websocketService.onNewMessage(handleNewMessage);
    websocketService.onUserTyping(handleUserTyping);
    websocketService.onUserTypingStop(handleUserTypingStop);
    
    // Join conversation room
    websocketService.joinConversation(id);
    
    return () => {
      // Cleanup
      websocketService.offNewMessage();
      websocketService.offUserTyping();
      websocketService.offUserTypingStop();
      websocketService.leaveConversation(id);
    };
  }, [id]);
  
  const loadTeamMembers = async () => {
    try {
      const members = await api.users.getTeam();
      // Exclude current user
      setTeamMembers(members.filter((m: User) => m.user_id !== user?.user_id));
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const data = await api.aiInsights.getAll({ conversation_id: id, status: 'pending' });
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const handleAnalyzeConversation = async () => {
    setIsAnalyzingInsights(true);
    try {
      const result = await api.aiInsights.analyze(id);
      setInsights(result.insights || []);
      setShowInsights(true);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'analyser la conversation");
    } finally {
      setIsAnalyzingInsights(false);
    }
  };

  const handleUseInsight = async (message: string, insightId: string) => {
    try {
      await api.aiInsights.updateStatus(insightId, 'sent');
      setInsights((prev) => prev.filter((i) => i.insight_id !== insightId));
    } catch {}
    setMessageText(message);
    setShowInsights(false);
    inputRef.current?.focus();
  };

  const handleDismissInsight = async (insightId: string) => {
    try {
      await api.aiInsights.updateStatus(insightId, 'dismissed');
      setInsights((prev) => prev.filter((i) => i.insight_id !== insightId));
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const registerPushNotifications = async () => {
    try {
      if (!Device.isDevice) return; // Skip in simulator/web
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const deviceType = Platform.OS;
      await api.pushTokens.register(tokenData.data, deviceType);
      console.log('📲 Push token registered');
    } catch (error) {
      console.error('Push notification setup failed (expected on web):', error);
    }
  };

  const handleMentionSelect = (selectedUser: User) => {
    // Insert @name in text, replace the @query part
    const atIndex = messageText.lastIndexOf('@');
    const beforeAt = messageText.substring(0, atIndex);
    const newText = `${beforeAt}@${selectedUser.name} `;
    setMessageText(newText);
    setPendingMentions((prev) => [...prev, selectedUser.user_id]);
    setShowMentionPicker(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const handleNewMessage = (data: any) => {
    if (data.conversation_id === id) {
      console.log('📨 New message received via WebSocket');
      const newMessage: Message = data.message;
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.message_id === newMessage.message_id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  
  const handleUserTyping = (data: any) => {
    if (data.conversation_id === id) {
      setTypingUser(data.user_name);
    }
  };
  
  const handleUserTypingStop = (data: any) => {
    if (data.conversation_id === id) {
      setTypingUser(null);
    }
  };
  
  const handleTextChange = (text: string) => {
    setMessageText(text);
    
    // Detect @mention
    const atIndex = text.lastIndexOf('@');
    if (atIndex >= 0) {
      const afterAt = text.substring(atIndex + 1);
      // Only show if no space after @
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        setMentionQuery(afterAt);
        setShowMentionPicker(true);
        // Auto-switch to internal note when @mention
        if (!isInternalNote) setIsInternalNote(true);
      } else {
        setShowMentionPicker(false);
        setMentionQuery('');
      }
    } else {
      setShowMentionPicker(false);
      setMentionQuery('');
    }
    
    // Emit typing start
    if (text.length > 0 && user) {
      websocketService.emitTypingStart(id, user.name);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        websocketService.emitTypingStop(id);
      }, 3000);
    } else {
      websocketService.emitTypingStop(id);
    }
  };
  
  const loadConversation = async () => {
    try {
      setIsLoading(true);
      
      // Load conversation
      const convData = await api.conversations.getById(id);
      setConversation(convData);
      
      // Load messages
      const messagesData = await api.conversations.getMessages(id);
      setMessages(messagesData);
      
      // Load guest
      const guestData = await api.guests.getById(convData.guest_id);
      setGuest(guestData);
      
      // Load hotel name
      try {
        const hotelData = await api.hotels.getMy();
        setHotelName(hotelData.name);
      } catch {}
      
      // Auto-generate AI suggestion if there's a recent guest message
      const lastMessage = messagesData[messagesData.length - 1];
      if (lastMessage && lastMessage.direction === MessageDirection.INBOUND) {
        await generateAISuggestion(lastMessage.content, guestData.language);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      Alert.alert('Erreur', 'Impossible de charger la conversation');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateAISuggestion = async (guestMessage: string, guestLanguage: string) => {
    try {
      setIsLoadingAI(true);
      const suggestion = await api.ai.getSuggestion(id, guestMessage, guestLanguage);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to generate AI suggestion:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      setIsSending(true);
      const newMessage = await api.conversations.sendMessage(
        id,
        messageText.trim(),
        {
          message_type: isInternalNote ? 'internal_note' : 'normal',
          mentions: pendingMentions,
        }
      );
      setMessages([...messages, newMessage]);
      setMessageText('');
      setAiSuggestion(null);
      setPendingMentions([]);
      setShowMentionPicker(false);
      // Reset internal note mode after sending
      setIsInternalNote(false);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'envoyer le message");
    } finally {
      setIsSending(false);
    }
  };
  
  const handleUseSuggestion = () => {
    if (aiSuggestion) {
      setMessageText(aiSuggestion.suggestion);
      setAiSuggestion(null);
      inputRef.current?.focus();
    }
  };
  
  const handleEmojiSelect = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    // Keep picker open for multiple emoji selection
    // User can close it manually
  };
  
  const handleMarkResolved = async () => {
    try {
      await api.conversations.update(id, { status: 'resolved' });
      Alert.alert('Succès', 'Conversation marquée comme résolue');
      router.back();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isOutbound = item.direction === MessageDirection.OUTBOUND;
    const isAI = item.author === MessageAuthor.AI;
    const isNote = item.message_type === MessageType.INTERNAL_NOTE;
    
    if (isNote) {
      return (
        <View style={styles.noteContainer}>
          <View style={styles.noteBubble}>
            <View style={styles.noteHeader}>
              <Ionicons name="lock-closed" size={12} color={Colors.warning.dark} />
              <Text style={styles.noteLabel}>Note interne</Text>
              {item.author_name && (
                <Text style={styles.noteAuthor}>{item.author_name}</Text>
              )}
            </View>
            <Text style={styles.noteText}>{item.content}</Text>
            <Text style={styles.noteTime}>
              {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOutbound ? styles.messageOutbound : styles.messageInbound,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOutbound ? styles.bubbleOutbound : styles.bubbleInbound,
            isAI && styles.bubbleAI,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOutbound ? styles.textOutbound : styles.textInbound,
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOutbound ? styles.timeOutbound : styles.timeInbound,
              ]}
            >
              {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
            </Text>
            {isAI && (
              <View style={styles.aiIndicator}>
                <Ionicons name="sparkles" size={12} color={Colors.accent[600]} />
                <Text style={styles.aiText}>IA</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <CanalBadge type={conversation!.canal_type} size="sm" showLabel={false} />
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{guest?.name || 'Guest'}</Text>
              {conversation?.detected_subject && (
                <Text style={styles.headerSubtitle}>{conversation.detected_subject}</Text>
              )}
            </View>
          </View>
          
          <Pressable
            onPress={() => setShowGuestPanel(!showGuestPanel)}
            style={styles.headerButton}
          >
            <Ionicons name="information-circle" size={24} color={Colors.primary[600]} />
          </Pressable>
          
          <Pressable
            onPress={handleAnalyzeConversation}
            disabled={isAnalyzingInsights}
            style={styles.headerButton}
          >
            {isAnalyzingInsights ? (
              <ActivityIndicator size="small" color={Colors.accent[600]} />
            ) : (
              <Ionicons name="sparkles" size={22} color={Colors.accent[600]} />
            )}
          </Pressable>
        </View>
        
        {/* Guest Info Panel */}
        {showGuestPanel && guest && (
          <Card style={styles.guestPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.guestInfo}>
                <View style={styles.guestAvatar}>
                  <Text style={styles.guestAvatarText}>
                    {guest.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.guestDetails}>
                  <Text style={styles.guestName}>{guest.name}</Text>
                  {guest.email && <Text style={styles.guestEmail}>{guest.email}</Text>}
                  {guest.phone && <Text style={styles.guestPhone}>{guest.phone}</Text>}
                </View>
                <View style={styles.guestStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="bed" size={16} color={Colors.neutral[600]} />
                    <Text style={styles.statText}>{guest.nb_stays} séjours</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="cash" size={16} color={Colors.accent[600]} />
                    <Text style={styles.statValue}>{guest.estimated_client_value.toLocaleString('fr-FR')}€</Text>
                  </View>
                </View>
                {guest.tags.length > 0 && (
                  <View style={styles.guestTags}>
                    {guest.tags.map(tag => (
                      <View key={tag} style={[styles.tag, tag === 'VIP' && styles.tagVIP]}>
                        <Text style={[styles.tagText, tag === 'VIP' && styles.tagTextVIP]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </Card>
        )}
        
        {/* AI Insights Banner */}
        {insights.length > 0 && (
          <Pressable
            style={styles.insightsBanner}
            onPress={() => setShowInsights(!showInsights)}
          >
            <Ionicons name="sparkles" size={16} color={Colors.accent[600]} />
            <Text style={styles.insightsBannerText}>
              {insights.length} opportunité{insights.length > 1 ? 's' : ''} IA détectée{insights.length > 1 ? 's' : ''}
            </Text>
            <Ionicons
              name={showInsights ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.accent[600]}
            />
          </Pressable>
        )}

        {/* AI Insights Panel */}
        {showInsights && (
          <View style={styles.insightsPanel}>
            <ScrollView style={styles.insightsScroll} nestedScrollEnabled>
              {insights.map((insight) => (
                <AIInsightCard
                  key={insight.insight_id}
                  insight={insight}
                  onUse={handleUseInsight}
                  onDismiss={handleDismissInsight}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={() => (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.emptyText}>Aucun message</Text>
            </View>
          )}
        />
        
        {/* AI Suggestion */}
        {aiSuggestion && (
          <Card style={styles.aiSuggestion}>
            <View style={styles.aiHeader}>
              <View style={styles.aiTitle}>
                <Ionicons name="sparkles" size={20} color={Colors.accent[600]} />
                <Text style={styles.aiTitleText}>Suggestion IA</Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: aiSuggestion.confidence_score > 0.7 ? Colors.success.light : Colors.warning.light }
                ]}>
                  <Text style={[
                    styles.confidenceText,
                    { color: aiSuggestion.confidence_score > 0.7 ? Colors.success.DEFAULT : Colors.warning.DEFAULT }
                  ]}>
                    {Math.round(aiSuggestion.confidence_score * 100)}%
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setAiSuggestion(null)}>
                <Ionicons name="close" size={20} color={Colors.neutral[500]} />
              </Pressable>
            </View>
            <Text style={styles.aiSuggestionText}>{aiSuggestion.suggestion}</Text>
            <View style={styles.aiActions}>
              <Button
                title="Utiliser"
                size="sm"
                onPress={handleUseSuggestion}
                style={styles.aiButton}
              />
              <Button
                title="Modifier"
                variant="secondary"
                size="sm"
                onPress={() => {
                  setMessageText(aiSuggestion.suggestion);
                  setAiSuggestion(null);
                }}
                style={styles.aiButton}
              />
            </View>
          </Card>
        )}
        
        {/* Mention Picker (above composer) */}
        <MentionPicker
          visible={showMentionPicker}
          query={mentionQuery}
          teamMembers={teamMembers}
          onSelect={handleMentionSelect}
        />
        
        {/* Composer */}
        <View style={[styles.composer, isInternalNote && styles.composerNote]}>
          {/* Internal Note Banner */}
          {isInternalNote && (
            <View style={styles.noteBanner}>
              <Ionicons name="lock-closed" size={14} color={Colors.warning.dark} />
              <Text style={styles.noteBannerText}>Note interne — invisible pour le client</Text>
              <Pressable onPress={() => { setIsInternalNote(false); setPendingMentions([]); }}>
                <Ionicons name="close" size={16} color={Colors.warning.dark} />
              </Pressable>
            </View>
          )}
          
          <View style={styles.composerActions}>
            <Pressable
              onPress={handleMarkResolved}
              style={styles.actionButton}
            >
              <Ionicons name="checkmark-circle" size={24} color={Colors.success.DEFAULT} />
            </Pressable>
            
            <Pressable
              onPress={() => setShowEmojiPicker(true)}
              style={styles.actionButton}
            >
              <Ionicons name="happy" size={24} color={Colors.accent[600]} />
            </Pressable>
            
            {/* Templates button */}
            <Pressable
              onPress={() => setShowTemplates(true)}
              style={styles.actionButton}
            >
              <Ionicons name="document-text" size={24} color={Colors.primary[500]} />
            </Pressable>
            
            {/* Internal note toggle */}
            <Pressable
              onPress={() => {
                setIsInternalNote(!isInternalNote);
                if (isInternalNote) setPendingMentions([]);
              }}
              style={[styles.actionButton, isInternalNote && styles.actionButtonActive]}
            >
              <Ionicons
                name={isInternalNote ? 'lock-closed' : 'lock-open'}
                size={22}
                color={isInternalNote ? Colors.warning.dark : Colors.neutral[500]}
              />
            </Pressable>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[styles.input, isInternalNote && styles.inputNote]}
              value={messageText}
              onChangeText={handleTextChange}
              placeholder={isInternalNote ? 'Note interne (@mentionner un collègue)...' : `Répondre via ${conversation?.canal_type}...`}
              placeholderTextColor={Colors.neutral[400]}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!messageText.trim() || isSending}
              style={[
                styles.sendButton,
                isInternalNote && styles.sendButtonNote,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Ionicons
                  name={isInternalNote ? 'lock-closed' : 'send'}
                  size={20}
                  color={messageText.trim() ? Colors.neutral[0] : Colors.neutral[400]}
                />
              )}
            </Pressable>
          </View>
          
          {/* Typing Indicator */}
          {typingUser && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{typingUser} est en train d'écrire...</Text>
            </View>
          )}
        </View>
        
        {/* Emoji Picker */}
        <EmojiPicker
          visible={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onEmojiSelect={handleEmojiSelect}
        />
        
        {/* Templates Picker */}
        <TemplatesPicker
          visible={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={(content) => {
            setMessageText(content);
            inputRef.current?.focus();
          }}
          guestName={guest?.name}
          hotelName={hotelName}
        />
        
        {/* Loading AI Indicator */}
        {isLoadingAI && (
          <View style={styles.loadingAI}>
            <ActivityIndicator size="small" color={Colors.accent[600]} />
            <Text style={styles.loadingAIText}>Génération de suggestion IA...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    marginRight: Spacing[3],
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.accent[600],
  },
  headerButton: {
    marginLeft: Spacing[2],
  },
  guestPanel: {
    margin: Spacing[3],
    padding: Spacing[3],
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  guestDetails: {},
  guestName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  guestEmail: {
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  guestPhone: {
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  guestStats: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  statText: {
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  statValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[600],
  },
  guestTags: {
    flexDirection: 'row',
    gap: Spacing[1],
  },
  tag: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
    backgroundColor: Colors.neutral[200],
  },
  tagVIP: {
    backgroundColor: Colors.accent[100],
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[700],
  },
  tagTextVIP: {
    color: Colors.accent[700],
  },
  messagesList: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  messageContainer: {
    width: '100%',
  },
  messageInbound: {
    alignItems: 'flex-start',
  },
  messageOutbound: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing[3],
    borderRadius: Spacing[3],
  },
  bubbleInbound: {
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  bubbleOutbound: {
    backgroundColor: Colors.primary[600],
  },
  bubbleAI: {
    borderColor: Colors.accent[300],
    borderWidth: 2,
  },
  messageText: {
    fontSize: FontSize.base,
    lineHeight: 22,
  },
  textInbound: {
    color: Colors.neutral[900],
  },
  textOutbound: {
    color: Colors.neutral[0],
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[1],
    gap: Spacing[2],
  },
  messageTime: {
    fontSize: FontSize.xs,
  },
  timeInbound: {
    color: Colors.neutral[500],
  },
  timeOutbound: {
    color: Colors.neutral[0],
    opacity: 0.7,
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  aiText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[600],
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: Spacing[16],
  },
  emptyText: {
    marginTop: Spacing[2],
    fontSize: FontSize.base,
    color: Colors.neutral[500],
  },
  aiSuggestion: {
    margin: Spacing[3],
    padding: Spacing[3],
    backgroundColor: Colors.accent[50],
    borderColor: Colors.accent[300],
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  aiTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  aiTitleText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.accent[700],
  },
  confidenceBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
  },
  confidenceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  aiSuggestionText: {
    fontSize: FontSize.base,
    color: Colors.neutral[900],
    lineHeight: 22,
    marginBottom: Spacing[3],
  },
  aiActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  aiButton: {
    flex: 1,
  },
  composer: {
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    padding: Spacing[3],
  },
  composerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  actionButton: {
    padding: Spacing[1],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    fontSize: FontSize.base,
    color: Colors.neutral[900],
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  loadingAI: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    padding: Spacing[2],
    backgroundColor: Colors.accent[50],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.accent[200],
  },
  loadingAIText: {
    fontSize: FontSize.sm,
    color: Colors.accent[700],
  },
  typingIndicator: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    backgroundColor: Colors.neutral[100],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  typingText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    fontStyle: 'italic',
  },
  // Internal Note styles
  noteContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: Spacing[1],
  },
  noteBubble: {
    width: '90%',
    backgroundColor: Colors.warning.light,
    borderWidth: 1,
    borderColor: Colors.warning.DEFAULT,
    borderRadius: Spacing[3],
    padding: Spacing[3],
    borderStyle: 'dashed',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    marginBottom: Spacing[1],
  },
  noteLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.warning.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteAuthor: {
    fontSize: FontSize.xs,
    color: Colors.warning.dark,
    opacity: 0.8,
    marginLeft: 'auto',
  },
  noteText: {
    fontSize: FontSize.base,
    color: Colors.neutral[800],
    lineHeight: 22,
  },
  noteTime: {
    fontSize: FontSize.xs,
    color: Colors.warning.dark,
    opacity: 0.7,
    marginTop: Spacing[1],
    textAlign: 'right',
  },
  composerNote: {
    borderTopColor: Colors.warning.DEFAULT,
    borderTopWidth: 2,
    backgroundColor: Colors.warning.light,
  },
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[1],
    paddingBottom: Spacing[2],
  },
  noteBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning.dark,
  },
  actionButtonActive: {
    backgroundColor: Colors.warning.light,
    borderRadius: Spacing[1],
  },
  inputNote: {
    borderColor: Colors.warning.DEFAULT,
  },
  sendButtonNote: {
    backgroundColor: Colors.warning.DEFAULT,
  },
  // AI Insights
  insightsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.accent[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent[200],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  insightsBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[700],
  },
  insightsPanel: {
    maxHeight: 280,
    backgroundColor: Colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  insightsScroll: {
    padding: Spacing[3],
  },
});
