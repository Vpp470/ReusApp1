import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

// Tipus per la campanya de tiquets
interface TicketCampaign {
  _id: string;
  id: string;
  title: string;
  description?: string;
  image?: string;
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
  tag?: string;
}

export default function ScanTicketScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [participations, setParticipations] = useState(0);
  const [scanMode, setScanMode] = useState<'menu' | 'qr' | 'photo' | 'manual'>('menu');
  const [scanned, setScanned] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<TicketCampaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    loadParticipations();
    loadActiveCampaign();
  }, []);

  const loadActiveCampaign = async () => {
    try {
      setLoadingCampaign(true);
      const response = await api.get('/tickets/campaign');
      setActiveCampaign(response.data);
    } catch (error) {
      console.error('Error carregant campanya activa:', error);
      setActiveCampaign(null);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const loadParticipations = async () => {
    if (!token) return;
    try {
      const response = await api.get('/tickets/my-participations', {
        headers: { Authorization: token },
      });
      setParticipations(response.data.participations || 0);
    } catch (error) {
      console.error('Error carregant participacions:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      processTicket(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      processTicket(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setProcessing(true);

    try {
      const response = await api.post(
        '/tickets/scan',
        { ticket_code: data },
        { headers: { Authorization: token! } }
      );

      if (Platform.OS === 'web') {
        window.alert(`🎉 Tiquet Validat!\n${response.data.message || 'Tiquet processat correctament!'}`);
        setScanned(false);
        setScanMode('menu');
        loadParticipations();
      } else {
        Alert.alert(
          '🎉 Tiquet Validat!',
          response.data.message || 'Tiquet processat correctament!',
          [
            {
              text: 'Veure Participacions',
              onPress: () => {
                setScanned(false);
                setScanMode('menu');
                router.push('/tickets/participations');
              },
            },
            { 
              text: 'Escanejar Altre', 
              onPress: () => {
                setScanned(false);
                setProcessing(false);
                loadParticipations();
              } 
            },
          ]
        );
      }
      loadParticipations();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut processar el codi QR';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
        setScanned(false);
        setProcessing(false);
      } else {
        Alert.alert(
          'Error',
          errorMsg,
          [
            {
              text: 'Reintentar',
              onPress: () => {
                setScanned(false);
                setProcessing(false);
              },
            },
          ]
        );
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim() || processing) return;
    
    setProcessing(true);
    try {
      const response = await api.post(
        '/tickets/scan',
        { ticket_code: manualCode.trim().toUpperCase() },
        { headers: { Authorization: token! } }
      );

      if (Platform.OS === 'web') {
        window.alert(`🎉 Tiquet Validat!\n${response.data.message || 'Tiquet processat correctament!'}`);
      } else {
        Alert.alert('🎉 Tiquet Validat!', response.data.message || 'Tiquet processat correctament!');
      }
      
      setManualCode('');
      setScanMode('menu');
      loadParticipations();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut processar el codi';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const processTicket = async (imageBase64: string) => {
    try {
      setProcessing(true);
      
      const response = await api.post(
        '/tickets/process',
        { ticket_image: imageBase64 },
        { headers: { Authorization: token! } }
      );

      if (response.data.success) {
        const msg = `${response.data.message}\n\nEstabliment: ${response.data.establishment}\nImport: ${response.data.amount}€\n\nTotal participacions: ${participations + response.data.participations}`;
        if (Platform.OS === 'web') {
          window.alert(`🎉 Tiquet Validat!\n${msg}`);
        } else {
          Alert.alert(
            '🎉 Tiquet Validat!',
            msg,
            [
              {
                text: 'Veure Participacions',
                onPress: () => router.push('/tickets/participations'),
              },
              { text: 'Escanejar Altre', onPress: () => { setScanMode('menu'); loadParticipations(); } },
            ]
          );
        }
        loadParticipations();
      }
    } catch (error: any) {
      console.error('Error processant tiquet:', error);
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut processar el tiquet. Comprova que sigui llegible i d\'un establiment associat.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  // A web, la càmera pot no estar disponible
  const isWeb = Platform.OS === 'web';
  
  if (!permission && !isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  // Mode d'entrada manual
  if (scanMode === 'manual') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setScanMode('menu')}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Introduir Codi</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.manualContainer} contentContainerStyle={styles.manualContent}>
          <MaterialIcons name="keyboard" size={64} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.manualTitle}>Introdueix el Codi del Tiquet</Text>
          <Text style={styles.manualSubtitle}>
            Escriu el codi que apareix al tiquet de compra
          </Text>
          
          <TextInput
            style={styles.manualInput}
            placeholder="Ex: TIQUET-12345-ABC"
            placeholderTextColor={Colors.textSecondary}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.manualSubmitButton, (!manualCode.trim() || processing) && styles.manualSubmitButtonDisabled]}
            onPress={handleManualSubmit}
            disabled={!manualCode.trim() || processing}
          >
            {processing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={Colors.white} />
                <Text style={styles.manualSubmitButtonText}>Validar Codi</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.manualCancelButton} onPress={() => setScanMode('menu')}>
            <Text style={styles.manualCancelButtonText}>Cancel·lar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // A web o sense permisos de càmera, mostrar opcions alternatives
  if (isWeb || !permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Escaneja Tiquet</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={{ flex: 1 }}>
          {/* Secció de campanya activa */}
          {loadingCampaign ? (
            <View style={styles.campaignLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : activeCampaign ? (
            <View style={styles.campaignContainer}>
              {activeCampaign.image && (
                <Image source={{ uri: activeCampaign.image }} style={styles.campaignImage} />
              )}
              <View style={styles.campaignContent}>
                <Text style={styles.campaignTitle}>{activeCampaign.title}</Text>
                {activeCampaign.description && (
                  <Text style={styles.campaignDescription}>{activeCampaign.description}</Text>
                )}
                <Text style={styles.campaignPrize}>🎁 {activeCampaign.prize_description}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noCampaignContainer}>
              <MaterialIcons name="info-outline" size={40} color={Colors.textSecondary} />
              <Text style={styles.noCampaignText}>No hi ha cap campanya activa en aquest moment</Text>
            </View>
          )}
          
          <View style={styles.permissionContainer}>
            <MaterialIcons name="photo-camera" size={64} color={Colors.primary} />
            <Text style={styles.permissionTitle}>
              {isWeb ? 'Opcions d\'Escaneig' : 'Accés a la Càmera'}
            </Text>
            <Text style={styles.permissionText}>
              {isWeb 
                ? 'Tria com vols validar el teu tiquet:'
                : 'Necessitem accés a la càmera per escanejar els teus tiquets'
              }
            </Text>
            
            {!isWeb && (
              <Pressable style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonText}>Permetre Càmera</Text>
              </Pressable>
            )}
            
            {/* Botó entrada manual */}
            <Pressable style={styles.manualEntryButton} onPress={() => setScanMode('manual')}>
              <MaterialIcons name="keyboard" size={20} color={Colors.white} />
              <Text style={styles.manualEntryButtonText}>Introduir Codi Manualment</Text>
            </Pressable>
            
            <Pressable style={styles.galleryButton} onPress={pickImage}>
              <MaterialIcons name="photo-library" size={20} color={Colors.primary} />
              <Text style={styles.galleryButtonText}>Seleccionar de Galeria</Text>
            </Pressable>
            
            {/* Participacions */}
            <TouchableOpacity 
              style={styles.participationsButton} 
              onPress={() => router.push('/tickets/participations')}
          >
            <MaterialIcons name="confirmation-number" size={20} color={Colors.white} />
            <Text style={styles.participationsButtonText}>
              Les meves participacions ({participations})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Vista de escàner QR
  if (scanMode === 'qr' && permission?.granted) {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        <SafeAreaView style={styles.scannerOverlay} edges={['top']}>
          <View style={styles.scannerHeader}>
            <Pressable onPress={() => setScanMode('menu')}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
            </Pressable>
            <Text style={styles.scannerHeaderTitle}>Escanejar Codi QR</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.scannerContent}>
            <View style={styles.scanAreaWrapper}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
            
            <Text style={styles.scannerInstructionText}>
              Apunta la càmera al codi QR del tiquet
            </Text>

            {processing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.scannerProcessingText}>Processant ticket...</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Escaneja Tiquet</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Secció de campanya activa */}
      {loadingCampaign ? (
        <View style={styles.campaignLoadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : activeCampaign ? (
        <View style={styles.campaignContainer}>
          {activeCampaign.image && (
            <Image 
              source={{ uri: activeCampaign.image }} 
              style={styles.campaignImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.campaignContent}>
            <View style={styles.campaignBadge}>
              <MaterialIcons name="star" size={14} color={Colors.white} />
              <Text style={styles.campaignBadgeText}>CAMPANYA ACTIVA</Text>
            </View>
            <Text style={styles.campaignTitle}>{activeCampaign.title}</Text>
            {activeCampaign.description && (
              <Text style={styles.campaignDescription}>{activeCampaign.description}</Text>
            )}
            <View style={styles.campaignPrizeRow}>
              <MaterialIcons name="emoji-events" size={18} color={Colors.secondary} />
              <Text style={styles.campaignPrize}>{activeCampaign.prize_description}</Text>
            </View>
            <Text style={styles.campaignDates}>
              Fins el {new Date(activeCampaign.end_date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noCampaignContainer}>
          <MaterialIcons name="info-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.noCampaignText}>No hi ha cap campanya de tiquets activa</Text>
        </View>
      )}

      <View style={styles.participationsBar}>
        <MaterialIcons name="confirmation-number" size={24} color={Colors.primary} />
        <Text style={styles.participationsText}>
          {participations} participació{participations !== 1 ? 'ns' : ''} acumulada{participations !== 1 ? 'es' : ''}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Per cada 10€ de compra generes 1 participació per al sorteig mensual
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {/* Botó escanejar QR */}
          {permission?.granted && (
            <Pressable
              style={styles.qrButton}
              onPress={() => setScanMode('qr')}
              disabled={processing}
            >
              <MaterialIcons name="qr-code-scanner" size={48} color={Colors.white} />
              <Text style={styles.photoButtonText}>Escanejar QR</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.photoButton}
            onPress={takePhoto}
            disabled={processing}
          >
            <MaterialIcons name="camera-alt" size={48} color={Colors.white} />
            <Text style={styles.photoButtonText}>Fer Foto</Text>
          </Pressable>

          <Pressable
            style={styles.galleryButtonLarge}
            onPress={pickImage}
            disabled={processing}
          >
            <MaterialIcons name="photo-library" size={48} color={Colors.white} />
            <Text style={styles.photoButtonText}>Galeria</Text>
          </Pressable>
        </View>

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingText}>Processant tiquet amb IA...</Text>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Com funciona:</Text>
          <Text style={styles.instructionItem}>📱 Escanejar codi QR (si en tens)</Text>
          <Text style={styles.instructionItem}>📸 O fes una foto clara del tiquet</Text>
          <Text style={styles.instructionItem}>🔍 El sistema llegirà automàticament les dades</Text>
          <Text style={styles.instructionItem}>✅ Es validarà que sigui d'un establiment associat</Text>
          <Text style={styles.instructionItem}>🎯 Generaràs participacions segons l'import</Text>
          <Text style={styles.instructionItem}>🏆 Participa al sorteig mensual</Text>
        </View>

        <Pressable
          style={styles.historyButton}
          onPress={() => router.push('/tickets/participations')}
        >
          <MaterialIcons name="history" size={20} color={Colors.primary} />
          <Text style={styles.historyButtonText}>Veure Historial</Text>
        </Pressable>
      </View>
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
  // Estils per la campanya activa
  campaignLoadingContainer: {
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  campaignContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#E5E5E5',
  },
  campaignImage: {
    width: '100%',
    height: 120,
  },
  campaignContent: {
    padding: Spacing.md,
  },
  campaignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.success || '#28A745',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm || 4,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  campaignBadgeText: {
    color: Colors.white,
    fontSize: FontSizes.xs || 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  campaignTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  campaignDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary || '#666',
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  campaignPrizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  campaignPrize: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.secondary || '#FFC107',
  },
  campaignDates: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary || '#666',
    fontStyle: 'italic',
  },
  noCampaignContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  noCampaignText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary || '#666',
  },
  participationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
    gap: Spacing.sm,
  },
  participationsText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  photoButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  galleryButtonLarge: {
    flex: 1,
    backgroundColor: Colors.secondary,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  photoButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  processingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.md,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  instructionItem: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  historyButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  galleryButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  participationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  participationsButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  qrButton: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scannerHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  scannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanAreaWrapper: {
    padding: Spacing.xl,
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.success,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerInstructionText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  scannerProcessingText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
});
