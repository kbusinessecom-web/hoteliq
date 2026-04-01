import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import Card from '../components/Card';
import api from '../services/api';

interface Channel {
  canal_id: string;
  canal_type: string;
  name: string;
  status: string;
  created_at: string;
}

export default function ChannelsScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await api.canals.getAll();
      setChannels(data || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChannelIcon = (type: string | undefined) => {
    switch (type) {
      case 'whatsapp':
        return { name: 'logo-whatsapp', color: '#25D366' };
      case 'instagram':
        return { name: 'logo-instagram', color: '#E1306C' };
      case 'email':
        return { name: 'mail', color: Colors.primary[600] };
      case 'web':
        return { name: 'globe', color: Colors.accent[500] };
      default:
        return { name: 'chatbubble', color: Colors.neutral[600] };
    }
  };

  const getStatusBadge = (status: string) => {
    const isConnected = status === 'connected';
    return {
      text: isConnected ? 'Connecté' : 'Non connecté',
      bgColor: isConnected ? Colors.success.light : Colors.neutral[100],
      textColor: isConnected ? Colors.success.DEFAULT : Colors.neutral[500],
    };
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
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[800]} />
        </Pressable>
        <Text style={styles.headerTitle}>Canaux connectés</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Gérez vos canaux de communication. Les messages de tous les canaux sont centralisés dans votre inbox.
        </Text>

        {channels.map((channel) => {
          const icon = getChannelIcon(channel.canal_type);
          const status = getStatusBadge(channel.status);

          return (
            <Card key={channel.canal_id} style={styles.channelCard}>
              <View style={styles.channelHeader}>
                <View style={styles.channelInfo}>
                  <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                    <Ionicons name={icon.name as any} size={24} color={icon.color} />
                  </View>
                  <View>
                    <Text style={styles.channelName}>{channel.name || 'Canal'}</Text>
                    <Text style={styles.channelType}>
                      {(channel.canal_type || 'unknown').charAt(0).toUpperCase() + (channel.canal_type || 'unknown').slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.textColor }]} />
                  <Text style={[styles.statusText, { color: status.textColor }]}>
                    {status.text}
                  </Text>
                </View>
              </View>
              
              <Pressable
                style={styles.configureButton}
                onPress={() => router.push('/integrations')}
              >
                <Text style={styles.configureButtonText}>Configurer</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary[600]} />
              </Pressable>
            </Card>
          );
        })}

        {channels.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="link-outline" size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>Aucun canal configuré</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/integrations')}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.addButtonText}>Ajouter un canal</Text>
            </Pressable>
          </Card>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  content: {
    flex: 1,
    padding: Spacing[4],
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
    lineHeight: 20,
  },
  channelCard: {
    marginBottom: Spacing[3],
    padding: Spacing[4],
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  channelType: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    gap: Spacing[1],
  },
  configureButtonText: {
    fontSize: FontSize.sm,
    color: Colors.primary[600],
    fontWeight: FontWeight.medium,
  },
  emptyCard: {
    padding: Spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.base,
    color: Colors.neutral[500],
    marginTop: Spacing[3],
    marginBottom: Spacing[4],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: 8,
    gap: Spacing[2],
  },
  addButtonText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.medium,
  },
  bottomSpacing: {
    height: Spacing[8],
  },
});
