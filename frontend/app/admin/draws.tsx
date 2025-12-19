import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../../src/store/authStore';

interface Participant {
  user_id: string;
  name: string;
  email: string;
  participations: number;
  tickets_count: number;
}

interface Draw {
  id: string;
  draw_date: string;
  winners: Array<{
    user_id: string;
    name: string;
    email: string;
    participations: number;
  }>;
  prize_description: string;
  total_participants: number;
  total_participations: number;
  status: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  prize_description: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

export default function DrawsAdminScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalParticipations, setTotalParticipations] = useState(0);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [numWinners, setNumWinners] = useState('1');
  const [conducting, setConducting] = useState(false);

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participantsRes, drawsRes, campaignsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/tickets/participants`, {
          headers: { Authorization: token! },
        }),
        axios.get(`${API_URL}/api/admin/tickets/draws`, {
          headers: { Authorization: token! },
        }),
        axios.get(`${API_URL}/api/admin/tickets/campaigns`, {
          headers: { Authorization: token! },
        }),
      ]);

      setParticipants(participantsRes.data.participants || []);
      setTotalParticipations(participantsRes.data.total_participations || 0);
      setDraws(drawsRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (error) {
      console.error('Error carregant dades:', error);
      Alert.alert('Error', 'No s\'han pogut carregar les dades');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConductDraw = async () => {
    if (!selectedCampaign) {
      Alert.alert('Error', 'Selecciona una campanya');
      return;
    }

    const winners = parseInt(numWinners);
    if (isNaN(winners) || winners < 1) {
      Alert.alert('Error', 'El número de guanyadors ha de ser mínim 1');
      return;
    }

    if (winners > participants.length) {
      Alert.alert('Error', `No hi ha prou participants. Màxim: ${participants.length}`);
      return;
    }

    Alert.alert(
      'Confirmar Sorteig',
      `Estàs segur de realitzar el sorteig amb ${winners} guanyador(s)?\n\nAixò notificarà als guanyadors i resetarà totes les participacions.`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Realitzar Sorteig',
          style: 'destructive',
          onPress: async () => {
            try {
              setConducting(true);
              const response = await axios.post(
                `${API_URL}/api/admin/tickets/draw`,
                { campaign_id: selectedCampaign.id, num_winners: winners },
                {
                  headers: { Authorization: token! },
                  params: { campaign_id: selectedCampaign.id, num_winners: winners },
                }
              );

              setShowDrawModal(false);
              setSelectedCampaign(null);
              setNumWinners('1');

              Alert.alert(
                '🎉 Sorteig Completat!',
                response.data.message,
                [{ text: 'OK', onPress: loadData }]
              );
            } catch (error: any) {
              console.error('Error realitzant sorteig:', error);
              Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut realitzar el sorteig');
            } finally {
              setConducting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const activeCampaign = campaigns.find(c => c.is_active);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestió de Sortejos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Estadístiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="people" size={32} color={Colors.primary} />
            <Text style={styles.statValue}>{participants.length}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="confirmation-number" size={32} color={Colors.secondary} />
            <Text style={styles.statValue}>{totalParticipations}</Text>
            <Text style={styles.statLabel}>Participacions</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="emoji-events" size={32} color={Colors.warning} />
            <Text style={styles.statValue}>{draws.length}</Text>
            <Text style={styles.statLabel}>Sortejos</Text>
          </View>
        </View>

        {/* Botó Realitzar Sorteig */}
        {activeCampaign && participants.length > 0 && (
          <Pressable
            style={styles.drawButton}
            onPress={() => {
              setSelectedCampaign(activeCampaign);
              setShowDrawModal(true);
            }}
          >
            <MaterialIcons name="casino" size={24} color={Colors.white} />
            <Text style={styles.drawButtonText}>Realitzar Sorteig Ara</Text>
          </Pressable>
        )}

        {/* Llista de Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants Actuals</Text>
          {participants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No hi ha participants encara</Text>
            </View>
          ) : (
            participants.map((participant, index) => (
              <View key={participant.user_id} style={styles.participantCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantEmail}>{participant.email}</Text>
                </View>
                <View style={styles.participantStats}>
                  <View style={styles.statBadge}>
                    <MaterialIcons name="confirmation-number" size={16} color={Colors.primary} />
                    <Text style={styles.statBadgeText}>{participant.participations}</Text>
                  </View>
                  <View style={styles.statBadge}>
                    <MaterialIcons name="receipt" size={16} color={Colors.secondary} />
                    <Text style={styles.statBadgeText}>{participant.tickets_count}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Historial de Sortejos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Sortejos</Text>
          {draws.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No s'han realitzat sortejos encara</Text>
            </View>
          ) : (
            draws.map((draw) => (
              <View key={draw.id} style={styles.drawCard}>
                <View style={styles.drawHeader}>
                  <MaterialIcons name="emoji-events" size={24} color={Colors.warning} />
                  <Text style={styles.drawDate}>
                    {new Date(draw.draw_date).toLocaleDateString('ca-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={styles.drawPrize}>Premi: {draw.prize_description}</Text>
                <View style={styles.drawStats}>
                  <Text style={styles.drawStat}>
                    Participants: {draw.total_participants}
                  </Text>
                  <Text style={styles.drawStat}>
                    Participacions: {draw.total_participations}
                  </Text>
                </View>
                <View style={styles.winnersContainer}>
                  <Text style={styles.winnersTitle}>🏆 Guanyadors:</Text>
                  {draw.winners.map((winner, idx) => (
                    <View key={winner.user_id} style={styles.winnerItem}>
                      <Text style={styles.winnerText}>
                        {idx + 1}. {winner.name}
                      </Text>
                      <Text style={styles.winnerParticipations}>
                        ({winner.participations} participacions)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Realitzar Sorteig */}
      <Modal
        visible={showDrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Realitzar Sorteig</Text>
            
            {selectedCampaign && (
              <>
                <Text style={styles.modalLabel}>Campanya:</Text>
                <Text style={styles.modalValue}>{selectedCampaign.title}</Text>
                
                <Text style={styles.modalLabel}>Premi:</Text>
                <Text style={styles.modalValue}>{selectedCampaign.prize_description}</Text>
                
                <Text style={styles.modalLabel}>Número de Guanyadors:</Text>
                <TextInput
                  style={styles.input}
                  value={numWinners}
                  onChangeText={setNumWinners}
                  keyboardType="numeric"
                  placeholder="1"
                />
                
                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowDrawModal(false)}
                    disabled={conducting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel·lar</Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConductDraw}
                    disabled={conducting}
                  >
                    {conducting ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.confirmButtonText}>Realitzar</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  drawButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  drawButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  participantCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rankText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  participantEmail: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 2,
  },
  participantStats: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  statBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  drawCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  drawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  drawDate: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  drawPrize: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  drawStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  drawStat: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  winnersContainer: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  winnersTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  winnerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  winnerText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontWeight: '500',
  },
  winnerParticipations: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  modalValue: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.lightGray,
  },
  cancelButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
