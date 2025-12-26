import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { establishmentsService } from '../../src/services/api';
import type { Establishment } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

export default function EstablishmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
  
  // Comprovar si l'usuari pot veure el QR (admin o propietari)
  const canViewQR = user && establishment && (
    user.role === 'admin' || 
    user.establishment_id === establishment.id ||
    user.establishment_id === establishment._id
  );

  useEffect(() => {
    if (id) {
      loadEstablishment();
    }
  }, [id]);

  const loadEstablishment = async () => {
    try {
      const data = await establishmentsService.getById(id as string);
      setEstablishment(data);
    } catch (error) {
      console.error('Error loading establishment:', error);
      Alert.alert('Error', 'No s\'ha pogut carregar l\'establiment');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMap = () => {
    if (establishment?.latitude && establishment?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${establishment.latitude},${establishment.longitude}`;
      Linking.openURL(url);
    }
  };

  const handleCall = () => {
    if (establishment?.phone) {
      Linking.openURL(`tel:${establishment.phone}`);
    }
  };

  const handleEmail = () => {
    if (establishment?.email) {
      Linking.openURL(`mailto:${establishment.email}`);
    }
  };

  const handleOpenWebsite = () => {
    if (establishment?.website) {
      Linking.openURL(establishment.website);
    }
  };

  const handleOpenSocial = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  };

  if (!establishment) {
    return null;
  }

  const hasGallery = establishment.gallery && Array.isArray(establishment.gallery) && establishment.gallery.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {establishment.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Section amb Logo i Mapa petit */}
        <View style={styles.headerSection}>
          {/* Logo a l'esquerra */}
          <View style={styles.logoContainer}>
            {establishment.image_url ? (
              <Image source={{ uri: establishment.image_url }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="store" size={40} color={Colors.lightGray} />
              </View>
            )}
          </View>

          {/* Mapa petit a la dreta */}
          {establishment.latitude && establishment.longitude && (
            <Pressable style={styles.miniMapContainer} onPress={handleOpenMap}>
              <View style={styles.miniMapOverlay}>
                <MaterialIcons name="place" size={48} color={Colors.primary} />
                <Text style={styles.miniMapText}>Veure al mapa</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Category badge */}
        {establishment.category && (
          <View style={styles.categoryBadge}>
            <MaterialIcons name="label" size={16} color={Colors.primary} />
            <Text style={styles.categoryText}>{establishment.category}</Text>
          </View>
        )}

        {/* Name & Description */}
        <View style={styles.section}>
          <Text style={styles.title}>{establishment.name}</Text>
          {establishment.description && (
            <Text style={styles.description}>{establishment.description}</Text>
          )}
        </View>

        {/* Galeria d'Imatges */}
        {hasGallery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Galeria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {establishment.gallery.map((item: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.galleryItem}
                  onPress={() => setSelectedGalleryIndex(index)}
                >
                  <Image source={{ uri: item.image_url }} style={styles.galleryImage} />
                  {item.description && (
                    <View style={styles.galleryDescriptionContainer}>
                      <Text style={styles.galleryDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Vídeos */}
        {establishment.videos && Array.isArray(establishment.videos) && establishment.videos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="videocam" size={20} color={Colors.primary} /> Vídeos
            </Text>
            {establishment.videos.map((video: any, index: number) => (
              <TouchableOpacity
                key={`video-${index}`}
                style={styles.videoItem}
                onPress={() => {
                  if (video.video_url) {
                    Linking.openURL(video.video_url);
                  }
                }}
              >
                <View style={styles.videoThumbnail}>
                  <MaterialIcons name="play-circle-filled" size={48} color={Colors.primary} />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>Vídeo {index + 1}</Text>
                  {video.description && (
                    <Text style={styles.videoDescription} numberOfLines={2}>
                      {video.description}
                    </Text>
                  )}
                </View>
                <MaterialIcons name="open-in-new" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informació de Contacte</Text>

          {establishment.address && (
            <Pressable style={styles.infoItem} onPress={handleOpenMap}>
              <MaterialIcons name="location-on" size={24} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Adreça</Text>
                <Text style={styles.infoValue}>{establishment.address}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
            </Pressable>
          )}

          {establishment.phone && (
            <Pressable style={styles.infoItem} onPress={handleCall}>
              <MaterialIcons name="phone" size={24} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telèfon</Text>
                <Text style={styles.infoValue}>{establishment.phone}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
            </Pressable>
          )}

          {establishment.email && (
            <Pressable style={styles.infoItem} onPress={handleEmail}>
              <MaterialIcons name="email" size={24} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{establishment.email}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
            </Pressable>
          )}

          {establishment.website && (
            <Pressable style={styles.infoItem} onPress={handleOpenWebsite}>
              <MaterialIcons name="language" size={24} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Pàgina Web</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{establishment.website}</Text>
              </View>
              <MaterialIcons name="open-in-new" size={20} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Opening Hours */}
        {establishment.opening_hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horaris</Text>
            <View style={styles.hoursContainer}>
              <MaterialIcons name="access-time" size={24} color={Colors.primary} />
              <Text style={styles.hoursText}>{establishment.opening_hours}</Text>
            </View>
          </View>
        )}

        {/* Social Media */}
        {(establishment.facebook || establishment.instagram || establishment.twitter) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Xarxes Socials</Text>
            <View style={styles.socialContainer}>
              {establishment.facebook && (
                <Pressable
                  style={styles.socialButton}
                  onPress={() => handleOpenSocial(establishment.facebook)}
                >
                  <MaterialIcons name="facebook" size={32} color="#1877F2" />
                  <Text style={styles.socialLabel}>Facebook</Text>
                </Pressable>
              )}
              {establishment.instagram && (
                <Pressable
                  style={styles.socialButton}
                  onPress={() => handleOpenSocial(establishment.instagram)}
                >
                  <MaterialIcons name="photo-camera" size={32} color="#E4405F" />
                  <Text style={styles.socialLabel}>Instagram</Text>
                </Pressable>
              )}
              {establishment.twitter && (
                <Pressable
                  style={styles.socialButton}
                  onPress={() => handleOpenSocial(establishment.twitter)}
                >
                  <MaterialIcons name="chat-bubble" size={32} color="#1DA1F2" />
                  <Text style={styles.socialLabel}>Twitter</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* QR Code Section (només per admin o propietari) */}
        {canViewQR && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Codi QR</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={`https://www.reusapp.com/establishments/${establishment.id || establishment._id}`}
                size={200}
              />
              <Text style={styles.qrText}>
                Escaneja aquest codi per veure l'establiment
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {establishment.latitude && establishment.longitude && (
            <Pressable style={styles.actionButton} onPress={handleOpenMap}>
              <MaterialIcons name="directions" size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Com arribar</Text>
            </Pressable>
          )}

          {establishment.phone && (
            <Pressable style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleCall}>
              <MaterialIcons name="phone" size={24} color={Colors.primary} />
              <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Trucar</Text>
            </Pressable>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  miniMapContainer: {
    flex: 1,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  miniMap: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray,
  },
  miniMapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  miniMapText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  galleryScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  galleryItem: {
    width: 180,
    marginRight: Spacing.md,
  },
  galleryImage: {
    width: 180,
    height: 320, // Aspect ratio 9:16
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
  },
  galleryDescriptionContainer: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  galleryDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    lineHeight: 18,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '500',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  hoursText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 22,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  socialButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  socialLabel: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  qrText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  actionButtonTextSecondary: {
    color: Colors.primary,
  },
});
