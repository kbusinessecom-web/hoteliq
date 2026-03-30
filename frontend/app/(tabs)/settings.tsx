import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import notificationService from '../../services/notifications';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadConversations();
    checkNotificationStatus();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.conversations.getAll();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const checkNotificationStatus = async () => {
    if (!Device.isDevice) {
      setNotificationsEnabled(false);
      return;
    }
    try {
      const { status } = await (await import('expo-notifications')).getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch {
      setNotificationsEnabled(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!Device.isDevice) {
      Alert.alert('Non disponible', 'Les notifications push ne sont pas disponibles sur le web/simulateur.');
      return;
    }
    
    if (!notificationsEnabled) {
      const token = await notificationService.registerPushToken();
      if (token) {
        setNotificationsEnabled(true);
        Alert.alert('Succès', 'Notifications activées !');
      } else {
        Alert.alert('Erreur', 'Impossible d\'activer les notifications. Vérifiez les permissions dans les paramètres de l\'appareil.');
      }
    } else {
      Alert.alert('Info', 'Pour désactiver les notifications, allez dans les paramètres de l\'appareil.');
    }
  };

  const handleTestNotification = async () => {
    if (conversations.length === 0) {
      Alert.alert('Erreur', 'Aucune conversation disponible pour tester.');
      return;
    }

    setIsSimulating(true);
    try {
      // Pick a random conversation
      const randomConv = conversations[Math.floor(Math.random() * conversations.length)];
      
      // Simulate incoming message
      await api.webhook.simulateIncoming(
        randomConv.conversation_id,
        'Bonjour, j\'ai une question concernant ma réservation. Pouvez-vous m\'aider ?'
      );
      
      Alert.alert(
        'Message simulé !',
        'Un message entrant a été simulé. Vous devriez recevoir une notification push sur votre appareil mobile.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de simuler le message.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleLocalTestNotification = async () => {
    try {
      await notificationService.sendLocalNotification(
        '🔔 Test HotelIQ',
        'Ceci est une notification de test locale !',
        { type: 'test' }
      );
      Alert.alert('Succès', 'Notification locale envoyée !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer la notification.');
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };
  
  const SettingItem = ({
    icon,
    label,
    value,
    onPress,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        pressed && { backgroundColor: Colors.neutral[50] },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color={Colors.neutral[600]} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
      )}
    </Pressable>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Paramètres</Text>
        </View>
        
        {/* User Info */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {user?.picture ? (
                <Text>Image</Text>
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role}</Text>
              </View>
            </View>
          </View>
        </Card>
        
        {/* Hotel Section */}
        <Text style={styles.sectionTitle}>Hôtel</Text>
        <Card style={styles.section}>
          <SettingItem
            icon="business"
            label="Informations de l'hôtel"
            onPress={() => Alert.alert('En cours', 'Fonctionnalité à venir')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="link"
            label="Canaux connectés"
            value="4"
            onPress={() => Alert.alert('En cours', 'Fonctionnalité à venir')}
          />
        </Card>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications Push</Text>
        <Card style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={24} color={Colors.neutral[600]} />
              <Text style={styles.settingLabel}>Activer les notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[400] }}
              thumbColor={notificationsEnabled ? Colors.primary[600] : Colors.neutral[100]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.notificationTestSection}>
            <Text style={styles.notificationInfo}>
              {Platform.OS === 'web' 
                ? '⚠️ Les notifications push ne sont pas disponibles sur le web. Testez sur un appareil mobile via Expo Go.'
                : '🔔 Testez les notifications push pour vous assurer qu\'elles fonctionnent correctement.'}
            </Text>
            <View style={styles.testButtons}>
              <Button
                title="Test local"
                variant="secondary"
                size="sm"
                onPress={handleLocalTestNotification}
                style={styles.testButton}
              />
              <Button
                title={isSimulating ? 'Simulation...' : 'Simuler message entrant'}
                variant="primary"
                size="sm"
                onPress={handleTestNotification}
                disabled={isSimulating}
                style={styles.testButton}
              />
            </View>
          </View>
        </Card>
        
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Compte</Text>
        <Card style={styles.section}>
          <SettingItem
            icon="person"
            label="Profil"
            onPress={() => Alert.alert('En cours', 'Fonctionnalité à venir')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="shield-checkmark"
            label="Sécurité"
            onPress={() => Alert.alert('En cours', 'Fonctionnalité à venir')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="shield-checkmark"
            label="Sécurité"
            onPress={() => Alert.alert('En cours', 'Fonctionnalité à venir')}
          />
        </Card>
        
        {/* About Section */}
        <Text style={styles.sectionTitle}>À propos</Text>
        <Card style={styles.section}>
          <SettingItem icon="information-circle" label="Version" value="1.0.0" />
          <View style={styles.divider} />
          <SettingItem
            icon="help-circle"
            label="Aide et support"
            onPress={() => Alert.alert('En cours', 'Fonctionnalité à venir')}
          />
        </Card>
        
        {/* Logout Button */}
        <Button
          title="Se déconnecter"
          variant="destructive"
          onPress={handleLogout}
          fullWidth
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scrollContent: {
    padding: Spacing[4],
  },
  header: {
    marginBottom: Spacing[6],
  },
  headerTitle: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  userCard: {
    padding: Spacing[4],
    marginBottom: Spacing[6],
  },
  userInfo: {
    flexDirection: 'row',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  avatarText: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginTop: Spacing[1],
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Spacing[1],
    backgroundColor: Colors.accent[100],
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[700],
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  section: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    minHeight: 56,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  settingLabel: {
    fontSize: FontSize.base,
    color: Colors.neutral[900],
  },
  settingValue: {
    fontSize: FontSize.base,
    color: Colors.neutral[500],
    marginRight: Spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginLeft: Spacing[4] + 24 + Spacing[3],
  },
  notificationTestSection: {
    padding: Spacing[4],
  },
  notificationInfo: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[3],
    lineHeight: 20,
  },
  testButtons: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  testButton: {
    flex: 1,
  },
  logoutButton: {
    marginTop: Spacing[8],
  },
});
