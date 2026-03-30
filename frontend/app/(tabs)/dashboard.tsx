import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import AIInsightCard from '../../components/AIInsightCard';
import api from '../../services/api';
import { AnalyticsSnapshot, AIInsightsSummary, InsightStatus, ConversationInsight } from '../../types';

export default function DashboardScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [insightsSummary, setInsightsSummary] = useState<AIInsightsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [analyticsData, insightsData] = await Promise.all([
        api.analytics.getDashboard().catch(() => null),
        api.aiInsights.getAll({ status: 'pending' }).catch(() => null),
      ]);
      if (analyticsData) setAnalytics(analyticsData);
      if (insightsData) setInsightsSummary(insightsData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAll();
  };

  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true);
    try {
      const result = await api.aiInsights.analyzeAll();
      const insightsData = await api.aiInsights.getAll({ status: 'pending' });
      setInsightsSummary(insightsData);
      Alert.alert(
        '✨ Analyse terminée',
        `${result.conversations_analyzed} conversations analysées.\n${result.new_insights} nouvelle(s) opportunité(s) détectée(s).`
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'analyser les conversations");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseInsight = async (message: string, insightId: string) => {
    // Mark as sent
    try {
      await api.aiInsights.updateStatus(insightId, 'sent');
      // Refresh
      const insightsData = await api.aiInsights.getAll({ status: 'pending' });
      setInsightsSummary(insightsData);
    } catch {}
    // Navigate to conversation
    const insight = insightsSummary?.insights.find(i => i.insight_id === insightId);
    if (insight?.conversation_id) {
      router.push(`/conversation/${insight.conversation_id}`);
    }
  };

  const handleDismissInsight = async (insightId: string) => {
    try {
      await api.aiInsights.updateStatus(insightId, 'dismissed');
      const insightsData = await api.aiInsights.getAll({ status: 'pending' });
      setInsightsSummary(insightsData);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
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

  const pendingInsights = insightsSummary?.insights.filter(i => i.status === InsightStatus.PENDING) || [];
  const displayedInsights = showAllInsights ? pendingInsights : pendingInsights.slice(0, 3);
  const upsellRevenue = insightsSummary?.total_potential_revenue || 0;

  const KPICard = ({
    icon,
    label,
    value,
    color,
    backgroundColor,
  }: {
    icon: string;
    label: string;
    value: string | number;
    color: string;
    backgroundColor: string;
  }) => (
    <Card style={styles.kpiCard}>
      <View style={[styles.iconContainer, { backgroundColor }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[600]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Vue d'ensemble de votre performance</Text>
        </View>

        {/* KPIs Grid */}
        <View style={styles.kpiGrid}>
          <KPICard
            icon="chatbubbles"
            label="Conversations"
            value={analytics?.total_conversations || 0}
            color={Colors.primary[600]}
            backgroundColor={Colors.primary[50]}
          />
          <KPICard
            icon="checkmark-circle"
            label="Taux réponse <5min"
            value={`${Math.round((analytics?.response_rate_5min || 0) * 100)}%`}
            color={Colors.success.DEFAULT}
            backgroundColor={Colors.success.light}
          />
        </View>

        <View style={styles.kpiGrid}>
          <KPICard
            icon="trophy"
            label="Réservations"
            value={analytics?.confirmed_reservations || 0}
            color={Colors.accent[600]}
            backgroundColor={Colors.accent[50]}
          />
          <KPICard
            icon="trending-up"
            label="CA capturé"
            value={`${analytics?.estimated_captured_revenue?.toLocaleString('fr-FR') || 0}€`}
            color={Colors.success.DEFAULT}
            backgroundColor={Colors.success.light}
          />
        </View>

        {/* AI Insights Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="sparkles" size={20} color={Colors.accent[600]} />
            <Text style={styles.sectionTitle}>Recommandations IA</Text>
            {pendingInsights.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingInsights.length}</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={handleAnalyzeAll}
            disabled={isAnalyzing}
            style={[styles.analyzeBtn, isAnalyzing && styles.analyzeBtnDisabled]}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color={Colors.accent[600]} />
            ) : (
              <Ionicons name="refresh" size={16} color={Colors.accent[600]} />
            )}
            <Text style={styles.analyzeBtnText}>
              {isAnalyzing ? 'Analyse...' : 'Analyser'}
            </Text>
          </Pressable>
        </View>

        {/* AI Summary Stats */}
        {pendingInsights.length > 0 && (
          <View style={styles.aiSummaryRow}>
            <View style={styles.aiStat}>
              <Text style={styles.aiStatValue}>
                {insightsSummary?.by_type?.upsell || 0}
              </Text>
              <Text style={styles.aiStatLabel}>Upsell</Text>
            </View>
            <View style={styles.aiStatDivider} />
            <View style={styles.aiStat}>
              <Text style={styles.aiStatValue}>
                {insightsSummary?.by_type?.loyalty || 0}
              </Text>
              <Text style={styles.aiStatLabel}>Fidélité</Text>
            </View>
            <View style={styles.aiStatDivider} />
            <View style={styles.aiStat}>
              <Text style={styles.aiStatValue}>
                {insightsSummary?.by_type?.review || 0}
              </Text>
              <Text style={styles.aiStatLabel}>Avis</Text>
            </View>
            {upsellRevenue > 0 && (
              <>
                <View style={styles.aiStatDivider} />
                <View style={styles.aiStat}>
                  <Text style={[styles.aiStatValue, { color: Colors.success.DEFAULT }]}>
                    +{upsellRevenue.toLocaleString('fr-FR')}€
                  </Text>
                  <Text style={styles.aiStatLabel}>Potentiel</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Insight Cards */}
        {pendingInsights.length === 0 ? (
          <Card style={styles.emptyInsights}>
            <Ionicons name="sparkles-outline" size={36} color={Colors.neutral[300]} />
            <Text style={styles.emptyInsightsTitle}>Aucune opportunité détectée</Text>
            <Text style={styles.emptyInsightsText}>
              Cliquez sur "Analyser" pour lancer l'analyse IA de vos conversations récentes.
            </Text>
          </Card>
        ) : (
          <View style={styles.insightsList}>
            {displayedInsights.map((insight) => (
              <AIInsightCard
                key={insight.insight_id}
                insight={insight}
                onUse={handleUseInsight}
                onDismiss={handleDismissInsight}
              />
            ))}
            {pendingInsights.length > 3 && (
              <Pressable
                onPress={() => setShowAllInsights(!showAllInsights)}
                style={styles.showMoreBtn}
              >
                <Text style={styles.showMoreText}>
                  {showAllInsights
                    ? 'Voir moins'
                    : `Voir ${pendingInsights.length - 3} de plus`}
                </Text>
                <Ionicons
                  name={showAllInsights ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.primary[600]}
                />
              </Pressable>
            )}
          </View>
        )}

        {/* Lost Revenue Alert */}
        {analytics && analytics.estimated_lost_revenue > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={24} color={Colors.error.DEFAULT} />
              <Text style={styles.alertTitle}>CA potentiellement perdu</Text>
            </View>
            <Text style={styles.alertValue}>
              {analytics.estimated_lost_revenue.toLocaleString('fr-FR')}€
            </Text>
            <Text style={styles.alertText}>
              Des conversations n'ont pas reçu de réponse dans les délais optimaux.
            </Text>
          </Card>
        )}

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistiques rapides</Text>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Temps de réponse moyen</Text>
            <Text style={styles.statValue}>{'< 90 secondes'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Canaux connectés</Text>
            <Text style={styles.statValue}>4</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Satisfaction client</Text>
            <Text style={styles.statValue}>NPS 8/10</Text>
          </View>
        </Card>
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
  scrollContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[8],
  },
  header: {
    marginBottom: Spacing[6],
  },
  headerTitle: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginTop: Spacing[1],
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  kpiCard: {
    flex: 1,
    padding: Spacing[4],
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  kpiValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[4],
    marginBottom: Spacing[3],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  countBadge: {
    backgroundColor: Colors.accent[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[0],
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.accent[300],
    backgroundColor: Colors.accent[50],
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent[600],
  },
  aiSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing[3],
    padding: Spacing[3],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  aiStat: {
    flex: 1,
    alignItems: 'center',
  },
  aiStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  aiStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  aiStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.neutral[200],
  },
  insightsList: {
    marginBottom: Spacing[4],
  },
  emptyInsights: {
    padding: Spacing[6],
    alignItems: 'center',
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  emptyInsightsTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.neutral[700],
  },
  emptyInsightsText: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[2],
  },
  showMoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.primary[600],
  },
  alertCard: {
    padding: Spacing[4],
    backgroundColor: Colors.error.light,
    borderColor: Colors.error.DEFAULT,
    marginBottom: Spacing[4],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  alertTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.error.DEFAULT,
  },
  alertValue: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.error.DEFAULT,
    marginBottom: Spacing[2],
  },
  alertText: {
    fontSize: FontSize.sm,
    color: Colors.error.dark,
    lineHeight: 20,
  },
  statsCard: {
    padding: Spacing[4],
  },
  statsTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    marginBottom: Spacing[4],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  statLabel: {
    fontSize: FontSize.base,
    color: Colors.neutral[700],
  },
  statValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
});
