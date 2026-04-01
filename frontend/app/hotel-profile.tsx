import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
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

export default function HotelProfileScreen() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hotel, setHotel] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [classification, setClassification] = useState('');
  const [roomCount, setRoomCount] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [brandProfile, setBrandProfile] = useState('');

  useEffect(() => {
    loadHotel();
  }, []);

  const loadHotel = async () => {
    try {
      const data = await api.hotels.getMy();
      setHotel(data);
      setName(data.name || '');
      setCity(data.city || '');
      setClassification(data.classification || '');
      setRoomCount(String(data.nb_chambres || data.room_count || ''));
      setNotificationEmail(data.notification_email || '');
      setBrandProfile(data.brand_profile || '');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les informations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.hotels.update({
        name,
        city,
        classification,
        room_count: parseInt(roomCount, 10) || 0,
        notification_email: notificationEmail,
        brand_profile: brandProfile,
      });
      Alert.alert('Succès', 'Informations sauvegardées !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder');
    } finally {
      setIsSaving(false);
    }
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
        <Text style={styles.headerTitle}>Profil Hôtel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nom de l'hôtel</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Riviera Palace"
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Ville</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ex: Nice"
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Classification</Text>
              <TextInput
                style={styles.input}
                value={classification}
                onChangeText={setClassification}
                placeholder="Ex: 5★"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: Spacing[3] }]}>
              <Text style={styles.inputLabel}>Nombre de chambres</Text>
              <TextInput
                style={styles.input}
                value={roomCount}
                onChangeText={setRoomCount}
                placeholder="Ex: 45"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Email de notification</Text>
          <Text style={styles.sectionSubtitle}>
            Les rapports hebdomadaires seront envoyés à cette adresse
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={notificationEmail}
              onChangeText={setNotificationEmail}
              placeholder="manager@hotel.com"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Profil de marque IA</Text>
          <Text style={styles.sectionSubtitle}>
            Décrivez le ton, le style et les valeurs de votre hôtel. L'IA utilisera ces informations pour personnaliser ses réponses.
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={brandProfile}
              onChangeText={setBrandProfile}
              placeholder="Ex: Hôtel boutique luxueux avec une atmosphère familiale. Nous privilégions un service personnalisé et chaleureux. Notre clientèle est principalement composée de couples et de familles aisées..."
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
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
  section: {
    marginBottom: Spacing[4],
    padding: Spacing[4],
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing[3],
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
  textArea: {
    minHeight: 120,
    paddingTop: Spacing[3],
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    marginTop: Spacing[2],
  },
  bottomSpacing: {
    height: Spacing[8],
  },
});
