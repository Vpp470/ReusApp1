import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

type ChargeStep = 'amount' | 'scan' | 'confirm' | 'success';

export default function ChargeGiftCardScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [step, setStep] = useState<ChargeStep>('amount');
  const [amount, setAmount] = useState('');
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [scannedUserInfo, setScannedUserInfo] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);

  const handleAmountSubmit = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Introdueix un import vàlid');
      return;
    }
    if (amountNum > 500) {
      Alert.alert('Error', 'L\'import màxim per transacció és 500€');
      return;
    }
    setStep('scan');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedUserId) return; // Evitar escanejos múltiples
    
    try {
      // El QR conté l'ID de l'usuari o un codi específic
      // Format esperat: "REUSAPP_USER:userId" o simplement l'userId
      let userId = data;
      if (data.startsWith('REUSAPP_USER:')) {
        userId = data.replace('REUSAPP_USER:', '');
      }
      
      setScannedUserId(userId);
      Vibration.vibrate(100);
      
      // Verificar l'usuari i obtenir el seu saldo
      setProcessing(true);
      const response = await api.get(`/gift-cards/user/${userId}/balance`, {
        headers: { Authorization: token }
      });
      
      setScannedUserInfo(response.data);
      setStep('confirm');
    } catch (error: any) {
      console.error('Error verificant usuari:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No s\'ha pogut verificar l\'usuari. Assegura\'t que el QR és vàlid.'
      );
      setScannedUserId(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmCharge = async () => {
    if (!scannedUserId || !amount) return;
    
    const amountNum = parseFloat(amount);
    
    if (scannedUserInfo?.balance < amountNum) {
      Alert.alert(
        'Saldo insuficient',
        `El client només té ${scannedUserInfo.balance.toFixed(2)}€ de saldo disponible.`
      );
      return;
    }
    
    setProcessing(true);
    try {
      const response = await api.post('/gift-cards/charge', {
        user_id: scannedUserId,
        amount: amountNum,
      }, {
        headers: { Authorization: token }
      });
      
      setTransactionResult(response.data);
      setStep('success');
      Vibration.vibrate([100, 100, 100]);
    } catch (error: any) {
      console.error('Error processant cobrament:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No s\'ha pogut processar el cobrament'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleNewCharge = () => {
    setStep('amount');
    setAmount('');
    setScannedUserId(null);
    setScannedUserInfo(null);
    setTransactionResult(null);
  };

  // Pantalla d'import
  if (step === 'amount') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cobrar Targeta Regal</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="point-of-sale" size={64} color={Colors.primary} />
          </View>
          
          <Text style={styles.instruction}>Introdueix l'import a cobrar</Text>
          
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.gray}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.currencySymbol}>€</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, !amount && styles.buttonDisabled]}
            onPress={handleAmountSubmit}
            disabled={!amount}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Escanejar QR del Client</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pantalla d'escaneig
  if (step === 'scan') {
    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('amount')} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Escanejar QR</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.permissionContainer}>
            <MaterialIcons name="camera-alt" size={64} color={Colors.gray} />
            <Text style={styles.permissionText}>
              Necessitem accés a la càmera per escanejar el QR del client
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Permetre Càmera</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('amount')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escanejar QR</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scanContainer}>
          <View style={styles.amountBadge}>
            <Text style={styles.amountBadgeText}>Import: {parseFloat(amount).toFixed(2)}€</Text>
          </View>

          {Platform.OS === 'web' ? (
            <View style={styles.webCameraPlaceholder}>
              <MaterialIcons name="qr-code-scanner" size={64} color={Colors.gray} />
              <Text style={styles.webCameraText}>
                L'escaneig de QR funciona millor a l'app mòbil
              </Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Introdueix el codi d'usuari manualment"
                placeholderTextColor={Colors.gray}
                onSubmitEditing={(e) => handleBarCodeScanned({ data: e.nativeEvent.text })}
              />
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scannedUserId ? undefined : handleBarCodeScanned}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>Apunta al QR del client</Text>
              </View>
            </CameraView>
          )}

          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.processingText}>Verificant...</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Pantalla de confirmació
  if (step === 'confirm') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep('scan'); setScannedUserId(null); }} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar Cobrament</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <MaterialIcons name="person" size={48} color={Colors.primary} />
              <Text style={styles.confirmUserName}>{scannedUserInfo?.name || 'Client'}</Text>
              <Text style={styles.confirmUserEmail}>{scannedUserInfo?.email}</Text>
            </View>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Saldo disponible:</Text>
                <Text style={styles.confirmValue}>{scannedUserInfo?.balance?.toFixed(2)}€</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Import a cobrar:</Text>
                <Text style={[styles.confirmValue, styles.confirmAmount]}>
                  -{parseFloat(amount).toFixed(2)}€
                </Text>
              </View>
              <View style={[styles.confirmRow, styles.confirmTotal]}>
                <Text style={styles.confirmLabel}>Saldo restant:</Text>
                <Text style={styles.confirmValue}>
                  {((scannedUserInfo?.balance || 0) - parseFloat(amount)).toFixed(2)}€
                </Text>
              </View>
            </View>
          </View>

          {scannedUserInfo?.balance < parseFloat(amount) && (
            <View style={styles.warningBox}>
              <MaterialIcons name="warning" size={24} color={Colors.warning} />
              <Text style={styles.warningText}>
                El client no té saldo suficient per aquest cobrament
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (processing || scannedUserInfo?.balance < parseFloat(amount)) && styles.buttonDisabled
            ]}
            onPress={handleConfirmCharge}
            disabled={processing || scannedUserInfo?.balance < parseFloat(amount)}
          >
            {processing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={24} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Confirmar Cobrament</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => { setStep('scan'); setScannedUserId(null); }}
          >
            <Text style={styles.secondaryButtonText}>Cancel·lar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pantalla d'èxit
  if (step === 'success') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: Colors.success }]}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Cobrament Realitzat</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <MaterialIcons name="check-circle" size={80} color={Colors.success} />
          </View>

          <Text style={styles.successTitle}>Operació completada!</Text>
          
          <View style={styles.successCard}>
            <Text style={styles.successAmount}>{parseFloat(amount).toFixed(2)}€</Text>
            <Text style={styles.successLabel}>Import cobrat</Text>
          </View>

          <View style={styles.successDetails}>
            <View style={styles.successRow}>
              <Text style={styles.successDetailLabel}>Client:</Text>
              <Text style={styles.successDetailValue}>{scannedUserInfo?.name || scannedUserInfo?.email}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successDetailLabel}>Nou saldo del client:</Text>
              <Text style={styles.successDetailValue}>{transactionResult?.new_balance?.toFixed(2)}€</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successDetailLabel}>El teu saldo acumulat:</Text>
              <Text style={[styles.successDetailValue, { color: Colors.success }]}>
                {transactionResult?.shop_balance?.toFixed(2)}€
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleNewCharge}>
            <MaterialIcons name="add" size={24} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Nou Cobrament</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Tornar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
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
    paddingTop: 50,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight || '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  instruction: {
    fontSize: FontSizes.lg,
    color: Colors.textDark,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textDark,
    textAlign: 'center',
    minWidth: 150,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    width: '100%',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  scanContainer: {
    flex: 1,
  },
  amountBadge: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    zIndex: 10,
  },
  amountBadgeText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: Colors.white,
    borderRadius: BorderRadius.md,
  },
  scanText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    marginTop: Spacing.lg,
  },
  webCameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  webCameraText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 300,
    fontSize: FontSizes.md,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  confirmCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: Spacing.lg,
  },
  confirmHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    marginBottom: Spacing.lg,
  },
  confirmUserName: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.sm,
  },
  confirmUserEmail: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  confirmDetails: {
    gap: Spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  confirmValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
  },
  confirmAmount: {
    color: Colors.danger,
    fontSize: FontSizes.lg,
  },
  confirmTotal: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.warning,
  },
  successContent: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: Spacing.xl,
  },
  successCard: {
    backgroundColor: Colors.success + '20',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.success,
  },
  successLabel: {
    fontSize: FontSizes.md,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  successDetails: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  successDetailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  successDetailValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark,
  },
});
