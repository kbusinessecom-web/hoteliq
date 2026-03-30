import React from 'react';
import { View, Text, StyleSheet, Pressable, PressableProps } from 'react-native';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? Colors.neutral[300] : Colors.primary[600],
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: Colors.neutral[0],
          borderColor: Colors.primary[600],
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: Colors.neutral[300],
        };
      case 'destructive':
        return {
          backgroundColor: disabled ? Colors.neutral[300] : Colors.error.DEFAULT,
          borderColor: 'transparent',
        };
    }
  };
  
  const getTextColor = () => {
    if (disabled) return Colors.neutral[500];
    switch (variant) {
      case 'primary':
      case 'destructive':
        return Colors.neutral[0];
      case 'secondary':
        return Colors.primary[600];
      case 'ghost':
        return Colors.neutral[700];
    }
  };
  
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], fontSize: FontSize.sm };
      case 'md':
        return { paddingVertical: Spacing[3], paddingHorizontal: Spacing[4], fontSize: FontSize.base };
      case 'lg':
        return { paddingVertical: Spacing[4], paddingHorizontal: Spacing[6], fontSize: FontSize.lg };
    }
  };
  
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variantStyles,
        {
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          opacity: pressed ? 0.8 : 1,
          width: fullWidth ? '100%' : 'auto',
        },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      <Text
        style={[
          styles.text,
          { color: getTextColor(), fontSize: sizeStyles.fontSize },
          loading && { opacity: 0 },
        ]}
      >
        {loading ? 'Chargement...' : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing[2],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: FontWeight.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});
