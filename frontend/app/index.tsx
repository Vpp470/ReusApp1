import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Sempre anar primer al login - l'usuari decidirà si vol entrar
      // Si ja està autenticat, el login el redirigirà automàticament
      router.replace('/auth/login');
    }
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/logo-rcf-horizontal.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 100,
    marginBottom: 30,
  },
  loader: {
    marginTop: 20,
  },
});