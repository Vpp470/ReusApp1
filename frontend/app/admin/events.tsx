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
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import ParticipantsMapModal from '../../src/components/ParticipantsMapModal';
import { pickAndCropImage } from '../../src/utils/imageUtils';

interface Event {
  _id: string;
  establishment_id?: string | null;
  title: string;
  description: string;
  discount?: string | null;
  valid_from: string;
  valid_until: string;
  image_url?: string | null;
  terms?: string | null;
  web_link?: string | null;
  phone?: string | null;
  facebook_link?: string | null;
  instagram_link?: string | null;
  twitter_link?: string | null;
  youtube_link?: string | null;
  linkedin_link?: string | null;
  tiktok_link?: string | null;
  participating_establishments?: string[];
  created_at: string;
}

interface Establishment {
  _id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export default function AdminEventsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
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
    facebook_link: '',
    instagram_link: '',
    twitter_link: '',
    youtube_link: '',
    linkedin_link: '',
    tiktok_link: '',
    participating_establishments: [] as string[],
  });

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showParticipantsMap, setShowParticipantsMap] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, establishmentsRes] = await Promise.all([
        api.get('/admin/events', {
          headers: { Authorization: token },
        }),
        api.get('/establishments'),
      ]);
      setEvents(eventsRes.data);
      setEstablishments(establishmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No s\'han pogut carregar les dades');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const croppedImage = await pickAndCropImage();
    if (croppedImage) {
      setFormData({ ...formData, image_url: croppedImage });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Si us plau, omple els camps obligatoris');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        establishment_id: formData.establishment_id || null,
        discount: formData.discount || null,
        terms: formData.terms || null,
        web_link: formData.web_link || null,
        phone: formData.phone || null,
        facebook_link: formData.facebook_link || null,
        instagram_link: formData.instagram_link || null,
        twitter_link: formData.twitter_link || null,
        youtube_link: formData.youtube_link || null,
        linkedin_link: formData.linkedin_link || null,
        tiktok_link: formData.tiktok_link || null,
      };

      if (editingEvent) {
        await api.put(`/admin/events/${editingEvent._id}`, data, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Esdeveniment actualitzat correctament');
      } else {
        await api.post('/admin/events', data, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Esdeveniment creat correctament');
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'No s\'ha pogut guardar l\'esdeveniment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert(
      'Confirmar eliminació',
      'Estàs segur que vols eliminar aquest esdeveniment?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/events/${eventId}`, {
                headers: { Authorization: token },
              });
              Alert.alert('Èxit', 'Esdeveniment eliminat');
              await loadData();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'No s\'ha pogut eliminar l\'esdeveniment');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      establishment_id: event.establishment_id || '',
      title: event.title,
      description: event.description,
      discount: event.discount || '',
      valid_from: new Date(event.valid_from),
      valid_until: new Date(event.valid_until),
      image_url: event.image_url || '',
      terms: event.terms || '',
      web_link: event.web_link || '',
      phone: event.phone || '',
      facebook_link: event.facebook_link || '',
      instagram_link: event.instagram_link || '',
      twitter_link: event.twitter_link || '',
      youtube_link: event.youtube_link || '',
      linkedin_link: event.linkedin_link || '',
      tiktok_link: event.tiktok_link || '',
      participating_establishments: event.participating_establishments || [],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
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
      facebook_link: '',
      instagram_link: '',
      twitter_link: '',
      youtube_link: '',
      linkedin_link: '',
      tiktok_link: '',
      participating_establishments: [],
    });
    setShowForm(false);
  };

  const isExpired = (event: Event) => {
    return new Date(event.valid_until) < new Date();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Esdeveniments</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <MaterialIcons name="add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {events.map((event) => (
          <View
            key={event._id}
            style={[
              styles.eventCard,
              isExpired(event) && styles.expiredCard,
            ]}
          >
            {event.image_url && (
              <Pressable
                onPress={() => {
                  setSelectedImage(event.image_url!);
                  setShowImageModal(true);
                }}
              >
                <Image
                  source={{ uri: event.image_url }}
                  style={styles.eventImage}
                />
                {isExpired(event) && (
                  <View style={styles.expiredBadge}>
                    <MaterialIcons name="event-busy" size={16} color={Colors.white} />
                    <Text style={styles.expiredBadgeText}>CADUCAT</Text>
                  </View>
                )}
              </Pressable>
            )}
            <View style={styles.eventContent}>
              <View style={styles.titleRow}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {isExpired(event) && (
                  <View style={styles.expiredStatusBadge}>
                    <MaterialIcons name="error-outline" size={16} color={Colors.error} />
                    <Text style={styles.expiredStatusText}>Caducat</Text>
                  </View>
                )}
              </View>
              <Text style={styles.eventDescription} numberOfLines={2}>
                {event.description}
              </Text>
              {event.discount && (
                <View style={styles.discountBadge}>
                  <MaterialIcons name="sell" size={16} color={Colors.primary} />
                  <Text style={styles.discountText}>{event.discount}</Text>
                </View>
              )}
              <View style={styles.dateRow}>
                <MaterialIcons name="date-range" size={16} color={Colors.textSecondary} />
                <Text style={styles.dateText}>
                  {new Date(event.valid_from).toLocaleDateString('ca-ES')} -{' '}
                  {new Date(event.valid_until).toLocaleDateString('ca-ES')}
                </Text>
              </View>
              {event.establishment_id && (
                <View style={styles.establishmentRow}>
                  <MaterialIcons name="store" size={16} color={Colors.textSecondary} />
                  <Text style={styles.establishmentText}>
                    {establishments.find(e => e._id === event.establishment_id)?.name || 'Establiment'}
                  </Text>
                </View>
              )}
              {!event.establishment_id && (
                <View style={styles.adminBadge}>
                  <MaterialIcons name="admin-panel-settings" size={16} color={Colors.primary} />
                  <Text style={styles.adminBadgeText}>Esdeveniment General</Text>
                </View>
              )}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(event)}
                >
                  <MaterialIcons name="edit" size={20} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(event._id)}
                >
                  <MaterialIcons name="delete" size={20} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" onRequestClose={resetForm}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={resetForm}>
              <MaterialIcons name="close" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingEvent ? 'Editar Esdeveniment' : 'Nou Esdeveniment'}
            </Text>
            <Pressable
              style={styles.saveButton}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <MaterialIcons name="check" size={24} color={Colors.white} />
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Establiment (opcional)</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>
                  {formData.establishment_id
                    ? establishments.find(e => e._id === formData.establishment_id)?.name
                    : 'Esdeveniment General (Admin)'}
                </Text>
              </View>
              <Pressable
                style={styles.changeButton}
                onPress={() => {
                  Alert.alert(
                    'Seleccionar Establiment',
                    'Tria si és d\'un establiment o general',
                    [
                      {
                        text: 'General (Admin)',
                        onPress: () => setFormData({ ...formData, establishment_id: '' }),
                      },
                      ...establishments.map(est => ({
                        text: est.name,
                        onPress: () => setFormData({ ...formData, establishment_id: est._id }),
                      })),
                      { text: 'Cancel·lar', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.changeButtonText}>Canviar</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Títol *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Títol de l'esdeveniment"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripció *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripció de l'esdeveniment"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Preu / Descompte</Text>
              <TextInput
                style={styles.input}
                value={formData.discount}
                onChangeText={(text) => setFormData({ ...formData, discount: text })}
                placeholder="Ex: 10€, Gratuït, 20% descompte"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data d'inici *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formData.valid_from.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setFormData({ ...formData, valid_from: newDate });
                    }
                  }}
                  style={{
                    backgroundColor: Colors.white,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    fontSize: FontSizes.md,
                    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
                    width: '100%',
                    border: `1px solid ${Colors.border}`,
                    borderRadius: `${BorderRadius.md}px`,
                    padding: `${Spacing.md}px`,
                    fontSize: `${FontSizes.md}px`,
                  }}
                />
              ) : (
                <>
                  <Pressable
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <MaterialIcons name="calendar-today" size={20} color={Colors.textSecondary} />
                    <Text style={styles.dateButtonText}>
                      {formData.valid_from.toLocaleDateString('ca-ES')}
                    </Text>
                  </Pressable>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={formData.valid_from}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowStartDatePicker(false);
                        if (event.type === 'set' && date) {
                          setFormData({ ...formData, valid_from: date });
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data de finalització *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formData.valid_until.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setFormData({ ...formData, valid_until: newDate });
                    }
                  }}
                  style={{
                    backgroundColor: Colors.white,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    fontSize: FontSizes.md,
                    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
                    width: '100%',
                    border: `1px solid ${Colors.border}`,
                    borderRadius: `${BorderRadius.md}px`,
                    padding: `${Spacing.md}px`,
                    fontSize: `${FontSizes.md}px`,
                  }}
                />
              ) : (
                <>
                  <Pressable
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <MaterialIcons name="calendar-today" size={20} color={Colors.textSecondary} />
                    <Text style={styles.dateButtonText}>
                      {formData.valid_until.toLocaleDateString('ca-ES')}
                    </Text>
                  </Pressable>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={formData.valid_until}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowEndDatePicker(false);
                        if (event.type === 'set' && date) {
                          setFormData({ ...formData, valid_until: date });
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Imatge</Text>
              <Pressable style={styles.imageButton} onPress={pickImage}>
                {formData.image_url ? (
                  <Image source={{ uri: formData.image_url }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={40} color={Colors.textSecondary} />
                    <Text style={styles.imagePlaceholderText}>Afegir imatge</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Termes i condicions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.terms}
                onChangeText={(text) => setFormData({ ...formData, terms: text })}
                placeholder="Termes i condicions"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Enllaç web</Text>
              <TextInput
                style={styles.input}
                value={formData.web_link}
                onChangeText={(text) => setFormData({ ...formData, web_link: text })}
                placeholder="https://exemple.com"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Telèfon</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+34 977 123 456"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.sectionDivider}>
              <MaterialIcons name="share" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Xarxes Socials</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={formData.facebook_link}
                onChangeText={(text) => setFormData({ ...formData, facebook_link: text })}
                placeholder="https://facebook.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={formData.instagram_link}
                onChangeText={(text) => setFormData({ ...formData, instagram_link: text })}
                placeholder="https://instagram.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Twitter / X</Text>
              <TextInput
                style={styles.input}
                value={formData.twitter_link}
                onChangeText={(text) => setFormData({ ...formData, twitter_link: text })}
                placeholder="https://twitter.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={styles.input}
                value={formData.youtube_link}
                onChangeText={(text) => setFormData({ ...formData, youtube_link: text })}
                placeholder="https://youtube.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>LinkedIn</Text>
              <TextInput
                style={styles.input}
                value={formData.linkedin_link}
                onChangeText={(text) => setFormData({ ...formData, linkedin_link: text })}
                placeholder="https://linkedin.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>TikTok</Text>
              <TextInput
                style={styles.input}
                value={formData.tiktok_link}
                onChangeText={(text) => setFormData({ ...formData, tiktok_link: text })}
                placeholder="https://tiktok.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {!formData.establishment_id && (
              <>
                <View style={styles.sectionDivider}>
                  <MaterialIcons name="people" size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Locals Participants</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Selecciona els locals que participen en aquest esdeveniment
                  </Text>
                  <Text style={styles.helperText}>
                    {formData.participating_establishments.length} local
                    {formData.participating_establishments.length !== 1 ? 's' : ''} seleccionat
                    {formData.participating_establishments.length !== 1 ? 's' : ''}
                  </Text>
                  
                  <Pressable
                    style={styles.selectButton}
                    onPress={() => setShowParticipantsModal(true)}
                  >
                    <MaterialIcons name="add-business" size={20} color={Colors.white} />
                    <Text style={styles.selectButtonText}>
                      {formData.participating_establishments.length > 0
                        ? 'Gestionar Participants'
                        : 'Afegir Participants'}
                    </Text>
                  </Pressable>

                  {formData.participating_establishments.length > 0 && (
                    <Pressable
                      style={styles.mapButton}
                      onPress={() => setShowParticipantsMap(true)}
                    >
                      <MaterialIcons name="map" size={20} color={Colors.primary} />
                      <Text style={styles.mapButtonText}>Veure Mapa</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showImageModal} transparent onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalContainer}>
          <Pressable
            style={styles.imageModalClose}
            onPress={() => setShowImageModal(false)}
          >
            <MaterialIcons name="close" size={30} color={Colors.white} />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageModalContent}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Modal de selecció de participants */}
      <Modal
        visible={showParticipantsModal}
        animationType="slide"
        onRequestClose={() => {
          setShowParticipantsModal(false);
          setParticipantSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => {
              setShowParticipantsModal(false);
              setParticipantSearchQuery('');
            }}>
              <MaterialIcons name="close" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Seleccionar Participants</Text>
            <Pressable onPress={() => {
              setShowParticipantsModal(false);
              setParticipantSearchQuery('');
            }}>
              <MaterialIcons name="check" size={24} color={Colors.primary} />
            </Pressable>
          </View>
          
          {/* Barra de cerca */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cercar local..."
              value={participantSearchQuery}
              onChangeText={setParticipantSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {participantSearchQuery.length > 0 && (
              <Pressable onPress={() => setParticipantSearchQuery('')}>
                <MaterialIcons name="clear" size={20} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={establishments.filter((est) => 
              est.name.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
              est.address?.toLowerCase().includes(participantSearchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
              const isSelected = formData.participating_establishments.includes(item._id);
              return (
                <Pressable
                  style={[styles.participantItem, isSelected && styles.participantItemSelected]}
                  onPress={() => {
                    if (isSelected) {
                      setFormData({
                        ...formData,
                        participating_establishments: formData.participating_establishments.filter(
                          (id) => id !== item._id
                        ),
                      });
                    } else {
                      setFormData({
                        ...formData,
                        participating_establishments: [
                          ...formData.participating_establishments,
                          item._id,
                        ],
                      });
                    }
                  }}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={isSelected ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.participantName, isSelected && styles.participantNameSelected]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Modal del mapa */}
      {showParticipantsMap && (
        <ParticipantsMapModal
          visible={showParticipantsMap}
          onClose={() => setShowParticipantsMap(false)}
          participantIds={formData.participating_establishments}
          allEstablishments={establishments}
          eventId={formData._id || 'new'}
          onEstablishmentPress={(id) => router.push(`/establishments/${id}`)}
        />
      )}
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  eventCard: {
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
    opacity: 0.7,
    borderWidth: 2,
    borderColor: Colors.error + '40',
  },
  eventImage: {
    width: '100%',
    height: 200,
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
  eventContent: {
    padding: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    flex: 1,
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
  eventDescription: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  discountText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dateText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginLeft: Spacing.xs,
  },
  establishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  establishmentText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginLeft: Spacing.xs,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  adminBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.xs,
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
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    margin: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    paddingVertical: Spacing.xs,
  },
  saveButton: {
    backgroundColor: Colors.success,
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  formContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  pickerLabel: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  changeButton: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  changeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  dateButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginLeft: Spacing.sm,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  dateInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    outlineStyle: 'none',
  },
  imageButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  imagePlaceholderText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.sm,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginLeft: Spacing.sm,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    zIndex: 1,
  },
  imageModalContent: {
    width: '100%',
    height: '80%',
  },
  helperText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  selectButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  mapButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  participantItemSelected: {
    backgroundColor: Colors.primary + '15',
  },
  participantName: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginLeft: Spacing.md,
    flex: 1,
  },
  participantNameSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
});
