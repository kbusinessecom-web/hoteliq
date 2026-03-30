import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import api from '../services/api';
import { MessageTemplate } from '../types';

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'Tous', icon: 'grid' },
  { key: 'welcome', label: 'Bienvenue', icon: 'hand-left' },
  { key: 'confirmation', label: 'Confirmation', icon: 'checkmark-circle' },
  { key: 'info', label: 'Infos', icon: 'information-circle' },
  { key: 'urgency', label: 'Urgence', icon: 'warning' },
  { key: 'follow_up', label: 'Suivi', icon: 'chatbubble-ellipses' },
  { key: 'upsell', label: 'Upsell', icon: 'star' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
  guestName?: string;
  hotelName?: string;
}

export default function TemplatesPicker({ visible, onClose, onSelect, guestName, hotelName }: Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await api.templates.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveVariables = (content: string): string => {
    return content
      .replace(/\{\{guest_name\}\}/g, guestName || 'Client')
      .replace(/\{\{hotel_name\}\}/g, hotelName || 'notre hôtel')
      .replace(/\{\{room_number\}\}/g, '###')
      .replace(/\{\{checkin_date\}\}/g, 'JJ/MM')
      .replace(/\{\{checkout_date\}\}/g, 'JJ/MM')
      .replace(/\{\{room_type\}\}/g, 'Chambre Deluxe')
      .replace(/\{\{price\}\}/g, '...')
      .replace(/\{\{wifi_password\}\}/g, '...')
      .replace(/\{\{upgrade_price\}\}/g, '...')
      .replace(/\{\{spa_price\}\}/g, '...')
      .replace(/\{\{menu_price\}\}/g, '...')
      .replace(/\{\{booking_link\}\}/g, '...')
      .replace(/\{\{review_link\}\}/g, '...');
  };

  const handleSelect = async (template: MessageTemplate) => {
    const resolved = resolveVariables(template.content);
    onSelect(resolved);
    // Track usage
    try { await api.templates.use(template.template_id); } catch {}
    onClose();
  };

  const filteredTemplates = templates.filter((t) => {
    const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const renderTemplate = ({ item }: { item: MessageTemplate }) => (
    <Pressable style={styles.templateCard} onPress={() => handleSelect(item)}>
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{item.name}</Text>
        <View style={[styles.catBadge, styles[`cat_${item.category}` as keyof typeof styles] || styles.cat_default]}>
          <Text style={styles.catBadgeText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.templatePreview} numberOfLines={2}>
        {resolveVariables(item.content)}
      </Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Modèles de messages</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.neutral[700]} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un modèle..."
            placeholderTextColor={Colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.neutral[400]} />
            </Pressable>
          )}
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryTab,
                selectedCategory === cat.key && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={selectedCategory === cat.key ? Colors.neutral[0] : Colors.neutral[600]}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === cat.key && styles.categoryTabTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Templates List */}
        <FlatList
          data={filteredTemplates}
          renderItem={renderTemplate}
          keyExtractor={(item) => item.template_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={Colors.neutral[300]} />
              <Text style={styles.emptyText}>
                {isLoading ? 'Chargement...' : 'Aucun modèle trouvé'}
              </Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  closeBtn: {
    padding: Spacing[1],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    margin: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.neutral[900],
  },
  categoriesList: {
    paddingHorizontal: Spacing[3],
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Spacing[4],
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  categoryTabActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  categoryTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.neutral[600],
  },
  categoryTabTextActive: {
    color: Colors.neutral[0],
  },
  list: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  templateCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing[3],
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  templateName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
    flex: 1,
    marginRight: Spacing[2],
  },
  templatePreview: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  catBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Spacing[1],
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[0],
    textTransform: 'uppercase',
  },
  cat_welcome: { backgroundColor: Colors.success.DEFAULT },
  cat_confirmation: { backgroundColor: Colors.info.DEFAULT },
  cat_info: { backgroundColor: Colors.primary[600] },
  cat_urgency: { backgroundColor: Colors.error.DEFAULT },
  cat_follow_up: { backgroundColor: Colors.neutral[600] },
  cat_upsell: { backgroundColor: Colors.accent[500] },
  cat_default: { backgroundColor: Colors.neutral[500] },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing[16],
    gap: Spacing[2],
  },
  emptyText: {
    fontSize: FontSize.base,
    color: Colors.neutral[500],
  },
});
