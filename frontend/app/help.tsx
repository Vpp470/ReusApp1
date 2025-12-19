import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/constants/colors';
import i18n from '../src/i18n';

export default function HelpScreen() {
  const router = useRouter();

  const handlePhoneCall = () => {
    const phoneNumber = '656331410';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'No es pot obrir l\'aplicació de telèfon');
    });
  };

  const handleEmail = () => {
    const email = 'gestio@eltombdereus.com';
    const subject = 'Consulta des de l\'App REUS COMERÇ i FUTUR';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`).catch(() => {
      Alert.alert('Error', 'No es pot obrir l\'aplicació de correu');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{i18n.t('help.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>{i18n.t('help.subtitle')}</Text>

        {/* Phone Section */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="phone" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>{i18n.t('help.phone')}</Text>
          <Text style={styles.contactInfo}>{i18n.t('help.phoneNumber')}</Text>
          <Pressable style={styles.button} onPress={handlePhoneCall}>
            <MaterialIcons name="call" size={20} color={Colors.white} />
            <Text style={styles.buttonText}>{i18n.t('help.callNow')}</Text>
          </Pressable>
        </View>

        {/* Email Section */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="email" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>{i18n.t('help.email')}</Text>
          <Text style={styles.contactInfo}>{i18n.t('help.emailAddress')}</Text>
          <Pressable style={styles.button} onPress={handleEmail}>
            <MaterialIcons name="send" size={20} color={Colors.white} />
            <Text style={styles.buttonText}>{i18n.t('help.sendEmail')}</Text>
          </Pressable>
        </View>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xl,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.sm,
  },
  contactInfo: {
    fontSize: FontSizes.xl,
    color: Colors.primary,
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonText: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
});
