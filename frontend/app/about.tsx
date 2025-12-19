import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/constants/colors';
import i18n from '../src/i18n';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{i18n.t('about.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo-tomb.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.sectionTitle}>REUS COMERÇ i FUTUR</Text>
          <Text style={styles.text}>
            REUS COMERÇ i FUTUR és una associació que agrupa més de 250 establiments del centre de Reus, amb l'objectiu comú de promocionar el comerç de proximitat i oferir una experiència de compra única als nostres ciutadans.
          </Text>
          <Text style={styles.text}>
            Treballem per mantenir viu el cor comercial de Reus, organitzant campanyes promocionals, esdeveniments especials i oferint avantatges exclusius als nostres clients.
          </Text>
          
          <Text style={styles.sectionTitle}>Què oferim</Text>
          <Text style={styles.text}>
            Com a soci d'El Tomb, els nostres establiments compten amb suport promocional, visibilitat a través dels nostres canals digitals, participació en esdeveniments col·lectius i formació contínua per adaptar-se als nous temps.
          </Text>
          <Text style={styles.text}>
            Els consumidors poden gaudir d'ofertes exclusives, descobrir nous negocis i rebre informació actualitzada sobre totes les novetats del comerç de Reus.
          </Text>

          <Text style={styles.sectionTitle}>Els nostres valors</Text>
          
          <View style={styles.valueItem}>
            <MaterialIcons name="favorite" size={24} color={Colors.primary} style={styles.valueIcon} />
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Proximitat</Text>
              <Text style={styles.valueText}>Defensem el comerç de barri i el tracte personal que només el petit comerç pot oferir</Text>
            </View>
          </View>

          <View style={styles.valueItem}>
            <MaterialIcons name="people" size={24} color={Colors.primary} style={styles.valueIcon} />
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Comunitat</Text>
              <Text style={styles.valueText}>Creem xarxa entre comerciants i fortim els llaços amb els nostres veïns i clients</Text>
            </View>
          </View>

          <View style={styles.valueItem}>
            <MaterialIcons name="trending-up" size={24} color={Colors.primary} style={styles.valueIcon} />
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Innovació</Text>
              <Text style={styles.valueText}>Adaptem el comerç tradicional a les noves tecnologies i necessitats del consumidor modern</Text>
            </View>
          </View>

          <View style={styles.valueItem}>
            <MaterialIcons name="stars" size={24} color={Colors.primary} style={styles.valueIcon} />
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Qualitat</Text>
              <Text style={styles.valueText}>Els nostres associats ofereixen productes i serveis d'alta qualitat amb assessorament expert</Text>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 200,
    height: 200,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  valueItem: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    alignItems: 'flex-start',
  },
  valueIcon: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  valueText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    lineHeight: 22,
  },
});
