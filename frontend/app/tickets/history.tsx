import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import i18n from '../../src/i18n';
import { useAuthStore } from '../../src/store/authStore';

interface Ticket {
  _id: string;
  ticket_number: string;
  amount: number;
  establishment_name?: string;
  created_at: string;
  ticket_date?: string;
}

interface Campaign {
  _id: string;
  title: string;
  description: string;
  prize: string;
  start_date: string;
  end_date: string;
  tag?: string;
}

export default function TicketsHistoryScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadTickets(), loadCampaign()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTickets = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/tickets/my-tickets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const loadCampaign = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/tickets/campaign`);
      
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2)}€`;
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketIconContainer}>
          <MaterialIcons name="receipt" size={24} color={Colors.primary} />
        </View>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketNumber}>
            {i18n.t('ticketsHistory.ticketNumber')}: {item.ticket_number}
          </Text>
          <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.ticketAmount}>{formatAmount(item.amount)}</Text>
      </View>
      {item.establishment_name && (
        <View style={styles.ticketFooter}>
          <MaterialIcons name="store" size={16} color={Colors.textSecondary} />
          <Text style={styles.establishmentName}>{item.establishment_name}</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="receipt-long" size={80} color={Colors.lightGray} />
      <Text style={styles.emptyTitle}>{i18n.t('ticketsHistory.noTickets')}</Text>
      <Text style={styles.emptyText}>{i18n.t('ticketsHistory.scanFirst')}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{i18n.t('ticketsHistory.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
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
        <Text style={styles.headerTitle}>{i18n.t('ticketsHistory.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <>
            {/* Campaign Card */}
            {campaign && (
              <View style={styles.campaignCard}>
                <View style={styles.campaignHeader}>
                  <MaterialIcons name="emoji-events" size={32} color={Colors.primary} />
                  <Text style={styles.campaignTitle}>{i18n.t('ticketsHistory.nextDraw')}</Text>
                </View>
                <Text style={styles.campaignName}>{campaign.title}</Text>
                <Text style={styles.campaignDescription}>{campaign.description}</Text>
                <View style={styles.campaignInfo}>
                  <View style={styles.campaignInfoRow}>
                    <MaterialIcons name="card-giftcard" size={20} color={Colors.primary} />
                    <Text style={styles.campaignInfoText}>
                      {i18n.t('ticketsHistory.prize')}: {campaign.prize}
                    </Text>
                  </View>
                  <View style={styles.campaignInfoRow}>
                    <MaterialIcons name="event" size={20} color={Colors.primary} />
                    <Text style={styles.campaignInfoText}>
                      {i18n.t('ticketsHistory.validFor')}: {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>{i18n.t('ticketsHistory.myParticipations')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{tickets.length}</Text>
                  <Text style={styles.statLabel}>{i18n.t('ticketsHistory.totalTickets')}</Text>
                </View>
                {campaign && (
                  <View style={styles.statItem}>
                    <View style={styles.statusBadge}>
                      <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                      <Text style={styles.statusText}>{i18n.t('ticketsHistory.campaignActive')}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Section Title */}
            {tickets.length > 0 && (
              <Text style={styles.sectionTitle}>{i18n.t('ticketsHistory.myTickets')}</Text>
            )}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  listContainer: {
    padding: Spacing.md,
  },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  campaignTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  campaignName: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  campaignDescription: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  campaignInfo: {
    gap: Spacing.sm,
  },
  campaignInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  campaignInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    flex: 1,
  },
  statsCard: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ticketIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  ticketAmount: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    gap: Spacing.xs,
  },
  establishmentName: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
