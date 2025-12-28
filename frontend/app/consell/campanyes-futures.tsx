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
  description: string;
  start_date: string;
  end_date: string;
  managers: string[];
  manager_names?: string[];
  status: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

export default function CampanyesFuturesPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    managers: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, membersRes] = await Promise.all([
        api.get('/consell/campanyes-futures', { headers: { Authorization: token } }),
        api.get('/consell/members', { headers: { Authorization: token } }),
      ]);
      setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setCampaigns([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      const msg = 'El nom i les dates són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      await api.post('/consell/campanyes-futures', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ name: '', description: '', start_date: '', end_date: '', managers: [] });
      loadData();
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/consell/campanyes-futures/${campaignId}`, {
          headers: { Authorization: token },
        });
        loadData();
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

  const toggleManager = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      managers: prev.managers.includes(memberId)
        ? prev.managers.filter(m => m !== memberId)
        : [...prev.managers, memberId]
    }));
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES');
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
          <Text style={styles.headerTitle}>Campanyes Futures</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
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
        <Text style={styles.headerTitle}>Campanyes Futures</Text>
        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="campaign" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha campanyes</Text>
            <Text style={styles.emptyText}>Clica + per crear una nova campanya</Text>
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
              
              <Text style={styles.campaignDescription}>{campaign.description}</Text>
              
              <View style={styles.dateRow}>
                <MaterialIcons name="date-range" size={18} color="#9C27B0" />
                <Text style={styles.dateText}>
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </Text>
              </View>
              
              <View style={styles.managersSection}>
                <Text style={styles.managersTitle}>Gestors:</Text>
                <Text style={styles.managersList}>
                  {campaign.manager_names?.join(', ') || 'Sense assignar'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Nom de la campanya"
              />
              
              <Text style={styles.label}>Data Inici *</Text>
              <TextInput
                style={styles.input}
                value={formData.start_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                placeholder="YYYY-MM-DD"
              />
              
              <Text style={styles.label}>Data Final *</Text>
              <TextInput
                style={styles.input}
                value={formData.end_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                placeholder="YYYY-MM-DD"
              />
              
              <Text style={styles.label}>Descripció</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Descripció..."
                multiline
                numberOfLines={4}
              />
              
              <Text style={styles.label}>Gestors</Text>
              <View style={styles.membersGrid}>
                {members.map(member => (
                  <Pressable
                    key={member.id}
                    style={[
                      styles.memberChip,
                      formData.managers.includes(member.id) && styles.memberChipSelected
                    ]}
                    onPress={() => toggleManager(member.id)}
                  >
                    <Text style={[
                      styles.memberChipText,
                      formData.managers.includes(member.id) && styles.memberChipTextSelected
                    ]}>
                      {member.name || member.email}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: '#9C27B0' }]} onPress={handleCreate}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#9C27B0', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: Spacing.md },
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  campaignCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  campaignName: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textDark, flex: 1 },
  campaignDescription: { fontSize: FontSizes.md, color: Colors.darkGray, marginBottom: Spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  dateText: { fontSize: FontSizes.sm, color: '#9C27B0', fontWeight: '600' },
  managersSection: { borderTopWidth: 1, borderTopColor: Colors.lightGray, paddingTop: Spacing.sm },
  managersTitle: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark },
  managersList: { fontSize: FontSizes.sm, color: Colors.darkGray, marginTop: Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark },
  modalBody: { padding: Spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.textDark },
  textArea: { height: 100, textAlignVertical: 'top' },
  membersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  memberChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#9C27B0' },
  memberChipSelected: { backgroundColor: '#9C27B0' },
  memberChipText: { fontSize: FontSizes.sm, color: '#9C27B0' },
  memberChipTextSelected: { color: Colors.white },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gray },
  cancelButtonText: { color: Colors.gray, fontSize: FontSizes.md },
  saveButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
