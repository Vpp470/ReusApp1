import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import ParticipantsMapModal from '../../src/components/ParticipantsMapModal';
import axios from 'axios';
import Constants from 'expo-constants';

interface Event {
  id: string;
  title: string;
  description: string;
  location?: string;
  valid_from: string;
  valid_until: string;
  image_url?: string;
  url?: string;
  organizer?: string;
  contact_email?: string;
  contact_phone?: string;
  participating_establishments?: string[];
}

interface Establishment {
  _id: string;
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/events/${id}`);
      setEvent(response.data);
      
      // Carregar establiments participants si n'hi ha
      if (response.data.participating_establishments && response.data.participating_establishments.length > 0) {
        await loadParticipants(response.data.participating_establishments);
      }
    } catch (error) {
      console.error('Error carregant esdeveniment:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (participantIds: string[]) => {
    try {
      const establishmentsResponse = await axios.get(`${API_URL}/api/establishments`);
      const allEstablishments = establishmentsResponse.data;
      
      // Filtrar només els participants d'aquest esdeveniment
      const eventParticipants = allEstablishments.filter((est: Establishment) => 
        participantIds.includes(est._id) || participantIds.includes(est.id)
      );
      
      setParticipants(eventParticipants);
    } catch (error) {
      console.error('Error carregant participants:', error);
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant esdeveniment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Esdeveniment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="event-busy" size={80} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Esdeveniment no trobat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Esdeveniment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {event.image_url && (
          <Image source={{ uri: event.image_url }} style={styles.eventImage} />
        )}

        <View style={styles.content}>
          <View style={styles.categoryBadge}>
            <MaterialIcons name="event" size={18} color={Colors.accent} />
            <Text style={styles.categoryText}>Club El Tomb</Text>
          </View>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.dateContainer}>
            <View style={styles.dateRow}>
              <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
              <Text style={styles.dateLabel}>Inici:</Text>
              <Text style={styles.dateText}>
                {new Date(event.valid_from).toLocaleDateString('ca-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={20} color={Colors.primary} />
              <Text style={styles.dateLabel}>Fi:</Text>
              <Text style={styles.dateText}>
                {new Date(event.valid_until).toLocaleDateString('ca-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {event.location && (
            <View style={styles.infoRow}>
              <MaterialIcons name="place" size={24} color={Colors.primary} />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          )}

          {event.organizer && (
            <View style={styles.infoRow}>
              <MaterialIcons name="group" size={24} color={Colors.primary} />
              <Text style={styles.infoText}>{event.organizer}</Text>
            </View>
          )}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Descripció</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {(event.contact_email || event.contact_phone) && (
            <View style={styles.contactSection}>
              <Text style={styles.sectionTitle}>Informació de contacte</Text>
              
              {event.contact_email && (
                <Pressable
                  style={styles.contactButton}
                  onPress={() => openLink(`mailto:${event.contact_email}`)}
                >
                  <MaterialIcons name="email" size={24} color={Colors.primary} />
                  <Text style={styles.contactText}>{event.contact_email}</Text>
                </Pressable>
              )}

              {event.contact_phone && (
                <Pressable
                  style={styles.contactButton}
                  onPress={() => openLink(`tel:${event.contact_phone}`)}
                >
                  <MaterialIcons name="phone" size={24} color={Colors.primary} />
                  <Text style={styles.contactText}>{event.contact_phone}</Text>
                </Pressable>
              )}
            </View>
          )}

          {participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>
                Locals Participants ({participants.length})
              </Text>
              
              {/* Botó per obrir el mapa */}
              <Pressable
                style={styles.mapButton}
                onPress={() => setShowMap(true)}
              >
                <MaterialIcons name="map" size={24} color={Colors.white} />
                <Text style={styles.mapButtonText}>Veure mapa dels participants</Text>
              </Pressable>

              {/* Llista de participants */}
              {participants.map((participant) => (
                <Pressable
                  key={participant._id}
                  style={styles.participantCard}
                  onPress={() => router.push(`/establishments/${participant.id || participant._id}`)}
                >
                  {participant.image_url && (
                    <Image 
                      source={{ uri: participant.image_url }} 
                      style={styles.participantImage}
                    />
                  )}
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{participant.name}</Text>
                    {participant.address && (
                      <View style={styles.participantAddress}>
                        <MaterialIcons name="place" size={16} color={Colors.textSecondary} />
                        <Text style={styles.participantAddressText}>{participant.address}</Text>
                      </View>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          )}

          {event.url && (
            <Pressable
              style={styles.linkButton}
              onPress={() => openLink(event.url!)}
            >
              <MaterialIcons name="link" size={24} color={Colors.white} />
              <Text style={styles.linkButtonText}>Més informació</Text>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Modal del mapa de participants */}
      {showMap && participants.length > 0 && (
        <ParticipantsMapModal
          visible={showMap}
          onClose={() => setShowMap(false)}
          participantIds={participants.map(p => p._id || p.id)}
          allEstablishments={participants}
          eventId={id}
          onEstablishmentPress={(id) => {
            setShowMap(false);
            router.push(`/establishments/${id}`);
          }}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: "rgba(255, 255, 255, 0.7)",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.lg,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  eventImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  content: {
    padding: Spacing.lg,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.lg,
    lineHeight: 32,
  },
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: "rgba(255, 255, 255, 0.7)",
  },
  dateText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  descriptionSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 24,
  },
  contactSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  contactText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  linkButtonText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
  },
  participantsSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  mapButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  participantImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  participantAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  participantAddressText: {
    fontSize: FontSizes.sm,
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
  },
});
