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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface GalleryImage {
  image_url: string;
  description: string;
}

export default function LocalAssociatGalleryScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([
    { image_url: '', description: '' },
    { image_url: '', description: '' },
    { image_url: '', description: '' },
  ]);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      // Primer obtenim l'establiment de l'usuari
      const response = await api.get('/user/me', {
        headers: { Authorization: token },
      });
      
      if (response.data.establishment_id) {
        setEstablishmentId(response.data.establishment_id);
        
        // Carreguem la galeria de l'establiment
        const estResponse = await api.get(`/establishments/${response.data.establishment_id}`);
        if (estResponse.data.gallery && Array.isArray(estResponse.data.gallery)) {
          const loadedGallery = estResponse.data.gallery;
          // Assegurem que sempre hi hagi 3 slots
          while (loadedGallery.length < 3) {
            loadedGallery.push({ image_url: '', description: '' });
          }
          setGallery(loadedGallery.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
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

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Format vertical 9:16
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        console.log('📸 Imatge seleccionada:', result.assets[0].uri);
        
        // Redimensionar la imatge a format 9:16
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }], // Amplada fixa, altura proporcional
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        console.log('🔄 Imatge redimensionada:', manipResult.uri);
        
        // Convertir a base64
        const base64Image = await convertImageToBase64(manipResult.uri);
        
        console.log('✅ Imatge convertida a base64. Longitud:', base64Image.length);
        
        const newGallery = [...gallery];
        newGallery[index] = { ...newGallery[index], image_url: base64Image };
        setGallery(newGallery);
        
        Alert.alert('Èxit', 'Imatge seleccionada correctament');
      } catch (error) {
        console.error('❌ Error processing image:', error);
        Alert.alert('Error', 'No s\'ha pogut processar la imatge');
      }
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Eliminar imatge',
      'Estàs segur que vols eliminar aquesta imatge?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newGallery = [...gallery];
            newGallery[index] = { image_url: '', description: '' };
            setGallery(newGallery);
          },
        },
      ]
    );
  };

  const updateDescription = (index: number, description: string) => {
    const newGallery = [...gallery];
    newGallery[index] = { ...newGallery[index], description };
    setGallery(newGallery);
  };

  const handleSave = async () => {
    if (!establishmentId) {
      Alert.alert('Error', 'No s\'ha pogut identificar l\'establiment');
      return;
    }

    setSaving(true);
    try {
      // Filtrem les imatges buides
      const validGallery = gallery.filter(item => item.image_url !== '');
      
      await api.put(
        `/establishments/${establishmentId}/gallery`,
        { gallery: validGallery },
        { headers: { Authorization: token } }
      );
      
      Alert.alert('Èxit', 'Galeria actualitzada correctament');
    } catch (error: any) {
      console.error('Error saving gallery:', error);
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut guardar la galeria';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Galeria d'Imatges</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          Puja fins a 3 fotografies en format vertical (9:16) del teu establiment amb una breu descripció.
        </Text>

        {gallery.map((item, index) => (
          <View key={index} style={styles.imageCard}>
            <Text style={styles.imageLabel}>Imatge {index + 1}</Text>
            
            {item.image_url ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.image_url }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <MaterialIcons name="close" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePlaceholder}
                onPress={() => pickImage(index)}
              >
                <MaterialIcons name="add-photo-alternate" size={48} color={Colors.textSecondary} />
                <Text style={styles.placeholderText}>Afegir imatge (9:16)</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Descripció:</Text>
            <TextInput
              style={styles.descriptionInput}
              value={item.description}
              onChangeText={(text) => updateDescription(index, text)}
              placeholder="Breu descripció de la imatge..."
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={styles.charCount}>{item.description.length}/150</Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Guardar Galeria</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  description: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  imageCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageLabel: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 9 / 16,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    aspectRatio: 9 / 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  placeholderText: {
    marginTop: Spacing.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
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
