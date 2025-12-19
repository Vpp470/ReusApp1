import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { promotionsService } from '../../src/services/api';
import type { Promotion } from '../../src/types';

export default function PromotionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotion();
  }, [id]);

  const loadPromotion = async () => {
    try {
      console.log('Loading promotion with ID:', id);
      const data = await promotionsService.getById(id as string);
      console.log('Promotion data received:', data);
      setPromotion(data);
    } catch (error) {
      console.error('Error loading promotion:', error);
      Alert.alert('Error', 'No s\'ha pogut carregar la promoció');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = () => {
    if (promotion?.link_url) {
      Linking.openURL(promotion.link_url).catch(() => {
        Alert.alert('Error', 'No s\'ha pogut obrir l\'enllaç');
      });
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

  if (!promotion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <MaterialIcons name="error-outline" size={80} color={Colors.lightGray} />
          <Text style={styles.errorText}>Promoció no trobada</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Tornar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const validFrom = new Date(promotion.valid_from);
  const validUntil = new Date(promotion.valid_until);
  const isActive = new Date() >= validFrom && new Date() <= validUntil;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Detall Promoció</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Imatge principal */}
        <View style={styles.imageContainer}>
          {promotion.image_url ? (
            <Image source={{ uri: promotion.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <MaterialIcons name="image" size={100} color={Colors.lightGray} />
            </View>
          )}
          
          {/* Badge d'estat si no és aprovada */}
          {promotion.status === 'pending' && (
            <View style={styles.statusBadge}>
              <MaterialIcons name="schedule" size={20} color={Colors.white} />
              <Text style={styles.statusText}>Pendent d'aprovació</Text>
            </View>
          )}
          {promotion.status === 'rejected' && (
            <View style={[styles.statusBadge, styles.rejectedBadge]}>
              <MaterialIcons name="cancel" size={20} color={Colors.white} />
              <Text style={styles.statusText}>Rebutjada</Text>
            </View>
          )}
        </View>

        {/* Informació */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{promotion.title}</Text>

          {/* Dates de validesa */}
          <View style={styles.validityCard}>
            <View style={styles.validityRow}>
              <MaterialIcons name="event" size={20} color={Colors.primary} />
              <View style={styles.validityInfo}>
                <Text style={styles.validityLabel}>Vàlid des de:</Text>
                <Text style={styles.validityDate}>
                  {validFrom.toLocaleDateString('ca-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.validityRow}>
              <MaterialIcons name="event" size={20} color={Colors.error} />
              <View style={styles.validityInfo}>
                <Text style={styles.validityLabel}>Vàlid fins:</Text>
                <Text style={styles.validityDate}>
                  {validUntil.toLocaleDateString('ca-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
            
            {isActive ? (
              <View style={styles.activeIndicator}>
                <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                <Text style={styles.activeText}>Activa ara</Text>
              </View>
            ) : (
              <View style={[styles.activeIndicator, styles.inactiveIndicator]}>
                <MaterialIcons name="cancel" size={16} color={Colors.error} />
                <Text style={styles.inactiveText}>No activa</Text>
              </View>
            )}
          </View>

          {/* Descripció */}
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Descripció</Text>
            <Text style={styles.description}>{promotion.description}</Text>
          </View>

          {/* Motiu de rebuig si existeix */}
          {promotion.status === 'rejected' && promotion.rejection_reason && (
            <View style={styles.rejectionCard}>
              <View style={styles.rejectionHeader}>
                <MaterialIcons name="info" size={24} color={Colors.error} />
                <Text style={styles.rejectionTitle}>Motiu del rebuig</Text>
              </View>
              <Text style={styles.rejectionReason}>{promotion.rejection_reason}</Text>
            </View>
          )}

          {/* Botó d'acció si té enllaç */}
          {promotion.link_url && promotion.status === 'approved' && (
            <Pressable style={styles.actionButton} onPress={handleOpenLink}>
              <Text style={styles.actionButtonText}>Més informació</Text>
              <MaterialIcons name="open-in-new" size={20} color={Colors.white} />
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
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rejectedBadge: {
    backgroundColor: Colors.error,
  },
  statusText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  infoContainer: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.lg,
  },
  validityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  validityInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  validityLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  validityDate: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginTop: 2,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  inactiveIndicator: {
    backgroundColor: Colors.error + '20',
  },
  activeText: {
    color: Colors.success,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  inactiveText: {
    color: Colors.error,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  descriptionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 24,
  },
  rejectionCard: {
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rejectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  rejectionReason: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginRight: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  backButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
