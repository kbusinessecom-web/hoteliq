import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { CanalType } from '../types';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';

interface CanalBadgeProps {
  type: CanalType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const CANAL_CONFIG = {
  [CanalType.WHATSAPP]: {
    icon: 'logo-whatsapp' as const,
    label: 'WhatsApp',
    color: Colors.whatsapp,
    bgColor: '#25D36620',
  },
  [CanalType.INSTAGRAM]: {
    icon: 'logo-instagram' as const,
    label: 'Instagram',
    color: Colors.instagram,
    bgColor: '#E1306C20',
  },
  [CanalType.EMAIL]: {
    icon: 'mail' as const,
    label: 'Email',
    color: Colors.email,
    bgColor: '#1A3C7A20',
  },
  [CanalType.WEB]: {
    icon: 'globe' as const,
    label: 'Web',
    color: Colors.web,
    bgColor: '#C4952A20',
  },
};

export default function CanalBadge({ type, size = 'md', showLabel = true }: CanalBadgeProps) {
  const config = CANAL_CONFIG[type];
  const iconSize = size === 'sm' ? 16 : 20;
  
  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color, fontSize: size === 'sm' ? FontSize.xs : FontSize.sm }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
    gap: Spacing[1],
  },
  label: {
    fontWeight: FontWeight.semibold,
  },
});
