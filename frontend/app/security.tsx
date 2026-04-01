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

export default function SecurityScreen() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsSaving(true);
    try {
      await api.users.changePassword(currentPassword, newPassword);
      Alert.alert('Succès', 'Mot de passe modifié avec succès !');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de modifier le mot de passe');
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
        <Text style={styles.headerTitle}>Sécurité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={24} color={Colors.primary[600]} />
            <Text style={styles.sectionTitle}>Mot de passe</Text>
          </View>

          {!isChangingPassword ? (
            <>
              <Text style={styles.sectionDescription}>
                Modifiez votre mot de passe régulièrement pour sécuriser votre compte.
              </Text>
              <Button
                title="Modifier le mot de passe"
                variant="secondary"
                onPress={() => setIsChangingPassword(true)}
              />
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mot de passe actuel</Text>
                <View style={styles.passwordInput}>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.neutral[400]}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={Colors.neutral[500]}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                <View style={styles.passwordInput}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.neutral[400]}
                    secureTextEntry={!showNewPassword}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={Colors.neutral[500]}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
                <TextInput
                  style={[styles.input, styles.fullInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.neutral[400]}
                  secureTextEntry
                />
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="Annuler"
                  variant="secondary"
                  onPress={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={styles.cancelButton}
                />
                <Button
                  title={isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                  onPress={handleChangePassword}
                  disabled={isSaving}
                  style={styles.saveButton}
                />
              </View>
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.success.DEFAULT} />
            <Text style={styles.sectionTitle}>Sessions actives</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Vous êtes actuellement connecté sur cet appareil.
          </Text>
          <View style={styles.sessionItem}>
            <View style={styles.sessionInfo}>
              <Ionicons name="desktop" size={20} color={Colors.neutral[600]} />
              <View>
                <Text style={styles.sessionDevice}>Session actuelle</Text>
                <Text style={styles.sessionDate}>Connecté maintenant</Text>
              </View>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Actif</Text>
            </View>
          </View>
        </Card>

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
  section: {
    marginBottom: Spacing[4],
    padding: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  sectionDescription: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
    lineHeight: 20,
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
  passwordInput: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    paddingRight: 44,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  fullInput: {
    paddingRight: Spacing[3],
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  sessionDevice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.neutral[800],
  },
  sessionDate: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  activeBadge: {
    backgroundColor: Colors.success.light,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.success.DEFAULT,
    fontWeight: FontWeight.medium,
  },
  bottomSpacing: {
    height: Spacing[8],
  },
});
