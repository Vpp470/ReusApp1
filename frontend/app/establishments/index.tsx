import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { establishmentsService } from '../../src/services/api';
import type { Establishment } from '../../src/types';
import { i18n } from '../../src/i18n';

export default function EstablishmentsDirectoryScreen() {
  const router = useRouter();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEstablishments();
  }, []);

  useEffect(() => {
    filterEstablishments();
  }, [searchQuery, establishments]);

  const loadEstablishments = async () => {
    try {
      const data = await establishmentsService.getAll();
      setEstablishments(data);
      setFilteredEstablishments(data);
    } catch (error) {
      console.error('Error loading establishments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEstablishments = () => {
    if (!searchQuery.trim()) {
      setFilteredEstablishments(establishments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = establishments.filter(
      (est) =>
        est.name.toLowerCase().includes(query) ||
        est.category?.toLowerCase().includes(query) ||
        est.address?.toLowerCase().includes(query)
    );
    setFilteredEstablishments(filtered);
  };

  const renderEstablishment = ({ item }: { item: Establishment }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/establishments/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Header amb logotip i nom */}
        <View style={styles.cardHeader}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.establishmentLogo} resizeMode="cover" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <MaterialIcons name="store" size={32} color={Colors.lightGray} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>
            {item.category && (
              <View style={styles.categoryBadge}>
                <MaterialIcons name="label" size={14} color={Colors.primary} />
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
        </View>

        {item.address && (
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}

        {item.phone && (
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.detailsLink}>Veure detalls</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregant establiments...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Directori d'Establiments</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('establishments.searchPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Results count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredEstablishments.length} {filteredEstablishments.length === 1 ? 'establiment' : 'establiments'}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredEstablishments}
        renderItem={renderEstablishment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No s\'han trobat establiments' : 'No hi ha establiments disponibles'}
            </Text>
          </View>
        }
      />
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
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  resultsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  resultsText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    fontWeight: '600',
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.background,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  establishmentLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  detailsLink: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
