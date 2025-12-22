import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { offersService } from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import type { Offer } from '../../src/types';

export default function OfferDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [id]);

  const loadOffer = async () => {
    try {
      if (id) {
        const data = await offersService.getById(id);
        setOffer(data);
      }
    } catch (error) {
      console.error('Error loading offer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Oferta no trobada</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Tornar</Text>
        </Pressable>
      </View>
    );
  }

  const validFrom = new Date(offer.valid_from);
  const validUntil = new Date(offer.valid_until);
  const isActive = new Date() >= validFrom && new Date() <= validUntil;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header con imagen */}
        {offer.image_url ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: offer.image_url }} style={styles.image} />
            <Pressable
              style={styles.magnifyButton}
              onPress={() => setShowImageModal(true)}
            >
              <MaterialIcons name="search" size={28} color={Colors.white} />
            </Pressable>
            <Pressable style={styles.backIconButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="local-offer" size={80} color={Colors.primary} />
            <Pressable style={styles.backIconButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={28} color={Colors.text} />
            </Pressable>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Title and status */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{offer.title}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Activa</Text>
              </View>
            )}
          </View>

          {/* Establishment */}
          {offer.establishment_id && (
            <View style={styles.infoRow}>
              <MaterialIcons name="store" size={20} color={Colors.textSecondary} />
              <Text style={styles.infoText}>Establiment: {offer.establishment_id}</Text>
            </View>
          )}

          {/* Discount */}
          {offer.discount && (
            <View style={styles.discountBanner}>
              <MaterialIcons name="sell" size={24} color={Colors.primary} />
              <Text style={styles.discountText}>{offer.discount}</Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripció</Text>
            <Text style={styles.description}>{offer.description}</Text>
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Validesa</Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>
                Des de: {validFrom.toLocaleDateString('ca-ES')}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>
                Fins: {validUntil.toLocaleDateString('ca-ES')}
              </Text>
            </View>
          </View>

          {/* Web link */}
          {offer.web_link && (
            <Pressable
              style={styles.actionButton}
              onPress={() => Linking.openURL(offer.web_link!)}
            >
              <MaterialIcons name="language" size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Visitar web</Text>
            </Pressable>
          )}

          {/* Phone */}
          {offer.phone && (
            <Pressable
              style={[styles.actionButton, styles.phoneButton]}
              onPress={() => Linking.openURL(`tel:${offer.phone}`)}
            >
              <MaterialIcons name="phone" size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Trucar: {offer.phone}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Image modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <MaterialIcons name="close" size={32} color={Colors.white} />
          </Pressable>
          {offer.image_url && (
            <Image
              source={{ uri: offer.image_url }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    color: Colors.textDark,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  magnifyButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: Spacing.sm,
  },
  backIconButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginRight: Spacing.md,
  },
  activeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  activeBadgeText: {
    color: Colors.textDark,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: Spacing.xs,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  discountText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textDark,
    lineHeight: 24,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dateText: {
    fontSize: FontSizes.md,
    color: Colors.textDark,
    marginLeft: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  phoneButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: Colors.textDark,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: Spacing.sm,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
});
