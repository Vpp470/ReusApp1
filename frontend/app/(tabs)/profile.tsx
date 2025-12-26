import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  RefreshControl,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/store/authStore';
import { giftCardsService, authService, establishmentsService } from '../../src/services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import type { GiftCard } from '../../src/types';
import i18n, { changeLanguage, getCurrentLanguage } from '../../src/i18n';
import { 
  isWebPushSupported, 
  subscribeToWebPush, 
  isSubscribedToWebPush,
  getNotificationPermission,
  resyncWebPushSubscription
} from '../../src/services/webPushService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [userEstablishment, setUserEstablishment] = useState<any>(null);
  const [availableEstablishments, setAvailableEstablishments] = useState<any[]>([]);
  
  // Web Push state
  const [webPushStatus, setWebPushStatus] = useState<'loading' | 'subscribed' | 'not-subscribed' | 'denied' | 'unsupported'>('loading');

  const languages = [
    { code: 'ca', name: 'Català', flag: '🇪🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  useEffect(() => {
    if (user) {
      console.log('User role:', user.role);
      console.log('Full user:', user);
      loadGiftCards();
      loadUserEstablishment();
      checkWebPushStatus();
      checkAvailableEstablishments();
    }
  }, [user]);

  const loadUserEstablishment = async () => {
    try {
      if (user && user.establishment_id) {
        const data = await establishmentsService.getById(user.establishment_id);
        setUserEstablishment(data);
      }
    } catch (error) {
      console.error('Error loading user establishment:', error);
    }
  };

  const loadGiftCards = async () => {
    try {
      if (user) {
        const data = await giftCardsService.getUserCards(user.id);
        setGiftCards(data);
      }
    } catch (error) {
      console.error('Error loading gift cards:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const checkAvailableEstablishments = async () => {
    try {
      if (user && user.role !== 'local_associat') {
        // Buscar establiments amb el mateix email
        const allEstablishments = await establishmentsService.getAll();
        const matching = allEstablishments.filter(
          (est: any) => est.email && est.email.toLowerCase() === user.email?.toLowerCase()
        );
        setAvailableEstablishments(matching);
      }
    } catch (error) {
      console.error('Error checking establishments:', error);
    }
  };

  // Funció per verificar l'estat de Web Push
  const checkWebPushStatus = async () => {
    console.log('[WebPush] checkWebPushStatus - Platform:', Platform.OS);
    
    if (Platform.OS !== 'web') {
      console.log('[WebPush] No és web, marcant com unsupported');
      setWebPushStatus('unsupported');
      return;
    }
    
    const supported = isWebPushSupported();
    console.log('[WebPush] isWebPushSupported:', supported);
    
    if (!supported) {
      setWebPushStatus('unsupported');
      return;
    }
    
    const permission = getNotificationPermission();
    console.log('[WebPush] getNotificationPermission:', permission);
    
    if (permission === 'denied') {
      setWebPushStatus('denied');
      return;
    }
    
    const subscribed = await isSubscribedToWebPush();
    console.log('[WebPush] isSubscribedToWebPush:', subscribed);
    
    // Si l'usuari està subscrit al navegador, intentar re-sincronitzar amb el servidor
    if (subscribed && permission === 'granted') {
      console.log('[WebPush] Usuari subscrit al navegador, re-sincronitzant amb servidor...');
      
      // Obtenir token
      let authToken = token;
      if (!authToken && typeof localStorage !== 'undefined') {
        authToken = localStorage.getItem('reusapp_auth_token');
      }
      
      if (authToken) {
        const resyncResult = await resyncWebPushSubscription(authToken);
        console.log('[WebPush] Re-sincronització:', resyncResult ? 'OK' : 'FALLIDA');
      }
    }
    
    setWebPushStatus(subscribed ? 'subscribed' : 'not-subscribed');
    console.log('[WebPush] Estat final:', subscribed ? 'subscribed' : 'not-subscribed');
  };

  // Funció per activar Web Push
  const handleEnableWebPush = async () => {
    console.log('[WebPush] Botó clicat, intentant activar...');
    
    // Obtenir token - primer de l'store, després del localStorage
    let authToken = token;
    console.log('[WebPush] Token de store:', authToken ? 'SÍ' : 'NO');
    
    if (!authToken && typeof localStorage !== 'undefined') {
      authToken = localStorage.getItem('reusapp_auth_token');
      console.log('[WebPush] Token de localStorage:', authToken ? 'SÍ' : 'NO');
    }
    
    if (!authToken) {
      console.log('[WebPush] No hi ha token!');
      if (Platform.OS === 'web') {
        window.alert('Has d\'iniciar sessió per activar les notificacions');
      } else {
        Alert.alert('Error', 'Has d\'iniciar sessió per activar les notificacions');
      }
      return;
    }
    
    console.log('[WebPush] Token trobat, procedint...');
    
    try {
      console.log('[WebPush] Esborrant flag dismissed...');
      // Esborrar el flag de "dismissed" per poder tornar a mostrar el prompt si cal
      await AsyncStorage.removeItem('web_push_prompt_dismissed');
      
      console.log('[WebPush] Cridant subscribeToWebPush...');
      const success = await subscribeToWebPush(authToken);
      console.log('[WebPush] Resultat:', success);
      
      if (success) {
        setWebPushStatus('subscribed');
        if (Platform.OS === 'web') {
          window.alert('Les notificacions push s\'han activat correctament!');
        } else {
          Alert.alert('Activat!', 'Les notificacions push s\'han activat correctament');
        }
      } else {
        const permission = getNotificationPermission();
        console.log('[WebPush] Permís:', permission);
        if (permission === 'denied') {
          setWebPushStatus('denied');
          if (Platform.OS === 'web') {
            window.alert('Has bloquejat les notificacions per aquesta web. Per activar-les, ves a la configuració del navegador.');
          } else {
            Alert.alert(
              'Notificacions bloquejades',
              'Has bloquejat les notificacions per aquesta web. Per activar-les, ves a la configuració del navegador.'
            );
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert('No s\'ha pogut activar les notificacions. Intenta-ho de nou.');
          } else {
            Alert.alert('Error', 'No s\'ha pogut activar les notificacions. Intenta-ho de nou.');
          }
        }
      }
    } catch (error) {
      console.error('[WebPush] Error activant Web Push:', error);
      if (Platform.OS === 'web') {
        window.alert('Hi ha hagut un error activant les notificacions: ' + (error as Error).message);
      } else {
        Alert.alert('Error', 'Hi ha hagut un error activant les notificacions');
      }
    }
  };

  const associateWithEstablishment = async (establishment: any) => {
    try {
      // Confirmar amb l'usuari
      Alert.alert(
        'Associar Perfil',
        `Vols associar el teu perfil amb l'establiment "${establishment.name}"? Això canviarà el teu rol a "Local Associat" i podràs gestionar ofertes i esdeveniments.`,
        [
          { text: 'Cancel·lar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              try {
                const token = await useAuthStore.getState().token;
                if (!token) return;

                // Actualitzar l'usuari amb l'establishment_id i rol
                await authService.updateProfile({
                  establishment_id: establishment.id || establishment._id,
                  role: 'local_associat',
                });

                Alert.alert('Èxit', 'Perfil associat correctament! Per favor, torna a iniciar sessió.');
                handleLogout();
              } catch (error) {
                console.error('Error associating establishment:', error);
                Alert.alert('Error', 'No s\'ha pogut associar el perfil');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in associateWithEstablishment:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGiftCards();
  };

  const handleLogout = async () => {
    console.log('handleLogout called - Direct logout');
    try {
      await logout();
      console.log('Logout successful, navigating to login');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      // Change language in i18n
      changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      
      // Save language preference to backend
      if (user) {
        const token = await useAuthStore.getState().token;
        if (token) {
          await authService.updateLanguage(languageCode, token);
        }
      }
      
      setShowLanguageModal(false);
      
      // Show success message
      Alert.alert(
        i18n.t('common.success'),
        'Language updated successfully!',
        [{ text: i18n.t('common.ok') }]
      );
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert(
        i18n.t('common.error'),
        'Could not update language preference',
        [{ text: i18n.t('common.ok') }]
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
      {/* User Info Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color={Colors.white} />
            </View>
            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.member_code && (
                <View style={styles.memberCodeBadge}>
                  <MaterialIcons name="badge" size={14} color={Colors.primary} />
                  <Text style={styles.memberCodeText}>{user.member_code}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* QR Code - Carnet d'Identitat */}
          {user?.member_code && (
            <View style={styles.qrContainer}>
              <View style={styles.qrCard}>
                <QRCode
                  value={user.member_code}
                  size={80}
                  backgroundColor="white"
                  color={Colors.primary}
                />
                <Text style={styles.qrLabel}>Carnet de Soci</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Establishment QR Code - Only for local_associat users */}
      {user?.role === 'local_associat' && userEstablishment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DNI Digital del Meu Establiment</Text>
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QRCode
                value={`ESTAB-${userEstablishment.id || userEstablishment._id}`}
                size={150}
                color={Colors.text}
                backgroundColor={Colors.white}
              />
            </View>
            <View style={styles.qrInfo}>
              <Text style={styles.establishmentName}>{userEstablishment.name}</Text>
              <Text style={styles.qrId}>
                ID: {(userEstablishment.id || userEstablishment._id)?.substring(0, 12)}...
              </Text>
              <Text style={styles.qrDescription}>
                Mostra aquest QR per identificar el teu establiment
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Associate Establishment - Only for non-local_associat users with matching email */}
      {user?.role !== 'local_associat' && availableEstablishments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.associateHeader}>
            <MaterialIcons name="store" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Associa el teu Perfil</Text>
          </View>
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoBoxText}>
              Hem detectat que el teu correu electrònic està associat amb un o més establiments. 
              Pots associar el teu perfil per gestionar ofertes i esdeveniments.
            </Text>
          </View>
          {availableEstablishments.map((est: any) => (
            <Pressable
              key={est.id || est._id}
              style={styles.establishmentCard}
              onPress={() => associateWithEstablishment(est)}
            >
              <View style={styles.establishmentCardContent}>
                <MaterialIcons name="business" size={40} color={Colors.primary} />
                <View style={styles.establishmentCardInfo}>
                  <Text style={styles.establishmentCardName}>{est.name}</Text>
                  {est.address && (
                    <Text style={styles.establishmentCardAddress}>{est.address}</Text>
                  )}
                  <Text style={styles.establishmentCardEmail}>{est.email}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={28} color={Colors.primary} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Gift Cards Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis Tarjetas Regalo</Text>
          <Pressable onPress={() => router.push('/gift-cards/purchase')}>
            <MaterialIcons name="add-circle" size={28} color={Colors.primary} />
          </Pressable>
        </View>

        {giftCards.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="card-giftcard" size={60} color={Colors.lightGray} />
            <Text style={styles.emptyText}>No tienes tarjetas regalo</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/gift-cards/purchase')}
            >
              <Text style={styles.addButtonText}>Comprar Tarjeta Regalo</Text>
            </Pressable>
          </View>
        ) : (
          giftCards.map((card) => (
            <View key={card.id} style={styles.giftCard}>
              <View style={styles.giftCardHeader}>
                <View style={styles.giftCardIcon}>
                  <MaterialIcons name="card-giftcard" size={32} color={Colors.primary} />
                </View>
                <View style={styles.giftCardInfo}>
                  <Text style={styles.giftCardCode}>Código: {card.code}</Text>
                  <Text style={styles.giftCardStatus}>
                    {card.status === 'active' ? 'Activa' : card.status === 'used' ? 'Usada' : 'Expirada'}
                  </Text>
                </View>
              </View>
              <View style={styles.giftCardFooter}>
                <View>
                  <Text style={styles.balanceLabel}>Saldo disponible</Text>
                  <Text style={styles.balanceAmount}>{card.balance.toFixed(2)} €</Text>
                </View>
                <Pressable
                  style={styles.detailsButton}
                  onPress={() => router.push(`/gift-cards/${card.id}`)}
                >
                  <Text style={styles.detailsButtonText}>Ver detalles</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Admin Section - Only visible for admin users */}
      {user?.role === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administración</Text>
          <Pressable
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <MaterialIcons name="admin-panel-settings" size={24} color={Colors.white} />
            <Text style={styles.adminButtonText}>Acceder al Backoffice</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
          </Pressable>
        </View>
      )}

      {/* Local Associate Section */}
      {user?.role === 'local_associat' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>El Meu Establiment</Text>
          <Pressable
            style={styles.establishmentButton}
            onPress={() => router.push('/my-establishment')}
          >
            <MaterialIcons name="store" size={24} color={Colors.white} />
            <Text style={styles.establishmentButtonText}>Gestionar Establiment</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
          </Pressable>
          
          <Pressable
            style={[styles.establishmentButton, { marginTop: Spacing.md, backgroundColor: Colors.secondary }]}
            onPress={() => router.push('/local-associat/promotions')}
          >
            <MaterialIcons name="local-offer" size={24} color={Colors.white} />
            <Text style={styles.establishmentButtonText}>Les Meves Promocions</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
          </Pressable>

          <Pressable
            style={[styles.establishmentButton, { marginTop: Spacing.md, backgroundColor: Colors.accent }]}
            onPress={() => router.push('/local-associat/gallery')}
          >
            <MaterialIcons name="collections" size={24} color={Colors.white} />
            <Text style={styles.establishmentButtonText}>Galeria d'Imatges</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
          </Pressable>
        </View>
      )}
      
      {/* Debug info - Temporary */}
      {user && (
        <View style={[styles.section, { backgroundColor: '#f0f0f0', padding: Spacing.md }]}>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Debug Info - Rol actual: {user.role || 'undefined'}
          </Text>
          <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
            Si has canviat el rol, tanca sessió i torna a entrar
          </Text>
        </View>
      )}

      {/* Menu Options */}
      <View style={styles.section}>
        <Pressable 
          style={styles.menuItem}
          onPress={() => router.push('/privacy-policy')}
        >
          <MaterialIcons name="security" size={24} color={Colors.text} />
          <Text style={styles.menuText}>Protecció de Dades</Text>
          <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => router.push('/tickets/history')}
        >
          <MaterialIcons name="history" size={24} color={Colors.text} />
          <Text style={styles.menuText}>{i18n.t('profile.menu.history')}</Text>
          <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => router.push('/notifications')}
        >
          <MaterialIcons name="notifications" size={24} color={Colors.text} />
          <Text style={styles.menuText}>{i18n.t('profile.menu.notifications')}</Text>
          <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
        </Pressable>

        {/* Web Push - només mostrar a web */}
        {Platform.OS === 'web' && webPushStatus !== 'unsupported' && (
          <TouchableOpacity 
            style={[styles.menuItem, webPushStatus === 'subscribed' && styles.menuItemSuccess]}
            onPress={() => {
              console.log('[WebPush] Botó clicat! Estat actual:', webPushStatus);
              if (webPushStatus !== 'subscribed') {
                handleEnableWebPush();
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={webPushStatus === 'subscribed' ? 'notifications-active' : 'notifications-off'} 
              size={24} 
              color={webPushStatus === 'subscribed' ? Colors.success : Colors.warning} 
            />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>
                {webPushStatus === 'subscribed' ? 'Notificacions activades' : 'Activar notificacions push'}
              </Text>
              <Text style={styles.menuSubtext}>
                {webPushStatus === 'subscribed' 
                  ? 'Rebràs ofertes i novetats' 
                  : webPushStatus === 'denied'
                    ? 'Bloquejades - ves a configuració del navegador'
                    : 'Activa-les per no perdre\'t res'}
              </Text>
            </View>
            {webPushStatus !== 'subscribed' && webPushStatus !== 'denied' && (
              <MaterialIcons name="chevron-right" size={24} color={Colors.warning} />
            )}
            {webPushStatus === 'subscribed' && (
              <MaterialIcons name="check-circle" size={24} color={Colors.success} />
            )}
          </TouchableOpacity>
        )}

        <Pressable style={styles.menuItem}>
          <MaterialIcons name="settings" size={24} color={Colors.text} />
          <Text style={styles.menuText}>{i18n.t('profile.menu.settings')}</Text>
          <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => setShowLanguageModal(true)}
        >
          <MaterialIcons name="language" size={24} color={Colors.text} />
          <Text style={styles.menuText}>Idioma / Language</Text>
          <View style={styles.languageIndicator}>
            <Text style={styles.languageCode}>{currentLanguage.toUpperCase()}</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
          </View>
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => router.push('/help')}
        >
          <MaterialIcons name="help" size={24} color={Colors.text} />
          <Text style={styles.menuText}>{i18n.t('profile.menu.help')}</Text>
          <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => router.push('/about')}
        >
          <MaterialIcons name="info" size={24} color={Colors.text} />
          <Text style={styles.menuText}>{i18n.t('profile.menu.about')}</Text>
          <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
        </Pressable>
      </View>

    </ScrollView>

      {/* Logout Button - Outside ScrollView */}
      <Pressable 
        style={styles.logoutButton} 
        onPress={handleLogout}
        activeOpacity={0.7}
        testID="logout-button"
      >
        <MaterialIcons name="logout" size={24} color={Colors.white} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecciona Idioma / Select Language</Text>
                <Pressable 
                  style={styles.closeButton}
                  onPress={() => setShowLanguageModal(false)}
                >
                  <MaterialIcons name="close" size={28} color={Colors.textDark} />
                </Pressable>
              </View>
              
              <ScrollView style={styles.languageList}>
                {languages.map((lang) => (
                  <Pressable
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      currentLanguage === lang.code && styles.languageOptionSelected,
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.languageName,
                      currentLanguage === lang.code && styles.languageNameSelected,
                    ]}>
                      {lang.name}
                    </Text>
                    {currentLanguage === lang.code && (
                      <MaterialIcons name="check" size={24} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 100, // Espai per al menú inferior dels tabs
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  memberCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  memberCodeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4,
  },
  qrCard: {
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  qrLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  addButtonText: {
    color: Colors.white, // Text blanc per botó verd
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  giftCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  giftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  giftCardIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  giftCardInfo: {
    flex: 1,
  },
  giftCardCode: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  giftCardStatus: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: '600',
  },
  giftCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: Spacing.md,
  },
  balanceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  menuItemSuccess: {
    backgroundColor: Colors.success + '10',
  },
  menuText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    marginLeft: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: 140,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.error,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    cursor: 'pointer',
  },
  logoutText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  adminButtonText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  establishmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  establishmentButtonText: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  languageCode: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    flex: 1,
  },
  closeButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
  },
  languageList: {
    paddingHorizontal: Spacing.lg,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.xs,
  },
  languageOptionSelected: {
    backgroundColor: Colors.primary + '10',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  languageName: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc
  },
  languageNameSelected: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  qrContainer: {
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.md,
    marginTop: -10,
  },
  qrInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  establishmentName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  qrId: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontFamily: 'monospace',
    marginBottom: Spacing.sm,
  },
  qrDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  associateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc
    lineHeight: 20,
  },
  establishmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  establishmentCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  establishmentCardInfo: {
    flex: 1,
  },
  establishmentCardName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    marginBottom: Spacing.xs,
  },
  establishmentCardAddress: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  establishmentCardEmail: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});