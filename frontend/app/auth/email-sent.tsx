import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

export default function EmailSentScreen() {
  const router = useRouter();
  const { email, resetUrl } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="mark-email-read" size={100} color={Colors.success} />
        
        <Text style={styles.title}>Correu enviat!</Text>
        
        <Text style={styles.message}>
          Hem enviat un correu electrònic a <Text style={styles.email}>{email}</Text> amb un enllaç per recuperar la teva contrasenya.
        </Text>

        <Text style={styles.instructions}>
          Revisa la teva safata d'entrada i fes clic a l'enllaç per continuar.
        </Text>

        {resetUrl && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>⚠️ Mode Debug:</Text>
            <Pressable
              style={styles.debugButton}
              onPress={() => {
                const token = resetUrl.toString().split('token=')[1];
                router.push(`/auth/reset-password?token=${token}`);
              }}
            >
              <Text style={styles.debugButtonText}>Anar directament a canviar contrasenya</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.backButtonText}>Tornar al login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  email: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  instructions: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  debugContainer: {
    backgroundColor: '#fff3cd',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#ffc107',
    marginVertical: Spacing.lg,
    width: '100%',
  },
  debugTitle: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: Spacing.sm,
  },
  debugButton: {
    backgroundColor: '#ffc107',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#856404',
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
