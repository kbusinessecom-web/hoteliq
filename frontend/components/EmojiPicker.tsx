import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

// Emojis catégorisés pour l'hôtellerie
const EMOJI_CATEGORIES = {
  frequent: {
    label: 'Fréquents',
    icon: 'time',
    emojis: ['👋', '😊', '🙏', '✨', '⭐', '💙', '✅', '🎉'],
  },
  hotel: {
    label: 'Hôtel',
    icon: 'business',
    emojis: ['🏨', '🏩', '🛎️', '🗝️', '🛏️', '🚪', '🪑', '🛋️', '🪟', '🚿', '🧴', '🧻', '🧺'],
  },
  food: {
    label: 'Restaurant',
    icon: 'restaurant',
    emojis: ['🍽️', '🍴', '🥂', '🍾', '🍷', '🍸', '🍹', '☕', '🍰', '🥐', '🧀', '🍕', '🍝'],
  },
  activities: {
    label: 'Activités',
    icon: 'bicycle',
    emojis: ['🏊', '🏖️', '⛱️', '🎾', '⛳', '🎿', '🏄', '🚴', '🧘', '💆', '💅', '🎭', '🎨'],
  },
  celebration: {
    label: 'Célébration',
    icon: 'gift',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎂', '💐', '🌹', '💍', '💒', '🎆', '🎇', '✨'],
  },
  weather: {
    label: 'Météo',
    icon: 'sunny',
    emojis: ['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌈', '❄️', '🌊', '🏔️'],
  },
  transport: {
    label: 'Transport',
    icon: 'car',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚁', '🚢', '⛴️'],
  },
  faces: {
    label: 'Émotions',
    icon: 'happy',
    emojis: ['😊', '😃', '😄', '😁', '😍', '🥰', '😘', '🤗', '🤩', '😎', '🙏', '👍', '👏'],
  },
  symbols: {
    label: 'Symboles',
    icon: 'star',
    emojis: ['⭐', '✨', '💫', '⚡', '🔥', '💎', '👑', '🏆', '🎯', '✅', '❌', '❗', '❓'],
  },
  communication: {
    label: 'Communication',
    icon: 'chatbubble',
    emojis: ['📧', '📞', '📱', '💬', '💭', '📝', '📋', '📅', '🕐', '⏰', '⏱️', '📍', '🗺️'],
  },
};

export default function EmojiPicker({ visible, onClose, onEmojiSelect }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('frequent');
  
  const handleEmojiPress = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close automatically to allow multiple emoji selection
  };
  
  const categories = Object.entries(EMOJI_CATEGORIES);
  const currentEmojis = EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.emojis || [];
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Emojis</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.neutral[700]} />
            </Pressable>
          </View>
          
          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map(([key, category]) => (
              <Pressable
                key={key}
                onPress={() => setSelectedCategory(key)}
                style={[
                  styles.categoryTab,
                  selectedCategory === key && styles.categoryTabActive,
                ]}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === key ? Colors.primary[600] : Colors.neutral[500]}
                />
              </Pressable>
            ))}
          </ScrollView>
          
          {/* Emoji Grid */}
          <ScrollView style={styles.emojiScroll}>
            <View style={styles.emojiGrid}>
              {currentEmojis.map((emoji, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleEmojiPress(emoji)}
                  style={({ pressed }) => [
                    styles.emojiButton,
                    pressed && styles.emojiButtonPressed,
                  ]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          
          {/* Footer with category name */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.label || 'Emojis'}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: Spacing[4],
    borderTopRightRadius: Spacing[4],
    maxHeight: '70%',
    paddingBottom: Spacing[8], // Safe area padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing[1],
  },
  categoryScroll: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  categoryScrollContent: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    gap: Spacing[1],
  },
  categoryTab: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing[2],
    backgroundColor: Colors.neutral[100],
  },
  categoryTabActive: {
    backgroundColor: Colors.primary[50],
  },
  emojiScroll: {
    flex: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing[2],
  },
  emojiButton: {
    width: '12.5%', // 8 emojis per row
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing[1],
  },
  emojiButtonPressed: {
    backgroundColor: Colors.neutral[100],
  },
  emoji: {
    fontSize: 28,
  },
  footer: {
    padding: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    fontWeight: FontWeight.medium,
  },
});
