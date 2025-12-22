import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  valid_from: string;
  valid_until: string;
  link_url?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function LocalAssociatPromotionsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dies
    link_url: '',
  });

  // Estats temporals per les dates com a text
  const [startDateText, setStartDateText] = useState('');
  const [endDateText, setEndDateText] = useState('');

  useEffect(() => {
    loadPromotions();
    // Inicialitzar les dates com a text
    setStartDateText(formData.valid_from.toISOString().split('T')[0]);
    setEndDateText(formData.valid_until.toISOString().split('T')[0]);
  }, []);

  const loadPromotions = async () => {
    try {
      if (!token) {
        Alert.alert('Error', 'No tens sessió iniciada. Torna a fer login.');
        setLoading(false);
        return;
      }
      
      const response = await api.get('/promotions', {
        headers: { Authorization: token },
      });
      setPromotions(response.data);
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      if (error.response?.status === 401) {
        Alert.alert('Sessió expirada', 'Si us plau, torna a iniciar sessió');
      } else {
        Alert.alert('Error', 'No s\'han pogut carregar les promocions');
      }
    } finally {
      setLoading(false);
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      // Per web: utilitzar fetch i FileReader
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Per mobile: utilitzar expo-file-system
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        console.log('📸 Imatge seleccionada:', result.assets[0].uri);
        
        // Redimensionar la imatge
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        console.log('🔄 Imatge redimensionada:', manipResult.uri);
        
        // Convertir a base64
        const base64Image = await convertImageToBase64(manipResult.uri);
        
        console.log('✅ Imatge convertida a base64. Longitud:', base64Image.length);
        
        setFormData(prev => ({ ...prev, image_url: base64Image }));
        Alert.alert('Èxit', 'Imatge seleccionada correctament');
      } catch (error) {
        console.error('❌ Error processing image:', error);
        Alert.alert('Error', 'No s\'ha pogut processar la imatge');
      }
    }
  };

  const handleSave = async () => {
    console.log('🔵 handleSave called');
    console.log('📝 Form data:', {
      title: formData.title,
      description: formData.description,
      hasImage: !!formData.image_url,
      imageLength: formData.image_url.length,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until,
    });

    if (!formData.title || !formData.description) {
      console.log('❌ Validation failed: missing title or description');
      Alert.alert('Error', 'Si us plau, omple títol i descripció');
      return;
    }

    if (!formData.image_url) {
      console.log('❌ Validation failed: missing image');
      Alert.alert('Error', 'Has de seleccionar una imatge');
      return;
    }

    console.log('✅ Validation passed, starting save...');
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url,
        link_url: formData.link_url || undefined,
        tag: undefined,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until.toISOString(),
      };

      console.log('📤 Sending payload to API...');

      if (editingPromotion) {
        console.log('🔄 Updating promotion:', editingPromotion.id);
        await api.put(`/promotions/${editingPromotion.id}`, payload, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Promoció actualitzada correctament. Esperant aprovació de l\'admin.');
      } else {
        console.log('➕ Creating new promotion');
        const response = await api.post('/promotions', payload, {
          headers: { Authorization: token },
        });
        console.log('✅ Promotion created successfully:', response.data);
        Alert.alert('Èxit', 'Promoció creada correctament. Esperant aprovació de l\'admin.');
      }

      setShowForm(false);
      setEditingPromotion(null);
      resetForm();
      loadPromotions();
    } catch (error: any) {
      console.error('❌ Error saving promotion:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut desar la promoció';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
      console.log('🏁 Save process finished');
    }
  };

  const handleDelete = async (promotionId: string) => {
    Alert.alert(
      'Confirmar',
      'Estàs segur que vols eliminar aquesta promoció?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/promotions/${promotionId}`, {
                headers: { Authorization: token },
              });
              Alert.alert('Èxit', 'Promoció eliminada correctament');
              loadPromotions();
            } catch (error) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Error', 'No s\'ha pogut eliminar la promoció');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      valid_from: new Date(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      link_url: '',
    });
  };

  const openForm = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      const fromDate = new Date(promotion.valid_from);
      const untilDate = new Date(promotion.valid_until);
      setFormData({
        title: promotion.title,
        description: promotion.description,
        image_url: promotion.image_url,
        valid_from: fromDate,
        valid_until: untilDate,
        link_url: promotion.link_url || '',
      });
      setStartDateText(fromDate.toISOString().split('T')[0]);
      setEndDateText(untilDate.toISOString().split('T')[0]);
    } else {
      setEditingPromotion(null);
      resetForm();
      setStartDateText(formData.valid_from.toISOString().split('T')[0]);
      setEndDateText(formData.valid_until.toISOString().split('T')[0]);
    }
    setShowForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rebutjada';
      default: return 'Pendent';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Les Meues Promocions</Text>
        <TouchableOpacity onPress={() => openForm()}>
          <MaterialIcons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.content}>
        {promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="local-offer" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No tens cap promoció</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => openForm()}>
              <Text style={styles.addButtonText}>Crear Promoció</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map((promo) => (
            <View key={promo.id} style={styles.card}>
              {promo.image_url && (
                <Image source={{ uri: promo.image_url }} style={styles.cardImage} />
              )}
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{promo.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(promo.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(promo.status)}</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {promo.description}
                </Text>
                <Text style={styles.cardDates}>
                  Vàlida: {new Date(promo.valid_from).toLocaleDateString()} - {new Date(promo.valid_until).toLocaleDateString()}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openForm(promo)}
                  >
                    <MaterialIcons name="edit" size={20} color={Colors.primary} />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(promo.id)}
                  >
                    <MaterialIcons name="delete" size={20} color={Colors.error} />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPromotion ? 'Editar Promoció' : 'Nova Promoció'}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.form}
              contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Títol *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Nom de la promoció"
              />

              <Text style={styles.label}>Descripció *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Descripció de la promoció"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Imatge *</Text>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                {formData.image_url ? (
                  <Image source={{ uri: formData.image_url }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={48} color={Colors.textSecondary} />
                    <Text style={styles.imagePlaceholderText}>Seleccionar imatge</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Enllaç web (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.link_url}
                onChangeText={(text) => setFormData(prev => ({ ...prev, link_url: text }))}
                placeholder="https://exemple.com"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Data d'inici (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={startDateText}
                onChangeText={(text) => {
                  setStartDateText(text);
                  // Intentar parsejar si té format complet
                  if (text.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    try {
                      const newDate = new Date(text + 'T00:00:00');
                      if (!isNaN(newDate.getTime())) {
                        setFormData(prev => ({ ...prev, valid_from: newDate }));
                      }
                    } catch (e) {
                      console.log('Data encara no vàlida');
                    }
                  }
                }}
                placeholder="2025-12-31"
              />

              <Text style={styles.label}>Data de fi (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={endDateText}
                onChangeText={(text) => {
                  setEndDateText(text);
                  // Intentar parsejar si té format complet
                  if (text.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    try {
                      const newDate = new Date(text + 'T23:59:59');
                      if (!isNaN(newDate.getTime())) {
                        setFormData(prev => ({ ...prev, valid_until: newDate }));
                      }
                    } catch (e) {
                      console.log('Data encara no vàlida');
                    }
                  }
                }}
                placeholder="2025-12-31"
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingPromotion ? 'Actualitzar' : 'Crear'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl * 3,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  cardDates: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  deleteButtonText: {
    color: Colors.error,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  form: {
    padding: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    backgroundColor: Colors.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  imagePlaceholderText: {
    marginTop: Spacing.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
