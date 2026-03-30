import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import CanalBadge from '../../components/CanalBadge';
import api from '../../services/api';
import { Guest } from '../../types';

export default function GuestsScreen() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    loadGuests();
  }, []);
  
  const loadGuests = async () => {
    try {
      const data = await api.guests.getAll();
      setGuests(data);
    } catch (error) {
      console.error('Failed to load guests:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGuests();
  };
  
  const renderGuest = ({ item }: { item: Guest }) => (
    <Card style={styles.guestCard}>
      <View style={styles.guestHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>{item.name}</Text>
          {item.email && <Text style={styles.guestEmail}>{item.email}</Text>}
          {item.phone && <Text style={styles.guestPhone}>{item.phone}</Text>}
        </View>
      </View>
      
      <View style={styles.guestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="bed" size={16} color={Colors.neutral[600]} />
          <Text style={styles.detailText}>{item.nb_stays} séjour(s)</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color={Colors.accent[600]} />
          <Text style={styles.detailValue}>
            {item.estimated_client_value.toLocaleString('fr-FR')}€
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="language" size={16} color={Colors.neutral[600]} />
          <Text style={styles.detailText}>{item.language.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.channels_used.length > 0 && (
        <View style={styles.channels}>
          {item.channels_used.map((channel) => (
            <CanalBadge key={channel} type={channel} size="sm" showLabel={false} />
          ))}
        </View>
      )}
      
      {item.tags.length > 0 && (
        <View style={styles.tags}>
          {item.tags.map((tag) => (
            <View
              key={tag}
              style={[
                styles.tag,
                tag === 'VIP' && { backgroundColor: Colors.accent[100] },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  tag === 'VIP' && { color: Colors.accent[700] },
                ]}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
        <Text style={styles.headerSubtitle}>
          {guests.length} client{guests.length > 1 ? 's' : ''}
        </Text>
      </View>
      
      <FlatList
        data={guests}
        renderItem={renderGuest}
        keyExtractor={(item) => item.guest_id}
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
            <Ionicons name="people-outline" size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>Aucun client</Text>
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
  listContent: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  guestCard: {
    padding: Spacing[4],
  },
  guestHeader: {
    flexDirection: 'row',
    marginBottom: Spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  guestInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  guestName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  guestEmail: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  guestPhone: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  guestDetails: {
    flexDirection: 'row',
    gap: Spacing[4],
    marginBottom: Spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  detailText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[600],
  },
  channels: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  tag: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
    backgroundColor: Colors.neutral[200],
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[700],
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
