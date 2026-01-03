import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    console.log('🚀 Index: Carregant sessió guardada...');
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      console.log('📊 Index: isLoading=false, isAuthenticated=', isAuthenticated);
      
      if (isAuthenticated) {
        // L'usuari ja està autenticat, anar directament a home
        console.log('✅ Usuari ja autenticat, redirigint a home...');
        router.replace('/(tabs)/home');
      } else {
        // L'usuari no està autenticat, anar al login
        console.log('🔒 No autenticat, redirigint a login...');
        router.replace('/auth/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/logo-tomb-horizontal.png')} 
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
    width: 300,
    height: 120,
    marginBottom: 30,
  },
  loader: {
    marginTop: 20,
  },
});