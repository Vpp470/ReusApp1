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
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  description?: string;
  image?: string;
  publish_date?: string;
  expiry_date?: string;
  is_automatic: boolean;
}

export default function AdminClubScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [content, setContent] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContent, setEditingContent] = useState<NewsItem | null>(null);
  const [showPublishDatePicker, setShowPublishDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    image: '',
    category: 'activitat',
    publish_date: new Date(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dies
  });

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/club/content?limit=50`);
      setContent(response.data);
    } catch (error) {
      console.error('Error carregant contingut:', error);
      Alert.alert('Error', 'No s\'ha pogut carregar el contingut');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, image: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Emplena el títol');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        publish_date: formData.publish_date.toISOString(),
        expiry_date: formData.expiry_date.toISOString(),
      };

      if (editingContent) {
        await axios.put(`${API_URL}/api/club/content/${editingContent.id}`, payload, {
          headers: { Authorization: token! },
        });
        Alert.alert('Èxit', 'Contingut actualitzat');
      } else {
        await axios.post(`${API_URL}/api/club/content`, payload, {
          headers: { Authorization: token! },
        });
        Alert.alert('Èxit', 'Contingut creat');
      }

      setModalVisible(false);
      resetForm();
      loadContent();
    } catch (error: any) {
      console.error('Error guardant:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirmar', 'Eliminar aquest contingut?', [
      { text: 'Cancel·lar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/api/club/content/${id}`, {
              headers: { Authorization: token! },
            });
            Alert.alert('Èxit', 'Contingut eliminat');
            loadContent();
          } catch (error) {
            Alert.alert('Error', 'No s\'ha pogut eliminar');
          }
        },
      },
    ]);
  };

  const handleEdit = (item: NewsItem) => {
    setEditingContent(item);
    setFormData({
      title: item.title,
      url: item.url || '',
      description: item.description || '',
      image: item.image || '',
      category: (item as any).category || 'activitat',
      publish_date: item.publish_date ? new Date(item.publish_date) : new Date(),
      expiry_date: item.expiry_date ? new Date(item.expiry_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingContent(null);
    setFormData({
      title: '',
      url: '',
      description: '',
      image: '',
      category: 'activitat',
      publish_date: new Date(),
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestió de Notícies</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>Nou Contingut</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {content.map((item) => (
            <View key={item.id} style={styles.newsCard}>
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.newsImage} />
              )}
              <View style={styles.newsContent}>
                <View style={styles.newsHeader}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                </View>
                <Text style={styles.newsSource}>{(item as any).category || 'activitat'}</Text>
                {item.description && (
                  <Text style={styles.newsDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                {item.expiry_date && (
                  <Text style={styles.expiryDate}>
                    Caduca: {new Date(item.expiry_date).toLocaleDateString('ca-ES')}
                  </Text>
                )}
                <View style={styles.newsActions}>
                  <Pressable onPress={() => handleEdit(item)} style={styles.editButton}>
                    <MaterialIcons name="edit" size={20} color={Colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                    <MaterialIcons name="delete" size={20} color={Colors.error} />
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
              <MaterialIcons name="close" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>{editingContent ? 'Editar' : 'Nou'} Contingut</Text>
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
              placeholder="Títol de la notícia"
            />

            <Text style={styles.label}>Enllaç *</Text>
            <TextInput
              style={styles.input}
              value={formData.url}
              onChangeText={(text) => setFormData({ ...formData, url: text })}
              placeholder="https://..."
              autoCapitalize="none"
            />

            <Text style={styles.label}>Categoria</Text>
            <TextInput
              style={styles.input}
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
              placeholder="activitat, avantatge, premi..."
            />

            <Text style={styles.label}>Descripció</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Descripció breu..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Imatge (3x2)</Text>
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

            <Text style={styles.label}>Data de Publicació</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowPublishDatePicker(true)}
            >
              <Text>{formData.publish_date.toLocaleDateString('ca-ES')}</Text>
              <MaterialIcons name="calendar-today" size={20} color={Colors.text} />
            </Pressable>

            {showPublishDatePicker && (
              <DateTimePicker
                value={formData.publish_date}
                mode="date"
                onChange={(event, date) => {
                  setShowPublishDatePicker(false);
                  if (date) setFormData({ ...formData, publish_date: date });
                }}
              />
            )}

            <Text style={styles.label}>Data de Caducitat</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowExpiryDatePicker(true)}
            >
              <Text>{formData.expiry_date.toLocaleDateString('ca-ES')}</Text>
              <MaterialIcons name="event" size={20} color={Colors.text} />
            </Pressable>

            {showExpiryDatePicker && (
              <DateTimePicker
                value={formData.expiry_date}
                mode="date"
                onChange={(event, date) => {
                  setShowExpiryDatePicker(false);
                  if (date) setFormData({ ...formData, expiry_date: date });
                }}
              />
            )}
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
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  addButton: {
    flex: 1,
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
  fetchButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  fetchButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  newsCard: {
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
  newsImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.lightGray,
  },
  newsContent: {
    padding: Spacing.md,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  newsTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  newsSource: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  newsDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.xs,
  },
  expiryDate: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  newsActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    padding: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.sm,
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
  input: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    fontSize: FontSizes.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    height: 150,
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
  },
});
