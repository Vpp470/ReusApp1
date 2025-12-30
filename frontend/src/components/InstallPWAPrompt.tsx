import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/colors';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Variable global per guardar el prompt
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export default function InstallPWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const checkIfShouldShow = async () => {
      try {
        // Verificar si ja s'ha mostrat o l'usuari l'ha descartat
        const dismissed = await AsyncStorage.getItem('pwa_prompt_dismissed');
        const dismissedDate = dismissed ? new Date(dismissed) : null;
        const now = new Date();
        
        // Si s'ha descartat fa menys de 3 dies, no mostrar
        if (dismissedDate && (now.getTime() - dismissedDate.getTime()) < 3 * 24 * 60 * 60 * 1000) {
          return;
        }
        
        const installed = await AsyncStorage.getItem('pwa_installed');
        if (installed) return;

        // Detectar tipus de dispositiu
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        const isAndroidDevice = /android/.test(userAgent);
        const isSamsung = /samsung|sm-/i.test(userAgent);
        const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
        
        // Detectar si és escriptori (no mòbil)
        const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isDesktop = !isMobileDevice && window.innerWidth >= 768;
        
        setIsIOS(isIOSDevice);
        setIsAndroid(isAndroidDevice);
        
        console.log('[PWA] Device detection:', { isIOSDevice, isAndroidDevice, isSamsung, isDesktop });

        // Si ja està instal·lat com a PWA, no mostrar
        if (isInStandaloneMode || window.matchMedia('(display-mode: standalone)').matches) {
          await AsyncStorage.setItem('pwa_installed', 'true');
          return;
        }

        // Esperar una mica abans de mostrar
        setTimeout(() => {
          // Mostrar per iOS, Android sense PWA, o escriptori
          if (isIOSDevice || isAndroidDevice || isDesktop) {
            setShowPrompt(true);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        }, 2000);
      } catch (error) {
        console.error('Error checking PWA prompt:', error);
      }
    };

    // Escoltar l'event beforeinstallprompt per Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar el prompt després d'un moment
      setTimeout(async () => {
        const dismissed = await AsyncStorage.getItem('pwa_prompt_dismissed');
        if (!dismissed) {
          setShowPrompt(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkIfShouldShow();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome - usar el prompt natiu
      try {
        console.log('[PWA] Mostrant prompt d\'instal·lació...');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Resultat:', outcome);
        
        if (outcome === 'accepted') {
          await AsyncStorage.setItem('pwa_installed', 'true');
          console.log('[PWA] App instal·lada!');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('[PWA] Error instal·lant:', error);
        // Si falla, mostrar instruccions manuals
        if (Platform.OS === 'web') {
          window.alert('Per instal·lar l\'app:\n\n1. Obre el menú del navegador (⋮)\n2. Selecciona "Instal·lar app" o "Afegir a pantalla d\'inici"');
        }
      }
    } else {
      // Si no hi ha deferredPrompt, mostrar instruccions
      console.log('[PWA] No hi ha prompt disponible, mostrant instruccions');
      if (Platform.OS === 'web') {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isAndroid = /android/.test(userAgent);
        
        if (isAndroid) {
          window.alert('Per instal·lar l\'app:\n\n1. Obre el menú del navegador (⋮ o ⋯)\n2. Selecciona "Instal·lar app" o "Afegir a pantalla d\'inici"');
        } else {
          window.alert('Per instal·lar l\'app:\n\n1. Toca la icona de compartir\n2. Selecciona "Afegir a la pantalla d\'inici"');
        }
      }
    }
    handleDismiss();
  };

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPrompt(false);
    });
    await AsyncStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={showPrompt}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
            <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Image
            source={require('../../assets/images/logo-rcf.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>📱 Instal·la l'App</Text>
          
          <Text style={styles.description}>
            Per una millor experiència, instal·la l'app d'El Tomb de Reus al teu dispositiu mòbil. 
            Podràs escanejar tiquets, participar en gimcanes i rebre notificacions!
          </Text>

          {isIOS ? (
            <View style={styles.iosInstructions}>
              <Text style={styles.instructionTitle}>Com instal·lar a iPhone/iPad:</Text>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>
                  Toca la icona de compartir{' '}
                  <MaterialIcons name="ios-share" size={18} color={Colors.primary} />
                </Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Selecciona "Afegir a la pantalla d'inici"</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Toca "Afegir"</Text>
              </View>
            </View>
          ) : isAndroid ? (
            <View style={styles.iosInstructions}>
              <Text style={styles.instructionTitle}>Com instal·lar a Android:</Text>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>
                  Toca el menú del navegador (⋮ tres punts a dalt)
                </Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Selecciona "Afegir a la pantalla d'inici" o "Instal·lar app"</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Confirma tocant "Afegir" o "Instal·lar"</Text>
              </View>
              
              {deferredPrompt && (
                <TouchableOpacity style={styles.installButton} onPress={handleInstall}>
                  <MaterialIcons name="add-to-home-screen" size={24} color={Colors.white} />
                  <Text style={styles.installButtonText}>Instal·lar App Ara</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.installButton} onPress={handleInstall}>
              <MaterialIcons name="add-to-home-screen" size={24} color={Colors.white} />
              <Text style={styles.installButtonText}>Instal·lar App</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.laterButton} onPress={handleDismiss}>
            <Text style={styles.laterButtonText}>Més tard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  iosInstructions: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  instructionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    marginRight: Spacing.sm,
  },
  stepText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  installButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  installButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: Spacing.sm,
  },
  laterButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
});
