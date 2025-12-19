import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

/**
 * Selecciona una imatge de la galeria i la retalla en format quadrat
 * @param aspectRatio - Proporció de l'aspecte (per defecte [1, 1] per quadrat)
 * @returns Promise amb la imatge retallada en base64 o null
 */
export const pickAndCropImage = async (
  aspectRatio: [number, number] = [1, 1]
): Promise<string | null> => {
  try {
    // Demanar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necessaris',
        'Necessitem permisos per accedir a les teves fotos'
      );
      return null;
    }

    // Seleccionar imatge
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: aspectRatio,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const selectedImage = result.assets[0];

    // Obtenir les dimensions de la imatge
    const { width, height } = selectedImage;
    
    // Calcular el tamany del quadrat (la dimensió més petita)
    const size = Math.min(width, height);
    
    // Calcular l'origen per centrar el retall
    const originX = (width - size) / 2;
    const originY = (height - size) / 2;

    // Retallar la imatge en format quadrat
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      selectedImage.uri,
      [
        {
          crop: {
            originX,
            originY,
            width: size,
            height: size,
          },
        },
        // Redimensionar a 600x600 per optimitzar (més lleuger)
        {
          resize: {
            width: 600,
            height: 600,
          },
        },
      ],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manipulatedImage.base64) {
      return `data:image/jpeg;base64,${manipulatedImage.base64}`;
    }

    return null;
  } catch (error) {
    console.error('Error seleccionant i retallant imatge:', error);
    Alert.alert('Error', 'No s\'ha pogut processar la imatge');
    return null;
  }
};

/**
 * Pren una foto amb la càmera i la retalla en format quadrat
 * @param aspectRatio - Proporció de l'aspecte (per defecte [1, 1] per quadrat)
 * @returns Promise amb la imatge retallada en base64 o null
 */
export const takePictureAndCrop = async (
  aspectRatio: [number, number] = [1, 1]
): Promise<string | null> => {
  try {
    // Demanar permisos de càmera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necessaris',
        'Necessitem permisos per accedir a la càmera'
      );
      return null;
    }

    // Prendre foto
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: aspectRatio,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const selectedImage = result.assets[0];

    // Obtenir les dimensions de la imatge
    const { width, height } = selectedImage;
    
    // Calcular el tamany del quadrat (la dimensió més petita)
    const size = Math.min(width, height);
    
    // Calcular l'origen per centrar el retall
    const originX = (width - size) / 2;
    const originY = (height - size) / 2;

    // Retallar la imatge en format quadrat
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      selectedImage.uri,
      [
        {
          crop: {
            originX,
            originY,
            width: size,
            height: size,
          },
        },
        // Redimensionar a 600x600 per optimitzar (més lleuger)
        {
          resize: {
            width: 600,
            height: 600,
          },
        },
      ],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manipulatedImage.base64) {
      return `data:image/jpeg;base64,${manipulatedImage.base64}`;
    }

    return null;
  } catch (error) {
    console.error('Error prenent i retallant foto:', error);
    Alert.alert('Error', 'No s\'ha pogut processar la foto');
    return null;
  }
};
