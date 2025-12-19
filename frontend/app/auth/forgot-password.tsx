import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import api from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleVerifyEmail = async () => {
    if (!email) {
      setError('Si us plau, introdueix el teu correu electrònic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Enviar correu de recuperació
      const response = await api.post('/auth/forgot-password', null, {
        params: { email }
      });
      
      if (response.data.success) {
        // Mostrar missatge d'èxit
        console.log('Email sent successfully');
        console.log('Reset URL:', response.data.reset_url);
        
        // Mostrar missatge a l'usuari
        setError('');
        router.push({
          pathname: '/auth/email-sent',
          params: { email, resetUrl: response.data.reset_url }
        });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      if (error.response?.status === 404) {
        setError('usuari no registrat');
      } else {
        setError('Error enviant el correu. Si us plau, torna-ho a intentar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Si us plau, omple tots els camps');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les contrasenyes no coincideixen');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contrasenya ha de tenir almenys 6 caràcters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', {
        email,
        new_password: newPassword,
      });

      // Contrasenya actualitzada correctament
      console.log('Password reset successfully');
      router.replace('/auth/login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError('No s\'ha pogut actualitzar la contrasenya');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </Pressable>
            
            <MaterialIcons name="lock-reset" size={80} color={Colors.primary} />
            <Text style={styles.title}>Recupera la teva contrasenya</Text>
            <Text style={styles.subtitle}>Introdueix el teu correu</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={24} color={Colors.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correu electrònic"
                placeholderTextColor={Colors.gray}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {error === 'usuari no registrat' && (
                  <Pressable
                    style={styles.registerButton}
                    onPress={() => router.push('/auth/register')}
                  >
                    <Text style={styles.registerButtonText}>Registra't</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleVerifyEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Continuar</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: Introduir nova contrasenya
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable 
            onPress={() => setStep('email')}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </Pressable>
          
          <MaterialIcons name="vpn-key" size={80} color={Colors.primary} />
          <Text style={styles.title}>Nova contrasenya</Text>
          <Text style={styles.subtitle}>Introdueix la teva nova contrasenya</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nova contrasenya"
              placeholderTextColor={Colors.gray}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setError('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color={Colors.gray}
              />
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirma la contrasenya"
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setError('');
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color={Colors.gray}
              />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Actualitzar contrasenya</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: Spacing.sm,
    zIndex: 1,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  eyeIcon: {
    padding: Spacing.sm,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  registerButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
  },
  registerButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
});
