import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import Button from '../components/Button';
import Card from '../components/Card';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

// Cities in Côte d'Azur and Savoie
const CITIES = [
  'Cannes', 'Nice', 'Saint-Tropez', 'Antibes', 'Menton', 'Èze', 'Monaco',
  'Aix-les-Bains', 'Annecy', 'Chambéry', 'Megève'
];

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export default function OnboardingScreen() {
  const {
    currentStep,
    hotelName,
    hotelCity,
    roomCount,
    classification,
    seasonType,
    language,
    connectedChannels,
    teamMembers,
    nextStep,
    prevStep,
    updateHotelInfo,
    addChannel,
    removeChannel,
    addTeamMember,
    removeTeamMember,
    completeOnboarding,
  } = useOnboardingStore();
  
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('receptionist');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string; status: string}>>([]);
  const [brandProfile, setBrandProfile] = useState<any>(null);
  
  const canContinueStep1 = hotelName && hotelCity && roomCount > 0;
  const canContinueStep2 = connectedChannels.length > 0;
  const canContinueStep3 = true; // Optional step
  const canContinueStep4 = true; // Optional step
  
  const handleNext = async () => {
    if (currentStep === 1 && !canContinueStep1) {
      Alert.alert('Information manquante', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (currentStep === 1) {
      // Create hotel
      try {
        setIsLoading(true);
        await api.hotels.create({
          name: hotelName,
          city: hotelCity,
          room_count: roomCount,
          classification,
          season_type: seasonType,
          language,
        });
        nextStep();
      } catch (error: any) {
        Alert.alert('Erreur', error.message || 'Impossible de créer l\'hôtel');
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 2 && !canContinueStep2) {
      Alert.alert('Canal requis', 'Connectez au moins un canal pour continuer');
      return;
    } else if (currentStep === 4) {
      // Complete onboarding
      completeOnboarding();
      Alert.alert(
        'Félicitations! 🎉',
        'Votre hôtel est configuré. Bienvenue sur HotelIQ!',
        [{ text: 'Commencer', onPress: () => router.replace('/(tabs)') }]
      );
    } else {
      nextStep();
    }
  };
  
  const handleConnectChannel = async (channel: string) => {
    try {
      setIsLoading(true);
      // Simulate OAuth connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      await api.canals.create({ type: channel });
      addChannel(channel);
      Alert.alert('Succès', `${channel} connecté avec succès`);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Connexion échouée');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddTeamMember = () => {
    if (!newMemberEmail) {
      Alert.alert('Email requis', 'Entrez un email valide');
      return;
    }
    addTeamMember({ email: newMemberEmail, role: newMemberRole });
    setNewMemberEmail('');
  };
  
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return;
      }
      
      const file = result.assets[0];
      
      // Validate file size (max 10MB)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('Fichier trop volumineux', 'Taille maximale: 10MB');
        return;
      }
      
      // Upload document
      setIsLoading(true);
      setUploadProgress(0);
      
      try {
        const uploadResult = await api.documents.upload(
          file.uri,
          file.name,
          file.mimeType || 'application/octet-stream'
        );
        
        setUploadProgress(100);
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'success' }]);
        setBrandProfile(uploadResult.brand_profile);
        
        Alert.alert(
          'Analyse réussie! ✨',
          `Votre IA a appris le ton de votre marque:\n\n"${uploadResult.brand_profile?.tone || 'professionnel'}"\n\nL'IA adaptera désormais ses réponses à votre image de marque.`,
          [{ text: 'Super!' }]
        );
      } catch (error: any) {
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'error' }]);
        Alert.alert('Erreur', error.message || 'Impossible d\'analyser le document');
      } finally {
        setIsLoading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir le sélecteur de fichiers');
    }
  };
  
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.progressStep,
            step <= currentStep && styles.progressStepActive,
          ]}
        />
      ))}
    </View>
  );
  
  const renderStep1 = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Parlez-nous de votre établissement</Text>
      <Text style={styles.stepSubtitle}>
        Ces informations permettent à l'IA d'apprendre la voix de votre hôtel
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nom de l'hôtel *</Text>
        <TextInput
          style={styles.input}
          value={hotelName}
          onChangeText={(text) => updateHotelInfo({ hotelName: text })}
          placeholder="Ex: Le Grand Hôtel de Cannes"
          placeholderTextColor={Colors.neutral[400]}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ville *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.cityGrid}>
            {CITIES.map((city) => (
              <Pressable
                key={city}
                onPress={() => updateHotelInfo({ hotelCity: city })}
                style={[
                  styles.cityChip,
                  hotelCity === city && styles.cityChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    hotelCity === city && styles.cityChipTextActive,
                  ]}
                >
                  {city}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre de chambres *</Text>
        <TextInput
          style={styles.input}
          value={roomCount > 0 ? roomCount.toString() : ''}
          onChangeText={(text) => updateHotelInfo({ roomCount: parseInt(text) || 0 })}
          placeholder="Ex: 45"
          placeholderTextColor={Colors.neutral[400]}
          keyboardType="number-pad"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Classification</Text>
        <View style={styles.toggleGroup}>
          {['4★', '5★'].map((star) => (
            <Pressable
              key={star}
              onPress={() => updateHotelInfo({ classification: star })}
              style={[
                styles.toggleButton,
                classification === star && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  classification === star && styles.toggleButtonTextActive,
                ]}
              >
                {star}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type de saison</Text>
        <View style={styles.toggleGroup}>
          {['Annuel', 'Saisonnier'].map((type) => (
            <Pressable
              key={type}
              onPress={() => updateHotelInfo({ seasonType: type })}
              style={[
                styles.toggleButton,
                seasonType === type && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  seasonType === type && styles.toggleButtonTextActive,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Langue principale</Text>
        <View style={styles.languageGrid}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => updateHotelInfo({ language: lang.code })}
              style={[
                styles.languageChip,
                language === lang.code && styles.languageChipActive,
              ]}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageLabel,
                  language === lang.code && styles.languageLabelActive,
                ]}
              >
                {lang.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
  
  const renderStep2 = () => {
    const channels = [
      { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: Colors.whatsapp },
      { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: Colors.instagram },
      { id: 'email', label: 'Email', icon: 'mail', color: Colors.email },
      { id: 'web', label: 'Site Web', icon: 'globe', color: Colors.web },
    ];
    
    return (
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Connectez vos canaux</Text>
        <Text style={styles.stepSubtitle}>
          Choisissez les plateformes par lesquelles vos clients vous contactent
        </Text>
        
        <View style={styles.channelsGrid}>
          {channels.map((channel) => {
            const isConnected = connectedChannels.includes(channel.id);
            return (
              <Card
                key={channel.id}
                style={[
                  styles.channelCard,
                  isConnected && styles.channelCardConnected,
                ]}
              >
                <View style={[styles.channelIcon, { backgroundColor: `${channel.color}20` }]}>
                  <Ionicons name={channel.icon as any} size={32} color={channel.color} />
                </View>
                <Text style={styles.channelLabel}>{channel.label}</Text>
                {isConnected ? (
                  <View style={styles.connectedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success.DEFAULT} />
                    <Text style={styles.connectedText}>Connecté</Text>
                  </View>
                ) : (
                  <Button
                    title="Connecter"
                    size="sm"
                    onPress={() => handleConnectChannel(channel.id)}
                    loading={isLoading}
                  />
                )}
              </Card>
            );
          })}
        </View>
        
        {connectedChannels.length > 0 && (
          <View style={styles.hint}>
            <Ionicons name="information-circle" size={20} color={Colors.accent[600]} />
            <Text style={styles.hintText}>
              Vous pouvez ajouter d'autres canaux plus tard dans les paramètres
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };
  
  const renderStep3 = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Entraînez l'IA (optionnel)</Text>
      <Text style={styles.stepSubtitle}>
        Uploadez votre FAQ, brochure ou tarifs pour personnaliser l'IA à votre image de marque
      </Text>
      
      <Card style={styles.uploadCard}>
        <Ionicons name="cloud-upload" size={48} color={Colors.accent[600]} />
        <Text style={styles.uploadTitle}>Upload de documents</Text>
        <Text style={styles.uploadText}>
          Formats acceptés: PDF, DOCX, TXT (max 10MB)
        </Text>
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        )}
        
        <Button
          title="Parcourir"
          variant="secondary"
          onPress={handlePickDocument}
          loading={isLoading}
          disabled={isLoading}
        />
      </Card>
      
      {uploadedFiles.length > 0 && (
        <View style={styles.uploadedFiles}>
          <Text style={styles.uploadedFilesTitle}>Documents analysés:</Text>
          {uploadedFiles.map((file, index) => (
            <View key={index} style={styles.uploadedFileItem}>
              <Ionicons
                name={file.status === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={file.status === 'success' ? Colors.success.DEFAULT : Colors.error.DEFAULT}
              />
              <Text style={styles.uploadedFileName}>{file.name}</Text>
            </View>
          ))}
        </View>
      )}
      
      {brandProfile && (
        <Card style={styles.brandProfileCard}>
          <View style={styles.brandProfileHeader}>
            <Ionicons name="sparkles" size={24} color={Colors.accent[600]} />
            <Text style={styles.brandProfileTitle}>Image de marque détectée</Text>
          </View>
          
          {brandProfile.tone && (
            <View style={styles.brandProfileItem}>
              <Text style={styles.brandProfileLabel}>Ton:</Text>
              <Text style={styles.brandProfileValue}>{brandProfile.tone}</Text>
            </View>
          )}
          
          {brandProfile.positioning && (
            <View style={styles.brandProfileItem}>
              <Text style={styles.brandProfileLabel}>Positionnement:</Text>
              <Text style={styles.brandProfileValue}>{brandProfile.positioning}</Text>
            </View>
          )}
          
          {brandProfile.values && brandProfile.values.length > 0 && (
            <View style={styles.brandProfileItem}>
              <Text style={styles.brandProfileLabel}>Valeurs:</Text>
              <Text style={styles.brandProfileValue}>
                {brandProfile.values.slice(0, 3).join(', ')}
              </Text>
            </View>
          )}
        </Card>
      )}
      
      <View style={styles.hint}>
        <Ionicons name="information-circle" size={20} color={Colors.info.DEFAULT} />
        <Text style={styles.hintText}>
          L'IA utilisera ces informations pour adapter le ton et le vocabulaire de ses suggestions
        </Text>
      </View>
    </ScrollView>
  );
  
  const renderStep4 = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Invitez votre équipe (optionnel)</Text>
      <Text style={styles.stepSubtitle}>
        Ils recevront un email avec leur accès. Vous pouvez le faire plus tard.
      </Text>
      
      <Card style={styles.inviteCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={newMemberEmail}
            onChangeText={setNewMemberEmail}
            placeholder="exemple@hotel.com"
            placeholderTextColor={Colors.neutral[400]}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rôle</Text>
          <View style={styles.toggleGroup}>
            {[{ value: 'receptionist', label: 'Réceptionniste' }, { value: 'manager', label: 'Manager' }].map((role) => (
              <Pressable
                key={role.value}
                onPress={() => setNewMemberRole(role.value)}
                style={[
                  styles.toggleButton,
                  newMemberRole === role.value && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    newMemberRole === role.value && styles.toggleButtonTextActive,
                  ]}
                >
                  {role.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        
        <Button
          title="Ajouter"
          variant="secondary"
          onPress={handleAddTeamMember}
          fullWidth
        />
      </Card>
      
      {teamMembers.length > 0 && (
        <View style={styles.teamList}>
          {teamMembers.map((member) => (
            <Card key={member.email} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                <Ionicons name="person-circle" size={32} color={Colors.primary[600]} />
                <View style={styles.memberDetails}>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
              </View>
              <Pressable onPress={() => removeTeamMember(member.email)}>
                <Ionicons name="close-circle" size={24} color={Colors.error.DEFAULT} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="chatbubbles" size={32} color={Colors.primary[600]} />
          <Text style={styles.headerTitle}>HotelIQ</Text>
        </View>
        <Text style={styles.headerStep}>Étape {currentStep} sur 4</Text>
      </View>
      
      {renderProgressBar()}
      
      {/* Content */}
      <View style={styles.content}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <Button
            title="Précédent"
            variant="ghost"
            onPress={prevStep}
            style={styles.footerButton}
          />
        )}
        <Button
          title={currentStep === 4 ? 'Terminer' : 'Continuer'}
          onPress={handleNext}
          loading={isLoading}
          style={[styles.footerButton, styles.footerButtonPrimary]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  header: {
    padding: Spacing[6],
    paddingBottom: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary[700],
  },
  headerStep: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[6],
    marginBottom: Spacing[4],
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: Colors.accent[600],
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: Spacing[6],
  },
  stepTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
  },
  stepSubtitle: {
    fontSize: FontSize.base,
    color: Colors.neutral[600],
    marginBottom: Spacing[6],
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: Spacing[5],
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[700],
    marginBottom: Spacing[2],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Spacing[2],
    padding: Spacing[3],
    fontSize: FontSize.base,
    color: Colors.neutral[900],
  },
  textarea: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Spacing[2],
    padding: Spacing[3],
    fontSize: FontSize.base,
    color: Colors.neutral[900],
    height: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing[3],
  },
  cityGrid: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  cityChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    backgroundColor: Colors.neutral[0],
  },
  cityChipActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  cityChipText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  cityChipTextActive: {
    color: Colors.primary[600],
    fontWeight: FontWeight.semibold,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    backgroundColor: Colors.neutral[0],
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[600],
  },
  toggleButtonText: {
    fontSize: FontSize.base,
    color: Colors.neutral[700],
  },
  toggleButtonTextActive: {
    color: Colors.neutral[0],
    fontWeight: FontWeight.semibold,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    backgroundColor: Colors.neutral[0],
  },
  languageChipActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  languageFlag: {
    fontSize: 20,
  },
  languageLabel: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  languageLabelActive: {
    color: Colors.primary[600],
    fontWeight: FontWeight.semibold,
  },
  channelsGrid: {
    gap: Spacing[3],
  },
  channelCard: {
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  channelCardConnected: {
    borderColor: Colors.success.DEFAULT,
    backgroundColor: Colors.success.light,
  },
  channelIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelLabel: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  connectedText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success.DEFAULT,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    padding: Spacing[3],
    backgroundColor: Colors.accent[50],
    borderRadius: Spacing[2],
    marginTop: Spacing[4],
  },
  hintText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accent[700],
    lineHeight: 20,
  },
  uploadCard: {
    padding: Spacing[8],
    alignItems: 'center',
    gap: Spacing[3],
  },
  uploadTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  uploadText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  orText: {
    textAlign: 'center',
    fontSize: FontSize.base,
    color: Colors.neutral[500],
    marginVertical: Spacing[4],
  },
  questionsCard: {
    padding: Spacing[4],
  },
  questionsTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  inviteCard: {
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  teamList: {
    gap: Spacing[2],
  },
  memberCard: {
    padding: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
  },
  memberDetails: {
    flex: 1,
  },
  memberEmail: {
    fontSize: FontSize.base,
    color: Colors.neutral[900],
  },
  memberRole: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing[6],
    paddingTop: Spacing[4],
    gap: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  footerButton: {
    flex: 1,
  },
  footerButtonPrimary: {},
});
