import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/colors';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_PROMPT_SHOWN_KEY = 'pwa_install_prompt_shown';
const INSTALL_PROMPT_DISMISSED_KEY = 'pwa_install_prompt_dismissed';

export default function InstallPWA() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Només funciona al web
    if (Platform.OS !== 'web') return;

    const checkIfShouldShow = async () => {
      try {
        // Comprovar si ja s'ha mostrat o descartat
        const hasShown = await AsyncStorage.getItem(INSTALL_PROMPT_SHOWN_KEY);
        const hasDismissed = await AsyncStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
        
        if (hasDismissed === 'true') {
          console.log('ℹ️ Install prompt already dismissed by user');
          return;
        }

        // Comprovar si ja està instal·lat
        if (window.matchMedia('(display-mode: standalone)').matches) {
          console.log('ℹ️ App already installed');
          return;
        }

        // Detectar iOS (Safari)
        const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
        setIsIOS(isIOSDevice);

        if (isIOSDevice) {
          // iOS sempre mostra el prompt manual
          if (hasShown !== 'true') {
            setTimeout(() => setShowPrompt(true), 2000);
            await AsyncStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, 'true');
          }
        }
      } catch (error) {
        console.error('Error checking install prompt status:', error);
      }
    };

    checkIfShouldShow();

    // Listener per Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Mostrar el nostre prompt personalitzat després de 2 segons
      setTimeout(async () => {
        const hasShown = await AsyncStorage.getItem(INSTALL_PROMPT_SHOWN_KEY);
        const hasDismissed = await AsyncStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
        
        if (hasDismissed !== 'true') {
          setShowPrompt(true);
          await AsyncStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, 'true');
        }
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      // Per iOS, només tanquem el modal (no podem forçar la instal·lació)
      setShowPrompt(false);
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    setShowPrompt(false);
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal
      visible={showPrompt}
      animationType="slide"
      transparent={true}
      onRequestClose={handleRemindLater}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icona de l'app */}
          <View style={styles.iconContainer}>
            <MaterialIcons name="get-app" size={48} color={Colors.primary} />
          </View>

          {/* Títol */}
          <Text style={styles.title}>Instal·lar El Tomb de Reus</Text>

          {/* Descripció */}
          <Text style={styles.description}>
            {isIOS 
              ? 'Afegeix aquesta app a la pantalla d\'inici per accedir-hi més ràpidament i gaudir d\'una experiència millorada.'
              : 'Instal·la aquesta aplicació al teu dispositiu per accedir-hi més ràpidament i gaudir d\'una experiència millorada, fins i tot sense connexió.'
            }
          </Text>

          {/* Instruccions per iOS */}
          {isIOS && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Com instal·lar:</Text>
              <View style={styles.instructionStep}>
                <MaterialIcons name="share" size={20} color={Colors.primary} />
                <Text style={styles.instructionText}>
                  1. Prem el botó de compartir
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <MaterialIcons name="add-box" size={20} color={Colors.primary} />
                <Text style={styles.instructionText}>
                  2. Selecciona "Afegir a pantalla d'inici"
                </Text>
              </View>
            </View>
          )}

          {/* Avantatges */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefit}>
              <MaterialIcons name="speed" size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Accés instantani</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="offline-bolt" size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Funciona offline</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="notifications-active" size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Notificacions</Text>
            </View>
          </View>

          {/* Botons */}
          <View style={styles.buttonsContainer}>
            {!isIOS && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleInstall}
              >
                <MaterialIcons name="download" size={20} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Instal·lar</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleRemindLater}
            >
              <Text style={styles.secondaryButtonText}>
                {isIOS ? 'Entesos' : 'Més tard'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <Text style={styles.dismissButtonText}>No mostrar més</Text>
            </TouchableOpacity>
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
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  instructionsContainer: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  instructionsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  instructionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  benefit: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  benefitText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
  },
  dismissButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});
