import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/constants/colors';
import axios from 'axios';
import Constants from 'expo-constants';

// Informació del Club (xarxes socials i web)
const CLUB_INFO = {
  web: 'https://www.eltombdereus.cat',
  facebook: 'https://www.facebook.com/eltombdereus',
  instagram: 'https://www.instagram.com/eltombdereus',
  twitter: 'https://twitter.com/eltombdereus',
};

interface ClubContent {
  id: string;
  title: string;
  url?: string;
  description?: string;
  image?: string;
  publish_date?: string;
  expiry_date?: string;
  category: string;
}

export default function ClubScreen() {
  const router = useRouter();
  const [content, setContent] = useState<ClubContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/club/content`);
      setContent(response.data);
    } catch (error) {
      console.error('Error carregant contingut:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadContent();
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error obrint enllaç:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Club El Tomb</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Banner del Club amb Logo */}
        <View style={styles.banner}>
          <Image 
            source={require('../assets/images/logo-rcf.png')} 
            style={styles.bannerLogo}
            resizeMode="contain"
          />
          <Text style={styles.bannerSubtitle}>
            Gaudeix d'avantatges exclusius al comerç local
          </Text>
        </View>

        {/* Xarxes Socials */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>Segueix-nos</Text>
          <View style={styles.socialButtons}>
            <Pressable
              style={[styles.socialButton, { backgroundColor: '#3b5998' }]}
              onPress={() => openLink(CLUB_INFO.facebook)}
            >
              <MaterialIcons name="facebook" size={24} color={Colors.white} />
            </Pressable>
            <Pressable
              style={[styles.socialButton, { backgroundColor: '#E1306C' }]}
              onPress={() => openLink(CLUB_INFO.instagram)}
            >
              <MaterialIcons name="photo-camera" size={24} color={Colors.white} />
            </Pressable>
            <Pressable
              style={[styles.socialButton, { backgroundColor: '#1DA1F2' }]}
              onPress={() => openLink(CLUB_INFO.twitter)}
            >
              <MaterialIcons name="alternate-email" size={24} color={Colors.white} />
            </Pressable>
            <Pressable
              style={[styles.socialButton, { backgroundColor: Colors.primary }]}
              onPress={() => openLink(CLUB_INFO.web)}
            >
              <MaterialIcons name="language" size={24} color={Colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Proposta Escaneja Tiquets */}
        <Pressable
          style={styles.scanProposal}
          onPress={() => router.push('/tickets/scan')}
          activeOpacity={0.7}
        >
          <View style={styles.scanIcon}>
            <MaterialIcons name="confirmation-number" size={32} color={Colors.white} />
          </View>
          <View style={styles.scanContent}>
            <Text style={styles.scanTitle}>Escaneja Tiquets i Guanya Premis</Text>
            <Text style={styles.scanSubtitle}>
              Per cada 10€ de compra als establiments socis, 1 participació al sorteig mensual
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={28} color={Colors.white} />
        </Pressable>

        {/* Continguts */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Activitats i Avantatges</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : content.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No hi ha contingut disponible</Text>
            </View>
          ) : (
            content.map((item) => {
              // Determinar si és un esdeveniment (té valid_from)
              const isEvent = 'valid_from' in item;
              // Usar image_url si existeix (esdeveniments), sinó image (contingut club)
              const imageUrl = (item as any).image_url || item.image;
              
              return (
                <Pressable
                  key={item.id}
                  style={styles.contentCard}
                  onPress={() => {
                    if (isEvent) {
                      router.push(`/events/${item.id}`);
                    } else if (item.url) {
                      openLink(item.url);
                    }
                  }}
                  activeOpacity={isEvent || item.url ? 0.7 : 1}
                >
                  {imageUrl && (
                    <Image source={{ uri: imageUrl }} style={styles.contentImage} />
                  )}
                  <View style={styles.contentBody}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                    <Text style={styles.contentTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.contentDescription}>{item.description}</Text>
                    )}
                    {item.url && !isEvent && (
                      <View style={styles.linkContainer}>
                        <Text style={styles.linkText}>Més informació</Text>
                        <MaterialIcons name="arrow-forward" size={16} color={Colors.primary} />
                      </View>
                    )}
                    {item.expiry_date && (
                      <Text style={styles.expiryText}>
                        Vàlid fins: {new Date(item.expiry_date).toLocaleDateString('ca-ES')}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  banner: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  bannerLogo: {
    width: 200,
    height: 200,
    marginBottom: Spacing.md,
  },
  bannerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
    opacity: 0.9,
  },
  socialSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  contentSection: {
    padding: Spacing.md,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.lightGray,
  },
  contentBody: {
    padding: Spacing.md,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contentTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  contentDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  linkText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  expiryText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: Spacing.md,
  },
  scanProposal: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  scanContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  scanTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  scanSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.9,
    lineHeight: 20,
  },
});
