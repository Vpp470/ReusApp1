/**
 * Pantalla de detall d'una Gimcana per a usuaris
 * Mostra el progrés, permet escanejar QRs i reclamar premis
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/constants/colors';

// Helper per obtenir la URL completa de les imatges
const getImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  
  // Si ja és una URL completa, retornar-la
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // Si és una URL relativa, afegir la base URL segons la plataforma
  if (Platform.OS === 'web') {
    // Al web en desenvolupament local
    if (typeof window !== 'undefined') {
      const hostname = window.location?.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://localhost:8001${url}`;
      }
    }
    // En producció o Emergent, la URL relativa funcionarà
    return url;
  }
  
  // Al mòbil, usar la URL de producció
  return `https://www.reusapp.com${url}`;
};

const { width } = Dimensions.get('window');
const QR_GRID_SIZE = Math.floor((width - Spacing.md * 3) / 4);

interface QRCode {
  _id: string;
  code: string;
  number: number;
  establishment_name: string;
  location_hint?: string;
  image_url?: string;
}

interface GimcanaProgress {
  scanned_qrs: string[];
  completed: boolean;
  completed_at?: string;
  entered_raffle: boolean;
  entered_raffle_at?: string;
  is_winner?: boolean;
}

interface GimcanaCampaign {
  _id: string;
  name: string;
  description: string;
  total_qr_codes: number;
  start_date: string;
  end_date: string;
  prize_type: 'direct' | 'raffle';
  prize_description: string;
  prize_image_url?: string;
  image_url?: string;
  rules?: string;
  rules_url?: string;
  raffle_date?: string;
  raffle_executed?: boolean;
  is_active: boolean;
}

export default function GimcanaDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, isLoading: authLoading, loadStoredAuth } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [campaign, setCampaign] = useState<GimcanaCampaign | null>(null);
  const [progress, setProgress] = useState<GimcanaProgress | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRaffleResult, setShowRaffleResult] = useState(false);
  const [raffleResult, setRaffleResult] = useState<any>(null);
  const [hasScanned, setHasScanned] = useState(false);

  // Assegurar que l'auth store s'ha carregat
  useEffect(() => {
    if (authLoading) {
      console.log('📊 Auth still loading, waiting...');
      loadStoredAuth();
    }
  }, [authLoading, loadStoredAuth]);

  const loadCampaignDetails = useCallback(async () => {
    if (!id) return;
    
    console.log('📊 Loading gimcana details, token:', token ? 'present' : 'missing');
    
    try {
      // Headers opcionals si l'usuari està autenticat
      const headers: any = {};
      if (token) {
        headers.Authorization = token;
      }
      
      // Obtenir detalls de la campanya (públic)
      const campaignRes = await api.get(`/gimcana/campaigns/${id}`, { headers });
      setCampaign(campaignRes.data);
      
      // Obtenir QR codes (públic)
      const qrRes = await api.get(`/gimcana/campaigns/${id}/qr-codes`, { headers });
      setQrCodes(qrRes.data);
      
      // Obtenir progrés de l'usuari (només si està autenticat)
      if (token) {
        try {
          console.log('📊 Fetching progress for user...');
          const progressRes = await api.get(`/gimcana/campaigns/${id}/progress`, { headers });
          console.log('📊 Progress received:', progressRes.data);
          setProgress(progressRes.data);
        } catch (progressError) {
          console.log('No progress found for user:', progressError);
          setProgress({
            scanned_qrs: [],
            completed: false,
            entered_raffle: false,
          });
        }
        
        // Si la campanya té sorteig executat, obtenir resultat
        if (campaignRes.data.raffle_executed) {
          try {
            const raffleRes = await api.get(`/gimcana/campaigns/${id}/raffle-result`, { headers });
            setRaffleResult(raffleRes.data);
          } catch (raffleError) {
            console.log('No raffle result available');
          }
        }
      } else {
        // Usuari no autenticat - progrés buit
        setProgress({
          scanned_qrs: [],
          completed: false,
          entered_raffle: false,
        });
      }
      
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadCampaignDetails();
  }, [loadCampaignDetails]);

  // Recarregar el progrés quan el token canviï (després del login)
  useEffect(() => {
    if (token && campaign) {
      console.log('📊 Token detected, reloading progress...');
      const headers = { Authorization: token };
      api.get(`/gimcana/campaigns/${id}/progress`, { headers })
        .then(res => {
          console.log('📊 Progress reloaded:', res.data);
          setProgress(res.data);
        })
        .catch(err => console.log('Error reloading progress:', err));
    }
  }, [token, id, campaign]);

  // Funció per obrir l'escàner
  const openScanner = async () => {
    setHasScanned(false);
    
    // A mòbil, demanar permisos de càmera
    if (Platform.OS !== 'web' && !permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permís necessari',
          'Cal accés a la càmera per escanejar codis QR'
        );
        return;
      }
    }
    
    setShowScanner(true);
  };

  // Handler per quan la càmera escaneja un QR
  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (hasScanned || scanning) return;
    
    const code = result.data;
    if (!code) return;
    
    // Verificar que l'usuari té token
    if (!token) {
      Alert.alert(
        'Sessió requerida',
        'Has d\'iniciar sessió per escanejar QR codes.',
        [{ text: 'D\'acord', onPress: () => setShowScanner(false) }]
      );
      return;
    }
    
    console.log('QR Escanejat:', code);
    console.log('Token disponible:', token ? 'Sí' : 'No');
    setHasScanned(true);
    setScanning(true);
    
    try {
      const response = await api.post('/gimcana/scan', {
        campaign_id: id,
        qr_code: code.toUpperCase(),
      }, {
        headers: { Authorization: token },
      });
      
      console.log('Resposta API:', response.data);
      const data = response.data;
      
      // Tancar scanner PRIMER
      setShowScanner(false);
      
      // Actualitzar el progrés IMMEDIATAMENT amb les dades de la resposta
      if (data.scanned_count !== undefined) {
        setProgress(prev => ({
          ...prev,
          scanned_qrs: [...(prev?.scanned_qrs || []), 'scanned'],
          scanned_count: data.scanned_count,
          completed: data.completed || false,
        }));
      }
      
      // Recarregar les dades completes per assegurar sincronització
      await loadCampaignDetails();
      
      // Mostrar missatge d'èxit
      if (Platform.OS === 'web') {
        window.alert(`✅ Èxit! ${data.message || `QR escanejat! Progrés: ${data.scanned_count}/${data.total}`}`);
      } else {
        Alert.alert(
          '✅ Èxit!',
          data.message || `QR escanejat! Progrés: ${data.scanned_count}/${data.total}`,
          [{ text: 'D\'acord' }]
        );
      }
      
    } catch (error: any) {
      console.error('Error escaneig:', error.response?.data || error);
      const errorMsg = error.response?.data?.detail || 'No s\'ha pogut processar el QR. Torna-ho a provar.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg, [{ text: 'D\'acord' }]);
      }
    } finally {
      setScanning(false);
      setHasScanned(false);
    }
  };

  // Funció per seleccionar imatge de la galeria
  const pickImageFromGallery = async () => {
    Alert.alert('Info', 'Utilitza la càmera per escanejar el QR');
  };

  const handleEnterRaffle = async () => {
    if (!token || !id || !campaign) return;
    
    try {
      const response = await api.post(`/gimcana/campaigns/${id}/enter-raffle`, {}, {
        headers: { Authorization: token },
      });
      
      setProgress(prev => prev ? {
        ...prev,
        entered_raffle: true,
        entered_raffle_at: new Date().toISOString(),
      } : null);
      
      setShowCompletionModal(false);
      
      const msg = campaign.prize_type === 'raffle'
        ? `Enhorabona! Has entrat al sorteig del ${formatDate(campaign.raffle_date || campaign.end_date)}`
        : 'Enhorabona! Has reclamat el teu premi!';
      
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Felicitats! 🎉', msg);
      }
      
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Error entrant al sorteig';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const isQRScanned = (qrId: string) => {
    return progress?.scanned_qrs?.includes(qrId) || false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant gimcana...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#CCC" />
          <Text style={styles.errorText}>Gimcana no trobada</Text>
          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Tornar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scannedCount = progress?.scanned_count || progress?.scanned_qrs?.length || 0;
  const progressPercent = (scannedCount / campaign.total_qr_codes) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{campaign.name}</Text>
        <TouchableOpacity onPress={() => setShowRulesModal(true)} style={styles.infoButton}>
          <MaterialIcons name="info-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Imatge de campanya */}
        {campaign.image_url && (
          <Image source={{ uri: getImageUrl(campaign.image_url) }} style={styles.campaignImage} />
        )}

        {/* Progrés */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>El teu progrés</Text>
          <View style={styles.progressBarLarge}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${progressPercent}%`,
                  backgroundColor: progress?.completed ? '#4CAF50' : Colors.primary 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressCount}>
            {scannedCount} de {campaign.total_qr_codes} QRs escanejats
          </Text>
          
          {progress?.completed && (
            <View style={styles.completedBanner}>
              <MaterialIcons name="emoji-events" size={24} color="#FF9800" />
              <Text style={styles.completedBannerText}>
                {progress.entered_raffle 
                  ? campaign.prize_type === 'raffle' 
                    ? '🎉 Ets participant al sorteig!'
                    : '🎁 Ja has reclamat el premi!'
                  : '✅ Gimcana completada! Reclama el teu premi.'}
              </Text>
            </View>
          )}
        </View>

        {/* Resultat del sorteig */}
        {campaign.raffle_executed && raffleResult && (
          <TouchableOpacity 
            style={[
              styles.raffleResultBanner,
              raffleResult.is_winner && styles.raffleWinnerBanner
            ]}
            onPress={() => setShowRaffleResult(true)}
          >
            <MaterialIcons 
              name={raffleResult.is_winner ? "star" : "emoji-events"} 
              size={24} 
              color={raffleResult.is_winner ? "#FFD700" : "#FFF"} 
            />
            <Text style={styles.raffleResultText}>
              {raffleResult.is_winner 
                ? '🎉 ENHORABONA! Has guanyat!'
                : 'El sorteig ja s\'ha realitzat. Toca per veure els resultats.'}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}

        {/* Premi */}
        <View style={styles.prizeSection}>
          <View style={styles.prizeTitleRow}>
            <MaterialIcons 
              name={campaign.prize_type === 'direct' ? 'card-giftcard' : 'emoji-events'} 
              size={24} 
              color={campaign.prize_type === 'direct' ? '#4CAF50' : '#FF9800'} 
            />
            <Text style={styles.prizeSectionTitle}>
              {campaign.prize_type === 'direct' ? 'Premi Directe' : 'Premi del Sorteig'}
            </Text>
          </View>
          <Text style={styles.prizeDescription}>{campaign.prize_description}</Text>
          {campaign.prize_type === 'raffle' && campaign.raffle_date && !campaign.raffle_executed && (
            <Text style={styles.raffleDate}>
              📅 Data del sorteig: {formatDate(campaign.raffle_date)}
            </Text>
          )}
          {campaign.prize_image_url && (
            <Image source={{ uri: getImageUrl(campaign.prize_image_url) }} style={styles.prizeImage} />
          )}
        </View>

        {/* Quadrícula de QRs */}
        <View style={styles.qrGridSection}>
          <Text style={styles.qrGridTitle}>Codis QR</Text>
          <Text style={styles.qrGridSubtitle}>
            Troba i escaneja tots els QRs per completar la gimcana
          </Text>
          
          <View style={styles.qrGrid}>
            {qrCodes.map((qr) => {
              const scanned = isQRScanned(qr._id);
              return (
                <View 
                  key={qr._id} 
                  style={[
                    styles.qrGridItem,
                    scanned && styles.qrGridItemScanned
                  ]}
                >
                  {scanned ? (
                    <MaterialIcons name="check-circle" size={30} color="#4CAF50" />
                  ) : (
                    <MaterialIcons name="qr-code-2" size={30} color="#CCC" />
                  )}
                  <Text style={[
                    styles.qrGridItemText,
                    scanned && styles.qrGridItemTextScanned
                  ]} numberOfLines={1}>
                    {qr.number}. {qr.establishment_name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesSection}>
          <View style={styles.dateItem}>
            <MaterialIcons name="play-arrow" size={18} color={Colors.primary} />
            <Text style={styles.dateLabel}>Inici: {formatDate(campaign.start_date)}</Text>
          </View>
          <View style={styles.dateItem}>
            <MaterialIcons name="stop" size={18} color="#E53935" />
            <Text style={styles.dateLabel}>Fi: {formatDate(campaign.end_date)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Botó d'escanejar */}
      {!progress?.completed && campaign.is_active && (
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={openScanner}
        >
          <MaterialIcons name="qr-code-scanner" size={28} color={Colors.white} />
          <Text style={styles.scanButtonText}>Escanejar QR</Text>
        </TouchableOpacity>
      )}

      {/* Botó de reclamar premi */}
      {progress?.completed && !progress?.entered_raffle && (
        <TouchableOpacity 
          style={[styles.scanButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => setShowCompletionModal(true)}
        >
          <MaterialIcons name="card-giftcard" size={28} color={Colors.white} />
          <Text style={styles.scanButtonText}>
            {campaign.prize_type === 'direct' ? 'Reclamar Premi' : 'Participar al Sorteig'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal d'escaneig */}
      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.scannerContainer}>
          {/* Header */}
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => { setShowScanner(false); setHasScanned(false); }}>
              <MaterialIcons name="close" size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.scannerHeaderTitle}>Escanejar QR</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Contingut principal - Càmera o missatge */}
          {!permission?.granted ? (
            /* Sense permisos */
            <View style={styles.webMessageContainer}>
              <MaterialIcons name="camera-alt" size={80} color={Colors.primary} />
              <Text style={styles.webMessageTitle}>Permís de Càmera</Text>
              <Text style={styles.webMessageText}>
                Necessitem accés a la càmera per escanejar codis QR.
              </Text>
              <Pressable 
                style={({ pressed }) => [
                  styles.webCloseButton,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={async () => {
                  console.log('Requesting camera permission from Gimcana...');
                  const result = await requestPermission();
                  console.log('Permission result:', result);
                  if (!result.granted) {
                    Alert.alert('Error', 'No s\'ha pogut obtenir el permís de la càmera');
                  }
                }}
              >
                <Text style={styles.webCloseButtonText}>Permetre Càmera</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [
                  styles.webCloseButton, 
                  { backgroundColor: Colors.textSecondary, marginTop: 10 },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => setShowScanner(false)}
              >
                <Text style={styles.webCloseButtonText}>Tancar</Text>
              </Pressable>
            </View>
          ) : (
            /* Amb permisos - Mostrar càmera */
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
              />
              
              {/* Overlay amb marc */}
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraScanArea}>
                  <View style={[styles.cornerTL, styles.corner]} />
                  <View style={[styles.cornerTR, styles.corner]} />
                  <View style={[styles.cornerBL, styles.corner]} />
                  <View style={[styles.cornerBR, styles.corner]} />
                </View>
                <Text style={styles.cameraScanText}>
                  Apunta al codi QR de la gimcana
                </Text>
              </View>

              {/* Botó galeria */}
              <View style={styles.cameraButtons}>
                <TouchableOpacity style={styles.cameraActionButton} onPress={pickImageFromGallery}>
                  <MaterialIcons name="photo-library" size={24} color={Colors.white} />
                  <Text style={styles.cameraActionText}>Galeria</Text>
                </TouchableOpacity>
              </View>

              {scanning && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator size="large" color={Colors.white} />
                  <Text style={styles.scanningText}>Processant...</Text>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal de completat */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            <View style={styles.celebrationIcon}>
              <Text style={{ fontSize: 60 }}>🎉</Text>
            </View>
            
            <Text style={styles.completionTitle}>ENHORABONA!</Text>
            <Text style={styles.completionSubtitle}>
              Has completat la gimcana "{campaign.name}"
            </Text>
            
            <View style={styles.prizeBox}>
              <MaterialIcons 
                name={campaign.prize_type === 'direct' ? 'card-giftcard' : 'emoji-events'} 
                size={40} 
                color={campaign.prize_type === 'direct' ? '#4CAF50' : '#FF9800'} 
              />
              <Text style={styles.prizeBoxTitle}>
                {campaign.prize_type === 'direct' ? 'El teu premi:' : 'Premi del sorteig:'}
              </Text>
              <Text style={styles.prizeBoxDescription}>{campaign.prize_description}</Text>
              {campaign.prize_type === 'raffle' && campaign.raffle_date && (
                <Text style={styles.prizeBoxDate}>
                  Sorteig: {formatDate(campaign.raffle_date)}
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.claimButton}
              onPress={handleEnterRaffle}
            >
              <Text style={styles.claimButtonText}>
                {campaign.prize_type === 'direct' 
                  ? '🎁 Reclamar premi' 
                  : '🎰 Participar al sorteig'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.laterButton}
              onPress={() => setShowCompletionModal(false)}
            >
              <Text style={styles.laterButtonText}>Més tard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de bases */}
      <Modal
        visible={showRulesModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rulesModal}>
            <View style={styles.rulesHeader}>
              <Text style={styles.rulesTitle}>Bases de participació</Text>
              <TouchableOpacity onPress={() => setShowRulesModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.rulesContent}>
              <Text style={styles.rulesText}>
                {campaign.rules || 'No hi ha bases definides per aquesta gimcana.'}
              </Text>
              
              {campaign.rules_url && (
                <TouchableOpacity 
                  style={styles.rulesLinkButton}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open(campaign.rules_url, '_blank');
                    }
                  }}
                >
                  <MaterialIcons name="description" size={20} color={Colors.primary} />
                  <Text style={styles.rulesLinkText}>Veure document complet</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeRulesButton}
              onPress={() => setShowRulesModal(false)}
            >
              <Text style={styles.closeRulesButtonText}>Tancar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de resultat del sorteig */}
      <Modal
        visible={showRaffleResult}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.raffleModal}>
            <View style={styles.rulesHeader}>
              <Text style={styles.rulesTitle}>Resultat del Sorteig</Text>
              <TouchableOpacity onPress={() => setShowRaffleResult(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {raffleResult && (
              <ScrollView style={styles.raffleContent}>
                {raffleResult.is_winner ? (
                  <View style={styles.winnerSection}>
                    <Text style={{ fontSize: 60, textAlign: 'center' }}>🏆</Text>
                    <Text style={styles.winnerTitle}>ENHORABONA!</Text>
                    <Text style={styles.winnerSubtitle}>Has guanyat el sorteig!</Text>
                    <View style={styles.prizeBox}>
                      <Text style={styles.prizeBoxDescription}>{campaign.prize_description}</Text>
                    </View>
                    <Text style={styles.winnerInstructions}>
                      Et contactarem per lliurar-te el premi. Gràcies per participar!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.notWinnerSection}>
                    <Text style={{ fontSize: 40, textAlign: 'center' }}>😊</Text>
                    <Text style={styles.notWinnerTitle}>No has estat seleccionat</Text>
                    <Text style={styles.notWinnerText}>
                      Gràcies per participar! Torna a provar en la propera gimcana.
                    </Text>
                  </View>
                )}
                
                <View style={styles.winnersListSection}>
                  <Text style={styles.winnersListTitle}>Guanyadors:</Text>
                  {raffleResult.winners?.map((winner: any, index: number) => (
                    <View key={index} style={styles.winnerItem}>
                      <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
                      <Text style={styles.winnerItemText}>
                        {winner.position}. {winner.user_name} ({winner.user_email})
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity 
              style={styles.closeRulesButton}
              onPress={() => setShowRaffleResult(false)}
            >
              <Text style={styles.closeRulesButtonText}>Tancar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  infoButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: '#666',
    fontSize: FontSizes.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: '#666',
    marginTop: Spacing.md,
  },
  backButtonLarge: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  campaignImage: {
    width: '100%',
    height: 200,
  },
  progressSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  progressTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Spacing.md,
  },
  progressBarLarge: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressCount: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF8E1',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  completedBannerText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FF9800',
  },
  raffleResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  raffleWinnerBanner: {
    backgroundColor: '#4CAF50',
  },
  raffleResultText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  prizeSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: BorderRadius.lg,
  },
  prizeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  prizeSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#333',
  },
  prizeDescription: {
    fontSize: FontSizes.md,
    color: '#666',
    lineHeight: 22,
  },
  raffleDate: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  prizeImage: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  qrGridSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: BorderRadius.lg,
  },
  qrGridTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Spacing.xs,
  },
  qrGridSubtitle: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.md,
  },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  qrGridItem: {
    width: QR_GRID_SIZE,
    height: QR_GRID_SIZE,
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  qrGridItemScanned: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  qrGridItemText: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  qrGridItemTextScanned: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  datesSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: BorderRadius.lg,
    marginBottom: 100,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateLabel: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  scanButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      },
    }),
  },
  scanButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  scannerModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scannerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#333',
  },
  scannerHint: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  inputRow: {
    marginBottom: Spacing.lg,
  },
  codeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  codeTextInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#333',
    marginLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  codeTextInputFull: {
    flex: 1,
    fontSize: FontSizes.lg,
    color: '#333',
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  submitScanButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  submitScanButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitScanButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  completionModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  celebrationIcon: {
    marginBottom: Spacing.md,
  },
  completionTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: Spacing.sm,
  },
  completionSubtitle: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  prizeBox: {
    backgroundColor: '#FFF8E1',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  prizeBoxTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: '#333',
    marginTop: Spacing.sm,
  },
  prizeBoxDescription: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  prizeBoxDate: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  claimButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  laterButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  laterButtonText: {
    color: '#666',
    fontSize: FontSizes.md,
  },
  rulesModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  rulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: Spacing.md,
  },
  rulesTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#333',
  },
  rulesContent: {
    maxHeight: 300,
  },
  rulesText: {
    fontSize: FontSizes.md,
    color: '#666',
    lineHeight: 24,
  },
  rulesLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
  },
  rulesLinkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  closeRulesButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  closeRulesButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  raffleModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  raffleContent: {
    maxHeight: 400,
  },
  winnerSection: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  winnerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: Spacing.md,
  },
  winnerSubtitle: {
    fontSize: FontSizes.lg,
    color: '#666',
    marginBottom: Spacing.lg,
  },
  winnerInstructions: {
    fontSize: FontSizes.sm,
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  notWinnerSection: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  notWinnerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#666',
    marginTop: Spacing.md,
  },
  notWinnerText: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  winnersListSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.md,
  },
  winnersListTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Spacing.sm,
  },
  winnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  winnerItemText: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  // Estils per a l'escàner de càmera
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  scannerHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraScanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  cameraScanText: {
    marginTop: Spacing.xl,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cameraButtons: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  cameraActionButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  cameraActionText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  // Estils per missatge web
  webMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: '#F5F5F5',
  },
  webMessageTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  webMessageText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  webMessageHint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  webCloseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  webCloseButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
