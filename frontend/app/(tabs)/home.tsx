import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { offersService, eventsService } from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import type { Offer, Event } from '../../src/types';
import i18n from '../../src/i18n';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 60) / 3;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [offersData, eventsData] = await Promise.all([
        offersService.getAll(),
        eventsService.getAll(),
      ]);
      setOffers(offersData.slice(0, 3));
      setEvents(eventsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const menuItems = [
    { id: 'scan', icon: 'qr-code-scanner', title: i18n.t('scanner.title'), route: '/(tabs)/scanner', color: Colors.primary },
    { id: 'directory', icon: 'store', title: 'Directori', route: '/establishments', color: Colors.secondary },
    { id: 'club', icon: 'stars', title: 'Club El Tomb', route: '/club', color: Colors.accent },
    { id: 'territory', icon: 'article', title: 'Reus i Territori', route: '/(tabs)/news', color: Colors.primary },
    { id: 'map', icon: 'map', title: 'Mapa', route: '/(tabs)/map', color: Colors.secondary },
    { id: 'offers', icon: 'local-offer', title: i18n.t('offers.title'), route: '/(tabs)/offers', color: Colors.accent },
    { id: 'giftcards', icon: 'card-giftcard', title: i18n.t('home.quickActions.giftCards'), route: '/gift-cards/purchase', color: Colors.primary },
    { id: 'profile', icon: 'person', title: i18n.t('profile.title'), route: '/(tabs)/profile', color: Colors.secondary },
    { id: 'info', icon: 'info', title: 'Informació', route: '/info', color: Colors.accent },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/logo-rcf-horizontal.png')} 
          style={styles.logoHorizontal}
          resizeMode="contain"
        />
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <Pressable
            key={item.id}
            style={styles.menuCard}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <MaterialIcons name={item.icon as any} size={36} color={item.color} />
            </View>
            <Text style={styles.menuTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {offers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('home.featuredOffers')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/offers')}>
              <Text style={styles.seeAllText}>{i18n.t('home.seeAll')}</Text>
            </Pressable>
          </View>
          
          {offers.map((offer) => (
            <Pressable
              key={offer.id}
              style={styles.offerCard}
              onPress={() => router.push('/(tabs)/offers')}
            >
              <View style={styles.offerContent}>
                <MaterialIcons name="local-offer" size={20} color={Colors.primary} />
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle} numberOfLines={1}>
                    {offer.title}
                  </Text>
                  {offer.discount && (
                    <Text style={styles.offerDiscount}>{offer.discount}</Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('home.upcomingEvents')}</Text>
          </View>
          
          {events.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push('/club')}
            >
              <View style={styles.eventContent}>
                <MaterialIcons name="event" size={20} color={Colors.secondary} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventDate}>
                    {event.valid_until ? new Date(event.valid_until).toLocaleDateString(i18n.locale, {
                      day: 'numeric',
                      month: 'short',
                    }) : 'Data no disponible'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Fons verd metàl·lic
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  logo: {
    width: screenWidth * 0.85,
    height: screenHeight * 0.18,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  appIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text negre per llegibilitat
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary, // Gris clar per contrast
    fontWeight: '600',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
  },
  menuCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    backgroundColor: Colors.white, // Targetes blanques
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textDark, // Text negre per targetes blanques
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white, // Text blanc sobre fons verd
  },
  seeAllText: {
    fontSize: FontSizes.sm,
    color: Colors.accent, // Dorat
    fontWeight: '600',
  },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per targetes blanques
    flex: 1,
  },
  offerDiscount: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per targetes blanques
    flex: 1,
  },
  eventDate: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});
