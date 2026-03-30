import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Card from '../components/Card';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuthStore();
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Connexion échouée');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    Alert.alert(
      'Google OAuth',
      'Google social login sera configuré dans la prochaine version. Utilisez les credentials de démo pour le moment.'
    );
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="chatbubbles" size={48} color={Colors.primary[600]} />
          </View>
          <Text style={styles.title}>HotelIQ</Text>
          <Text style={styles.subtitle}>
            L'inbox que vos clients méritent
          </Text>
        </View>
        
        {/* Login Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Connexion</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.neutral[400]}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          
          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            style={styles.loginButton}
          />
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <Pressable style={styles.googleButton} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={20} color={Colors.neutral[700]} />
            <Text style={styles.googleButtonText}>Continuer avec Google</Text>
          </Pressable>
        </Card>
        
        {/* Demo Credentials */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Credentials de démo</Text>
          <Text style={styles.demoText}>Email: manager@riviera-palace.com</Text>
          <Text style={styles.demoText}>Password: demo123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing[6],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary[700],
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  card: {
    marginBottom: Spacing[4],
  },
  cardTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[800],
    marginBottom: Spacing[6],
  },
  inputGroup: {
    marginBottom: Spacing[4],
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
    backgroundColor: Colors.neutral[0],
  },
  loginButton: {
    marginTop: Spacing[2],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[300],
  },
  dividerText: {
    marginHorizontal: Spacing[4],
    color: Colors.neutral[500],
    fontSize: FontSize.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Spacing[2],
    backgroundColor: Colors.neutral[0],
  },
  googleButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[700],
  },
  demoCard: {
    backgroundColor: Colors.accent[50],
    padding: Spacing[4],
    borderRadius: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.accent[200],
  },
  demoTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.accent[800],
    marginBottom: Spacing[2],
  },
  demoText: {
    fontSize: FontSize.sm,
    color: Colors.accent[700],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
