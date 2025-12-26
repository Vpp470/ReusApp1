import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

interface EstablishmentConfig {
  _id: string;
  name: string;
  accepts_gift_cards: boolean;
  bank_account_iban?: string;
  bank_account_holder?: string;
  gift_card_balance?: number;
}

export default function LocalAssociatConfigScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [establishment, setEstablishment] = useState<EstablishmentConfig | null>(null);
  
  // Form fields
  const [acceptsGiftCards, setAcceptsGiftCards] = useState(false);
  const [iban, setIban] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  useEffect(() => {
    loadEstablishmentConfig();
  }, []);

  const loadEstablishmentConfig = async () => {
    try {
      setLoading(true);
      
      // Obtenir l'establiment de l'usuari
      const response = await api.get('/local-associat/my-establishment', {
        headers: { Authorization: token }
      });
      
      if (response.data) {
        setEstablishment(response.data);
        setAcceptsGiftCards(response.data.accepts_gift_cards || false);
        setIban(response.data.bank_account_iban || '');
        setAccountHolder(response.data.bank_account_holder || '');
      }
    } catch (error: any) {
      console.error('Error carregant configuració:', error);
      if (error.response?.status === 404) {
        Alert.alert(
          'Sense establiment',
          'No tens cap establiment assignat. Contacta amb l\'administrador.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatIBAN = (value: string) => {
    // Eliminar espais i convertir a majúscules
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    // Afegir espais cada 4 caràcters
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const validateIBAN = (iban: string): boolean => {
    const cleaned = iban.replace(/\s/g, '');
    // IBAN espanyol: ES + 22 dígits = 24 caràcters
    if (cleaned.length !== 24) return false;
    if (!cleaned.startsWith('ES')) return false;
    return /^ES\d{22}$/.test(cleaned);
  };

  const handleSave = async () => {
    // Validacions
    if (acceptsGiftCards) {
      if (!iban) {
        Alert.alert('Error', 'Has d\'introduir el número de compte (IBAN) per acceptar Targetes Regal');
        return;
      }
      if (!validateIBAN(iban)) {
        Alert.alert('Error', 'El format de l\'IBAN no és vàlid. Ha de ser ES + 22 dígits');
        return;
      }
      if (!accountHolder) {
        Alert.alert('Error', 'Has d\'introduir el nom del titular del compte');
        return;
      }
    }

    try {
      setSaving(true);
      
      await api.put('/local-associat/config', {
        accepts_gift_cards: acceptsGiftCards,
        bank_account_iban: iban.replace(/\s/g, ''),
        bank_account_holder: accountHolder,
      }, {
        headers: { Authorization: token }
      });

      Alert.alert('Guardat', 'La configuració s\'ha guardat correctament');
      loadEstablishmentConfig();
    } catch (error: any) {
      console.error('Error guardant:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut guardar la configuració');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregant configuració...</Text>
      </View>
    );
  }

  if (!establishment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuració</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="store" size={64} color={Colors.gray} />
          <Text style={styles.emptyText}>No tens cap establiment assignat</Text>
          <Text style={styles.emptySubtext}>
            Contacta amb l'administrador perquè t'assigni un establiment
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuració</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Establiment */}
        <View style={styles.establishmentCard}>
          <MaterialIcons name="store" size={32} color={Colors.primary} />
          <View style={styles.establishmentInfo}>
            <Text style={styles.establishmentName}>{establishment.name}</Text>
            <Text style={styles.establishmentLabel}>El teu establiment</Text>
          </View>
        </View>

        {/* Secció Targeta Regal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="card-giftcard" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Targeta Regal</Text>
          </View>
          
          <Text style={styles.sectionDescription}>
            Activa aquesta opció per acceptar pagaments amb Targeta Regal dels clients. 
            Necessitaràs registrar el teu compte bancari per rebre els pagaments.
          </Text>

          {/* Switch activar/desactivar */}
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Acceptar Targetes Regal</Text>
              <Text style={styles.switchDescription}>
                {acceptsGiftCards 
                  ? 'Els clients podran pagar amb Targeta Regal' 
                  : 'No acceptes pagaments amb Targeta Regal'}
              </Text>
            </View>
            <Switch
              value={acceptsGiftCards}
              onValueChange={setAcceptsGiftCards}
              trackColor={{ false: Colors.gray, true: Colors.primaryLight || Colors.primary }}
              thumbColor={acceptsGiftCards ? Colors.primary : Colors.white}
            />
          </View>

          {/* Camps del compte bancari - només si accepta targetes */}
          {acceptsGiftCards && (
            <View style={styles.bankFields}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titular del compte *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom i cognoms del titular"
                  placeholderTextColor={Colors.gray}
                  value={accountHolder}
                  onChangeText={setAccountHolder}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de compte (IBAN) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  placeholderTextColor={Colors.gray}
                  value={formatIBAN(iban)}
                  onChangeText={(text) => setIban(text.replace(/\s/g, ''))}
                  autoCapitalize="characters"
                  maxLength={29} // 24 + 5 espais
                  keyboardType="default"
                />
                <Text style={styles.inputHelp}>
                  L'IBAN ha de començar per ES seguit de 22 dígits
                </Text>
              </View>

              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color={Colors.info || Colors.primary} />
                <Text style={styles.infoText}>
                  Els diners de les vendes amb Targeta Regal s'acumularan al teu saldo i podràs 
                  sol·licitar transferències al teu compte bancari quan vulguis.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Saldo acumulat (si accepta targetes) */}
        {acceptsGiftCards && establishment.gift_card_balance !== undefined && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="account-balance-wallet" size={24} color={Colors.success} />
              <Text style={styles.sectionTitle}>Saldo Acumulat</Text>
            </View>
            
            <View style={styles.balanceCard}>
              <Text style={styles.balanceAmount}>
                {(establishment.gift_card_balance || 0).toFixed(2)}€
              </Text>
              <Text style={styles.balanceLabel}>Disponible per retirar</Text>
            </View>

            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={() => router.push('/local-associat/withdraw')}
            >
              <MaterialIcons name="send" size={20} color={Colors.white} />
              <Text style={styles.withdrawButtonText}>Sol·licitar Retirada</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botó Guardar */}
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
              <Text style={styles.saveButtonText}>Guardar Configuració</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Link a cobrar amb Targeta Regal */}
        {acceptsGiftCards && (
          <TouchableOpacity 
            style={styles.chargeButton}
            onPress={() => router.push('/local-associat/charge-gift-card')}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color={Colors.primary} />
            <View style={styles.chargeButtonContent}>
              <Text style={styles.chargeButtonTitle}>Cobrar amb Targeta Regal</Text>
              <Text style={styles.chargeButtonSubtitle}>Escaneja el QR del client</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
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
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  establishmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  establishmentInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  establishmentName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  establishmentLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  switchInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
  },
  switchDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bankFields: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E5E5',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E5E5',
  },
  inputHelp: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight || '#E3F2FD',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark,
    lineHeight: 20,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.success,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  withdrawButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  chargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  chargeButtonContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  chargeButtonTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  chargeButtonSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
