import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import CanalBadge from '../../components/CanalBadge';
import api from '../../services/api';
import { Conversation, CanalType } from '../../types';

export default function InboxScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<CanalType | 'all'>('all');
  
  useEffect(() => {
    loadConversations();
  }, [selectedFilter]);
  
  const loadConversations = async () => {
    try {
      const params = selectedFilter !== 'all' ? { canal_type: selectedFilter } : {};
      const data = await api.conversations.getAll(params);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadConversations();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return Colors.info.DEFAULT;
      case 'in_progress':
        return Colors.warning.DEFAULT;
      case 'resolved':
        return Colors.success.DEFAULT;
      default:
        return Colors.neutral[500];
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Nouveau';
      case 'in_progress':
        return 'En cours';
      case 'waiting':
        return 'En attente';
      case 'resolved':
        return 'Résolu';
      default:
        return status;
    }
  };
  
  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable
      onPress={() => router.push(`/conversation/${item.conversation_id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Card style={styles.conversationCard}>
        <View style={styles.conversationHeader}>
          <CanalBadge type={item.canal_type} size="sm" showLabel={false} />
          <View style={styles.conversationInfo}>
            <Text style={styles.guestName} numberOfLines={1}>
              {item.guest?.name || 'Guest'}
            </Text>
            <Text style={styles.timestamp}>
              {format(new Date(item.last_message_at), 'HH:mm', { locale: fr })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        {item.detected_subject && (
          <Text style={styles.subject}>{item.detected_subject}</Text>
        )}
        
        <Text style={styles.preview} numberOfLines={2}>
          {item.last_message || 'Pas de message'}
        </Text>
        
        {item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
  
  const FilterButton = ({ type, label }: { type: CanalType | 'all'; label: string }) => (
    <Pressable
      onPress={() => setSelectedFilter(type)}
      style={[
        styles.filterButton,
        selectedFilter === type && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === type && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
        <Text style={styles.headerSubtitle}>
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
        </Text>
      </View>
      
      {/* Filters */}
      <View style={styles.filters}>
        <FilterButton type="all" label="Tous" />
        <FilterButton type={CanalType.WHATSAPP} label="WhatsApp" />
        <FilterButton type={CanalType.INSTAGRAM} label="Instagram" />
        <FilterButton type={CanalType.EMAIL} label="Email" />
        <FilterButton type={CanalType.WEB} label="Web" />
      </View>
      
      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.conversation_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[600]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>Aucune conversation</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    padding: Spacing[6],
    paddingBottom: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginTop: Spacing[1],
  },
  filters: {
    flexDirection: 'row',
    padding: Spacing[4],
    gap: Spacing[2],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  filterButton: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Spacing[5],
    backgroundColor: Colors.neutral[100],
  },
  filterButtonActive: {
    backgroundColor: Colors.primary[600],
  },
  filterButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[700],
  },
  filterButtonTextActive: {
    color: Colors.neutral[0],
  },
  listContent: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  conversationCard: {
    padding: Spacing[4],
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
    gap: Spacing[2],
  },
  conversationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    flex: 1,
  },
  timestamp: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  statusBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  subject: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[600],
    marginBottom: Spacing[1],
  },
  preview: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing[1],
    marginTop: Spacing[2],
  },
  tag: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
    backgroundColor: Colors.accent[100],
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.accent[700],
    fontWeight: FontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing[16],
  },
  emptyText: {
    marginTop: Spacing[4],
    fontSize: FontSize.lg,
    color: Colors.neutral[500],
  },
});
