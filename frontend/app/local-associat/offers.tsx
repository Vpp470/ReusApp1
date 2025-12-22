import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import type { Offer } from '../../src/types';

export default function LocalAssociatOffersScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount: '',
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    image_url: '',
    terms: '',
    web_link: '',
    phone: '',
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      if (!token) {
        Alert.alert('Error', 'No tens sessió iniciada. Torna a fer login.');
        setLoading(false);
        return;
      }
      
      // Ara carreguem promocions en lloc d'ofertes
      const response = await api.get('/promotions', {
        headers: { Authorization: token },
      });
      // Filtrar només les promocions de l'usuari actual
      setOffers(response.data);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permís necessari', 'Necessitem permís per accedir a les teves fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      // Sense aspect ratio fix - l'usuari pot ajustar lliurement
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        // Redimensionar la imatge si és massa gran, mantenint les proporcions
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }],  // Màxim 1080px d'amplada
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Convertir imatge a base64 directament
        const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const base64Image = `data:image/jpeg;base64,${base64}`;
        console.log('✅ Imatge convertida a base64. Longitud:', base64Image.length);
        
        setFormData(prev => ({ ...prev, image_url: base64Image }));
        Alert.alert('Èxit', 'Imatge seleccionada correctament');
      } catch (error) {
        console.error('Error processing image:', error);
        Alert.alert('Error', 'No s\'ha pogut processar la imatge');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Si us plau, omple títol i descripció');
      return;
    }

    if (!formData.image_url) {
      Alert.alert('Error', 'Has de seleccionar una imatge');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url,
        link_url: formData.web_link || undefined,
        tag: undefined,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until.toISOString(),
      };

      // Ara utilitzem el sistema de promocions
      if (editingOffer) {
        await api.put(`/promotions/${editingOffer.id}`, payload, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Promoció actualitzada correctament. Esperant aprovació de l\'admin.');
      } else {
        await api.post('/promotions', payload, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Promoció creada correctament. Esperant aprovació de l\'admin.');
      }

      setShowForm(false);
      setEditingOffer(null);
      resetForm();
      loadOffers();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut desar la promoció';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId: string) => {
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
              await api.delete(`/promotions/${offerId}`, {
                headers: { Authorization: token },
              });
              Alert.alert('Èxit', 'Promoció eliminada correctament');
              loadOffers();
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
      discount: '',
      valid_from: new Date(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      image_url: '',
      terms: '',
      web_link: '',
      phone: '',
    });
  };

  const startEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      discount: offer.discount || '',
      valid_from: new Date(offer.valid_from),
      valid_until: new Date(offer.valid_until),
      image_url: offer.image_url || '',
      terms: offer.terms || '',
      web_link: offer.web_link || '',
      phone: offer.phone || '',
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Les Meves Promocions</Text>
        <Pressable
          onPress={() => {
            setEditingOffer(null);
            resetForm();
            setShowForm(true);
          }}
          style={styles.addButton}
        >
          <MaterialIcons name="add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {showForm ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView 
            style={styles.formContainer}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.sectionTitle}>
              {editingOffer ? 'Editar Oferta' : 'Nova Oferta'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Títol *"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripció *"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={styles.input}
              placeholder="Descompte"
              value={formData.discount}
              onChangeText={(text) => setFormData({ ...formData, discount: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Termes i condicions"
              value={formData.terms}
              onChangeText={(text) => setFormData({ ...formData, terms: text })}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={styles.input}
              placeholder="Enllaç web"
              value={formData.web_link}
              onChangeText={(text) => setFormData({ ...formData, web_link: text })}
              keyboardType="url"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Telèfon"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Imatge Campanya (9:16 - Vertical)</Text>
            <Pressable style={styles.imagePickerButton} onPress={pickImage}>
              <MaterialIcons name="add-photo-alternate" size={32} color={Colors.primary} />
              <Text style={styles.imagePickerText}>
                {formData.image_url ? 'Canviar imatge' : 'Seleccionar imatge'}
              </Text>
            </Pressable>

            {formData.image_url && (
              <Pressable
                onPress={() => {
                  setSelectedImage(formData.image_url);
                  setShowImageModal(true);
                }}
              >
                <Image source={{ uri: formData.image_url }} style={styles.previewImage} />
                <View style={styles.magnifyBadge}>
                  <MaterialIcons name="search" size={20} color={Colors.white} />
                </View>
              </Pressable>
            )}

            <Text style={styles.label}>Data d'inici</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color={Colors.textDark} />
              <Text style={styles.dateButtonText}>
                {formData.valid_from.toLocaleDateString('ca-ES')}
              </Text>
            </Pressable>

            {showStartDatePicker && (
              <DateTimePicker
                value={formData.valid_from}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, valid_from: selectedDate });
                  }
                }}
              />
            )}

            <Text style={styles.label}>Data de fi</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color={Colors.textDark} />
              <Text style={styles.dateButtonText}>
                {formData.valid_until.toLocaleDateString('ca-ES')}
              </Text>
            </Pressable>

            {showEndDatePicker && (
              <DateTimePicker
                value={formData.valid_until}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, valid_until: selectedDate });
                  }
                }}
              />
            )}

            <View style={styles.formButtons}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowForm(false);
                  setEditingOffer(null);
                  resetForm();
                }}
              >
                <Text style={styles.buttonText}>Cancel·lar</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.buttonText}>
                    {editingOffer ? 'Actualitzar' : 'Crear'}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {offers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="local-offer" size={80} color={Colors.lightGray} />
              <Text style={styles.emptyText}>No tens promocions creades</Text>
              <Text style={styles.emptySubtext}>
                Crea la teva primera oferta per començar a atreure clients!
              </Text>
            </View>
          ) : (
            offers.map((offer) => {
              const isExpired = new Date(offer.valid_until) < new Date();
              return (
              <View key={offer.id} style={[styles.offerCard, isExpired && styles.expiredCard]}>
                {offer.image_url && (
                  <Pressable
                    onPress={() => {
                      setSelectedImage(offer.image_url || '');
                      setShowImageModal(true);
                    }}
                  >
                    <Image source={{ uri: offer.image_url }} style={styles.offerImage} />
                    <View style={styles.magnifyBadge}>
                      <MaterialIcons name="search" size={20} color={Colors.white} />
                    </View>
                    {isExpired && (
                      <View style={styles.expiredBadge}>
                        <MaterialIcons name="event-busy" size={16} color={Colors.white} />
                        <Text style={styles.expiredBadgeText}>CADUCADA</Text>
                      </View>
                    )}
                  </Pressable>
                )}
                <View style={styles.offerContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    {isExpired && (
                      <View style={styles.expiredStatusBadge}>
                        <MaterialIcons name="error-outline" size={16} color={Colors.error} />
                        <Text style={styles.expiredStatusText}>Caducada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.offerDescription} numberOfLines={2}>
                    {offer.description}
                  </Text>
                  {offer.discount && (
                    <View style={styles.discountBadge}>
                      <MaterialIcons name="sell" size={16} color={Colors.primary} />
                      <Text style={styles.discountText}>{offer.discount}</Text>
                    </View>
                  )}
                  <View style={styles.offerMeta}>
                    {offer.web_link && (
                      <View style={styles.metaRow}>
                        <MaterialIcons name="link" size={16} color={Colors.primary} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {offer.web_link}
                        </Text>
                      </View>
                    )}
                    {offer.phone && (
                      <View style={styles.metaRow}>
                        <MaterialIcons name="phone" size={16} color={Colors.primary} />
                        <Text style={styles.metaText}>{offer.phone}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <MaterialIcons name="calendar-today" size={14} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {new Date(offer.valid_from).toLocaleDateString('ca-ES')} -{' '}
                        {new Date(offer.valid_until).toLocaleDateString('ca-ES')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.offerActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => startEdit(offer)}
                    >
                      <MaterialIcons name="edit" size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(offer.id)}
                    >
                      <MaterialIcons name="delete" size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                  {isExpired && (
                    <View style={styles.reactivateInfo}>
                      <MaterialIcons name="info" size={16} color={Colors.primary} />
                      <Text style={styles.reactivateText}>
                        Aquesta oferta ha caducat i no es mostra públicament. Pots editar-la per reactivar-la.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <MaterialIcons name="close" size={32} color={Colors.white} />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
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
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  addButton: {
    padding: Spacing.sm,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  imagePickerText: {
    marginTop: Spacing.sm,
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  magnifyBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: Spacing.sm,
  },
  dateButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  dateButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    marginLeft: Spacing.sm,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  cancelButton: {
    backgroundColor: Colors.gray,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expiredCard: {
    opacity: 0.85,
    borderWidth: 2,
    borderColor: Colors.error + '40',
  },
  expiredBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  expiredBadgeText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  expiredStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  expiredStatusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.error,
    marginLeft: 4,
  },
  reactivateInfo: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  reactivateText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  offerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  offerContent: {
    padding: Spacing.md,
  },
  offerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
  },
  offerDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.md,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  discountText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  offerMeta: {
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginLeft: Spacing.xs,
    flex: 1,
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  actionButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: Spacing.sm,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
