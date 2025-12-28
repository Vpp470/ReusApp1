import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../../src/constants/colors';
import { useAuthStore } from '../../../src/store/authStore';
import api from '../../../src/services/api';

interface QRCode {
  _id: string;
  code: string;
  number: number;
  establishment_id: string | null;
  establishment_name: string;
  location_hint: string;
  scan_count: number;
}

interface Participant {
  _id: string;
  user_name: string;
  user_email: string;
  scanned_count: number;
  total: number;
  completed: boolean;
  completed_at: string | null;
  entered_raffle: boolean;
}

interface Campaign {
  _id: string;
  name: string;
  total_qr_codes: number;
  stats: {
    participants: number;
    completed: number;
  };
}

export default function GimcanaDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { token } = useAuthStore();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qr' | 'participants' | 'raffle'>('qr');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQR, setEditingQR] = useState<QRCode | null>(null);
  const [editForm, setEditForm] = useState({
    establishment_name: '',
    location_hint: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [campaignRes, qrRes, participantsRes] = await Promise.all([
        api.get(`/gimcana/campaigns/${id}`, { headers: { Authorization: token } }),
        api.get(`/gimcana/campaigns/${id}/qr-codes`, { headers: { Authorization: token } }),
        api.get(`/gimcana/campaigns/${id}/participants`, { headers: { Authorization: token } }),
      ]);
      
      setCampaign(campaignRes.data);
      setQrCodes(qrRes.data);
      setParticipants(participantsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQR = (qr: QRCode) => {
    setEditingQR(qr);
    setEditForm({
      establishment_name: qr.establishment_name,
      location_hint: qr.location_hint || '',
    });
    setShowEditModal(true);
  };

  const handleSaveQR = async () => {
    if (!editingQR) return;
    
    try {
      await api.put(`/gimcana/qr-codes/${editingQR._id}`, editForm, {
        headers: { Authorization: token },
      });
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving QR:', error);
    }
  };

  const copyQRCode = (code: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(code);
      window.alert(`Codi copiat: ${code}`);
    } else {
      Alert.alert('Codi QR', code);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Carregant...</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const raffleParticipants = participants.filter(p => p.completed && p.entered_raffle);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {campaign?.name || 'Gimcana'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{campaign?.total_qr_codes || 0}</Text>
          <Text style={styles.statLabel}>QR Codes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{campaign?.stats.participants || 0}</Text>
          <Text style={styles.statLabel}>Participants</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{campaign?.stats.completed || 0}</Text>
          <Text style={styles.statLabel}>Completats</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{raffleParticipants.length}</Text>
          <Text style={styles.statLabel}>Al sorteig</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
          onPress={() => setActiveTab('qr')}
        >
          <MaterialIcons name="qr-code" size={20} color={activeTab === 'qr' ? Colors.primary : Colors.gray} />
          <Text style={[styles.tabText, activeTab === 'qr' && styles.activeTabText]}>Codis QR</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'participants' && styles.activeTab]}
          onPress={() => setActiveTab('participants')}
        >
          <MaterialIcons name="people" size={20} color={activeTab === 'participants' ? Colors.primary : Colors.gray} />
          <Text style={[styles.tabText, activeTab === 'participants' && styles.activeTabText]}>Participants</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'raffle' && styles.activeTab]}
          onPress={() => setActiveTab('raffle')}
        >
          <MaterialIcons name="emoji-events" size={20} color={activeTab === 'raffle' ? Colors.primary : Colors.gray} />
          <Text style={[styles.tabText, activeTab === 'raffle' && styles.activeTabText]}>Sorteig</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* QR Codes Tab */}
        {activeTab === 'qr' && (
          <>
            <Text style={styles.sectionTitle}>Codis QR per imprimir</Text>
            <Text style={styles.sectionHint}>
              Clica a cada codi per copiar-lo. Després pots generar els QR amb qualsevol generador online.
            </Text>
            {qrCodes.map(qr => (
              <View key={qr._id} style={styles.qrCard}>
                <View style={styles.qrHeader}>
                  <View style={styles.qrNumber}>
                    <Text style={styles.qrNumberText}>{qr.number}</Text>
                  </View>
                  <View style={styles.qrInfo}>
                    <Text style={styles.qrEstablishment}>{qr.establishment_name}</Text>
                    {qr.location_hint && (
                      <Text style={styles.qrHint}>{qr.location_hint}</Text>
                    )}
                  </View>
                  <Pressable style={styles.editQRButton} onPress={() => handleEditQR(qr)}>
                    <MaterialIcons name="edit" size={20} color={Colors.primary} />
                  </Pressable>
                </View>
                <Pressable style={styles.qrCodeBox} onPress={() => copyQRCode(qr.code)}>
                  <MaterialIcons name="qr-code-2" size={24} color={Colors.primary} />
                  <Text style={styles.qrCodeText}>{qr.code}</Text>
                  <MaterialIcons name="content-copy" size={18} color={Colors.gray} />
                </Pressable>
                <Text style={styles.scanCount}>
                  <MaterialIcons name="visibility" size={14} color={Colors.gray} /> {qr.scan_count} escanejos
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <>
            <Text style={styles.sectionTitle}>Tots els participants ({participants.length})</Text>
            {participants.length === 0 ? (
              <View style={styles.emptyTab}>
                <MaterialIcons name="people-outline" size={48} color={Colors.gray} />
                <Text style={styles.emptyText}>Encara no hi ha participants</Text>
              </View>
            ) : (
              participants.map(p => (
                <View key={p._id} style={styles.participantCard}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{p.user_name}</Text>
                    <Text style={styles.participantEmail}>{p.user_email}</Text>
                  </View>
                  <View style={styles.participantProgress}>
                    <Text style={styles.progressText}>
                      {p.scanned_count}/{p.total}
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${(p.scanned_count / p.total) * 100}%` }
                        ]} 
                      />
                    </View>
                    {p.completed && (
                      <View style={styles.completedBadge}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.completedText}>Completat</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Raffle Tab */}
        {activeTab === 'raffle' && (
          <>
            <Text style={styles.sectionTitle}>Participants al sorteig ({raffleParticipants.length})</Text>
            <Text style={styles.sectionHint}>
              Usuaris que han completat tots els QR i s'han inscrit al sorteig
            </Text>
            {raffleParticipants.length === 0 ? (
              <View style={styles.emptyTab}>
                <MaterialIcons name="emoji-events" size={48} color={Colors.gray} />
                <Text style={styles.emptyText}>Encara no hi ha participants al sorteig</Text>
              </View>
            ) : (
              raffleParticipants.map((p, index) => (
                <View key={p._id} style={styles.raffleCard}>
                  <View style={styles.raffleNumber}>
                    <Text style={styles.raffleNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.raffleInfo}>
                    <Text style={styles.raffleName}>{p.user_name}</Text>
                    <Text style={styles.raffleEmail}>{p.user_email}</Text>
                    <Text style={styles.raffleDate}>Completat: {formatDate(p.completed_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Edit QR Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar QR #{editingQR?.number}</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.label}>Nom de l'establiment</Text>
              <TextInput
                style={styles.input}
                value={editForm.establishment_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, establishment_name: text }))}
                placeholder="Ex: Botiga Can Pere"
              />
              
              <Text style={styles.label}>Pista d'ubicació</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.location_hint}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, location_hint: text }))}
                placeholder="Ex: A l'entrada, al costat de la caixa"
                multiline
                numberOfLines={2}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSaveQR}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white, flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.primary },
  statLabel: { fontSize: FontSizes.xs, color: '#666' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, color: '#666' },
  activeTabText: { color: Colors.primary, fontWeight: '600' },
  content: { flex: 1, padding: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: '#333', marginBottom: Spacing.xs },
  sectionHint: { fontSize: FontSizes.sm, color: '#666', marginBottom: Spacing.md },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  qrNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrNumberText: { color: Colors.white, fontWeight: 'bold' },
  qrInfo: { flex: 1, marginLeft: Spacing.sm },
  qrEstablishment: { fontSize: FontSizes.md, fontWeight: '600', color: '#333' },
  qrHint: { fontSize: FontSizes.sm, color: '#666' },
  editQRButton: { padding: Spacing.xs },
  qrCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  qrCodeText: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: FontSizes.sm, color: '#333' },
  scanCount: { fontSize: FontSizes.xs, color: '#666', marginTop: Spacing.xs },
  emptyTab: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { color: '#666', marginTop: Spacing.sm },
  participantCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantInfo: { flex: 1 },
  participantName: { fontSize: FontSizes.md, fontWeight: '600', color: '#333' },
  participantEmail: { fontSize: FontSizes.sm, color: '#666' },
  participantProgress: { alignItems: 'flex-end' },
  progressText: { fontSize: FontSizes.md, fontWeight: 'bold', color: Colors.primary },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 2 },
  completedText: { fontSize: FontSizes.xs, color: '#4CAF50' },
  raffleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  raffleNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  raffleNumberText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSizes.md },
  raffleInfo: { flex: 1, marginLeft: Spacing.md },
  raffleName: { fontSize: FontSizes.md, fontWeight: '600', color: '#333' },
  raffleEmail: { fontSize: FontSizes.sm, color: '#666' },
  raffleDate: { fontSize: FontSizes.xs, color: '#666', marginTop: Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: '#333' },
  modalBody: { padding: Spacing.lg },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: '#333', marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: '#F5F5F5', borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: '#333', borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 60, textAlignVertical: 'top' },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#999' },
  cancelButtonText: { color: '#666' },
  saveButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
});
