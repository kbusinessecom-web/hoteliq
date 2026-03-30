import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import { ConversationInsight, InsightType, InsightStatus } from '../types';
import api from '../services/api';

const INSIGHT_CONFIG = {
  [InsightType.UPSELL]: {
    icon: 'trending-up',
    color: Colors.accent[600],
    bg: Colors.accent[50],
    border: Colors.accent[200],
    label: 'Upsell',
  },
  [InsightType.LOYALTY]: {
    icon: 'heart',
    color: Colors.primary[600],
    bg: Colors.primary[50],
    border: Colors.primary[200],
    label: 'Fidélité',
  },
  [InsightType.REVIEW]: {
    icon: 'star',
    color: Colors.warning.dark,
    bg: Colors.warning.light,
    border: Colors.warning.DEFAULT,
    label: 'Avis',
  },
};

interface Props {
  insight: ConversationInsight;
  onUse: (message: string, insightId: string) => void;
  onDismiss: (insightId: string) => void;
  compact?: boolean;
}

export default function AIInsightCard({ insight, onUse, onDismiss, compact = false }: Props) {
  const config = INSIGHT_CONFIG[insight.insight_type] || INSIGHT_CONFIG[InsightType.UPSELL];
  const isDone = insight.status !== InsightStatus.PENDING;

  const handleDismiss = () => {
    Alert.alert(
      'Ignorer cette opportunité ?',
      'Elle sera masquée de vos recommandations.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ignorer',
          style: 'destructive',
          onPress: () => onDismiss(insight.insight_id),
        },
      ]
    );
  };

  return (
    <View style={[styles.card, { borderColor: config.border, opacity: isDone ? 0.5 : 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={14} color={config.color} />
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>

        {insight.insight_type === InsightType.UPSELL && insight.potential_revenue > 0 && (
          <View style={styles.revenueBadge}>
            <Text style={styles.revenueText}>+{insight.potential_revenue}€</Text>
          </View>
        )}

        {!isDone && (
          <Pressable onPress={handleDismiss} style={styles.dismissBtn} hitSlop={8}>
            <Ionicons name="close" size={16} color={Colors.neutral[400]} />
          </Pressable>
        )}
      </View>

      {/* Guest name */}
      {insight.guest_name && (
        <Text style={styles.guestName}>{insight.guest_name}</Text>
      )}

      {/* Title */}
      <Text style={styles.title}>{insight.title}</Text>

      {/* Description (hidden in compact mode) */}
      {!compact && (
        <Text style={styles.description}>{insight.description}</Text>
      )}

      {/* Suggested message preview */}
      <View style={styles.messagePreview}>
        <Ionicons name="chatbubble-ellipses" size={12} color={Colors.neutral[400]} />
        <Text style={styles.messagePreviewText} numberOfLines={compact ? 1 : 2}>
          {insight.suggested_message}
        </Text>
      </View>

      {/* Actions */}
      {!isDone && (
        <Pressable
          style={[styles.useBtn, { backgroundColor: config.color }]}
          onPress={() => onUse(insight.suggested_message, insight.insight_id)}
        >
          <Ionicons name="send" size={14} color={Colors.neutral[0]} />
          <Text style={styles.useBtnText}>Utiliser ce message</Text>
        </Pressable>
      )}

      {isDone && (
        <View style={styles.doneRow}>
          <Ionicons
            name={insight.status === InsightStatus.SENT ? 'checkmark-circle' : 'close-circle'}
            size={14}
            color={insight.status === InsightStatus.SENT ? Colors.success.DEFAULT : Colors.neutral[400]}
          />
          <Text style={styles.doneText}>
            {insight.status === InsightStatus.SENT ? 'Message envoyé' : 'Ignoré'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing[3],
    padding: Spacing[3],
    borderWidth: 1,
    marginBottom: Spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Spacing[1],
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  revenueBadge: {
    backgroundColor: Colors.success.light,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Spacing[1],
    marginLeft: 'auto',
  },
  revenueText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.success.dark,
  },
  dismissBtn: {
    padding: 2,
    marginLeft: 'auto',
  },
  guestName: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 18,
    marginBottom: Spacing[2],
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[1],
    backgroundColor: Colors.neutral[50],
    borderRadius: Spacing[2],
    padding: Spacing[2],
    marginBottom: Spacing[2],
  },
  messagePreviewText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
    fontStyle: 'italic',
    lineHeight: 18,
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
    borderRadius: Spacing[2],
  },
  useBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[0],
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingTop: Spacing[1],
  },
  doneText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
});
