import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');

interface Statistics {
  users: {
    total: number;
    this_month: number;
    last_month: number;
    this_quarter: number;
    this_year: number;
    monthly_growth: number;
    active_users: number;
    participation_rate: number;
  };
  establishments: {
    total: number;
    active: number;
  };
  events: {
    total: number;
    active: number;
    upcoming: number;
    top_events: { name: string; participations: number }[];
  };
  promotions: {
    total: number;
    approved: number;
    pending: number;
  };
  raffles: {
    total: number;
    active: number;
  };
  news: {
    total: number;
    this_month: number;
  };
  participations: {
    total: number;
    this_month: number;
    by_type: { [key: string]: number };
  };
  trends: {
    monthly_signups: { month: string; count: number }[];
    top_tags: { tag: string; count: number }[];
  };
}

export default function StatisticsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (token) {
      loadStatistics();
    }
  }, [token]);

  const loadStatistics = async () => {
    if (!token) {
      console.error('No token available');
      setError('No hi ha sessió activa. Torna a iniciar sessió.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      console.log('📊 Carregant estadístiques...');
      const response = await api.get('/admin/statistics', {
        headers: { Authorization: token },
      });
      console.log('📊 Estadístiques rebudes:', response.data);
      // Validar que la resposta té l'estructura esperada
      if (response.data && response.data.users) {
        setStats(response.data);
      } else {
        setError('La resposta de l\'API no és vàlida');
      }
    } catch (error: any) {
      console.error('Error carregant estadístiques:', error?.response?.data || error);
      setError(error?.response?.data?.detail || 'Error carregant les estadístiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatistics();
  };

  const StatCard = ({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: string;
    color: string;
    trend?: number;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon as any} size={24} color={color} />
        </View>
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trend >= 0 ? Colors.success + '20' : '#FF5252' + '20' }]}>
            <MaterialIcons 
              name={trend >= 0 ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={trend >= 0 ? Colors.success : '#FF5252'} 
            />
            <Text style={[styles.trendText, { color: trend >= 0 ? Colors.success : '#FF5252' }]}>
              {trend >= 0 ? '+' : ''}{trend}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon as any} size={24} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant estadístiques...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>📊 Estadístiques</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={[styles.loadingText, { color: Colors.error, marginTop: 16 }]}>{error}</Text>
          <Pressable onPress={loadStatistics} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tornar a intentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || !stats.users) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>📊 Estadístiques</Text>
          <Pressable onPress={onRefresh} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={24} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="info-outline" size={48} color={Colors.primary} />
          <Text style={styles.loadingText}>No hi ha dades disponibles</Text>
          <Pressable onPress={loadStatistics} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Recarregar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>📊 Estadístiques</Text>
        <Pressable onPress={onRefresh} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {stats && (
          <>
            {/* Usuaris */}
            <SectionTitle title="Usuaris" icon="people" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total Usuaris"
                value={stats.users.total}
                icon="people"
                color={Colors.primary}
              />
              <StatCard
                title="Nous aquest mes"
                value={stats.users.this_month}
                subtitle={`vs ${stats.users.last_month} mes anterior`}
                icon="person-add"
                color={Colors.success}
                trend={stats.users.monthly_growth}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                title="Nous trimestre"
                value={stats.users.this_quarter}
                icon="date-range"
                color="#9C27B0"
              />
              <StatCard
                title="Nous any"
                value={stats.users.this_year}
                icon="calendar-today"
                color="#FF9800"
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                title="Usuaris actius"
                value={stats.users.active_users}
                subtitle={`${stats.users.participation_rate}% de participació`}
                icon="check-circle"
                color={Colors.success}
              />
              <StatCard
                title="Participació"
                value={`${stats.users.participation_rate}%`}
                subtitle="dels usuaris han participat"
                icon="pie-chart"
                color="#2196F3"
              />
            </View>

            {/* Gràfic d'altes mensuals */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Altes mensuals (últims 6 mesos)</Text>
              <View style={styles.barChart}>
                {stats.trends.monthly_signups.map((item, index) => {
                  const maxCount = Math.max(...stats.trends.monthly_signups.map(s => s.count), 1);
                  const height = (item.count / maxCount) * 100;
                  return (
                    <View key={index} style={styles.barContainer}>
                      <Text style={styles.barValue}>{item.count}</Text>
                      <View style={[styles.bar, { height: `${Math.max(height, 5)}%` }]} />
                      <Text style={styles.barLabel}>{item.month.substring(0, 3)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Establiments */}
            <SectionTitle title="Establiments" icon="store" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total"
                value={stats.establishments.total}
                icon="store"
                color={Colors.primary}
              />
              <StatCard
                title="Actius"
                value={stats.establishments.active}
                icon="check-circle"
                color={Colors.success}
              />
            </View>

            {/* Esdeveniments */}
            <SectionTitle title="Esdeveniments" icon="event" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total"
                value={stats.events.total}
                icon="event"
                color={Colors.primary}
              />
              <StatCard
                title="Actius"
                value={stats.events.active}
                icon="event-available"
                color={Colors.success}
              />
            </View>
            
            {stats.events.top_events.length > 0 && (
              <View style={styles.listCard}>
                <Text style={styles.listTitle}>Top 5 esdeveniments per participació</Text>
                {stats.events.top_events.map((event, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.listRank}>
                      <Text style={styles.listRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.listItemName} numberOfLines={1}>{event.name}</Text>
                    <Text style={styles.listItemValue}>{event.participations}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Promocions */}
            <SectionTitle title="Promocions" icon="local-offer" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total"
                value={stats.promotions.total}
                icon="local-offer"
                color={Colors.primary}
              />
              <StatCard
                title="Aprovades"
                value={stats.promotions.approved}
                icon="check"
                color={Colors.success}
              />
            </View>
            {stats.promotions.pending > 0 && (
              <View style={styles.alertCard}>
                <MaterialIcons name="pending" size={24} color="#FF9800" />
                <Text style={styles.alertText}>
                  {stats.promotions.pending} promocions pendents de revisar
                </Text>
              </View>
            )}

            {/* Sortejos */}
            <SectionTitle title="Sortejos" icon="casino" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total"
                value={stats.raffles.total}
                icon="casino"
                color={Colors.primary}
              />
              <StatCard
                title="Actius"
                value={stats.raffles.active}
                icon="play-circle"
                color={Colors.success}
              />
            </View>

            {/* Participacions */}
            <SectionTitle title="Participacions" icon="timeline" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total"
                value={stats.participations.total}
                icon="timeline"
                color={Colors.primary}
              />
              <StatCard
                title="Aquest mes"
                value={stats.participations.this_month}
                icon="today"
                color={Colors.success}
              />
            </View>

            {/* Marcadors populars */}
            {stats.trends.top_tags.length > 0 && (
              <>
                <SectionTitle title="Marcadors populars" icon="label" />
                <View style={styles.listCard}>
                  {stats.trends.top_tags.map((tag, index) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.listRank}>
                        <Text style={styles.listRankText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.listItemName} numberOfLines={1}>{tag.tag}</Text>
                      <Text style={styles.listItemValue}>{tag.count} participacions</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Notícies */}
            <SectionTitle title="Notícies" icon="article" />
            <View style={styles.statsRow}>
              <StatCard
                title="Total"
                value={stats.news.total}
                icon="article"
                color={Colors.primary}
              />
              <StatCard
                title="Aquest mes"
                value={stats.news.this_month}
                icon="fiber-new"
                color={Colors.success}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: '#666666',
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#212121',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  trendText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#212121',
  },
  statTitle: {
    fontSize: FontSizes.sm,
    color: '#666666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: FontSizes.xs,
    color: '#999999',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#212121',
    marginBottom: Spacing.lg,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: FontSizes.xs,
    color: '#666666',
    marginBottom: 4,
  },
  bar: {
    width: '60%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  barLabel: {
    fontSize: FontSizes.xs,
    color: '#666666',
    marginTop: 4,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#212121',
    marginBottom: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  listRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  listRankText: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    color: Colors.white,
  },
  listItemName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#212121',
  },
  listItemValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#E65100',
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
