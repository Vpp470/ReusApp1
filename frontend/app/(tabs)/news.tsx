import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import axios from 'axios';
import Constants from 'expo-constants';

const AGENDA_URL = 'https://www.reus.cat/agenda';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  created_at: string;
  is_automatic: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  valid_from: string;
  valid_until: string;
  image_url?: string;
  web_link?: string;
  phone?: string;
  facebook_link?: string;
  instagram_link?: string;
  twitter_link?: string;
  youtube_link?: string;
  linkedin_link?: string;
  tiktok_link?: string;
}

export default function NewsScreen() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [newsResponse, eventsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/news?limit=20`),
        axios.get(`${API_URL}/api/events`),
      ]);
      setNews(newsResponse.data);
      setEvents(eventsResponse.data);
    } catch (error) {
      console.error('Error carregant dades:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNews = loadData;

  const onRefresh = () => {
    setRefreshing(true);
    loadNews();
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

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <Pressable
      style={styles.newsCard}
      onPress={() => openLink(item.url)}
      activeOpacity={0.7}
    >
      <View style={styles.newsHeader}>
        <View style={styles.sourceContainer}>
          <MaterialIcons name="article" size={16} color={Colors.primary} />
          <Text style={styles.source}>{item.source}</Text>
        </View>
        {item.is_automatic && (
          <View style={styles.autoTag}>
            <MaterialIcons name="auto-awesome" size={12} color={Colors.primary} />
          </View>
        )}
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString('ca-ES', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <MaterialIcons name="open-in-new" size={16} color={Colors.textSecondary} />
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant notícies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reus i el Territori</Text>
      </View>

      {/* Enllaç permanent a l'agenda municipal */}
      <Pressable
        style={styles.agendaButton}
        onPress={() => openLink(AGENDA_URL)}
        activeOpacity={0.7}
      >
        <Image 
          source={require('../../assets/ajuntament-reus.png')} 
          style={styles.ajuntamentLogo}
          resizeMode="contain"
        />
        <Text style={styles.agendaText}>Agenda Municipal</Text>
        <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
      </Pressable>

      {/* Enllaç a la càmera en directe de la Plaça del Mercadal */}
      <Pressable
        style={styles.liveButton}
        onPress={() => openLink('https://youtu.be/L9HyLjRVN8E')}
        activeOpacity={0.7}
      >
        <MaterialIcons name="videocam" size={28} color={Colors.error} />
        <View style={styles.liveTextContainer}>
          <Text style={styles.liveText}>Plaça del Mercadal en Directe</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>DIRECTE</Text>
          </View>
        </View>
        <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
      </Pressable>

      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          events.length > 0 ? (
            <View style={styles.eventsSection}>
              <Text style={styles.sectionTitle}>Esdeveniments del Club El Tomb</Text>
              {events.map((event) => (
                <Pressable
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/events/${event.id}`)}
                  activeOpacity={0.7}
                >
                  {event.image_url && (
                    <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                  )}
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <MaterialIcons name="event" size={20} color={Colors.accent} />
                      <Text style={styles.eventDate}>
                        {new Date(event.valid_from).toLocaleDateString('ca-ES', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDescription} numberOfLines={2}>
                      {event.description}
                    </Text>
                    
                    {/* Enllaços web i xarxes socials */}
                    <View style={styles.eventLinks}>
                      {event.web_link && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={(e) => { e.stopPropagation(); openLink(event.web_link!); }}
                        >
                          <MaterialIcons name="language" size={20} color={Colors.primary} />
                          <Text style={styles.linkText}>Web</Text>
                        </TouchableOpacity>
                      )}
                      {event.facebook_link && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={(e) => { e.stopPropagation(); openLink(event.facebook_link!); }}
                        >
                          <MaterialIcons name="facebook" size={20} color="#1877F2" />
                        </TouchableOpacity>
                      )}
                      {event.instagram_link && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={(e) => { e.stopPropagation(); openLink(event.instagram_link!); }}
                        >
                          <MaterialIcons name="camera-alt" size={20} color="#E4405F" />
                        </TouchableOpacity>
                      )}
                      {event.twitter_link && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={(e) => { e.stopPropagation(); openLink(event.twitter_link!); }}
                        >
                          <MaterialIcons name="tag" size={20} color="#1DA1F2" />
                        </TouchableOpacity>
                      )}
                      {event.youtube_link && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={(e) => { e.stopPropagation(); openLink(event.youtube_link!); }}
                        >
                          <MaterialIcons name="play-circle-filled" size={20} color="#FF0000" />
                        </TouchableOpacity>
                      )}
                      {event.phone && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={(e) => { e.stopPropagation(); openLink(`tel:${event.phone}`); }}
                        >
                          <MaterialIcons name="phone" size={20} color={Colors.success} />
                          <Text style={styles.linkText}>{event.phone}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="article" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No hi ha notícies disponibles</Text>
            <Text style={styles.emptySubtext}>
              Les notícies s'actualitzen automàticament 3 vegades al dia
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
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  agendaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  ajuntamentLogo: {
    width: 32,
    height: 32,
  },
  agendaText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  liveTextContainer: {
    flex: 1,
  },
  liveText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  liveLabel: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    letterSpacing: 0.5,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  newsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  source: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  autoTag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  date: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  eventsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.md,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  eventContent: {
    padding: Spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  eventDate: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per targetes blanques
    marginBottom: Spacing.sm,
  },
  eventDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  eventLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  linkText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark,
    fontWeight: '500',
  },
});
