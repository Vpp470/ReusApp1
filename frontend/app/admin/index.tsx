import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

export default function AdminDashboard() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [pendingPromotions, setPendingPromotions] = useState(0);

  useEffect(() => {
    loadPendingPromotions();
  }, []);

  const loadPendingPromotions = async () => {
    try {
      const response = await api.get('/promotions', {
        headers: { Authorization: token },
      });
      const pending = response.data.filter((p: any) => p.status === 'pending');
      setPendingPromotions(pending.length);
    } catch (error) {
      console.error('Error loading pending promotions:', error);
    }
  };

  const adminSections = [
    {
      title: 'Gestió de Continguts',
      items: [
        {
          icon: 'store',
          label: 'Establiments',
          route: '/admin/establishments',
          color: Colors.primary,
        },
        {
          icon: 'local-offer',
          label: 'Promocions',
          route: '/admin/promotions',
          color: Colors.secondary,
        },
        {
          icon: 'event',
          label: 'Esdeveniments',
          route: '/admin/events',
          color: Colors.success,
        },
        {
          icon: 'article',
          label: 'Notícies',
          route: '/admin/news',
          color: Colors.accent,
        },
        {
          icon: 'stars',
          label: 'Club El Tomb',
          route: '/admin/club',
          color: Colors.primary,
        },
        {
          icon: 'info',
          label: 'Informació',
          route: '/admin/info',
          color: Colors.accent,
        },
        {
          icon: 'confirmation-number',
          label: 'Campanyes Tiquets',
          route: '/admin/ticket-campaigns',
          color: Colors.primary,
        },
        {
          icon: 'casino',
          label: 'Sortejos',
          route: '/admin/draws',
          color: Colors.warning,
        },
      ],
    },
    {
      title: 'Gestió d\'Usuaris',
      items: [
        {
          icon: 'people',
          label: 'Usuaris',
          route: '/admin/users',
          color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
        },
        {
          icon: 'business',
          label: 'Assignar Establiments',
          route: '/admin/ownership',
          color: Colors.primary,
        },
        {
          icon: 'label',
          label: 'Marcadors',
          route: '/admin/tags',
          color: Colors.primary,
        },
        {
          icon: 'card-giftcard',
          label: 'Targetes Regal',
          route: '/admin/gift-cards',
          color: Colors.accent,
        },
        {
          icon: 'notifications',
          label: 'Notificacions Push',
          route: '/admin/notifications',
          color: Colors.error,
        },
      ],
    },
    {
      title: 'Estadístiques',
      items: [
        {
          icon: 'analytics',
          label: 'Estadístiques',
          route: '/admin/stats',
          color: Colors.primary,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Backoffice Admin</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeCard}>
          <MaterialIcons name="admin-panel-settings" size={48} color={Colors.primary} />
          <Text style={styles.welcomeTitle}>Benvingut al Backoffice</Text>
          <Text style={styles.welcomeSubtitle}>
            Gestiona tots els continguts de l'aplicació
          </Text>
        </View>

        {adminSections.map((section, sectionIdx) => (
          <View key={sectionIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map((item, itemIdx) => (
                <Pressable
                  key={itemIdx}
                  style={[styles.card, { borderLeftColor: item.color }]}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                    <MaterialIcons name={item.icon as any} size={32} color={item.color} />
                    {item.label === 'Promocions' && pendingPromotions > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingPromotions}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={Colors.gray} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Secció de Manteniment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Manteniment</Text>
          <Pressable
            style={[styles.maintenanceCard, fixingSpelling && styles.maintenanceCardDisabled]}
            onPress={fixHosteleriaSpelling}
            disabled={fixingSpelling}
          >
            <View style={styles.maintenanceContent}>
              <MaterialIcons name="spellcheck" size={32} color="#FF9800" />
              <View style={styles.maintenanceText}>
                <Text style={styles.maintenanceTitle}>Corregir "Hostalería"</Text>
                <Text style={styles.maintenanceSubtitle}>
                  Canvia "Hostalería" per "Hostelería" a tots els establiments
                </Text>
              </View>
            </View>
            {fixingSpelling ? (
              <ActivityIndicator size="small" color="#FF9800" />
            ) : (
              <MaterialIcons name="play-arrow" size={24} color="#FF9800" />
            )}
          </Pressable>
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
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
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
  welcomeCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginTop: Spacing.md,
  },
  welcomeSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  maintenanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  maintenanceCardDisabled: {
    opacity: 0.7,
  },
  maintenanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  maintenanceText: {
    flex: 1,
  },
  maintenanceTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
  },
  maintenanceSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 4,
  },
});
