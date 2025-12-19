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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  // Form state - Tots els camps obligatoris
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleViewPrivacyPolicy = () => {
    router.push('/privacy-policy');
  };

  const handleRegister = async () => {
    // Validació de camps obligatoris
    if (!name || !email || !phone || !address || !city || !gender || !password || !confirmPassword) {
      Alert.alert('Error', 'Tots els camps són obligatoris');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Les contrasenyes no coincideixen');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contrasenya ha de tenir almenys 6 caràcters');
      return;
    }

    if (!dataConsent) {
      Alert.alert(
        'Consentiment requerit',
        'Has d\'acceptar la Política de Protecció de Dades per registrar-te'
      );
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Email no vàlid');
      return;
    }

    // Validar telèfon
    const phoneRegex = /^[0-9+\s()-]{9,}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Error', 'Telèfon no vàlid');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.register({ 
        name,
        email,
        password,
        phone,
        birth_date: birthDate.toISOString(),
        gender,
        address,
        city,
        data_consent: dataConsent
      });
      
      // Auto login after registration
      const loginResponse = await authService.login(email, password);
      await login(loginResponse.user, loginResponse.token);
      
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert(
        'Error de registre',
        error.response?.data?.detail || 'No s\'ha pogut completar el registre'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </Pressable>
          <Text style={styles.title}>Registre</Text>
          <Text style={styles.subtitle}>Uneix-te a REUS COMERÇ i FUTUR</Text>
        </View>

        <View style={styles.form}>
          {/* Nom complet */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom Complet *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom i cognoms"
              placeholderTextColor={Colors.gray}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correu Electrònic *</Text>
            <TextInput
              style={styles.input}
              placeholder="exemple@correu.com"
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Telèfon */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telèfon *</Text>
            <TextInput
              style={styles.input}
              placeholder="+34 977 123 456"
              placeholderTextColor={Colors.gray}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          {/* Data de naixement */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data de Naixement *</Text>
            <Pressable
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {birthDate.toLocaleDateString('ca-ES')}
              </Text>
              <MaterialIcons name="calendar-today" size={20} color={Colors.gray} />
            </Pressable>
            
            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setBirthDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Sexe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sexe *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={(itemValue) => setGender(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Selecciona..." value="" />
                <Picker.Item label="Home" value="home" />
                <Picker.Item label="Dona" value="dona" />
                <Picker.Item label="Altre" value="altre" />
                <Picker.Item label="Prefereixo no dir-ho" value="no_especificat" />
              </Picker>
            </View>
          </View>

          {/* Adreça */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adreça *</Text>
            <TextInput
              style={styles.input}
              placeholder="Carrer, número, pis"
              placeholderTextColor={Colors.gray}
              value={address}
              onChangeText={setAddress}
              autoComplete="street-address"
            />
          </View>

          {/* Població */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Població *</Text>
            <TextInput
              style={styles.input}
              placeholder="Reus, Tarragona..."
              placeholderTextColor={Colors.gray}
              value={city}
              onChangeText={setCity}
              autoComplete="postal-address-locality"
            />
          </View>

          {/* Contrasenya */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contrasenya *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínim 6 caràcters"
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
          </View>

          {/* Confirmar contrasenya */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contrasenya *</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeteix la contrasenya"
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
          </View>

          {/* Casella de consentiment */}
          <View style={styles.consentContainer}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setDataConsent(!dataConsent)}
            >
              <View style={[styles.checkbox, dataConsent && styles.checkboxChecked]}>
                {dataConsent && (
                  <MaterialIcons name="check" size={18} color={Colors.white} />
                )}
              </View>
              <Text style={styles.consentText}>
                Accepto la{' '}
                <Text style={styles.linkText} onPress={handleViewPrivacyPolicy}>
                  Política de Protecció de Dades
                </Text>
                {' '}i consento que les meves dades siguin tractades per REUS COMERÇ i FUTUR i els seus Patrocinadors Associats *
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>Registrar-se</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ja tens compte? </Text>
            <Pressable onPress={() => router.push('/auth/login')}>
              <Text style={styles.linkText}>Inicia sessió</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: "rgba(255, 255, 255, 0.7)",
  },
  form: {
    padding: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  dateInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  passwordContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  eyeIcon: {
    padding: Spacing.md,
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
    color: Colors.text,
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.md,
    color: "rgba(255, 255, 255, 0.7)",
  },
  linkText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
