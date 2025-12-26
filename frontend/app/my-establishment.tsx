import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/constants/colors';
import { useAuthStore } from '../src/store/authStore';
import api from '../src/services/api';

export default function MyEstablishmentScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasEstablishment, setHasEstablishment] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    phone: '',
    email: '',
    website: '',
    facebook: '',
    instagram: '',
    twitter: '',
    opening_hours: '',
    image_url: '',
  });

  const [gallery, setGallery] = useState([
    { image_url: '', description: '', type: 'image' },
    { image_url: '', description: '', type: 'image' },
    { image_url: '', description: '', type: 'image' },
    { image_url: '', description: '', type: 'image' },
    { image_url: '', description: '', type: 'image' },
    { image_url: '', description: '', type: 'image' },
  ]);

  // Videos curts
  const [videos, setVideos] = useState([
    { video_url: '', description: '' },
    { video_url: '', description: '' },
    { video_url: '', description: '' },
  ]);

  useEffect(() => {
    loadMyEstablishment();
  }, []);

  const loadMyEstablishment = async () => {
    try {
      const response = await api.get('/my-establishment', {
        headers: { Authorization: token },
      });
      
      if (response.data) {
        setHasEstablishment(true);
        setFormData({
          name: response.data.name || '',
          description: response.data.description || '',
          category: response.data.category || '',
          address: response.data.address || '',
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          phone: response.data.phone || '',
          email: response.data.email || '',
          website: response.data.website || '',
          facebook: response.data.facebook || '',
          instagram: response.data.instagram || '',
          twitter: response.data.twitter || '',
          opening_hours: response.data.opening_hours || '',
          image_url: response.data.image_url || '',
        });
        
        // Carregar galeria si existeix
        if (response.data.gallery && Array.isArray(response.data.gallery)) {
          const loadedGallery = response.data.gallery.map((item: any) => ({
            image_url: item.image_url || '',
            description: item.description || '',
            type: item.type || 'image'
          }));
          while (loadedGallery.length < 6) {
            loadedGallery.push({ image_url: '', description: '', type: 'image' });
          }
          setGallery(loadedGallery.slice(0, 6));
        }
        
        // Carregar videos si existeixen
        if (response.data.videos && Array.isArray(response.data.videos)) {
          const loadedVideos = response.data.videos.map((item: any) => ({
            video_url: item.video_url || '',
            description: item.description || ''
          }));
          while (loadedVideos.length < 3) {
            loadedVideos.push({ video_url: '', description: '' });
          }
          setVideos(loadedVideos.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Error loading establishment:', error);
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
      // Convert to base64
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(blob);
    }
  };


  const convertImageToBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    }
  };

  const pickGalleryImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Format vertical 9:16
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        // Redimensionar la imatge a format 9:16
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        // Convertir a base64
        const base64Image = await convertImageToBase64(manipResult.uri);
        
        const newGallery = [...gallery];
        newGallery[index] = { ...newGallery[index], image_url: base64Image };
        setGallery(newGallery);
        
        Alert.alert('Èxit', 'Imatge seleccionada correctament');
      } catch (error) {
        console.error('Error processing gallery image:', error);
        Alert.alert('Error', 'No s\'ha pogut processar la imatge');
      }
    }
  };


  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      Alert.alert('Error', 'El nom i l\'adreça són obligatoris');
      return;
    }

    setSaving(true);
    try {
      // Filtrar galeria buida
      const validGallery = gallery.filter(item => item.image_url !== '');
      // Filtrar videos buits
      const validVideos = videos.filter(item => item.video_url !== '');
      
      const dataToSave = {
        ...formData,
        gallery: validGallery,
        videos: validVideos,
      };
      
      if (hasEstablishment) {
        await api.put('/my-establishment', dataToSave, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Establiment actualitzat correctament');
      } else {
        await api.post('/my-establishment', dataToSave, {
          headers: { Authorization: token },
        });
        Alert.alert('Èxit', 'Establiment creat correctament');
        setHasEstablishment(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut guardar l\'establiment');
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {hasEstablishment ? 'El Meu Establiment' : 'Crear Establiment'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Info box */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            {hasEstablishment 
              ? 'Gestiona la informació del teu establiment. Els canvis seran visibles públicament.'
              : 'Crea el teu establiment per apareixer al directori i al mapa de l\'app.'
            }
          </Text>
        </View>

        {/* Informació bàsica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informació Bàsica</Text>
          
          <Text style={styles.label}>Nom de l'establiment *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Nom del teu negoci"
          />

          <Text style={styles.label}>Categoria</Text>
          <TextInput
            style={styles.input}
            value={formData.category}
            onChangeText={(text) => setFormData({ ...formData, category: text })}
            placeholder="Ex: Restaurant, Botiga, Cafeteria..."
          />

          <Text style={styles.label}>Descripció</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Descriu el teu establiment..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Logo / Imatge</Text>
          <Pressable style={styles.imageButton} onPress={pickImage}>
            {formData.image_url ? (
              <Image source={{ uri: formData.image_url }} style={styles.imagePreview} />
            ) : (
              <>
                <MaterialIcons name="add-photo-alternate" size={40} color={Colors.primary} />
                <Text style={styles.imageButtonText}>Seleccionar imatge</Text>
              </>
            )}
          </Pressable>

          {/* Galeria d'Imatges (3 fotos verticals 9:16) */}
          <Text style={[styles.label, { marginTop: Spacing.lg }]}>Galeria d'Imatges (3 fotos format 9:16)</Text>
          <Text style={styles.helperText}>Puja fins a 3 fotografies verticals amb descripció</Text>
          
          {gallery.map((item, index) => (
            <View key={index} style={styles.galleryItem}>
              <Text style={styles.galleryLabel}>Imatge {index + 1}</Text>
              
              {item.image_url ? (
                <View style={styles.galleryImageContainer}>
                  <Image source={{ uri: item.image_url }} style={styles.galleryImage} />
                  <TouchableOpacity
                    style={styles.removeGalleryButton}
                    onPress={() => {
                      const newGallery = [...gallery];
                      newGallery[index] = { image_url: '', description: '' };
                      setGallery(newGallery);
                    }}
                  >
                    <MaterialIcons name="close" size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.galleryPlaceholder}
                  onPress={() => pickGalleryImage(index)}
                >
                  <MaterialIcons name="add-photo-alternate" size={32} color={Colors.textSecondary} />
                  <Text style={styles.galleryPlaceholderText}>Afegir foto 9:16</Text>
                </TouchableOpacity>
              )}
              
              <TextInput
                style={styles.galleryDescriptionInput}
                value={item.description}
                onChangeText={(text) => {
                  const newGallery = [...gallery];
                  newGallery[index] = { ...newGallery[index], description: text };
                  setGallery(newGallery);
                }}
                placeholder="Descripció de la imatge..."
                maxLength={150}
              />
              <Text style={styles.charCount}>{item.description.length}/150</Text>
            </View>
          ))}

        </View>

        {/* Ubicació */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicació</Text>
          
          <Text style={styles.label}>Adreça *</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Carrer, número, ciutat"
          />

          <Text style={styles.label}>Latitud (per mapa)</Text>
          <TextInput
            style={styles.input}
            value={formData.latitude?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, latitude: text ? parseFloat(text) : undefined })}
            placeholder="41.1557"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Longitud (per mapa)</Text>
          <TextInput
            style={styles.input}
            value={formData.longitude?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, longitude: text ? parseFloat(text) : undefined })}
            placeholder="1.1072"
            keyboardType="numeric"
          />
        </View>

        {/* Contacte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacte</Text>
          
          <Text style={styles.label}>Telèfon</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+34 123 456 789"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="contacte@establiment.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Web</Text>
          <TextInput
            style={styles.input}
            value={formData.website}
            onChangeText={(text) => setFormData({ ...formData, website: text })}
            placeholder="https://www.exemple.com"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Xarxes socials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Xarxes Socials</Text>
          
          <Text style={styles.label}>Facebook</Text>
          <TextInput
            style={styles.input}
            value={formData.facebook}
            onChangeText={(text) => setFormData({ ...formData, facebook: text })}
            placeholder="https://facebook.com/establiment"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Instagram</Text>
          <TextInput
            style={styles.input}
            value={formData.instagram}
            onChangeText={(text) => setFormData({ ...formData, instagram: text })}
            placeholder="@establiment"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Twitter</Text>
          <TextInput
            style={styles.input}
            value={formData.twitter}
            onChangeText={(text) => setFormData({ ...formData, twitter: text })}
            placeholder="@establiment"
            autoCapitalize="none"
          />
        </View>

        {/* Horaris */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horaris</Text>
          
          <Text style={styles.label}>Horari d'obertura</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.opening_hours}
            onChangeText={(text) => setFormData({ ...formData, opening_hours: text })}
            placeholder="Ex: Dl-Dv: 9:00-20:00, Ds: 10:00-14:00"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Botó guardar */}
        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <MaterialIcons name="save" size={24} color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {hasEstablishment ? 'Actualitzar' : 'Crear Establiment'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  section: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    minHeight: 150,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    resizeMode: 'contain',
  },
  imageButtonText: {
    marginTop: Spacing.xs,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: FontSizes.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: FontSizes.sm,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: Spacing.md,
  },
  galleryItem: {
    marginVertical: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  galleryLabel: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  galleryImageContainer: {
    position: 'relative',
    aspectRatio: 9 / 16,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeGalleryButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryPlaceholder: {
    aspectRatio: 9 / 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  galleryPlaceholderText: {
    marginTop: Spacing.xs,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: FontSizes.sm,
  },
  galleryDescriptionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
