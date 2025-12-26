import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
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

interface Campaign {
  _id: string;
  name: string;
  start_date: string;
  end_date?: string;
  budget: number;
  media: string;
  notes: string;
  created_at: string;
}

export default function CampanyesContractadesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    budget: '',
    media: '',
    notes: '',
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/consell/campanyes-publicitaries', {
        headers: { Authorization: token },
      });
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.start_date || !formData.budget || !formData.media) {
      const msg = 'El nom, data d\'inici, pressupost i mitjà són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      await api.post('/consell/campanyes-publicitaries', {
        ...formData,
        budget: parseFloat(formData.budget),
      }, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ name: '', start_date: '', end_date: '', budget: '', media: '', notes: '' });
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/consell/campanyes-publicitaries/${campaignId}`, {
          headers: { Authorization: token },
        });
        loadCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Estàs segur que vols eliminar aquesta campanya?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Confirmar', 'Estàs segur?', [
        { text: 'Cancel·lar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Campanyes Publicitàries</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Campanyes Publicitàries</Text>
        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Card */}
        {campaigns.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <MaterialIcons name="campaign" size={24} color="#2196F3" />
              <Text style={styles.summaryValue}>{campaigns.length}</Text>
              <Text style={styles.summaryLabel}>Campanyes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <MaterialIcons name="euro" size={24} color="#4CAF50" />
              <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
              <Text style={styles.summaryLabel}>Pressupost total</Text>
            </View>
          </View>
        )}

        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha campanyes</Text>
            <Text style={styles.emptyText}>
              Clica el botó + per afegir una nova campanya publicitària
            </Text>
          </View>
        ) : (
          campaigns.map(campaign => (
            <View key={campaign._id} style={styles.campaignCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.campaignName}>{campaign.name}</Text>
                <Pressable onPress={() => handleDelete(campaign._id)}>
                  <MaterialIcons name="delete" size={24} color={Colors.error} />
                </Pressable>
              </View>
              
              <View style={styles.mediaRow}>
                <MaterialIcons name="tv" size={18} color="#2196F3" />
                <Text style={styles.mediaText}>{campaign.media}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="date-range" size={16} color={Colors.gray} />
                  <Text style={styles.infoText}>
                    {formatDate(campaign.start_date)}
                    {campaign.end_date && ` - ${formatDate(campaign.end_date)}`}
                  </Text>
                </View>
                <View style={styles.budgetBadge}>
                  <Text style={styles.budgetText}>{formatCurrency(campaign.budget)}</Text>
                </View>
              </View>
              
              {campaign.notes && (
                <Text style={styles.notes}>{campaign.notes}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Campaign Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Campanya</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nom de la campanya *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Ex: Campanya Nadal 2025"
              />
              
              <Text style={styles.label}>Mitjà *</Text>
              <TextInput
                style={styles.input}
                value={formData.media}
                onChangeText={(text) => setFormData(prev => ({ ...prev, media: text }))}
                placeholder="Ex: Ràdio Reus, Diari de Tarragona"
              />
              
              <Text style={styles.label}>Data d'inici *</Text>
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
                placeholder="YYYY-MM-DD (opcional)"
              />
              
              <Text style={styles.label}>Pressupost (€) *</Text>
              <TextInput
                style={styles.input}
                value={formData.budget}
                onChangeText={(text) => setFormData(prev => ({ ...prev, budget: text }))}
                placeholder="1000"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Notes addicionals..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleCreate}>
                <Text style={styles.saveButtonText}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2196F3', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: Spacing.md },
  summaryCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, flexDirection: 'row', marginBottom: Spacing.md },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.lightGray, marginHorizontal: Spacing.md },
  summaryValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.xs },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.gray },
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  campaignCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  campaignName: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textDark, flex: 1 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  mediaText: { fontSize: FontSizes.md, color: '#2196F3', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  infoText: { fontSize: FontSizes.sm, color: Colors.gray },
  budgetBadge: { backgroundColor: '#4CAF50' + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  budgetText: { color: '#4CAF50', fontSize: FontSizes.md, fontWeight: 'bold' },
  notes: { fontSize: FontSizes.sm, color: Colors.darkGray, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: Colors.lightGray, paddingTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark },
  modalBody: { padding: Spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.textDark },
  textArea: { height: 80, textAlignVertical: 'top' },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gray },
  cancelButtonText: { color: Colors.gray, fontSize: FontSizes.md },
  saveButton: { backgroundColor: '#2196F3', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
