import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function ConsentScreen() {
  const router = useRouter();
  const { user, token, setConsent } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Debug: Mostrar info de l'usuari en carregar la pantalla
  React.useEffect(() => {
    console.log('🔍 Pantalla de consentiment carregada');
    console.log('👤 User:', user);
    console.log('🔑 Token:', token ? 'Disponible' : 'No disponible');
    
    // Esperar 500ms per donar temps a que es carregui el user
    const timer = setTimeout(() => {
      if (!user || !token) {
        console.error('❌ No hi ha user o token després de 500ms, redirigint a login');
        router.replace('/auth/login');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    console.log('🔘 Botó "Acceptar" premut');
    console.log('📋 Estat actual:', { accepted, hasUser: !!user, hasToken: !!token });
    
    if (!accepted) {
      console.log('⚠️ Checkbox no marcat');
      Alert.alert(
        'Consentiment requerit',
        'Has de marcar la casella per acceptar la política de protecció de dades.',
        [{ text: 'D\'acord' }]
      );
      return;
    }

    if (!user || !token) {
      console.log('❌ No hi ha usuari o token:', { user: user?.email, hasToken: !!token });
      Alert.alert('Error', 'No hi ha usuari autenticat');
      return;
    }

    console.log('📤 Enviant consentiment al backend...');
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/consent/${user.id}`,
        { consent_given: true },
        { headers: { Authorization: token } }
      );
      
      console.log('✅ Resposta del backend:', response.data);
      
      await setConsent(true);
      console.log('✅ Consentiment guardat localment');
      console.log('🏠 Redirigint a home...');
      
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('❌ Error donant consentiment:', error);
      console.error('❌ Error response:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No s\'ha pogut guardar el consentiment. Si us plau, intenta-ho de nou.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MaterialIcons name="security" size={48} color={Colors.white} />
        <Text style={styles.headerTitle}>Protecció de Dades</Text>
        <Text style={styles.headerSubtitle}>Consentiment obligatori</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Política de Protecció de Dades Personals
          </Text>
          
          <Text style={styles.text}>
            De conformitat amb el Reglament (UE) 2016/679 del Parlament Europeu i del Consell, de 27 d'abril de 2016, relatiu a la protecció de les persones físiques pel que fa al tractament de dades personals i a la lliure circulació d'aquestes dades (RGPD), t'informem:
          </Text>

          <View style={styles.infoSection}>
            <MaterialIcons name="person" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Responsable del tractament</Text>
              <Text style={styles.infoText}>REUS COMERÇ i FUTUR</Text>
              <Text style={styles.infoText}>protecciodades@reuscomercifutur.com</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <MaterialIcons name="description" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Finalitat del tractament</Text>
              <Text style={styles.infoText}>
                Les teves dades es tractaran per gestionar el teu compte d'usuari, proporcionar-te els serveis de l'aplicació, enviar-te comunicacions relacionades amb esdeveniments, promocions i notícies de comerços locals de Reus.
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <MaterialIcons name="lock" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Legitimació</Text>
              <Text style={styles.infoText}>
                Consentiment de l'interessat en acceptar aquesta política.
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <MaterialIcons name="verified-user" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Els teus drets</Text>
              <Text style={styles.infoText}>
                Tens dret a accedir, rectificar, suprimir, limitar el tractament, oposar-te i a la portabilitat de les teves dades. Pots exercir aquests drets contactant-nos a protecciodades@reuscomercifutur.com
              </Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={24} color={Colors.warning} />
            <Text style={styles.warningText}>
              Per poder utilitzar aquesta aplicació és obligatori acceptar la política de protecció de dades.
            </Text>
          </View>
        </View>

        <View style={styles.consentBox}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => {
              console.log('☑️ Checkbox premut, nou estat:', !accepted);
              setAccepted(!accepted);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkboxInner, accepted && styles.checkboxChecked]}>
              {accepted && <MaterialIcons name="check" size={20} color={Colors.white} />}
            </View>
            <Text style={styles.checkboxText}>
              He llegit i accepto la política de protecció de dades personals
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton, (!accepted || !user) && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={loading || !accepted || !user}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={24} color={Colors.white} />
                <Text style={styles.buttonText}>Acceptar i continuar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.9,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: FontSizes.sm,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.warning + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    marginTop: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  consentBox: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
});
