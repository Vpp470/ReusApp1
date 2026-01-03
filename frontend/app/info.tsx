import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Linking,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/constants/colors';
import axios from 'axios';
import Constants from 'expo-constants';

export default function InfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    establishments: 0,
    offers: 0,
    events: 0,
  });

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Carregar estadístiques
      const [establishmentsRes, eventsRes] = await Promise.all([
        axios.get(`${API_URL}/api/establishments`),
        axios.get(`${API_URL}/api/events`),
      ]);
      
      setStats({
        establishments: establishmentsRes.data.length || 0,
        offers: 0, // Les promocions estan protegides per auth
        events: eventsRes.data.length || 0,
      });
    } catch (error) {
      console.error('Error carregant estadístiques:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const openWebsite = () => {
    Linking.openURL('https://www.eltombdereus.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>REUS COMERÇ i FUTUR</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: '/assets/logo-tomb.png' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>Què és REUS COMERÇ i FUTUR?</Text>
          
          <Text style={styles.aboutText}>
            REUS COMERÇ i FUTUR és una associació que agrupa les botigues del centre de Reus 
            amb l'objectiu de potenciar i promocionar el comerç i la restauració locals, 
            contribuint així a una ciutat més compacta i sostenible.
          </Text>
          
          <Text style={styles.aboutText}>
            Defensem un model de comerç de proximitat, amb una identitat pròpia i distintiva, 
            i treballem per fer-lo més visible i atractiu.
          </Text>
        </View>

        {/* Stats Section */}
        {!loading && (
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.establishments}</Text>
              <Text style={styles.statLabel}>Establiments</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.offers}</Text>
              <Text style={styles.statLabel}>Ofertes Actives</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.events}</Text>
              <Text style={styles.statLabel}>Esdeveniments</Text>
            </View>
          </View>
        )}

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <TouchableOpacity style={styles.websiteButton} onPress={openWebsite}>
            <MaterialIcons name="language" size={24} color={Colors.white} />
            <Text style={styles.websiteButtonText}>Visita la nostra web</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
  },
  logoImage: {
    width: 250,
    height: 100,
  },
  aboutSection: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  aboutText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    lineHeight: 24,
    marginBottom: Spacing.md,
    textAlign: 'justify',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
  },
  statCard: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  statNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
  },
  contactSection: {
    padding: Spacing.xl,
    marginTop: Spacing.md,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  websiteButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
