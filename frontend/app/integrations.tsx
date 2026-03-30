import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Colors from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import Spacing from '../constants/Spacing';
import Card from '../components/Card';
import Button from '../components/Button';
import api from '../services/api';
import { HotelIntegrations, WebhookInfo } from '../types';

// Secure Input Component
interface SecureInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maskedValue?: string;
  disabled?: boolean;
}

const SecureInput: React.FC<SecureInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  maskedValue,
  disabled,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const displayValue = isVisible ? value : (maskedValue || value);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.secureInputWrapper}>
        <TextInput
          style={[styles.input, styles.secureInput, disabled && styles.inputDisabled]}
          value={displayValue}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[400]}
          secureTextEntry={!isVisible && !!maskedValue}
          editable={!disabled}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setIsVisible(!isVisible)}
        >
          <Ionicons
            name={isVisible ? 'eye-off' : 'eye'}
            size={20}
            color={Colors.neutral[500]}
          />
        </Pressable>
      </View>
    </View>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return { bg: Colors.success[50], text: Colors.success[700] };
      case 'connecting':
        return { bg: Colors.warning[50], text: Colors.warning[700] };
      case 'error':
        return { bg: Colors.error[50], text: Colors.error[700] };
      default:
        return { bg: Colors.neutral[100], text: Colors.neutral[600] };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connecté';
      case 'connecting':
        return 'Connexion...';
      case 'error':
        return 'Erreur';
      default:
        return 'Non configuré';
    }
  };

  const colors = getStatusColor();

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: colors.text }]} />
      <Text style={[styles.statusText, { color: colors.text }]}>{getStatusText()}</Text>
    </View>
  );
};

export default function IntegrationsScreen() {
  const [integrations, setIntegrations] = useState<HotelIntegrations | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Form states
  const [whatsappConfig, setWhatsappConfig] = useState({
    enabled: false,
    api_token: '',
    phone_number_id: '',
  });
  const [instagramConfig, setInstagramConfig] = useState({
    enabled: false,
    access_token: '',
    business_account_id: '',
  });
  const [smtpConfig, setSmtpConfig] = useState({
    enabled: false,
    host: '',
    port: '587',
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    use_tls: true,
  });
  const [n8nConfig, setN8nConfig] = useState({
    enabled: false,
    webhook_url: '',
    voice_call_webhook: '',
    auth_header: '',
  });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const [integrationsData, webhookData] = await Promise.all([
        api.integrations.getAll(),
        api.integrations.getWebhookInfo(),
      ]);

      setIntegrations(integrationsData);
      setWebhookInfo(webhookData);

      // Populate form states
      if (integrationsData.meta_whatsapp) {
        setWhatsappConfig({
          enabled: integrationsData.meta_whatsapp.enabled,
          api_token: '',
          phone_number_id: integrationsData.meta_whatsapp.phone_number_id || '',
        });
      }
      if (integrationsData.meta_instagram) {
        setInstagramConfig({
          enabled: integrationsData.meta_instagram.enabled,
          access_token: '',
          business_account_id: integrationsData.meta_instagram.business_account_id || '',
        });
      }
      if (integrationsData.smtp) {
        setSmtpConfig({
          enabled: integrationsData.smtp.enabled,
          host: integrationsData.smtp.host || '',
          port: String(integrationsData.smtp.port || 587),
          username: integrationsData.smtp.username || '',
          password: '',
          from_email: integrationsData.smtp.from_email || '',
          from_name: integrationsData.smtp.from_name || '',
          use_tls: integrationsData.smtp.use_tls ?? true,
        });
      }
      if (integrationsData.n8n) {
        setN8nConfig({
          enabled: integrationsData.n8n.enabled,
          webhook_url: integrationsData.n8n.webhook_url || '',
          voice_call_webhook: integrationsData.n8n.voice_call_webhook || '',
          auth_header: '',
        });
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les intégrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIntegration = async (type: string, config: Record<string, any>) => {
    setIsSaving(type);
    try {
      await api.integrations.update(type, config);
      await loadIntegrations();
      Alert.alert('Succès', 'Configuration sauvegardée !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder');
    } finally {
      setIsSaving(null);
    }
  };

  const handleTestConnection = async (type: string) => {
    setIsTesting(type);
    try {
      const result = await api.integrations.test(type);
      Alert.alert(
        result.status === 'connected' ? 'Succès' : 'Erreur',
        result.message
      );
      await loadIntegrations();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Test de connexion échoué');
    } finally {
      setIsTesting(null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copié !', `${label} copié dans le presse-papier`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>Chargement des intégrations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[800]} />
        </Pressable>
        <Text style={styles.headerTitle}>Intégrations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* WhatsApp Business Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.sectionTitle}>WhatsApp Business</Text>
            </View>
            <StatusBadge status={integrations?.meta_whatsapp?.status || 'disconnected'} />
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activer WhatsApp</Text>
              <Switch
                value={whatsappConfig.enabled}
                onValueChange={(value) =>
                  setWhatsappConfig({ ...whatsappConfig, enabled: value })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[400] }}
                thumbColor={whatsappConfig.enabled ? Colors.primary[600] : Colors.neutral[100]}
              />
            </View>

            <SecureInput
              label="API Token"
              value={whatsappConfig.api_token}
              onChangeText={(text) =>
                setWhatsappConfig({ ...whatsappConfig, api_token: text })
              }
              placeholder="Entrez votre token WhatsApp Business API"
              maskedValue={integrations?.meta_whatsapp?.api_token_masked}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number ID</Text>
              <TextInput
                style={styles.input}
                value={whatsappConfig.phone_number_id}
                onChangeText={(text) =>
                  setWhatsappConfig({ ...whatsappConfig, phone_number_id: text })
                }
                placeholder="Ex: 123456789012345"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button
                title={isSaving === 'meta_whatsapp' ? 'Sauvegarde...' : 'Sauvegarder'}
                variant="secondary"
                size="sm"
                onPress={() => handleSaveIntegration('meta_whatsapp', whatsappConfig)}
                disabled={isSaving === 'meta_whatsapp'}
                style={styles.actionButton}
              />
              <Button
                title={isTesting === 'meta_whatsapp' ? 'Test...' : 'Tester connexion'}
                variant="primary"
                size="sm"
                onPress={() => handleTestConnection('meta_whatsapp')}
                disabled={isTesting === 'meta_whatsapp'}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>

        {/* Instagram Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              <Text style={styles.sectionTitle}>Instagram DM</Text>
            </View>
            <StatusBadge status={integrations?.meta_instagram?.status || 'disconnected'} />
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activer Instagram</Text>
              <Switch
                value={instagramConfig.enabled}
                onValueChange={(value) =>
                  setInstagramConfig({ ...instagramConfig, enabled: value })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[400] }}
                thumbColor={instagramConfig.enabled ? Colors.primary[600] : Colors.neutral[100]}
              />
            </View>

            <SecureInput
              label="Access Token"
              value={instagramConfig.access_token}
              onChangeText={(text) =>
                setInstagramConfig({ ...instagramConfig, access_token: text })
              }
              placeholder="Entrez votre token Instagram"
              maskedValue={integrations?.meta_instagram?.access_token_masked}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Business Account ID</Text>
              <TextInput
                style={styles.input}
                value={instagramConfig.business_account_id}
                onChangeText={(text) =>
                  setInstagramConfig({ ...instagramConfig, business_account_id: text })
                }
                placeholder="Ex: 17841400123456789"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button
                title={isSaving === 'meta_instagram' ? 'Sauvegarde...' : 'Sauvegarder'}
                variant="secondary"
                size="sm"
                onPress={() => handleSaveIntegration('meta_instagram', instagramConfig)}
                disabled={isSaving === 'meta_instagram'}
                style={styles.actionButton}
              />
              <Button
                title={isTesting === 'meta_instagram' ? 'Test...' : 'Tester connexion'}
                variant="primary"
                size="sm"
                onPress={() => handleTestConnection('meta_instagram')}
                disabled={isTesting === 'meta_instagram'}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>

        {/* SMTP Email Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="mail" size={24} color={Colors.primary[600]} />
              <Text style={styles.sectionTitle}>Email SMTP</Text>
            </View>
            <StatusBadge status={integrations?.smtp?.status || 'disconnected'} />
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activer SMTP personnalisé</Text>
              <Switch
                value={smtpConfig.enabled}
                onValueChange={(value) =>
                  setSmtpConfig({ ...smtpConfig, enabled: value })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[400] }}
                thumbColor={smtpConfig.enabled ? Colors.primary[600] : Colors.neutral[100]}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Serveur SMTP</Text>
                <TextInput
                  style={styles.input}
                  value={smtpConfig.host}
                  onChangeText={(text) => setSmtpConfig({ ...smtpConfig, host: text })}
                  placeholder="smtp.example.com"
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: Spacing[2] }]}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={smtpConfig.port}
                  onChangeText={(text) => setSmtpConfig({ ...smtpConfig, port: text })}
                  placeholder="587"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Utilisateur</Text>
              <TextInput
                style={styles.input}
                value={smtpConfig.username}
                onChangeText={(text) => setSmtpConfig({ ...smtpConfig, username: text })}
                placeholder="user@example.com"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="none"
              />
            </View>

            <SecureInput
              label="Mot de passe"
              value={smtpConfig.password}
              onChangeText={(text) => setSmtpConfig({ ...smtpConfig, password: text })}
              placeholder="Mot de passe SMTP"
              maskedValue={integrations?.smtp?.password_masked}
            />

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Email expéditeur</Text>
                <TextInput
                  style={styles.input}
                  value={smtpConfig.from_email}
                  onChangeText={(text) => setSmtpConfig({ ...smtpConfig, from_email: text })}
                  placeholder="noreply@hotel.com"
                  placeholderTextColor={Colors.neutral[400]}
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: Spacing[2] }]}>
                <Text style={styles.inputLabel}>Nom expéditeur</Text>
                <TextInput
                  style={styles.input}
                  value={smtpConfig.from_name}
                  onChangeText={(text) => setSmtpConfig({ ...smtpConfig, from_name: text })}
                  placeholder="Mon Hôtel"
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Utiliser TLS</Text>
              <Switch
                value={smtpConfig.use_tls}
                onValueChange={(value) => setSmtpConfig({ ...smtpConfig, use_tls: value })}
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[400] }}
                thumbColor={smtpConfig.use_tls ? Colors.primary[600] : Colors.neutral[100]}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button
                title={isSaving === 'smtp' ? 'Sauvegarde...' : 'Sauvegarder'}
                variant="secondary"
                size="sm"
                onPress={() =>
                  handleSaveIntegration('smtp', {
                    ...smtpConfig,
                    port: parseInt(smtpConfig.port, 10),
                  })
                }
                disabled={isSaving === 'smtp'}
                style={styles.actionButton}
              />
              <Button
                title={isTesting === 'smtp' ? 'Test...' : 'Tester connexion'}
                variant="primary"
                size="sm"
                onPress={() => handleTestConnection('smtp')}
                disabled={isTesting === 'smtp'}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>

        {/* n8n Webhook Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="git-network" size={24} color="#FF6D00" />
              <Text style={styles.sectionTitle}>n8n / Appels Vocaux IA</Text>
            </View>
            <StatusBadge status={integrations?.n8n?.status || 'disconnected'} />
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activer n8n</Text>
              <Switch
                value={n8nConfig.enabled}
                onValueChange={(value) => setN8nConfig({ ...n8nConfig, enabled: value })}
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[400] }}
                thumbColor={n8nConfig.enabled ? Colors.primary[600] : Colors.neutral[100]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>URL Webhook n8n</Text>
              <TextInput
                style={styles.input}
                value={n8nConfig.webhook_url}
                onChangeText={(text) => setN8nConfig({ ...n8nConfig, webhook_url: text })}
                placeholder="https://n8n.example.com/webhook/xxx"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Webhook Appels Vocaux</Text>
              <TextInput
                style={styles.input}
                value={n8nConfig.voice_call_webhook}
                onChangeText={(text) =>
                  setN8nConfig({ ...n8nConfig, voice_call_webhook: text })
                }
                placeholder="https://n8n.example.com/webhook/voice"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="none"
              />
              <Text style={styles.inputHint}>
                URL appelée lors d'un appel vocal entrant pour traitement IA
              </Text>
            </View>

            <SecureInput
              label="Header d'authentification (optionnel)"
              value={n8nConfig.auth_header}
              onChangeText={(text) => setN8nConfig({ ...n8nConfig, auth_header: text })}
              placeholder="Bearer xxx ou clé API"
              maskedValue={integrations?.n8n?.auth_header_masked}
            />

            <View style={styles.buttonRow}>
              <Button
                title={isSaving === 'n8n' ? 'Sauvegarde...' : 'Sauvegarder'}
                variant="secondary"
                size="sm"
                onPress={() => handleSaveIntegration('n8n', n8nConfig)}
                disabled={isSaving === 'n8n'}
                style={styles.actionButton}
              />
              <Button
                title={isTesting === 'n8n' ? 'Test...' : 'Tester connexion'}
                variant="primary"
                size="sm"
                onPress={() => handleTestConnection('n8n')}
                disabled={isTesting === 'n8n'}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>

        {/* Webhook URLs Section */}
        {webhookInfo && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="link" size={24} color={Colors.neutral[600]} />
                <Text style={styles.sectionTitle}>URLs Webhook (à configurer)</Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
              <Text style={styles.webhookNote}>
                Configurez ces URLs dans les plateformes respectives pour recevoir les messages.
              </Text>

              <View style={styles.webhookItem}>
                <Text style={styles.webhookLabel}>WhatsApp Webhook</Text>
                <Pressable
                  style={styles.webhookUrl}
                  onPress={() =>
                    copyToClipboard(webhookInfo.whatsapp_webhook_url, 'URL WhatsApp')
                  }
                >
                  <Text style={styles.webhookUrlText} numberOfLines={1}>
                    {webhookInfo.whatsapp_webhook_url}
                  </Text>
                  <Ionicons name="copy-outline" size={18} color={Colors.primary[600]} />
                </Pressable>
                <View style={styles.tokenRow}>
                  <Text style={styles.tokenLabel}>Verify Token:</Text>
                  <Pressable
                    onPress={() =>
                      copyToClipboard(webhookInfo.whatsapp_verify_token, 'Verify Token')
                    }
                  >
                    <Text style={styles.tokenValue}>
                      {webhookInfo.whatsapp_verify_token}{' '}
                      <Ionicons name="copy-outline" size={14} color={Colors.primary[600]} />
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.webhookItem}>
                <Text style={styles.webhookLabel}>Instagram Webhook</Text>
                <Pressable
                  style={styles.webhookUrl}
                  onPress={() =>
                    copyToClipboard(webhookInfo.instagram_webhook_url, 'URL Instagram')
                  }
                >
                  <Text style={styles.webhookUrlText} numberOfLines={1}>
                    {webhookInfo.instagram_webhook_url}
                  </Text>
                  <Ionicons name="copy-outline" size={18} color={Colors.primary[600]} />
                </Pressable>
              </View>

              <View style={styles.webhookItem}>
                <Text style={styles.webhookLabel}>Callback Appels Vocaux</Text>
                <Pressable
                  style={styles.webhookUrl}
                  onPress={() =>
                    copyToClipboard(webhookInfo.voice_callback_url, 'URL Voice Callback')
                  }
                >
                  <Text style={styles.webhookUrlText} numberOfLines={1}>
                    {webhookInfo.voice_callback_url}
                  </Text>
                  <Ionicons name="copy-outline" size={18} color={Colors.primary[600]} />
                </Pressable>
              </View>
            </View>
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
  loadingText: {
    marginTop: Spacing[4],
    fontSize: FontSize.base,
    color: Colors.neutral[600],
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
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[900],
  },
  sectionContent: {
    padding: Spacing[4],
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  switchLabel: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
    fontWeight: FontWeight.medium,
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
  },
  inputHint: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: Spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
  },
  secureInputWrapper: {
    position: 'relative',
  },
  secureInput: {
    paddingRight: 44,
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
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  actionButton: {
    flex: 1,
  },
  webhookNote: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
    lineHeight: 20,
  },
  webhookItem: {
    marginBottom: Spacing[4],
  },
  webhookLabel: {
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
    fontWeight: FontWeight.medium,
    marginBottom: Spacing[1],
  },
  webhookUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  webhookUrlText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[1],
    gap: Spacing[2],
  },
  tokenLabel: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  tokenValue: {
    fontSize: FontSize.xs,
    color: Colors.primary[600],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bottomSpacing: {
    height: Spacing[8],
  },
});
