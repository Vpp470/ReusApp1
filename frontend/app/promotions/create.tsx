import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { promotionsService } from '../../src/services/api';
import { pickImageWithOptions } from '../../src/utils/imagePickerHelper';
import { i18n } from '../../src/i18n';

export default function CreatePromotionScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [tag, setTag] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [validFrom, setValidFrom] = useState(new Date());
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // +30 dies
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showUntilPicker, setShowUntilPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    console.log('📸 Obrint selector d\'imatges...');
    await pickImageWithOptions(
      (uri) => {
        console.log('✅ Imatge seleccionada:', uri);
        setImageUri(uri);
      },
      [3, 4] // Format 3:4 per al crop opcional
    );
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      // Per React Native, utilitzem expo-file-system
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Obtenir l'extensió del fitxer
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      // Retornar amb el prefix data:image
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      Alert.alert('Error', 'No s\'ha pogut processar la imatge');
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validacions
    if (!title.trim()) {
      Alert.alert('Error', 'El títol és obligatori');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'La descripció és obligatòria');
      return;
    }
    if (!imageUri) {
      Alert.alert('Error', 'Has de seleccionar una imatge');
      return;
    }
    if (validFrom >= validUntil) {
      Alert.alert('Error', 'La data de finalització ha de ser posterior a la d\'inici');
      return;
    }
    if (!token) {
      Alert.alert('Error', 'No estàs autenticat');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Convertint imatge a base64...');
      console.log('📎 URI de la imatge:', imageUri);
      
      // Convertir imatge a base64
      const base64Image = await convertImageToBase64(imageUri);
      console.log('✅ Imatge convertida. Longitud:', base64Image.length);
      console.log('📊 Primeres 100 caracters:', base64Image.substring(0, 100));

      // Preparar dades
      const promotionData = {
        title: title.trim(),
        description: description.trim(),
        image_url: base64Image,
        link_url: linkUrl.trim() || undefined,
        tag: tag.trim() || undefined,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
      };

      console.log('📤 Enviant promoció:', {
        ...promotionData,
        image_url: `[base64 de ${base64Image.length} chars]`
      });

      // Crear promoció
      await promotionsService.create(token, promotionData);

      // Missatge segons el rol
      if (user?.role === 'admin') {
        Alert.alert(
          'Èxit',
          'Promoció creada i aprovada correctament',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Èxit',
          'Promoció enviada per a revisió. Un administrador la revisarà aviat.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No s\'ha pogut crear la promoció'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{i18n.t('promotions.create.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Imatge */}
          <View style={styles.section}>
            <Text style={styles.label}>{i18n.t('promotions.create.image')} {i18n.t('common.required')}</Text>
            <Text style={styles.hint}>{i18n.t('promotions.create.imageHint')}</Text>
            
            <Pressable style={styles.imagePickerContainer} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-photo-alternate" size={60} color={Colors.lightGray} />
                  <Text style={styles.imagePlaceholderText}>{i18n.t('promotions.create.selectImage')}</Text>
                </View>
              )}
            </Pressable>
            {imageUri && (
              <Pressable onPress={pickImage} style={styles.changeImageButton}>
                <Text style={styles.changeImageText}>🔄 {i18n.t('promotions.create.changeImage')}</Text>
              </Pressable>
            )}
          </View>

          {/* Títol */}
          <View style={styles.section}>
            <Text style={styles.label}>{i18n.t('promotions.create.titleLabel')} {i18n.t('common.required')}</Text>
            <TextInput
              style={styles.input}
              placeholder="Títol de la promoció"
              placeholderTextColor={Colors.lightGray}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Descripció */}
          <View style={styles.section}>
            <Text style={styles.label}>{i18n.t('promotions.create.description')} {i18n.t('common.required')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={i18n.t('promotions.create.descriptionPlaceholder')}
              placeholderTextColor={Colors.lightGray}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Enllaç */}
          <View style={styles.section}>
            <Text style={styles.label}>{i18n.t('promotions.create.link')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('promotions.create.linkPlaceholder')}
              placeholderTextColor={Colors.lightGray}
              value={linkUrl}
              onChangeText={setLinkUrl}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Marcador */}
          <View style={styles.section}>
            <Text style={styles.label}>🏷️ {i18n.t('promotions.create.tag')}</Text>
            <Text style={styles.hint}>
              {i18n.t('promotions.create.tagHint')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('promotions.create.tagPlaceholder')}
              placeholderTextColor={Colors.lightGray}
              value={tag}
              onChangeText={setTag}
              maxLength={50}
              autoCapitalize="none"
            />
          </View>

          {/* Data d'inici */}
          <View style={styles.section}>
            <Text style={styles.label}>{i18n.t('promotions.create.validFrom')} {i18n.t('common.required')}</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={validFrom.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setValidFrom(newDate);
                }}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 16,
                  width: '100%',
                }}
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowFromPicker(true)}
                >
                  <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
                  <Text style={styles.dateText}>
                    {validFrom.toLocaleDateString('ca-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </Pressable>
                {showFromPicker && (
                  <DateTimePicker
                    value={validFrom}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowFromPicker(false);
                      if (selectedDate) {
                        setValidFrom(selectedDate);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          {/* Data de finalització */}
          <View style={styles.section}>
            <Text style={styles.label}>{i18n.t('promotions.create.validUntil')} {i18n.t('common.required')}</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={validUntil.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setValidUntil(newDate);
                }}
                min={validFrom.toISOString().split('T')[0]}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 16,
                  width: '100%',
                }}
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowUntilPicker(true)}
                >
                  <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
                  <Text style={styles.dateText}>
                    {validUntil.toLocaleDateString('ca-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </Pressable>
                {showUntilPicker && (
                  <DateTimePicker
                    value={validUntil}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowUntilPicker(false);
                      if (selectedDate) {
                        setValidUntil(selectedDate);
                      }
                    }}
                    minimumDate={validFrom}
                  />
                )}
              </>
            )}
          </View>

          {/* Info per usuaris associats */}
          {user?.role !== 'admin' && (
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color={Colors.accent} />
              <Text style={styles.infoText}>
                {i18n.t('promotions.create.info')}
              </Text>
            </View>
          )}

          {/* Botó de crear */}
          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <MaterialIcons name="check" size={24} color={Colors.white} />
                <Text style={styles.submitButtonText}>{i18n.t('promotions.create.submit')}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
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
    color: Colors.textDark, // Text fosc per fons blanc
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  imagePickerContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  imagePlaceholderText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  changeImageButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  changeImageText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  dateText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    marginLeft: Spacing.sm,
  },
  infoBox: {
    backgroundColor: Colors.accent + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    marginLeft: Spacing.sm,
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginLeft: Spacing.sm,
  },
});
