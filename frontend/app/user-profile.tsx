import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import Card from '../components/Card';
import Button from '../components/Button';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function UserProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await api.users.updateProfile({ name });
      setUser(updatedUser);
      Alert.alert('Succès', 'Profil mis à jour !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le profil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[800]} />
        </Pressable>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Votre nom"
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.neutral[400]}
            />
            <Text style={styles.inputHint}>L'email ne peut pas être modifié</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences de notification</Text>
          
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="mail" size={20} color={Colors.neutral[600]} />
              <Text style={styles.preferenceLabel}>Notifications par email</Text>
            </View>
            <Text style={styles.preferenceValue}>
              {user?.notification_preferences?.email ? 'Activé' : 'Désactivé'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="notifications" size={20} color={Colors.neutral[600]} />
              <Text style={styles.preferenceLabel}>Notifications push</Text>
            </View>
            <Text style={styles.preferenceValue}>
              {user?.notification_preferences?.push ? 'Activé' : 'Désactivé'}
            </Text>
          </View>
        </Card>

        <Button
          title={isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          onPress={handleSave}
          disabled={isSaving}
          fullWidth
          style={styles.saveButton}
        />

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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  avatarText: {
    fontSize: 36,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  roleText: {
    fontSize: FontSize.sm,
    color: Colors.accent[600],
    fontWeight: FontWeight.medium,
  },
  section: {
    marginBottom: Spacing[4],
    padding: Spacing[4],
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
    marginBottom: Spacing[4],
  },
  inputContainer: {
    marginBottom: Spacing[3],
  },
  inputLabel: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
    fontWeight: FontWeight.medium,
    marginBottom: Spacing[1],
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  inputDisabled: {
    backgroundColor: Colors.neutral[100],
    color: Colors.neutral[500],
  },
  inputHint: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: Spacing[1],
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  preferenceLabel: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  preferenceValue: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: Spacing[2],
  },
  saveButton: {
    marginTop: Spacing[2],
  },
  bottomSpacing: {
    height: Spacing[8],
  },
});
