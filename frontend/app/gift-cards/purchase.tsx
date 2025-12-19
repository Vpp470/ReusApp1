import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../../src/store/authStore';
import { paymentService } from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

export default function PurchaseGiftCardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const handlePayPalPayment = async () => {
    if (!selectedAmount) {
      Alert.alert('Error', 'Por favor selecciona un monto');
      return;
    }

    setProcessing(true);
    try {
      const returnUrl = 'eltombdereus://payment-success';
      const cancelUrl = 'eltombdereus://payment-cancel';

      const response = await paymentService.createPayPalPayment({
        amount: selectedAmount,
        currency: 'EUR',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      });

      // Open PayPal approval URL in browser
      const result = await WebBrowser.openBrowserAsync(response.approval_url);

      if (result.type === 'cancel') {
        Alert.alert('Pago cancelado', 'Has cancelado el pago');
      } else if (result.type === 'dismiss') {
        // User closed the browser, check payment status
        Alert.alert(
          'Verificando pago',
          'Estamos verificando el estado de tu pago. Por favor revisa tu perfil en unos momentos.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No se pudo procesar el pago'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRedsysPayment = async () => {
    if (!selectedAmount) {
      Alert.alert('Error', 'Por favor selecciona un monto');
      return;
    }

    Alert.alert(
      'Próximamente',
      'La integración con Redsys estará disponible pronto. Por favor usa PayPal.'
    );
  };

  const handleBizumPayment = async () => {
    if (!selectedAmount) {
      Alert.alert('Error', 'Por favor selecciona un monto');
      return;
    }

    // TODO: Integrate with Bizum API when credentials are available
    // This is a mockup - replace with real Bizum integration
    Alert.alert(
      'Pago con Bizum',
      `Funcionalidad preparada para integración.\n\nMonto: ${selectedAmount}€\n\nPara activar:\n1. Obtén credenciales de Bizum\n2. Configura el endpoint /api/payments/bizum/create\n3. Implementa el flujo de pago`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Simular pago (Demo)',
          onPress: () => {
            Alert.alert(
              'Demo',
              'En producción, aquí se abriría la app de Bizum o se mostraría un código QR para completar el pago.'
            );
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Comprar Tarjeta Regalo</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color={Colors.info} />
          <Text style={styles.infoText}>
            Las tarjetas regalo pueden ser usadas en cualquier establecimiento
            asociado a REUS COMERÇ i FUTUR
          </Text>
        </View>

        {/* Amount Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciona el monto</Text>
          <View style={styles.amountGrid}>
            {PRESET_AMOUNTS.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => setSelectedAmount(amount)}
              >
                <Text
                  style={[
                    styles.amountText,
                    selectedAmount === amount && styles.amountTextSelected,
                  ]}
                >
                  {amount} €
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Selected Amount Display */}
        {selectedAmount && (
          <View style={styles.selectedAmountCard}>
            <View style={styles.selectedAmountRow}>
              <Text style={styles.selectedAmountLabel}>Monto seleccionado</Text>
              <Text style={styles.selectedAmountValue}>{selectedAmount} €</Text>
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de pago</Text>

          <Pressable
            style={[styles.paymentButton, processing && styles.paymentButtonDisabled]}
            onPress={handlePayPalPayment}
            disabled={processing || !selectedAmount}
          >
            <View style={styles.paymentButtonContent}>
              <MaterialIcons name="payment" size={32} color={Colors.white} />
              <View style={styles.paymentButtonText}>
                <Text style={styles.paymentButtonTitle}>PayPal</Text>
                <Text style={styles.paymentButtonSubtitle}>
                  Pago seguro con PayPal
                </Text>
              </View>
            </View>
            {processing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
            )}
          </Pressable>

          <Pressable
            style={[styles.paymentButton, styles.redsysButton]}
            onPress={handleRedsysPayment}
            disabled={!selectedAmount}
          >
            <View style={styles.paymentButtonContent}>
              <MaterialIcons name="credit-card" size={32} color={Colors.secondary} />
              <View style={styles.paymentButtonText}>
                <Text style={[styles.paymentButtonTitle, styles.redsysText]}>
                  Tarjeta de crédito/débito
                </Text>
                <Text style={[styles.paymentButtonSubtitle, styles.redsysText]}>
                  Pago con Redsys
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.secondary} />
          </Pressable>

          <Pressable
            style={[styles.paymentButton, styles.bizumButton]}
            onPress={handleBizumPayment}
            disabled={!selectedAmount}
          >
            <View style={styles.paymentButtonContent}>
              <MaterialIcons name="phone-android" size={32} color="#00D8A0" />
              <View style={styles.paymentButtonText}>
                <Text style={[styles.paymentButtonTitle, styles.bizumText]}>
                  Bizum
                </Text>
                <Text style={[styles.paymentButtonSubtitle, styles.bizumText]}>
                  Pago instantáneo con tu móvil
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#00D8A0" />
          </Pressable>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.termsText}>
            Al completar la compra, aceptas los términos y condiciones de uso
            de las tarjetas regalo
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: Spacing.md,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  amountButton: {
    width: '30%',
    aspectRatio: 1.5,
    margin: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lightGray,
  },
  amountButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amountText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  amountTextSelected: {
    color: Colors.text,
  },
  selectedAmountCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedAmountLabel: {
    fontSize: FontSizes.md,
    color: "rgba(255, 255, 255, 0.7)",
  },
  selectedAmountValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  redsysButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  bizumButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#00D8A0',
  },
  paymentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentButtonText: {
    marginLeft: Spacing.md,
  },
  paymentButtonTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
  },
  paymentButtonSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    opacity: 0.9,
    marginTop: 2,
  },
  redsysText: {
    color: Colors.secondary,
  },
  bizumText: {
    color: '#00D8A0',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xl,
  },
  termsText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: Spacing.sm,
    lineHeight: 16,
  },
});
