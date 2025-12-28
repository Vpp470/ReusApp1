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
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface GimcanaCampaign {
  _id: string;
  name: string;
  description: string;
  total_qr_codes: number;
  start_date: string;
  end_date: string;
  prize_description: string;
  rules: string;
  is_active: boolean;
  stats: {
    participants: number;
    completed: number;
  };
}

export default function GimcanaAdminPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [campaigns, setCampaigns] = useState<GimcanaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<GimcanaCampaign | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_qr_codes: '15',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    prize_description: '',
    rules: '',
    is_active: true,
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/gimcana/campaigns', {
        headers: { Authorization: token },
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      total_qr_codes: '15',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      prize_description: '',
      rules: '',
      is_active: true,
    });
    setEditingCampaign(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (campaign: GimcanaCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      total_qr_codes: campaign.total_qr_codes.toString(),
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      prize_description: campaign.prize_description || '',
      rules: campaign.rules || '',
      is_active: campaign.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.total_qr_codes) {
      const msg = 'El nom i la quantitat de QR són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      const data = {
        name: formData.name,
        description: formData.description,
        total_qr_codes: parseInt(formData.total_qr_codes),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        prize_description: formData.prize_description,
        rules: formData.rules,
        is_active: formData.is_active,
      };

      if (editingCampaign) {
        await api.put(`/gimcana/campaigns/${editingCampaign._id}`, data, {
          headers: { Authorization: token },
        });
        const msg = 'Campanya actualitzada correctament';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
      } else {
        await api.post('/gimcana/campaigns', data, {
          headers: { Authorization: token },
        });
        const msg = `Campanya creada amb ${data.total_qr_codes} codis QR`;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
      }

      setShowModal(false);
      resetForm();
      loadCampaigns();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      const msg = error.response?.data?.detail || 'Error guardant la campanya';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/gimcana/campaigns/${campaignId}`, {
          headers: { Authorization: token },
        });
        loadCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Estàs segur que vols eliminar aquesta campanya? S\'eliminaran tots els QR codes i el progrés dels usuaris.')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmar',
        'Estàs segur que vols eliminar aquesta campanya?',
        [
          { text: 'Cancel·lar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isActive = (campaign: GimcanaCampaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return campaign.is_active && now >= start && now <= end;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Gincanes QR</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Gincanes QR</Text>
        <Pressable style={styles.addButton} onPress={handleCreate}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="qr-code-2" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha gincanes</Text>
            <Text style={styles.emptyText}>
              Clica el botó + per crear una nova gimcana amb QR codes
            </Text>
          </View>
        ) : (
          campaigns.map(campaign => (
            <Pressable
              key={campaign._id}
              style={styles.campaignCard}
              onPress={() => router.push(`/admin/gimcana/${campaign._id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <MaterialIcons name="qr-code-2" size={24} color={Colors.primary} />
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isActive(campaign) ? '#4CAF50' : Colors.gray }
                ]}>
                  <Text style={styles.statusText}>
                    {isActive(campaign) ? 'Activa' : 'Inactiva'}
                  </Text>
                </View>
              </View>

              {campaign.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {campaign.description}
                </Text>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialIcons name="qr-code" size={18} color={Colors.primary} />
                  <Text style={styles.statText}>{campaign.total_qr_codes} QR</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="people" size={18} color="#2196F3" />
                  <Text style={styles.statText}>{campaign.stats.participants} participants</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="emoji-events" size={18} color="#FF9800" />
                  <Text style={styles.statText}>{campaign.stats.completed} completats</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <MaterialIcons name="date-range" size={16} color={Colors.gray} />
                <Text style={styles.dateText}>
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEdit(campaign);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color={Colors.primary} />
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/gimcana/${campaign._id}`);
                  }}
                >
                  <MaterialIcons name="settings" size={20} color="#2196F3" />
                  <Text style={[styles.actionText, { color: '#2196F3' }]}>Gestionar QR</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(campaign._id);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Eliminar</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Modal de creació/edició */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCampaign ? 'Editar Gimcana' : 'Nova Gimcana'}
              </Text>
              <Pressable onPress={() => { setShowModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nom de la campanya *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Ex: Gimcana dels Follets Coia i Pere"
              />

              <Text style={styles.label}>Descripció</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Descripció de la gimcana..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Quantitat de QR a escanejar *</Text>
              <TextInput
                style={styles.input}
                value={formData.total_qr_codes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, total_qr_codes: text }))}
                placeholder="15"
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Es generaran automàticament {formData.total_qr_codes} codis QR únics
              </Text>

              <Text style={styles.label}>Data d'inici</Text>
              <TextInput
                style={styles.input}
                value={formData.start_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.label}>Data de fi</Text>
              <TextInput
                style={styles.input}
                value={formData.end_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.label}>Descripció del premi</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.prize_description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, prize_description: text }))}
                placeholder="Ex: Entra en el sorteig de 3 vals de 50€!"
                multiline
                numberOfLines={2}
              />

              <Text style={styles.label}>Bases de participació</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.rules}
                onChangeText={(text) => setFormData(prev => ({ ...prev, rules: text }))}
                placeholder="Condicions i regles de participació..."
                multiline
                numberOfLines={4}
              />

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              >
                <MaterialIcons
                  name={formData.is_active ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Campanya activa</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => { setShowModal(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingCampaign ? 'Actualitzar' : 'Crear Gimcana'}
                </Text>
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
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: Spacing.md },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  campaignCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  campaignName: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textDark, flex: 1 },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: { color: Colors.white, fontSize: FontSizes.xs, fontWeight: 'bold' },
  description: { fontSize: FontSizes.sm, color: '#555', marginBottom: Spacing.md },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statText: { fontSize: FontSizes.sm, color: '#555' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  dateText: { fontSize: FontSizes.sm, color: '#666' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: Spacing.md,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.xs },
  actionText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark },
  modalBody: { padding: Spacing.lg },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  hint: { fontSize: FontSizes.xs, color: '#666', marginTop: Spacing.xs },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  checkboxLabel: { fontSize: FontSizes.md, color: Colors.textDark },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#999',
  },
  cancelButtonText: { color: '#666', fontSize: FontSizes.md },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
