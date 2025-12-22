import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

export default function ConsellDashboard() {
  const router = useRouter();

  const sections = [
    {
      icon: 'event-note',
      label: 'Agenda dels Actes Institucionals',
      description: 'Visualitza l\'agenda i membres assistents',
      route: '/consell/agenda',
      color: Colors.primary,
    },
    {
      icon: 'add-alert',
      label: 'Assumptes Sobrevinguts',
      description: 'Gestió d\'assumptes urgents',
      route: '/consell/assumptes',
      color: '#FF9800',
    },
    {
      icon: 'campaign',
      label: 'Campanyes Futures',
      description: 'Planificació de campanyes',
      route: '/consell/campanyes-futures',
      color: '#9C27B0',
    },
    {
      icon: 'account-balance',
      label: 'Estat de Comptes',
      description: 'Situació financera',
      route: '/consell/comptes',
      color: '#4CAF50',
    },
    {
      icon: 'shopping-cart',
      label: 'Campanyes Publicitàries Contractades',
      description: 'Gestió de campanyes en curs',
      route: '/consell/campanyes-contractades',
      color: '#2196F3',
    },
    {
      icon: 'description',
      label: 'Última Acta del Consell',
      description: 'Consulta l\'última acta aprovada',
      route: '/consell/acta',
      color: Colors.error,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Consell Rector</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <MaterialIcons name="gavel" size={48} color={Colors.primary} />
          <Text style={styles.welcomeTitle}>Benvingut al Consell</Text>
          <Text style={styles.welcomeText}>
            Accés exclusiu per a membres del consell rector d'REUS COMERÇ i FUTUR
          </Text>
        </View>

        <View style={styles.sectionsContainer}>
          {sections.map((section, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.card,
                { borderLeftColor: section.color, borderLeftWidth: 4 },
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(section.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: section.color + '20' }]}>
                <MaterialIcons name={section.icon as any} size={32} color={section.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>{section.label}</Text>
                <Text style={styles.cardDescription}>{section.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
            </Pressable>
          ))}
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
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white, // Text blanc sobre header verd
  },
  backButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  welcomeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per targeta blanca
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per targeta blanca
    textAlign: 'center',
  },
  sectionsContainer: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per targeta blanca
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per targeta blanca
  },
});
