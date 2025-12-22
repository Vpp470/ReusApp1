import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';

// Importar DateTimePicker només per plataformes natives
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  image?: string;
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
}

export default function AdminTicketCampaignsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    title: 'Escaneja Tiquets i Guanya Premis',
    description: 'Per cada 10€ de compra genera 1 participació per al sorteig mensual',
    image: '',
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dies
    prize_description: '',
    tag: '',
    is_active: true,
  });

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/tickets/campaigns`, {
        headers: { Authorization: token! },
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error carregant campanyes:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, image: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.prize_description) {
      Alert.alert('Error', 'Emplena el títol i la descripció del premi');
      return;
    }

    try {
      setLoading(true);
      
      // Generar automàticament un marcador si no existeix
      let tag = formData.tag;
      if (!tag || tag.trim() === '') {
        // Format: Mes_Any (Ex: Desembre_2025)
        const monthNames = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
        const startDate = formData.start_date;
        const month = monthNames[startDate.getMonth()];
        const year = startDate.getFullYear();
        tag = `${month}_${year}`;
      }
      
      const payload = {
        ...formData,
        tag: tag,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
      };

      if (editingCampaign) {
        await axios.put(`${API_URL}/api/admin/tickets/campaign/${editingCampaign.id}`, payload, {
          headers: { Authorization: token! },
        });
        Alert.alert('Èxit', `Campanya actualitzada amb marcador: ${tag}`);
      } else {
        await axios.post(`${API_URL}/api/admin/tickets/campaign`, payload, {
          headers: { Authorization: token! },
        });
        Alert.alert('Èxit', `Campanya creada amb marcador: ${tag}`);
      }

      setModalVisible(false);
      resetForm();
      loadCampaigns();
    } catch (error: any) {
      console.error('Error guardant:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirmar', 'Eliminar aquesta campanya?', [
      { text: 'Cancel·lar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/api/admin/tickets/campaign/${id}`, {
              headers: { Authorization: token! },
            });
            Alert.alert('Èxit', 'Campanya eliminada');
            loadCampaigns();
          } catch (error) {
            Alert.alert('Error', 'No s\'ha pogut eliminar');
          }
        },
      },
    ]);
  };

  const handleEdit = (item: Campaign) => {
    setEditingCampaign(item);
    setFormData({
      title: item.title,
      description: item.description,
      image: item.image || '',
      start_date: new Date(item.start_date),
      end_date: new Date(item.end_date),
      prize_description: item.prize_description,
      tag: (item as any).tag || '',
      is_active: item.is_active,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormData({
      title: 'Escaneja Tiquets i Guanya Premis',
      description: 'Per cada 10€ de compra genera 1 participació per al sorteig mensual',
      image: '',
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      prize_description: '',
      is_active: true,
    });
  };

  const isActive = (campaign: Campaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return campaign.is_active && now >= start && now <= end;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Campanyes de Tiquets</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>Nova Campanya</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignCard}>
              {campaign.image && (
                <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
              )}
              <View style={styles.campaignContent}>
                <View style={styles.statusBadge}>
                  {isActive(campaign) ? (
                    <View style={[styles.badge, { backgroundColor: Colors.success }]}>
                      <Text style={styles.badgeText}>ACTIVA</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: Colors.textSecondary }]}>
                      <Text style={styles.badgeText}>INACTIVA</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.campaignDescription}>{campaign.description}</Text>
                
                <View style={styles.dateRow}>
                  <MaterialIcons name="calendar-today" size={16} color={Colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {new Date(campaign.start_date).toLocaleDateString('ca-ES')} - {new Date(campaign.end_date).toLocaleDateString('ca-ES')}
                  </Text>
                </View>
                
                <View style={styles.prizeRow}>
                  <MaterialIcons name="emoji-events" size={16} color={Colors.primary} />
                  <Text style={styles.prizeText}>{campaign.prize_description}</Text>
                </View>
                
                <View style={styles.campaignActions}>
                  <Pressable onPress={() => handleEdit(campaign)} style={styles.editButton}>
                    <MaterialIcons name="edit" size={20} color={Colors.primary} />
                    <Text style={styles.actionText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(campaign.id)} style={styles.deleteButton}>
                    <MaterialIcons name="delete" size={20} color={Colors.error} />
                    <Text style={styles.actionTextDelete}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal Crear/Editar */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setModalVisible(false); resetForm(); }}>
              <MaterialIcons name="close" size={24} color={Colors.textDark} />
            </Pressable>
            <Text style={styles.modalTitle}>{editingCampaign ? 'Editar' : 'Nova'} Campanya</Text>
            <Pressable onPress={handleSave}>
              <MaterialIcons name="check" size={24} color={Colors.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Títol *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Escaneja Tiquets i Guanya Premis"
            />

            <Text style={styles.label}>Descripció</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Descripció de la campanya..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Imatge de la Campanya</Text>
            <Pressable style={styles.imageButton} onPress={pickImage}>
              {formData.image ? (
                <Image source={{ uri: formData.image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-a-photo" size={32} color={Colors.textSecondary} />
                  <Text style={styles.imagePlaceholderText}>Seleccionar imatge</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.label}>Data d'Inici *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={formData.start_date.toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (!isNaN(date.getTime())) {
                    setFormData({ ...formData, start_date: date });
                  }
                }}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#F5F5F5',
                  width: '100%',
                  marginBottom: 16,
                }}
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>{formData.start_date.toLocaleDateString('ca-ES')}</Text>
                  <MaterialIcons name="calendar-today" size={20} color={Colors.textDark} />
                </Pressable>
                {showStartDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={formData.start_date}
                    mode="date"
                    display="default"
                    onChange={(event: any, date?: Date) => {
                      setShowStartDatePicker(false);
                      if (date) setFormData({ ...formData, start_date: date });
                    }}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Data de Fi *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={formData.end_date.toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (!isNaN(date.getTime())) {
                    setFormData({ ...formData, end_date: date });
                  }
                }}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#F5F5F5',
                  width: '100%',
                  marginBottom: 16,
                }}
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>{formData.end_date.toLocaleDateString('ca-ES')}</Text>
                  <MaterialIcons name="event" size={20} color={Colors.textDark} />
                </Pressable>
                {showEndDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={formData.end_date}
                    mode="date"
                    display="default"
                    onChange={(event: any, date?: Date) => {
                      setShowEndDatePicker(false);
                      if (date) setFormData({ ...formData, end_date: date });
                    }}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Descripció del Premi *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.prize_description}
              onChangeText={(text) => setFormData({ ...formData, prize_description: text })}
              placeholder="Targeta regal de 100€, viatge, etc..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>🏷️ Marcador</Text>
            <Text style={styles.hint}>
              Es generarà automàticament si es deixa buit (Ex: Desembre_2025). 
              Serveix per identificar i filtrar usuaris participants d'aquesta campanya.
            </Text>
            <TextInput
              style={styles.input}
              value={formData.tag}
              onChangeText={(text) => setFormData({ ...formData, tag: text })}
              placeholder="Es generarà automàticament..."
              maxLength={50}
              autoCapitalize="none"
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Campanya Activa</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
                thumbColor={formData.is_active ? Colors.primary : Colors.textSecondary}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
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
  actions: {
    padding: Spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  addButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.lightGray,
  },
  campaignContent: {
    padding: Spacing.md,
  },
  statusBadge: {
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FontSizes.xs,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  campaignTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.xs,
  },
  campaignDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
  },
  prizeText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  campaignActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  actionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  actionTextDelete: {
    color: Colors.error,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
    padding: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    fontSize: FontSizes.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageButton: {
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  imagePlaceholderText: {
    marginTop: Spacing.xs,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  dateButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
});
