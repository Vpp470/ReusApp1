import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/colors';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Només executar a web
    if (Platform.OS !== 'web') return;

    // Comprovar si ja està instal·lada (mode standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // No mostrar si ja està instal·lada

    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Comprovar si l'usuari ja ha rebutjat el prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // No mostrar durant 7 dies després de rebutjar
      if ((now.getTime() - dismissedDate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Escoltar l'event beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar després de 3 segons de navegació
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Per iOS, mostrar instruccions manuals
    if (isIOSDevice && !standalone) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('Usuari ha acceptat instal·lar la PWA');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error instal·lant PWA:', error);
      }
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // No mostrar en mode standalone o en plataformes natives
  if (Platform.OS !== 'web' || isStandalone) return null;

  return (
    <Modal
      visible={showPrompt}
      transparent={true}
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header amb logo */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/logo-rcf.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Pressable style={styles.closeButton} onPress={handleDismiss}>
              <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Contingut */}
          <View style={styles.content}>
            <Text style={styles.title}>Instal·la l'App</Text>
            <Text style={styles.subtitle}>El Tomb de Reus</Text>
            
            {isIOS ? (
              // Instruccions per iOS
              <View style={styles.iosInstructions}>
                <Text style={styles.description}>
                  Per instal·lar l'aplicació al teu iPhone o iPad:
                </Text>
                <View style={styles.step}>
                  <MaterialIcons name="ios-share" size={24} color={Colors.primary} />
                  <Text style={styles.stepText}>
                    1. Prem el botó <Text style={styles.bold}>Compartir</Text> (icona a baix)
                  </Text>
                </View>
                <View style={styles.step}>
                  <MaterialIcons name="add-box" size={24} color={Colors.primary} />
                  <Text style={styles.stepText}>
                    2. Selecciona <Text style={styles.bold}>"Afegir a la pantalla d'inici"</Text>
                  </Text>
                </View>
                <View style={styles.step}>
                  <MaterialIcons name="check-circle" size={24} color={Colors.success} />
                  <Text style={styles.stepText}>
                    3. Prem <Text style={styles.bold}>"Afegir"</Text> per confirmar
                  </Text>
                </View>
              </View>
            ) : (
              // Botó per Android/Chrome
              <View>
                <Text style={styles.description}>
                  Afegeix l'aplicació a la pantalla d'inici per accedir-hi més ràpidament i gaudir d'una experiència completa.
                </Text>
                <View style={styles.benefits}>
                  <View style={styles.benefit}>
                    <MaterialIcons name="offline-bolt" size={20} color={Colors.primary} />
                    <Text style={styles.benefitText}>Accés ràpid</Text>
                  </View>
                  <View style={styles.benefit}>
                    <MaterialIcons name="notifications" size={20} color={Colors.primary} />
                    <Text style={styles.benefitText}>Notificacions</Text>
                  </View>
                  <View style={styles.benefit}>
                    <MaterialIcons name="fullscreen" size={20} color={Colors.primary} />
                    <Text style={styles.benefitText}>Pantalla completa</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Botons */}
          <View style={styles.buttons}>
            {!isIOS && deferredPrompt && (
              <Pressable style={styles.installButton} onPress={handleInstall}>
                <MaterialIcons name="download" size={20} color={Colors.white} />
                <Text style={styles.installButtonText}>Instal·lar ara</Text>
              </Pressable>
            )}
            <Pressable style={styles.laterButton} onPress={handleDismiss}>
              <Text style={styles.laterButtonText}>
                {isIOS ? "D'acord" : "Més tard"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl || 20,
    borderTopRightRadius: BorderRadius.xl || 20,
    paddingBottom: 34, // Safe area per iOS
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.lg,
    top: Spacing.lg,
    padding: 8,
  },
  content: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xl || 22,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.lg || 18,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.md || 16,
    color: Colors.textSecondary || '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  benefits: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.sm,
  },
  benefit: {
    alignItems: 'center',
    gap: 4,
  },
  benefitText: {
    fontSize: FontSizes.sm || 14,
    color: Colors.textDark,
  },
  iosInstructions: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.background || '#F5F5F5',
    padding: Spacing.md,
    borderRadius: BorderRadius.md || 8,
  },
  stepText: {
    flex: 1,
    fontSize: FontSizes.md || 16,
    color: Colors.textDark,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  buttons: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md || 8,
    gap: 8,
  },
  installButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md || 16,
    fontWeight: '600',
  },
  laterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md || 8,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E5E5',
  },
  laterButtonText: {
    color: Colors.textSecondary || '#666',
    fontSize: FontSizes.md || 16,
  },
});
