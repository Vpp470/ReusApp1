import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

export default function ScanTicketScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);

    try {
      // Obtenir user_id del store
      const userId = useAuthStore.getState().user?._id || useAuthStore.getState().user?.id;
      
      if (!userId) {
        Alert.alert('Error', 'Has d\'iniciar sessió per escanejar tiquets');
        setScanned(false);
        setProcessing(false);
        return;
      }

      const response = await api.post(
        '/tickets/scan',
        { 
          ticket_code: data,
          user_id: userId
        },
        { headers: { Authorization: token! } }
      );

      Alert.alert(
        '🎉 Tiquet Validat!',
        response.data.message || 'Tiquet processat correctament!',
        [
          {
            text: 'Continuar Escanejant',
            onPress: () => {
              setScanned(false);
              setProcessing(false);
            },
          },
          { 
            text: 'Tornar', 
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut processar el codi QR';
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
  };

  // Carregant permisos
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Escaneja Tiquet</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant càmera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Sense permisos - demanar
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Escaneja Tiquet</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.centerContent}>
          <MaterialIcons name="camera-alt" size={80} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Permís de Càmera</Text>
          <Text style={styles.permissionText}>
            Necessitem accés a la càmera per escanejar tiquets.
          </Text>
          
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={() => {
              console.log('Requesting camera permission...');
              requestPermission();
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="camera-alt" size={24} color={Colors.white} />
            <Text style={styles.permissionButtonText}>Permetre Càmera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Tornar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Càmera activa
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

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Escanejar Codi QR</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.scannerContent}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instructionText}>
            Apunta la càmera al codi QR del tiquet
          </Text>

          {processing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.processingText}>Processant...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  permissionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  backButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.white,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  processingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
});
