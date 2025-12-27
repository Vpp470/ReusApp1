import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface Promotion {
  _id: string;
  title: string;
  description: string;
  image_url: string;
  link_url?: string;
  status: string;
  created_at: string;
  valid_from: string;
  valid_until: string;
}

export default function PromotionsScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Verificar si l'usuari pot crear promocions
  const canCreatePromotions = user && ['admin', 'local_associat', 'entitat_colaboradora', 'membre_consell'].includes(user.role || '');

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const headers: any = {};
      if (token) {
        headers.Authorization = token;
      }

      const response = await api.get('/promotions', { headers });
      setPromotions(response.data);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPromotions();
  };

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <Pressable
      style={styles.promotionCard}
      onPress={() => router.push(`/promotions/${item._id}`)}
    >
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <MaterialIcons name="image" size={60} color={Colors.lightGray} />
          </View>
        )}
        {item.status === 'pending' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pendent</Text>
          </View>
        )}
        {item.status === 'rejected' && (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Text style={styles.statusText}>Rebutjada</Text>
          </View>
        )}
      </View>
      
      <View style={styles.promotionInfo}>
        <Text style={styles.promotionTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.promotionDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.footer}>
          <MaterialIcons name="access-time" size={14} color={Colors.textSecondary} />
          <Text style={styles.dateText}>
            Vàlid fins {new Date(item.valid_until).toLocaleDateString('ca-ES')}
          </Text>
        </View>
      </View>
    </Pressable>
  );

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
        <Text style={styles.headerTitle}>Promocions</Text>
        <MaterialIcons name="local-offer" size={28} color={Colors.white} />
      </View>

      {promotions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="card-giftcard" size={80} color={Colors.lightGray} />
          <Text style={styles.emptyText}>No hi ha promocions disponibles</Text>
        </View>
      ) : (
        <FlatList
          data={promotions}
          renderItem={renderPromotion}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}

      {/* Botó flotant per crear promoció (només per associats i admins) */}
      {canCreatePromotions && (
        <Pressable
          style={styles.fab}
          onPress={() => {
            if (user?.role === 'admin') {
              router.push('/admin/promotions');
            } else {
              router.push('/promotions/create');
            }
          }}
        >
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  listContainer: {
    padding: Spacing.sm,
    paddingBottom: 100, // Espai per al menú inferior
  },
  promotionCard: {
    flex: 1,
    margin: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4, // Format vertical 3x4
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
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  rejectedBadge: {
    backgroundColor: Colors.error,
  },
  statusText: {
    color: Colors.textDark, // Text fosc per badge dorat
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  promotionInfo: {
    padding: Spacing.md,
  },
  promotionTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text negre per targetes blanques
    marginBottom: Spacing.xs,
  },
  promotionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris fosc per targetes blanques
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris fosc per targetes blanques
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 90, // Espai per al menú inferior
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
