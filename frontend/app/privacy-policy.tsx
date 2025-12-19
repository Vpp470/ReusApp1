import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../src/constants/colors';
import { useAuthStore } from '../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [privacyText, setPrivacyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [consentHistory, setConsentHistory] = useState<any[]>([]);

  useEffect(() => {
    loadPrivacyPolicy();
    if (user && token) {
      loadConsentHistory();
    }
  }, [user, token]);

  const loadPrivacyPolicy = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/privacy-policy`);
      setPrivacyText(response.data.text);
    } catch (error) {
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConsentHistory = async () => {
    if (!user || !token) return;
    
    try {
      const response = await axios.get(
        `${API_URL}/api/consent-history/${user.id}`,
        { headers: { Authorization: token } }
      );
      setConsentHistory(response.data);
    } catch (error) {
      console.error('Error loading consent history:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Protecció de Dades</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="security" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Política de Protecció de Dades</Text>
          <Text style={styles.policyText}>{privacyText}</Text>
        </View>

        {user && consentHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historial de Consentiments</Text>
            {consentHistory.map((consent, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <MaterialIcons
                    name={consent.consent_given ? 'check-circle' : 'cancel'}
                    size={24}
                    color={consent.consent_given ? Colors.success : Colors.error}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyStatus}>
                    {consent.consent_given ? 'Consentiment Donat' : 'Consentiment Revocat'}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(consent.created_at).toLocaleString('ca-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Per exercir els teus drets de protecció de dades (accés, rectificació, supressió, etc.),
            pots contactar-nos a protecciodades@eltombdereus.com
          </Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.white, // Text blanc sobre header verd
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Espai suficient per veure l'infoBox al final
  },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per targeta blanca
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  policyText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per targeta blanca
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per targeta blanca
    marginBottom: Spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  historyIcon: {
    marginRight: Spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyStatus: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per targeta blanca
  },
  historyDate: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per targeta blanca
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per info box blanc
    marginLeft: Spacing.sm,
    lineHeight: 20,
  },
});
