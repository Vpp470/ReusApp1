import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import i18n from '../../src/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleViewPrivacyPolicy = () => {
    // Navegar a la pantalla de política de privacitat
    router.push('/privacy-policy');
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !phone || !birthDate || !gender || !address || !city) {
      Alert.alert('Error', i18n.t('auth.register.errors.fillRequired'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', i18n.t('auth.register.errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', i18n.t('auth.register.errors.passwordShort'));
      return;
    }

    setLoading(true);
    try {
      const user = await authService.register({ 
        name, 
        email, 
        password, 
        phone,
        birth_date: birthDate,
        gender,
        address,
        city,
        data_consent: false  // El consentiment es donarà a la següent pantalla
      });
      
      console.log('✅ Registre completat, fent login automàtic...');
      
      // Auto login after registration
      const loginResponse = await authService.login(email, password);
      await login(loginResponse.user, loginResponse.token);
      
      console.log('✅ Login automàtic completat, redirigint a consentiment...');
      
      // Redirigir a la pantalla de consentiment obligatori
      router.replace('/auth/consent');
    } catch (error: any) {
      Alert.alert(
        'Error de registro',
        error.response?.data?.detail || 'No se pudo completar el registro'
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
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, styles.scrollContentContainer]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialIcons name="person-add" size={60} color={Colors.primary} />
          <Text style={styles.title}>{i18n.t('auth.register.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.register.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.name')}
              placeholderTextColor={Colors.gray}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.email')}
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="phone" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.phone')}
              placeholderTextColor={Colors.gray}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="cake" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.birthDate')}
              placeholderTextColor={Colors.gray}
              value={birthDate}
              onChangeText={setBirthDate}
              keyboardType="default"
            />
          </View>
          <Text style={styles.helperText}>{i18n.t('auth.register.birthDateFormat')}</Text>

          <View style={styles.inputContainer}>
            <MaterialIcons name="wc" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.gender')}
              placeholderTextColor={Colors.gray}
              value={gender}
              onChangeText={setGender}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="home" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.address')}
              placeholderTextColor={Colors.gray}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="location-city" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.city')}
              placeholderTextColor={Colors.gray}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.password')}
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

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('auth.register.confirmPassword')}
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>{i18n.t('auth.register.button')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{i18n.t('auth.register.haveAccount')} </Text>
            <TouchableOpacity 
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.linkText}>{i18n.t('auth.register.login')}</Text>
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
    padding: Spacing.xl,
  },
  scrollContentContainer: {
    paddingBottom: 100, // Espai extra per iOS per assegurar que el botó és clicable
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.white, // Text blanc sobre fons verd
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)', // Blanc semi-transparent
    marginTop: Spacing.sm,
  },
  form: {
    width: '100%',
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
    color: Colors.textDark, // Text fosc sobre fons blanc dels inputs
  },
  helperText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)', // Blanc semi-transparent
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    marginLeft: Spacing.md,
  },
  eyeIcon: {
    padding: Spacing.sm,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  consentContainer: {
    marginBottom: Spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.gray,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.white, // Text blanc sobre fons verd
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)', // Blanc semi-transparent
  },
  linkText: {
    fontSize: FontSizes.md,
    color: Colors.accent, // Dorat
    fontWeight: 'bold',
  },
});