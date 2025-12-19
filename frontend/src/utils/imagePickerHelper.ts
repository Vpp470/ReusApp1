import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Mostra un diàleg per seleccionar com pujar la imatge
 * - Imatge completa (sense tallar)
 * - Ajustar al format especificat
 */
export const pickImageWithOptions = async (
  onImageSelected: (uri: string) => void,
  aspect?: [number, number] // Format opcional per al crop
): Promise<void> => {
  Alert.alert(
    'Seleccionar Imatge',
    'Tria com vols afegir la imatge',
    [
      {
        text: '📷 Fer foto',
        onPress: () => takePhoto(onImageSelected, aspect),
      },
      {
        text: '🖼️ Galeria (sense tallar)',
        onPress: () => pickImageWithoutCrop(onImageSelected),
      },
      ...(aspect ? [{
        text: `✂️ Galeria (format ${aspect[0]}:${aspect[1]})`,
        onPress: () => pickImageWithCrop(onImageSelected, aspect),
      }] : []),
      {
        text: 'Cancel·lar',
        style: 'cancel' as const,
      },
    ]
  );
};

/**
 * Fer foto amb la càmera
 */
const takePhoto = async (
  onImageSelected: (uri: string) => void,
  aspect?: [number, number]
): Promise<void> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permís necessari', 'Necessitem permís per accedir a la càmera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: !!aspect,
      aspect: aspect,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'No s\'ha pogut fer la foto');
  }
};

/**
 * Selecciona una imatge sense crop
 */
const pickImageWithoutCrop = async (
  onImageSelected: (uri: string) => void
): Promise<void> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permís necessari', 'Necessitem permís per accedir a les teves fotos');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    onImageSelected(result.assets[0].uri);
  }
};

/**
 * Selecciona una imatge amb crop al format especificat
 */
const pickImageWithCrop = async (
  onImageSelected: (uri: string) => void,
  aspect: [number, number]
): Promise<void> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permís necessari', 'Necessitem permís per accedir a les teves fotos');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: aspect,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    onImageSelected(result.assets[0].uri);
  }
};

/**
 * Selecciona una imatge directament sense opcions (comportament per defecte)
 */
export const pickImageDirect = async (
  onImageSelected: (uri: string) => void,
  allowsEditing: boolean = false,
  aspect?: [number, number]
): Promise<void> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permís necessari', 'Necessitem permís per accedir a les teves fotos');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: allowsEditing,
    aspect: aspect,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    onImageSelected(result.assets[0].uri);
  }
};
