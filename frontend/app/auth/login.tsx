import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import InstallPWAPrompt from '../../src/components/InstallPWAPrompt';
import i18n from '../../src/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Carregar credencials guardades
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('saved_email');
        const savedRemember = await AsyncStorage.getItem('remember_me');
        if (savedEmail && savedRemember === 'true') {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.log('Error loading saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t('common.error'), i18n.t('auth.login.errors.fillAll'));
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Intentant login amb:', email);
      const response = await authService.login(email, password);
      console.log('✅ Login exitós, resposta rebuda');
      
      // Guardar email si "Recorda'm" està activat
      if (rememberMe) {
        await AsyncStorage.setItem('saved_email', email);
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.setItem('remember_me', 'false');
      }
      
      await login(response.user, response.token);
      console.log('✅ Dades guardades, redirigint...');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('❌ Error de login:', error);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert(
        i18n.t('common.error'),
        error.response?.data?.detail || error.message || i18n.t('auth.login.errors.invalid')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo-tomb-horizontal.png')}
              style={styles.logoHorizontal}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>{i18n.t('auth.login.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.login.email')}
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.login.password')}
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
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

          <Pressable
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>{i18n.t('auth.login.button')}</Text>
            )}
          </Pressable>

          <Pressable 
            style={styles.forgotPasswordButton}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>No recordes la contrasenya?</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{i18n.t('auth.login.noAccount')} </Text>
            <TouchableOpacity 
              onPress={() => router.push('/auth/register')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.linkText}>{i18n.t('auth.login.register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Fons verd metàl·lic
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF', // Fons blanc per al logo
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoHorizontal: {
    width: '95%',
    height: '90%',
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)', // Text blanc sobre fons verd
    marginTop: Spacing.sm,
  },
  form: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white, // Fons blanc per inputs
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc sobre fons blanc
  },
  eyeIcon: {
    padding: Spacing.sm,
  },
  loginButton: {
    backgroundColor: Colors.accent, // Dorat
    borderRadius: BorderRadius.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.textDark,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  forgotPasswordText: {
    color: Colors.accent, // Dorat
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)', // Text blanc sobre fons verd
  },
  linkText: {
    fontSize: FontSizes.md,
    color: Colors.accent, // Dorat
    fontWeight: 'bold',
  },
});