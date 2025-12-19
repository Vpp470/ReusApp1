import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../src/i18n';

// Prevenir que la pantalla de splash s'amagui automàticament
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // Per a web, carregar fonts via link CSS
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          // Afegir Google Fonts per Material Icons
          const link = document.createElement('link');
          link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined|Material+Icons+Round';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
          
          // També afegir Ionicons
          const link2 = document.createElement('link');
          link2.href = 'https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js';
          link2.type = 'module';
          document.head.appendChild(link2);
          
          // Donar temps per carregar les fonts
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Carregar les fonts d'icones per native
        await Font.loadAsync({
          ...MaterialIcons.font,
          ...Ionicons.font,
          ...FontAwesome.font,
        });
        
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="consell" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
