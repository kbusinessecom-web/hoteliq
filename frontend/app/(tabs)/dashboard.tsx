import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Card from '../../components/Card';
import api from '../../services/api';
import { AnalyticsSnapshot } from '../../types';

export default function DashboardScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    loadAnalytics();
  }, []);
  
  const loadAnalytics = async () => {
    try {
      const data = await api.analytics.getDashboard();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
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
            label="Taux de réponse <5min"
            value={`${Math.round((analytics?.response_rate_5min || 0) * 100)}%`}
            color={Colors.success.DEFAULT}
            backgroundColor={Colors.success.light}
          />
        </View>
        
        <View style={styles.kpiGrid}>
          <KPICard
            icon="trophy"
            label="Réservations confirmées"
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
              Répondre rapidement peut augmenter vos conversions.
            </Text>
          </Card>
        )}
        
        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Statistiques rapides</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Temps de réponse moyen</Text>
            <Text style={styles.statValue}>< 90 secondes</Text>
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
  sectionTitle: {
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
