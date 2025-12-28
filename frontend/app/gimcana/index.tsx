/**
 * Pantalla principal de Gimcanes per a usuaris
 * Mostra les gimcanes actives i permet accedir als detalls
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/constants/colors';

interface GimcanaCampaign {
  _id: string;
  name: string;
  description: string;
  total_qr_codes: number;
  start_date: string;
  end_date: string;
  prize_type: 'direct' | 'raffle';
  prize_description: string;
  prize_image_url?: string;
  image_url?: string;
  raffle_date?: string;
  is_active: boolean;
  user_progress?: {
    scanned_count: number;
    completed: boolean;
    entered_raffle: boolean;
  };
}

export default function GimcanaUserPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<GimcanaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      // Les gimcanes actives són públiques, el token és opcional
      const headers: any = {};
      if (token) {
        headers.Authorization = token;
      }
      
      const response = await api.get('/gimcana/campaigns/active', { headers });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const renderCampaignCard = ({ item }: { item: GimcanaCampaign }) => {
    const progress = item.user_progress;
    const scannedCount = progress?.scanned_count || 0;
    const progressPercent = (scannedCount / item.total_qr_codes) * 100;
    const isCompleted = progress?.completed || false;

    return (
      <TouchableOpacity
        style={styles.campaignCard}
        onPress={() => router.push(`/gimcana/${item._id}`)}
        activeOpacity={0.8}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.campaignImage} />
        ) : (
          <View style={styles.campaignImagePlaceholder}>
            <MaterialIcons name="qr-code-2" size={40} color={Colors.primary} />
          </View>
        )}
        
        <View style={styles.campaignContent}>
          <View style={styles.campaignHeader}>
            <Text style={styles.campaignName} numberOfLines={1}>{item.name}</Text>
            {item.prize_type === 'direct' ? (
              <View style={[styles.prizeTypeBadge, { backgroundColor: '#4CAF50' }]}>
                <MaterialIcons name="card-giftcard" size={12} color={Colors.white} />
                <Text style={styles.prizeTypeText}>Premi directe</Text>
              </View>
            ) : (
              <View style={[styles.prizeTypeBadge, { backgroundColor: '#FF9800' }]}>
                <MaterialIcons name="emoji-events" size={12} color={Colors.white} />
                <Text style={styles.prizeTypeText}>Sorteig</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.campaignDescription} numberOfLines={2}>
            {item.description || item.prize_description}
          </Text>
          
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${progressPercent}%`,
                    backgroundColor: isCompleted ? '#4CAF50' : Colors.primary 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {scannedCount}/{item.total_qr_codes} QRs
            </Text>
          </View>
          
          {isCompleted && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.completedText}>
                {progress?.entered_raffle 
                  ? item.prize_type === 'raffle' 
                    ? 'Participant al sorteig!' 
                    : 'Premi obtingut!'
                  : 'Completada!'}
              </Text>
            </View>
          )}
          
          <View style={styles.dateRow}>
            <MaterialIcons name="event" size={14} color="#666" />
            <Text style={styles.dateText}>
              {formatDate(item.start_date)} - {formatDate(item.end_date)}
            </Text>
          </View>
        </View>
        
        <MaterialIcons name="chevron-right" size={24} color="#CCC" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gimcanes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant gimcanes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gimcanes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Banner per usuaris no registrats */}
      {!user && (
        <TouchableOpacity 
          style={styles.loginBanner}
          onPress={() => router.push('/auth/login')}
        >
          <MaterialIcons name="login" size={20} color={Colors.white} />
          <Text style={styles.loginBannerText}>
            Inicia sessió per participar i guanyar premis!
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.white} />
        </TouchableOpacity>
      )}

      {campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="qr-code-2" size={60} color="#CCC" />
          <Text style={styles.emptyTitle}>No hi ha gimcanes actives</Text>
          <Text style={styles.emptySubtitle}>
            Torna més tard per participar en noves gimcanes!
          </Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCampaignCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: '#666',
    fontSize: FontSizes.md,
  },
  listContent: {
    padding: Spacing.md,
  },
  campaignCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  campaignImage: {
    width: 100,
    height: '100%',
    minHeight: 140,
  },
  campaignImagePlaceholder: {
    width: 100,
    minHeight: 140,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  campaignContent: {
    flex: 1,
    padding: Spacing.md,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  campaignName: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: Spacing.xs,
  },
  prizeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  prizeTypeText: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '600',
  },
  campaignDescription: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.sm,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSizes.xs,
    color: '#666',
    fontWeight: '600',
    minWidth: 50,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  completedText: {
    fontSize: FontSizes.xs,
    color: '#4CAF50',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: '#666',
  },
  chevron: {
    alignSelf: 'center',
    marginRight: Spacing.sm,
  },
  separator: {
    height: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#333',
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: Spacing.lg,
  },
  loginSubtitle: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  loginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  loginBannerText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    flex: 1,
  },
});
