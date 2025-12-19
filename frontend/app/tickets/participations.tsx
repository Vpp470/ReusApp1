import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';

interface Ticket {
  id: string;
  ticket_number: string;
  establishment_name: string;
  amount: number;
  participations_generated: number;
  ticket_date: string;
  created_at: string;
}

export default function ParticipationsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [participations, setParticipations] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participationsRes, ticketsRes] = await Promise.all([
        axios.get(`${API_URL}/api/tickets/my-participations`, {
          headers: { Authorization: token! },
        }),
        axios.get(`${API_URL}/api/tickets/my-tickets`, {
          headers: { Authorization: token! },
        }),
      ]);

      setParticipations(participationsRes.data.participations || 0);
      setTicketsCount(participationsRes.data.tickets_count || 0);
      setTickets(ticketsRes.data || []);
    } catch (error) {
      console.error('Error carregant dades:', error);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Les Meves Participacions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Targeta Resum */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="emoji-events" size={48} color={Colors.primary} />
            <Text style={styles.summaryTitle}>Participacions Actuals</Text>
          </View>
          
          <View style={styles.summaryStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{participations}</Text>
              <Text style={styles.statLabel}>Participacions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{ticketsCount}</Text>
              <Text style={styles.statLabel}>Tiquets</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Cada participació és una oportunitat per guanyar al sorteig mensual
            </Text>
          </View>
        </View>

        {/* Historial de Tiquets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Tiquets</Text>
          
          {tickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="receipt-long" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No tens tiquets encara</Text>
              <Text style={styles.emptySubtext}>
                Escaneja els teus tiquets de compra per generar participacions
              </Text>
              <Pressable
                style={styles.scanButton}
                onPress={() => router.push('/tickets/scan')}
              >
                <MaterialIcons name="camera-alt" size={20} color={Colors.white} />
                <Text style={styles.scanButtonText}>Escanejar Tiquet</Text>
              </Pressable>
            </View>
          ) : (
            tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketIcon}>
                    <MaterialIcons name="receipt" size={24} color={Colors.white} />
                  </View>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketEstablishment}>{ticket.establishment_name}</Text>
                    <Text style={styles.ticketNumber}>#{ticket.ticket_number}</Text>
                  </View>
                  <View style={styles.participationsBadge}>
                    <MaterialIcons name="confirmation-number" size={16} color={Colors.white} />
                    <Text style={styles.participationsBadgeText}>{ticket.participations_generated}</Text>
                  </View>
                </View>

                <View style={styles.ticketDetails}>
                  <View style={styles.ticketDetailRow}>
                    <MaterialIcons name="euro" size={16} color={Colors.textSecondary} />
                    <Text style={styles.ticketDetailText}>Import: {ticket.amount.toFixed(2)}€</Text>
                  </View>
                  <View style={styles.ticketDetailRow}>
                    <MaterialIcons name="calendar-today" size={16} color={Colors.textSecondary} />
                    <Text style={styles.ticketDetailText}>
                      {formatDate(ticket.ticket_date || ticket.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Botó Escanejar Més */}
        {tickets.length > 0 && (
          <Pressable
            style={styles.addMoreButton}
            onPress={() => router.push('/tickets/scan')}
          >
            <MaterialIcons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addMoreButtonText}>Escanejar Més Tiquets</Text>
          </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginTop: Spacing.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  scanButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketEstablishment: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  ticketNumber: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 2,
  },
  participationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  participationsBadgeText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  ticketDetails: {
    gap: Spacing.xs,
  },
  ticketDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ticketDetailText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  addMoreButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
});
