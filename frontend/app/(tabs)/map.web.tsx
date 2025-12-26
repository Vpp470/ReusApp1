import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import axios from 'axios';
import Constants from 'expo-constants';

interface Establishment {
  _id: string;
  id?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
}

export default function MapScreen() {
  const router = useRouter();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    loadEstablishments();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 User location obtained:', position.coords);
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get user location:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }
  };

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

  // Actualitzar marcador d'usuari quan canvia la ubicació
  useEffect(() => {
    if (userLocation && mapInstance && typeof window !== 'undefined') {
      const L = (window as any).L;
      if (L) {
        // Icona vermella per la ubicació de l'usuari
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background-color: #FF0000;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userIcon,
          zIndexOffset: 1000,
        })
          .addTo(mapInstance)
          .bindPopup('<strong>📍 La teva ubicació</strong>');

        console.log('✅ User location marker added');
      }
    }
  }, [userLocation, mapInstance]);

  const initializeMap = () => {
    if (typeof window === 'undefined' || !(window as any).L) return;
    
    const L = (window as any).L;
    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement) return;

    // Evitar reinicialitzar el mapa
    if ((mapElement as any)._leaflet_id) {
      return;
    }

    // Inicialitzar mapa centrat a Reus o a la ubicació de l'usuari
    const center = userLocation || { latitude: 41.1556, longitude: 1.1064 };
    const map = L.map('leaflet-map').setView([center.latitude, center.longitude], 15);
    setMapInstance(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Icona personalitzada per establiments
    const establishmentIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjMDA3QUZGIiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDEuNCAwLjIgMi44IDAuNyA0LjFMOC4zIDM1bC0wLjEgMC4xQzkuNCAzNy4xIDEwLjkgMzkgMTIuNSA0MWMxLjYtMiAzLjEtMy45IDQuMy02bC0wLjEtMC4xTDI0LjMgMTYuNmMwLjUtMS4zIDAuNy0yLjcgMC43LTQuMUMyNSA1LjYgMTkuNCAwIDEyLjUgMHpNMTIuNSAxN2MtMi41IDAtNC41LTItNC41LTQuNXMyLTQuNSA0LjUtNC41IDQuNSAyIDQuNSA0LjVTMTUgMTcgMTIuNSAxN3oiLz48L3N2Zz4=',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    // Afegir marcadors d'establiments
    establishments.forEach((est) => {
      if (est.latitude && est.longitude) {
        const marker = L.marker([est.latitude, est.longitude], { icon: establishmentIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px; font-family: sans-serif;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #7EB89E;">${est.name}</h3>
              ${est.category ? `<p style="margin: 4px 0; color: #666;"><strong>🏷️</strong> ${est.category}</p>` : ''}
              ${est.address ? `<p style="margin: 4px 0; color: #666;"><strong>📍</strong> ${est.address}</p>` : ''}
              ${est.phone ? `<p style="margin: 4px 0;"><strong>📞</strong> <a href="tel:${est.phone}" style="color: #4CAF50; text-decoration: none;">${est.phone}</a></p>` : ''}
              <button onclick="window.selectEstablishment('${est._id}')" 
                style="margin-top: 8px; padding: 8px 16px; background: #7EB89E; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                Veure detalls
              </button>
            </div>
          `);
        
        marker.on('click', () => {
          setSelectedEstablishment(est);
        });
      }
    });

    // Funció global per seleccionar establiment des del popup
    (window as any).selectEstablishment = (id: string) => {
      const est = establishments.find(e => e._id === id);
      if (est) {
        setSelectedEstablishment(est);
      }
    };

    // Afegir marcador d'ubicació d'usuari si disponible
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background-color: #FF0000;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup('<strong>📍 La teva ubicació</strong>');
    }

    console.log('✅ Map initialized with', establishments.length, 'markers');
  };

  const openMapsDirections = (establishment: Establishment) => {
    if (!establishment.latitude || !establishment.longitude) return;
    
    const destination = `${establishment.latitude},${establishment.longitude}`;
    let url = '';
    
    if (userLocation) {
      // Amb origen i destí
      const origin = `${userLocation.latitude},${userLocation.longitude}`;
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    } else {
      // Només destí
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    }
    
    window.open(url, '_blank');
  };

  const handlePhoneCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
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
      
      {/* Botó per centrar a la ubicació de l'usuari */}
      {userLocation && mapInstance && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            if (mapInstance && userLocation) {
              mapInstance.setView([userLocation.latitude, userLocation.longitude], 16);
            }
          }}
        >
          <MaterialIcons name="my-location" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}
      
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
                  <MaterialIcons name="close" size={24} color={Colors.textDark} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                {selectedEstablishment.category && (
                  <View style={styles.modalRow}>
                    <MaterialIcons name="category" size={20} color={Colors.primary} />
                    <Text style={styles.modalValue}>{selectedEstablishment.category}</Text>
                  </View>
                )}
                
                {selectedEstablishment.address && (
                  <TouchableOpacity 
                    style={styles.modalRow}
                    onPress={() => openMapsDirections(selectedEstablishment)}
                  >
                    <MaterialIcons name="place" size={20} color={Colors.primary} />
                    <Text style={[styles.modalValue, styles.linkText]}>{selectedEstablishment.address}</Text>
                  </TouchableOpacity>
                )}
                
                {selectedEstablishment.phone && (
                  <TouchableOpacity 
                    style={styles.modalRow}
                    onPress={() => handlePhoneCall(selectedEstablishment.phone!)}
                  >
                    <MaterialIcons name="phone" size={20} color={Colors.success} />
                    <Text style={[styles.modalValue, styles.phoneText]}>{selectedEstablishment.phone}</Text>
                    <MaterialIcons name="call" size={18} color={Colors.success} style={styles.callIcon} />
                  </TouchableOpacity>
                )}
                
                {selectedEstablishment.whatsapp && (
                  <TouchableOpacity 
                    style={styles.modalRow}
                    onPress={() => handleWhatsApp(selectedEstablishment.whatsapp!)}
                  >
                    <MaterialIcons name="chat" size={20} color="#25D366" />
                    <Text style={[styles.modalValue, { color: '#25D366' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                )}
                
                {selectedEstablishment.website && (
                  <TouchableOpacity 
                    style={styles.modalRow}
                    onPress={() => handleWebsite(selectedEstablishment.website!)}
                  >
                    <MaterialIcons name="language" size={20} color={Colors.primary} />
                    <Text style={[styles.modalValue, styles.linkText]}>Lloc web</Text>
                  </TouchableOpacity>
                )}
                
                {selectedEstablishment.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionText}>
                      {selectedEstablishment.description
                        .replace(/<\/?p[^>]*>/g, '')
                        .replace(/<\/?br[^>]*>/g, ' ')
                        .replace(/<\/?[a-z]+[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/\s+/g, ' ')
                        .trim()}
                    </Text>
                  </View>
                )}
              </ScrollView>
              
              {/* Botons d'acció */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={() => openMapsDirections(selectedEstablishment)}
                >
                  <MaterialIcons name="directions" size={20} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Com arribar</Text>
                </TouchableOpacity>
                
                {selectedEstablishment.phone && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => handlePhoneCall(selectedEstablishment.phone!)}
                  >
                    <MaterialIcons name="call" size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Trucar</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.detailsButton]}
                  onPress={() => {
                    setSelectedEstablishment(null);
                    router.push(`/establishments/${selectedEstablishment._id || selectedEstablishment.id}`);
                  }}
                >
                  <MaterialIcons name="info" size={20} color={Colors.primary} />
                  <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Detalls</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#f5f5f5', // Fons clar per al mapa
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.darkGray,
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
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    paddingBottom: 100,
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
    maxHeight: 300,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalValue: {
    fontSize: FontSizes.md,
    color: Colors.darkGray,
    marginLeft: Spacing.md,
    flex: 1,
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  phoneText: {
    color: Colors.success,
    fontWeight: '600',
  },
  callIcon: {
    marginLeft: Spacing.sm,
  },
  descriptionContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  descriptionText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  directionsButton: {
    backgroundColor: Colors.primary,
  },
  callButton: {
    backgroundColor: Colors.success,
  },
  detailsButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
