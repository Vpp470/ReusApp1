import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import axios from 'axios';
import Constants from 'expo-constants';

interface Establishment {
  _id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export default function MapScreen() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    try {
      const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      'https://www.reusapp.com';
      
      const response = await axios.get(`${API_URL}/api/establishments`);
      const data = response.data;
      
      console.log(`📊 Loaded ${data.length} establishments from API`);
      
      const withCoords = data.filter((est: Establishment) => est.latitude && est.longitude);
      console.log(`📍 ${withCoords.length} establishments have coordinates`);
      
      setEstablishments(withCoords);
      
      if (withCoords.length === 0) {
        setError('No hi ha establiments amb coordenades per mostrar al mapa');
      }
    } catch (error) {
      console.error('Error loading establishments:', error);
      setError('No s\'han pogut carregar els establiments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (establishments.length > 0 && typeof window !== 'undefined') {
      // Carregar Leaflet només al navegador
      const script1 = document.createElement('script');
      script1.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script1.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script1.crossOrigin = '';
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      
      document.head.appendChild(link);
      document.body.appendChild(script1);
      
      script1.onload = () => {
        initializeMap();
      };
    }
  }, [establishments]);

  const initializeMap = () => {
    if (typeof window === 'undefined' || !(window as any).L) return;
    
    const L = (window as any).L;
    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement) return;

    // Inicialitzar mapa centrat a Reus
    const map = L.map('leaflet-map').setView([41.1556, 1.1064], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Afegir marcadors
    establishments.forEach((est) => {
      if (est.latitude && est.longitude) {
        const marker = L.marker([est.latitude, est.longitude])
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: ${Colors.primary};">${est.name}</h3>
              ${est.address ? `<p style="margin: 4px 0;"><strong>📍</strong> ${est.address}</p>` : ''}
              ${est.category ? `<p style="margin: 4px 0;"><strong>🏷️</strong> ${est.category}</p>` : ''}
              ${est.phone ? `<p style="margin: 4px 0;"><strong>📞</strong> ${est.phone}</p>` : ''}
            </div>
          `);
        
        marker.on('click', () => {
          setSelectedEstablishment(est);
        });
      }
    });

    console.log('✅ Map initialized with', establishments.length, 'markers');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant mapa...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEstablishments}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div id="leaflet-map" style={{ width: '100%', height: '100%' }} />
      
      {selectedEstablishment && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedEstablishment(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedEstablishment.name}</Text>
                <TouchableOpacity onPress={() => setSelectedEstablishment(null)}>
                  <MaterialIcons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                {selectedEstablishment.category && (
                  <View style={styles.modalRow}>
                    <MaterialIcons name="category" size={20} color={Colors.primary} />
                    <Text style={styles.modalLabel}>Categoria:</Text>
                    <Text style={styles.modalValue}>{selectedEstablishment.category}</Text>
                  </View>
                )}
                
                {selectedEstablishment.address && (
                  <View style={styles.modalRow}>
                    <MaterialIcons name="place" size={20} color={Colors.primary} />
                    <Text style={styles.modalLabel}>Adreça:</Text>
                    <Text style={styles.modalValue}>{selectedEstablishment.address}</Text>
                  </View>
                )}
                
                {selectedEstablishment.phone && (
                  <View style={styles.modalRow}>
                    <MaterialIcons name="phone" size={20} color={Colors.primary} />
                    <Text style={styles.modalLabel}>Telèfon:</Text>
                    <Text style={styles.modalValue}>{selectedEstablishment.phone}</Text>
                  </View>
                )}
                
                {selectedEstablishment.description && (
                  <View style={styles.modalRow}>
                    <MaterialIcons name="info" size={20} color={Colors.primary} />
                    <Text style={styles.modalLabel}>Descripció:</Text>
                    <Text style={styles.modalValue}>{selectedEstablishment.description}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
  },
  modalValue: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    flex: 1,
  },
});
