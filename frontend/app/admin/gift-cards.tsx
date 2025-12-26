import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

interface GiftCard {
  _id: string;
  code: string;
  amount: number;
  balance: number;
  user_id: string;
  user_name?: string;
  user_email?: string;
  status: string;
  created_at: string;
}

interface GiftCardStats {
  total_cards: number;
  active_cards: number;
  total_sold: number;
  total_balance: number;
  total_spent: number;
}

export default function AdminGiftCardsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [stats, setStats] = useState<GiftCardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar targetes regal
      const cardsResponse = await api.get('/admin/gift-cards', {
        headers: { Authorization: token }
      });
      setGiftCards(cardsResponse.data || []);

      // Calcular estadístiques
      const cards = cardsResponse.data || [];
      const statsData: GiftCardStats = {
        total_cards: cards.length,
        active_cards: cards.filter((c: GiftCard) => c.status === 'active').length,
        total_sold: cards.reduce((sum: number, c: GiftCard) => sum + (c.amount || 0), 0),
        total_balance: cards.reduce((sum: number, c: GiftCard) => sum + (c.balance || 0), 0),
        total_spent: cards.reduce((sum: number, c: GiftCard) => sum + ((c.amount || 0) - (c.balance || 0)), 0),
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error carregant targetes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ca-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'used': return Colors.warning;
      case 'expired': return Colors.danger;
      default: return Colors.gray;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'used': return 'Esgotada';
      case 'expired': return 'Caducada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregant targetes regal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Targetes Regal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Estadístiques */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <MaterialIcons name="card-giftcard" size={24} color={Colors.primary} />
                <Text style={styles.statValue}>{stats.total_cards}</Text>
                <Text style={styles.statLabel}>Total Targetes</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="check-circle" size={24} color={Colors.success} />
                <Text style={styles.statValue}>{stats.active_cards}</Text>
                <Text style={styles.statLabel}>Actives</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <MaterialIcons name="euro" size={24} color={Colors.warning} />
                <Text style={styles.statValue}>{stats.total_sold.toFixed(2)}€</Text>
                <Text style={styles.statLabel}>Venudes</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="account-balance-wallet" size={24} color={Colors.info || Colors.primary} />
                <Text style={styles.statValue}>{stats.total_balance.toFixed(2)}€</Text>
                <Text style={styles.statLabel}>Saldo Pendent</Text>
              </View>
            </View>
            <View style={[styles.statCard, styles.statCardFull]}>
              <MaterialIcons name="shopping-cart" size={24} color={Colors.success} />
              <Text style={styles.statValue}>{stats.total_spent.toFixed(2)}€</Text>
              <Text style={styles.statLabel}>Gastat en Comerços</Text>
            </View>
          </View>
        )}

        {/* Llista de Targetes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Targetes Venudes ({giftCards.length})
          </Text>

          {giftCards.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="card-giftcard" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>No hi ha targetes regal venudes</Text>
              <Text style={styles.emptySubtext}>
                Les targetes apareixeran aquí quan els usuaris les comprin
              </Text>
            </View>
          ) : (
            giftCards.map((card) => (
              <View key={card._id} style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardCode}>
                    <MaterialIcons name="card-giftcard" size={20} color={Colors.primary} />
                    <Text style={styles.cardCodeText}>{card.code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(card.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(card.status)}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Usuari:</Text>
                    <Text style={styles.cardValue}>{card.user_email || card.user_id}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Import inicial:</Text>
                    <Text style={styles.cardValue}>{card.amount?.toFixed(2)}€</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Saldo actual:</Text>
                    <Text style={[styles.cardValue, { color: Colors.success, fontWeight: 'bold' }]}>
                      {card.balance?.toFixed(2)}€
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Data compra:</Text>
                    <Text style={styles.cardValue}>{formatDate(card.created_at)}</Text>
                  </View>
                </View>

                {card.amount > card.balance && (
                  <View style={styles.spentInfo}>
                    <MaterialIcons name="trending-down" size={16} color={Colors.warning} />
                    <Text style={styles.spentText}>
                      Gastat: {(card.amount - card.balance).toFixed(2)}€
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Secció Locals Adherits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locals Adherits</Text>
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={24} color={Colors.info || Colors.primary} />
            <Text style={styles.infoText}>
              Els locals associats que registrin el seu compte bancari podran acceptar pagaments amb Targeta Regal.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => router.push('/admin/users?role=local_associat')}
          >
            <MaterialIcons name="store" size={20} color={Colors.primary} />
            <Text style={styles.linkButtonText}>Veure Locals Associats</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  statsContainer: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardFull: {
    flex: undefined,
    width: '100%',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  cardItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardCodeText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    fontWeight: '600',
  },
  cardDetails: {
    gap: Spacing.xs,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  cardValue: {
    fontSize: FontSizes.sm,
    color: Colors.textDark,
  },
  spentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E5E5',
  },
  spentText: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight || '#E3F2FD',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  linkButtonText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});
