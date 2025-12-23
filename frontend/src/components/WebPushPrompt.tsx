/**
 * Component per sol·licitar permís de notificacions Web Push
 * Es mostra només a la versió web després del login
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/colors';
import {
  isWebPushSupported,
  getNotificationPermission,
  subscribeToWebPush,
  isSubscribedToWebPush,
} from '../services/webPushService';

interface WebPushPromptProps {
  authToken?: string | null;
}

export default function WebPushPrompt({ authToken }: WebPushPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    checkIfShouldShow();
  }, [authToken]);

  const checkIfShouldShow = async () => {
    try {
      // No mostrar si no estem a web o no hi ha token
      if (!isWebPushSupported() || !authToken) return;

      // Verificar si ja s'ha descartat o ja està subscrit
      const dismissed = await AsyncStorage.getItem('web_push_prompt_dismissed');
      if (dismissed) return;

      // Verificar permís actual
      const permission = getNotificationPermission();
      if (permission === 'denied') return; // L'usuari ja ha denegat

      // Verificar si ja està subscrit
      const subscribed = await isSubscribedToWebPush();
      if (subscribed) return;

      // Esperar una mica abans de mostrar
      setTimeout(() => {
        setShowPrompt(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 5000); // Esperar 5 segons després del login

    } catch (error) {
      console.error('[WebPushPrompt] Error:', error);
    }
  };

  const handleAccept = async () => {
    if (!authToken) return;
    
    setIsLoading(true);
    try {
      const success = await subscribeToWebPush(authToken);
      
      if (success) {
        console.log('[WebPushPrompt] Subscripció exitosa');
      } else {
        console.log('[WebPushPrompt] No s\'ha pogut subscriure');
      }
    } catch (error) {
      console.error('[WebPushPrompt] Error subscrivint:', error);
    } finally {
      setIsLoading(false);
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPrompt(false);
    });
    await AsyncStorage.setItem('web_push_prompt_dismissed', 'true');
  };

  const handleLater = async () => {
    // Només tancar sense guardar que s'ha descartat
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPrompt(false);
    });
  };

  if (!showPrompt || Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={showPrompt}
      transparent
      animationType="none"
      onRequestClose={handleLater}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleLater}>
            <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <MaterialIcons name="notifications-active" size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Vols rebre notificacions?</Text>
          
          <Text style={styles.description}>
            Activa les notificacions per estar al dia de les ofertes, esdeveniments i novetats d'El Tomb de Reus.
          </Text>

          <View style={styles.benefits}>
            <View style={styles.benefit}>
              <MaterialIcons name="local-offer" size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Noves ofertes i descomptes</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="event" size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Esdeveniments especials</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="card-giftcard" size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Sortejos i premis</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.acceptButton, isLoading && styles.buttonDisabled]} 
            onPress={handleAccept}
            disabled={isLoading}
          >
            <MaterialIcons 
              name={isLoading ? "hourglass-empty" : "notifications"} 
              size={24} 
              color={Colors.white} 
            />
            <Text style={styles.acceptButtonText}>
              {isLoading ? 'Activant...' : 'Activar notificacions'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton} onPress={handleDismiss}>
            <Text style={styles.laterButtonText}>No, gràcies</Text>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight || '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
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
  benefits: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  benefitText: {
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
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
