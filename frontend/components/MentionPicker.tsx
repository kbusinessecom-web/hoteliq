import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import { User } from '../types';

interface Props {
  visible: boolean;
  query: string;
  teamMembers: User[];
  onSelect: (user: User) => void;
}

export default function MentionPicker({ visible, query, teamMembers, onSelect }: Props) {
  if (!visible) return null;

  const filtered = teamMembers.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => onSelect(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{item.role}</Text>
            </View>
          </Pressable>
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Spacing[2],
    marginHorizontal: Spacing[3],
    marginBottom: Spacing[1],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  role: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textTransform: 'capitalize',
  },
});
