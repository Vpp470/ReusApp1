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
import type { Offer } from '../../src/types';
import { pickAndCropImage } from '../../src/utils/imageUtils';

export default function AdminOffersScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [establishments, setEstablishments] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    establishment_id: '',
    title: '',
    description: '',
    discount: '',
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dies
    image_url: '',
    terms: '',
    web_link: '',
    phone: '',
  });

  useEffect(() => {
    loadOffers();
    loadEstablishments();
  }, []);

  const loadOffers = async () => {
    try {
      const response = await api.get('/offers');
      setOffers(response.data);
    } catch (error) {
      console.error('Error loading offers:', error);
      Alert.alert('Error', 'No s\'han pogut carregar les promocions');
    } finally {
      setLoading(false);
    }
  };

  const loadEstablishments = async () => {
    try {
      const response = await api.get('/establishments');
      console.log('Establishments loaded:', response.data.length, 'establiments');
      console.log('First establishment:', response.data[0]);
      setEstablishments(response.data);
    } catch (error) {
      console.error('Error loading establishments:', error);
    }
  };

  const handlePickImage = async () => {
    const croppedImage = await pickAndCropImage();
    if (croppedImage) {
      setFormData(prev => ({ ...prev, image_url: croppedImage }));
      console.log('Image set successfully');
    }
  };

  const handleSave = async () => {
    console.log('handleSave called');
    console.log('formData:', formData);
    console.log('token:', token ? 'Token present' : 'NO TOKEN!');
    console.log('token value:', token);
    
    if (!formData.title || !formData.description || !formData.establishment_id) {
      console.log('Validation failed:', {
        title: formData.title,
        description: formData.description,
        establishment_id: formData.establishment_id,
      });
      Alert.alert('Error', 'Si us plau, omple tots els camps obligatoris');
      return;
    }
    
    if (!token) {
      console.error('NO TOKEN AVAILABLE!');
      Alert.alert('Error', 'No estàs autenticat. Si us plau, torna a iniciar sessió.');
      return;
    }

    console.log('Starting save...');
    setSaving(true);
    try {
      const payload = {
        ...formData,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until.toISOString(),
      };
      
      console.log('Payload:', payload);

      if (editingOffer) {
        console.log('Updating offer:', editingOffer.id);
        await api.put(`/admin/offers/${editingOffer.id}`, payload, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Oferta actualitzada correctament');
      } else {
        console.log('Creating new offer...');
        const response = await api.post('/admin/offers', payload, {
          headers: { Authorization: token },
        });
        console.log('Offer created:', response.data);
        Alert.alert('Èxit', 'Oferta creada correctament');
      }

      setShowForm(false);
      setEditingOffer(null);
      resetForm();
      loadOffers();
    } catch (error: any) {
      console.error('Error saving offer:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert('Error', `No s'ha pogut desar l'oferta: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId: string) => {
    Alert.alert(
      'Confirmar',
      'Estàs segur que vols eliminar aquesta oferta?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/offers/${offerId}`, {
                headers: { Authorization: token },
              });
              Alert.alert('Èxit', 'Oferta eliminada correctament');
              loadOffers();
            } catch (error) {
              console.error('Error deleting offer:', error);
              Alert.alert('Error', 'No s\'ha pogut eliminar l\'oferta');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      establishment_id: '',
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
      establishment_id: offer.establishment_id,
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
        <Text style={styles.headerTitle}>Gestió de Promocions</Text>
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
        <ScrollView 
          style={styles.formContainer} 
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <Text style={styles.sectionTitle}>Detalls de l'Oferta</Text>

          <Text style={styles.label}>Establiment *</Text>
          {Platform.OS === 'web' ? (
            <select
              value={formData.establishment_id}
              onChange={(e: any) => setFormData({ ...formData, establishment_id: e.target.value })}
              style={{
                padding: Spacing.md,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.md,
                marginBottom: Spacing.md,
                backgroundColor: Colors.white,
                border: `1px solid ${Colors.border}`,
                borderRadius: `${BorderRadius.md}px`,
                padding: `${Spacing.md}px`,
              }}
            >
              <option value="">Selecciona un establiment</option>
              {establishments.map((est) => (
                <option key={est._id} value={est._id}>
                  {est.name}
                </option>
              ))}
            </select>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="ID Establiment *"
              value={formData.establishment_id}
              onChangeText={(text) => setFormData({ ...formData, establishment_id: text })}
            />
          )}

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

          <Text style={styles.label}>Imatge Campanya (4:3)</Text>
          <Pressable style={styles.imagePickerButton} onPress={handlePickImage}>
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
          <View style={styles.dateControl}>
            <Pressable
              style={styles.dateButton}
              onPress={() => {
                const newDate = new Date(formData.valid_from);
                newDate.setDate(newDate.getDate() - 1);
                setFormData({ ...formData, valid_from: newDate });
              }}
            >
              <MaterialIcons name="remove" size={24} color={Colors.primary} />
            </Pressable>
            <Text style={styles.dateText}>{formData.valid_from.toLocaleDateString('ca-ES')}</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => {
                const newDate = new Date(formData.valid_from);
                newDate.setDate(newDate.getDate() + 1);
                setFormData({ ...formData, valid_from: newDate });
              }}
            >
              <MaterialIcons name="add" size={24} color={Colors.primary} />
            </Pressable>
          </View>

          <Text style={styles.label}>Data de fi</Text>
          <View style={styles.dateControl}>
            <Pressable
              style={styles.dateButton}
              onPress={() => {
                const newDate = new Date(formData.valid_until);
                newDate.setDate(newDate.getDate() - 1);
                if (newDate >= formData.valid_from) {
                  setFormData({ ...formData, valid_until: newDate });
                }
              }}
            >
              <MaterialIcons name="remove" size={24} color={Colors.primary} />
            </Pressable>
            <Text style={styles.dateText}>{formData.valid_until.toLocaleDateString('ca-ES')}</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => {
                const newDate = new Date(formData.valid_until);
                newDate.setDate(newDate.getDate() + 1);
                setFormData({ ...formData, valid_until: newDate });
              }}
            >
              <MaterialIcons name="add" size={24} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowForm(false);
                setEditingOffer(null);
                resetForm();
              }}
            >
              <Text style={styles.buttonText}>Cancel·lar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={() => {
                console.log('Button pressed! saving:', saving);
                if (saving) {
                  console.log('Button is disabled - saving in progress');
                  return;
                }
                handleSave();
              }}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {editingOffer ? 'Actualitzar' : 'Crear'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.listContainer}>
          {offers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="local-offer" size={80} color={Colors.lightGray} />
              <Text style={styles.emptyText}>No hi ha promocions</Text>
            </View>
          ) : (
            offers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
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
                  </Pressable>
                )}
                <View style={styles.offerContent}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
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
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal per veure imatge a pantalla complerta */}
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
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
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
  dateControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  dateButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  dateText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontWeight: '600',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
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
  offerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  offerContent: {
    padding: Spacing.md,
  },
  offerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
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
