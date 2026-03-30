import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import Colors from '../constants/Colors';
import Spacing from '../constants/Spacing';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: number;
}

export default function Card({ children, padding = Spacing[4], style, ...props }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
