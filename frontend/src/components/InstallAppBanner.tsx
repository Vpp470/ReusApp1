import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSizes, Spacing } from '../constants/Theme';

const BANNER_DISMISSED_KEY = 'install_banner_dismissed';

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    // Only show on web
    if (Platform.OS !== 'web') {
      setVisible(false);
      return;
    }

    // Check if it's desktop (not mobile browser)
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      
      setIsDesktop(!isMobileDevice && !isSmallScreen);
      
      // Check if banner was dismissed
      try {
        const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
        const dismissedDate = dismissed ? new Date(dismissed) : null;
        const now = new Date();
        
        // Show again after 7 days
        if (!dismissedDate || (now.getTime() - dismissedDate.getTime()) > 7 * 24 * 60 * 60 * 1000) {
          setVisible(!isMobileDevice && !isSmallScreen);
        }
      } catch {
        setVisible(!isMobileDevice && !isSmallScreen);
      }
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, new Date().toISOString());
    } catch {}
  };

  const handleOpenStore = (store: 'ios' | 'android') => {
    // Enllaços a les botigues (actualitza amb els teus enllaços reals)
    const urls = {
      ios: 'https://apps.apple.com/app/el-tomb-de-reus/id123456789', // Actualitza amb l'ID real
      android: 'https://play.google.com/store/apps/details?id=com.eltombdereus.app', // Actualitza amb l'ID real
    };
    
    if (Platform.OS === 'web') {
      window.open(urls[store], '_blank');
    } else {
      Linking.openURL(urls[store]);
    }
  };

  if (!visible || !isDesktop) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="phone-android" size={40} color={Colors.white} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>📱 Millor experiència amb l'App!</Text>
          <Text style={styles.subtitle}>
            Descarrega l'app d'El Tomb de Reus per escanejar tiquets, participar en gimcanes i molt més!
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.storeButton}
            onPress={() => handleOpenStore('ios')}
          >
            <MaterialIcons name="apple" size={20} color={Colors.white} />
            <Text style={styles.storeButtonText}>App Store</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.storeButton}
            onPress={() => handleOpenStore('android')}
          >
            <MaterialIcons name="android" size={20} color={Colors.white} />
            <Text style={styles.storeButtonText}>Google Play</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <MaterialIcons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.9,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    gap: 6,
  },
  storeButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  dismissButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.md,
  },
});
