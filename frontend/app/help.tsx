import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import Card from '../components/Card';

const FAQ_ITEMS = [
  {
    question: 'Comment connecter WhatsApp Business ?',
    answer: 'Allez dans Paramètres > Intégrations > WhatsApp Business. Vous aurez besoin de votre API Token et Phone Number ID depuis la Meta Developer Console.',
  },
  {
    question: 'Comment fonctionne la suggestion IA ?',
    answer: "L'IA analyse automatiquement les messages entrants et génère une suggestion de réponse personnalisée basée sur le contexte de la conversation et le profil de votre hôtel.",
  },
  {
    question: 'Puis-je modifier les réponses IA avant envoi ?',
    answer: 'Oui ! Chaque suggestion IA peut être modifiée avant envoi. Utilisez le bouton "Modifier" pour ajuster le texte selon vos besoins.',
  },
  {
    question: 'Comment recevoir les rapports hebdomadaires ?',
    answer: "Les rapports sont envoyés automatiquement chaque lundi à 8h à l'adresse email configurée dans Paramètres > Profil Hôtel > Email de notification.",
  },
  {
    question: 'Les notes internes sont-elles visibles par les clients ?',
    answer: 'Non, les notes internes (marquées avec le cadenas) sont uniquement visibles par les membres de votre équipe. Les clients ne les voient jamais.',
  },
];

export default function HelpScreen() {
  const handleContact = () => {
    Linking.openURL('mailto:support@hoteliq.fr?subject=Support HotelIQ');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[800]} />
        </Pressable>
        <Text style={styles.headerTitle}>Aide et Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={handleContact}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary[100] }]}>
              <Ionicons name="mail" size={24} color={Colors.primary[600]} />
            </View>
            <Text style={styles.quickActionText}>Contacter le support</Text>
          </Pressable>
          
          <Pressable style={styles.quickAction} onPress={() => Linking.openURL('https://docs.hoteliq.fr')}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.accent[100] }]}>
              <Ionicons name="book" size={24} color={Colors.accent[600]} />
            </View>
            <Text style={styles.quickActionText}>Documentation</Text>
          </Pressable>
        </View>

        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        
        {FAQ_ITEMS.map((item, index) => (
          <Card key={index} style={styles.faqCard}>
            <View style={styles.faqHeader}>
              <Ionicons name="help-circle" size={20} color={Colors.primary[600]} />
              <Text style={styles.faqQuestion}>{item.question}</Text>
            </View>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </Card>
        ))}

        {/* Contact Info */}
        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Besoin d'aide supplémentaire ?</Text>
          <Text style={styles.contactDescription}>
            Notre équipe support est disponible du lundi au vendredi, de 9h à 18h.
          </Text>
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={18} color={Colors.neutral[600]} />
              <Text style={styles.contactText}>support@hoteliq.fr</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call" size={18} color={Colors.neutral[600]} />
              <Text style={styles.contactText}>+33 1 23 45 67 89</Text>
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
  quickActions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing[4],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  quickActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.neutral[800],
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  faqCard: {
    marginBottom: Spacing[3],
    padding: Spacing[4],
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  faqAnswer: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
    marginLeft: 28,
  },
  contactCard: {
    marginTop: Spacing[4],
    padding: Spacing[4],
    backgroundColor: Colors.primary[50],
  },
  contactTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary[800],
    marginBottom: Spacing[2],
  },
  contactDescription: {
    fontSize: FontSize.sm,
    color: Colors.primary[700],
    marginBottom: Spacing[3],
  },
  contactInfo: {
    gap: Spacing[2],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  contactText: {
    fontSize: FontSize.sm,
    color: Colors.primary[700],
  },
  bottomSpacing: {
    height: Spacing[8],
  },
});
