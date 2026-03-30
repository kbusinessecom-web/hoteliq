import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import api from '../../services/api';
import { WeeklyReport } from '../../types';

export default function ReportsScreen() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.reports.getAll();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSendNow = async () => {
    Alert.alert(
      'Envoyer le rapport maintenant ?',
      `Un rapport hebdomadaire complet sera généré par IA et envoyé par email au manager de l’établissement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            setIsSending(true);
            try {
              const result = await api.reports.send();
              Alert.alert(
                '✅ Rapport envoyé !',
                `Email envoyé à ${result.recipient}\nPériode : ${result.week_label}\n${result.insights_detected} opportunité(s) incluse(s).`
              );
              await loadReports();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d’envoyer le rapport');
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      sent: { bg: Colors.success.light, text: Colors.success.dark, label: 'Envoyé', icon: 'checkmark-circle' },
      failed: { bg: Colors.error.light, text: Colors.error.DEFAULT, label: 'Erreur', icon: 'close-circle' },
      pending: { bg: Colors.warning.light, text: Colors.warning.dark, label: 'En attente', icon: 'time' },
    }[status] || { bg: Colors.neutral[100], text: Colors.neutral[600], label: status, icon: 'help-circle' };

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={12} color={config.text} />
        <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
      </View>
    );
  };

  const ReportDetailModal = () => {
    if (!selectedReport) return null;
    const stats = selectedReport.stats || {};

    return (
      <Modal
        visible={!!selectedReport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedReport(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rapport — {selectedReport.week_label}</Text>
            <Pressable onPress={() => setSelectedReport(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.neutral[700]} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Recipient */}
            <View style={styles.recipientRow}>
              <Ionicons name="mail" size={16} color={Colors.primary[600]} />
              <Text style={styles.recipientText}>Envoyé à : <Text style={styles.recipientEmail}>{selectedReport.recipient_email}</Text></Text>
            </View>

            {/* AI Summary */}
            {selectedReport.ai_summary ? (
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="sparkles" size={16} color={Colors.accent[600]} />
                  <Text style={styles.sectionTitle}>Bilan IA</Text>
                </View>
                <Text style={styles.summaryText}>{selectedReport.ai_summary}</Text>
              </Card>
            ) : null}

            {/* KPIs */}
            <Text style={styles.sectionLabel}>Chiffres clés</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiNum}>{stats.new_conversations ?? 0}</Text>
                <Text style={styles.kpiLbl}>Nouvelles conv.</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiNum}>{stats.resolved_conversations ?? 0}</Text>
                <Text style={styles.kpiLbl}>Résolues</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiNum}>{stats.messages_sent ?? 0}</Text>
                <Text style={styles.kpiLbl}>Messages envoyés</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNum, { color: Colors.success.DEFAULT }]}>{stats.response_rate ?? 0}%</Text>
                <Text style={styles.kpiLbl}>Réponse &lt;5min</Text>
              </View>
            </View>

            {/* AI Insights stats */}
            <Text style={styles.sectionLabel}>Opportunités IA</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNum, { color: Colors.accent[600] }]}>{stats.insights_upsell ?? 0}</Text>
                <Text style={styles.kpiLbl}>Upsell</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNum, { color: Colors.primary[600] }]}>{stats.insights_loyalty ?? 0}</Text>
                <Text style={styles.kpiLbl}>Fidélité</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNum, { color: Colors.warning.dark }]}>{stats.insights_review ?? 0}</Text>
                <Text style={styles.kpiLbl}>Avis</Text>
              </View>
              {(stats.potential_revenue ?? 0) > 0 && (
                <View style={styles.kpiItem}>
                  <Text style={[styles.kpiNum, { color: Colors.success.DEFAULT }]}>+{Math.round(stats.potential_revenue)}€</Text>
                  <Text style={styles.kpiLbl}>Potentiel</Text>
                </View>
              )}
            </View>

            {/* Priority Actions */}
            {selectedReport.ai_actions?.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Actions prioritaires</Text>
                {selectedReport.ai_actions.map((action: string, i: number) => (
                  <View key={i} style={styles.actionItem}>
                    <View style={styles.actionNum}>
                      <Text style={styles.actionNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadReports(); }} tintColor={Colors.primary[600]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Rapports</Text>
            <Text style={styles.subtitle}>Historique des rapports hebdomadaires IA</Text>
          </View>
        </View>

        {/* Send Now Button */}
        <Pressable
          style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
          onPress={handleSendNow}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          ) : (
            <Ionicons name="send" size={20} color={Colors.neutral[0]} />
          )}
          <Text style={styles.sendBtnText}>
            {isSending ? 'Génération en cours...' : 'Envoyer le rapport maintenant'}
          </Text>
        </Pressable>

        {/* Schedule Info */}
        <View style={styles.scheduleInfo}>
          <Ionicons name="calendar" size={14} color={Colors.neutral[500]} />
          <Text style={styles.scheduleText}>Envoi automatique chaque lundi à 8h00 (heure de Paris)</Text>
        </View>

        {/* Reports List */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary[600]} />
        ) : reports.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="mail-open-outline" size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Aucun rapport encore</Text>
            <Text style={styles.emptyText}>
              Cliquez sur "Envoyer maintenant" pour générer et recevoir votre premier rapport IA.
            </Text>
          </Card>
        ) : (
          reports.map((report) => (
            <Pressable
              key={report.report_id}
              style={styles.reportCard}
              onPress={() => setSelectedReport(report)}
            >
              <View style={styles.reportHeader}>
                <View>
                  <Text style={styles.reportWeek}>{report.week_label}</Text>
                  <Text style={styles.reportDate}>
                    {report.sent_at
                      ? `Envoyé le ${format(new Date(report.sent_at), 'dd MMM à HH:mm', { locale: fr })}`
                      : 'Non envoyé'}
                  </Text>
                </View>
                <View style={styles.reportRight}>
                  <StatusBadge status={report.status} />
                  <Ionicons name="chevron-forward" size={16} color={Colors.neutral[400]} style={{ marginTop: 4 }} />
                </View>
              </View>

              {/* Stats preview */}
              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipValue}>{report.stats?.new_conversations ?? 0}</Text>
                  <Text style={styles.statChipLabel}>conv.</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipValue}>{report.stats?.messages_sent ?? 0}</Text>
                  <Text style={styles.statChipLabel}>messages</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statChipValue, { color: Colors.accent[600] }]}>
                    {(report.stats?.insights_upsell ?? 0) + (report.stats?.insights_loyalty ?? 0) + (report.stats?.insights_review ?? 0)}
                  </Text>
                  <Text style={styles.statChipLabel}>opportunités</Text>
                </View>
                {(report.stats?.potential_revenue ?? 0) > 0 && (
                  <View style={styles.statChip}>
                    <Text style={[styles.statChipValue, { color: Colors.success.DEFAULT }]}>
                      +{Math.round(report.stats.potential_revenue)}€
                    </Text>
                    <Text style={styles.statChipLabel}>potentiel</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <ReportDetailModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[8] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[4] },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  subtitle: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], backgroundColor: Colors.primary[600], borderRadius: Spacing[3],
    paddingVertical: Spacing[4], marginBottom: Spacing[2],
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.neutral[0] },
  scheduleInfo: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    justifyContent: 'center', marginBottom: Spacing[5],
  },
  scheduleText: { fontSize: FontSize.xs, color: Colors.neutral[500] },
  emptyCard: { padding: Spacing[8], alignItems: 'center', gap: Spacing[3] },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[700] },
  emptyText: { fontSize: FontSize.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
  reportCard: {
    backgroundColor: Colors.neutral[0], borderRadius: Spacing[3], padding: Spacing[4],
    marginBottom: Spacing[3], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[3] },
  reportWeek: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  reportDate: { fontSize: FontSize.xs, color: Colors.neutral[500], marginTop: 2 },
  reportRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Spacing[1] },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statsRow: { flexDirection: 'row', gap: Spacing[2] },
  statChip: { backgroundColor: Colors.neutral[50], borderRadius: Spacing[2], paddingHorizontal: Spacing[2], paddingVertical: Spacing[1], alignItems: 'center' },
  statChipValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  statChipLabel: { fontSize: 10, color: Colors.neutral[500] },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.neutral[50] },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing[4], backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200],
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.neutral[900], flex: 1 },
  closeBtn: { padding: Spacing[1] },
  modalContent: { padding: Spacing[4], paddingBottom: Spacing[8] },
  recipientRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    backgroundColor: Colors.primary[50], borderRadius: Spacing[2],
    padding: Spacing[3], marginBottom: Spacing[4],
  },
  recipientText: { fontSize: FontSize.sm, color: Colors.neutral[700] },
  recipientEmail: { fontWeight: FontWeight.semibold, color: Colors.primary[600] },
  summaryCard: { padding: Spacing[4], marginBottom: Spacing[4] },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[2] },
  summaryText: { fontSize: FontSize.sm, color: Colors.neutral[700], lineHeight: 22 },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.neutral[800] },
  sectionLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.neutral[900], marginBottom: Spacing[3], marginTop: Spacing[2] },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[4] },
  kpiItem: {
    flex: 1, minWidth: 70, backgroundColor: Colors.neutral[0],
    borderRadius: Spacing[2], padding: Spacing[3], alignItems: 'center',
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  kpiNum: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary[600] },
  kpiLbl: { fontSize: 10, color: Colors.neutral[500], textAlign: 'center', marginTop: 2 },
  actionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3], marginBottom: Spacing[3] },
  actionNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary[600],
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  actionNumText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.neutral[0] },
  actionText: { flex: 1, fontSize: FontSize.sm, color: Colors.neutral[700], lineHeight: 20 },
});
