import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface GimcanaCampaign {
  _id: string;
  name: string;
  description: string;
  total_qr_codes: number;
  start_date: string;
  end_date: string;
  prize_description: string;
  rules: string;
  is_active: boolean;
  stats: {
    participants: number;
    completed: number;
  };
}

interface QRItem {
  id: number;
  name: string;
  location_hint: string;
}

export default function GimcanaAdminPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [campaigns, setCampaigns] = useState<GimcanaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<GimcanaCampaign | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    prize_type: 'raffle' as 'direct' | 'raffle',
    prize_description: '',
    prize_image_url: '',
    rules: '',
    rules_url: '',
    image_url: '',
    raffle_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
  });
  
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [qrCount, setQrCount] = useState('15');

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Funció per seleccionar i pujar imatge
  const pickImage = async (field: 'image_url' | 'prize_image_url') => {
    try {
      // Demanar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        const msg = 'Cal permís per accedir a la galeria de fotos';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Permís necessari', msg);
        return;
      }
      
      // Obrir selector d'imatges
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: field === 'image_url' ? [16, 9] : [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        
        const asset = result.assets[0];
        
        // Crear FormData per pujar la imatge
        const formDataUpload = new FormData();
        
        if (Platform.OS === 'web') {
          // A web, convertim base64 a blob
          const base64Response = await fetch(`data:image/jpeg;base64,${asset.base64}`);
          const blob = await base64Response.blob();
          formDataUpload.append('file', blob, 'gimcana_image.jpg');
        } else {
          // A mòbil
          formDataUpload.append('file', {
            uri: asset.uri,
            type: 'image/jpeg',
            name: 'gimcana_image.jpg',
          } as any);
        }
        
        // Pujar la imatge
        const uploadResponse = await api.post('/upload', formDataUpload, {
          headers: {
            Authorization: token,
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (uploadResponse.data.url) {
          setFormData(prev => ({ ...prev, [field]: uploadResponse.data.url }));
          const msg = 'Imatge pujada correctament!';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
        }
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const msg = error.response?.data?.detail || 'Error pujant la imatge';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/gimcana/campaigns', {
        headers: { Authorization: token },
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      prize_type: 'raffle',
      prize_description: '',
      prize_image_url: '',
      rules: '',
      rules_url: '',
      image_url: '',
      raffle_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
    });
    setQrItems([]);
    setQrCount('15');
    setEditingCampaign(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (campaign: GimcanaCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      prize_type: (campaign as any).prize_type || 'raffle',
      prize_description: campaign.prize_description || '',
      prize_image_url: (campaign as any).prize_image_url || '',
      rules: campaign.rules || '',
      rules_url: (campaign as any).rules_url || '',
      image_url: (campaign as any).image_url || '',
      raffle_date: (campaign as any).raffle_date?.split('T')[0] || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: campaign.is_active,
    });
    setQrCount(campaign.total_qr_codes.toString());
    setShowModal(true);
  };

  const handleNextStep = () => {
    if (!formData.name) {
      const msg = 'El nom de la gimcana és obligatori';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }
    
    const count = parseInt(qrCount) || 15;
    if (count < 1 || count > 100) {
      const msg = 'La quantitat de QR ha de ser entre 1 i 100';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }
    
    // Generar llista de QR items
    const items: QRItem[] = [];
    for (let i = 0; i < count; i++) {
      items.push({
        id: i + 1,
        name: `Punt ${i + 1}`,
        location_hint: '',
      });
    }
    setQrItems(items);
    setShowModal(false);
    setShowQRModal(true);
  };

  const updateQRItem = (index: number, field: 'name' | 'location_hint', value: string) => {
    const newItems = [...qrItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setQrItems(newItems);
  };

  const handleSave = async () => {
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        total_qr_codes: qrItems.length,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        prize_type: formData.prize_type,
        prize_description: formData.prize_description,
        prize_image_url: formData.prize_image_url || null,
        rules: formData.rules,
        rules_url: formData.rules_url || null,
        image_url: formData.image_url || null,
        raffle_date: formData.prize_type === 'raffle' ? new Date(formData.raffle_date).toISOString() : null,
        is_active: formData.is_active,
        qr_items: qrItems.map(item => ({
          establishment_name: item.name,
          location_hint: item.location_hint,
        })),
      };

      let campaignId: string;
      
      if (editingCampaign) {
        await api.put(`/gimcana/campaigns/${editingCampaign._id}`, data, {
          headers: { Authorization: token },
        });
        campaignId = editingCampaign._id;
        const msg = 'Gimcana actualitzada correctament';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
      } else {
        const response = await api.post('/gimcana/campaigns', data, {
          headers: { Authorization: token },
        });
        campaignId = response.data.campaign_id;
        const msg = `Gimcana creada amb ${qrItems.length} codis QR`;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
      }

      setShowQRModal(false);
      resetForm();
      loadCampaigns();
      
      // Preguntar si vol descarregar el PDF
      if (Platform.OS === 'web') {
        if (window.confirm('Vols descarregar el PDF amb els codis QR?')) {
          generatePDF(campaignId);
        }
      }
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      const msg = error.response?.data?.detail || 'Error guardant la gimcana';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const generatePDF = async (campaignId: string) => {
    setGeneratingPDF(true);
    
    try {
      // Obtenir els QR codes de la campanya
      const response = await api.get(`/gimcana/campaigns/${campaignId}/qr-codes`, {
        headers: { Authorization: token },
      });
      
      const qrCodes = response.data;
      
      if (Platform.OS === 'web') {
        // A web, usem la llibreria qrcode per generar els QR i crear un HTML per imprimir
        const QRCode = (await import('qrcode')).default;
        
        // Crear contingut HTML per imprimir
        let htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Codis QR - Gimcana</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .qr-container { 
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                gap: 20px; 
                page-break-inside: avoid;
              }
              .qr-item { 
                text-align: center; 
                padding: 10px; 
                border: 1px solid #ddd; 
                border-radius: 8px;
                page-break-inside: avoid;
              }
              .qr-image { width: 150px; height: 150px; }
              .qr-name { font-weight: bold; margin-top: 5px; font-size: 12px; }
              .qr-hint { color: #666; font-size: 10px; }
              .qr-code { font-family: monospace; font-size: 8px; color: #999; margin-top: 3px; }
              @media print {
                .qr-container { page-break-inside: avoid; }
                .qr-item { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <h1>Codis QR - ${formData.name}</h1>
            <div class="qr-container">
        `;
        
        for (const qr of qrCodes) {
          const qrDataUrl = await QRCode.toDataURL(qr.code, {
            width: 200,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
          
          htmlContent += `
            <div class="qr-item">
              <img src="${qrDataUrl}" class="qr-image" />
              <div class="qr-name">${qr.number}. ${qr.establishment_name}</div>
              ${qr.location_hint ? `<div class="qr-hint">${qr.location_hint}</div>` : ''}
              <div class="qr-code">${qr.code}</div>
            </div>
          `;
        }
        
        htmlContent += `
            </div>
          </body>
          </html>
        `;
        
        // Obrir finestra d'impressió
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        }
        
        const msg = 'S\'ha obert la finestra d\'impressió. Pots guardar com a PDF!';
        window.alert(msg);
      } else {
        Alert.alert('Avís', 'Per generar el PDF, accedeix des de la versió web');
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      const msg = 'Error generant el PDF';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/gimcana/campaigns/${campaignId}`, {
          headers: { Authorization: token },
        });
        loadCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Estàs segur que vols eliminar aquesta gimcana? S\'eliminaran tots els QR codes i el progrés dels usuaris.')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmar',
        'Estàs segur que vols eliminar aquesta gimcana?',
        [
          { text: 'Cancel·lar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const handleDownloadPDF = async (campaign: GimcanaCampaign) => {
    setFormData(prev => ({ ...prev, name: campaign.name }));
    await generatePDF(campaign._id);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isActive = (campaign: GimcanaCampaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return campaign.is_active && now >= start && now <= end;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Gimcanes QR</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Gimcanes QR</Text>
        <Pressable style={styles.addButton} onPress={handleCreate}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      {generatingPDF && (
        <View style={styles.pdfOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.pdfText}>Generant PDF...</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="qr-code-2" size={64} color="#999" />
            <Text style={styles.emptyTitle}>No hi ha gimcanes</Text>
            <Text style={styles.emptyText}>
              Clica el botó + per crear una nova gimcana amb QR codes
            </Text>
          </View>
        ) : (
          campaigns.map(campaign => (
            <Pressable
              key={campaign._id}
              style={styles.campaignCard}
              onPress={() => router.push(`/admin/gimcana/${campaign._id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <MaterialIcons name="qr-code-2" size={24} color={Colors.primary} />
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isActive(campaign) ? '#4CAF50' : '#999' }
                ]}>
                  <Text style={styles.statusText}>
                    {isActive(campaign) ? 'Activa' : 'Inactiva'}
                  </Text>
                </View>
              </View>

              {campaign.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {campaign.description}
                </Text>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialIcons name="qr-code" size={18} color={Colors.primary} />
                  <Text style={styles.statText}>{campaign.total_qr_codes} QR</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="people" size={18} color="#2196F3" />
                  <Text style={styles.statText}>{campaign.stats.participants} participants</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="emoji-events" size={18} color="#FF9800" />
                  <Text style={styles.statText}>{campaign.stats.completed} completats</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <MaterialIcons name="date-range" size={16} color="#666" />
                <Text style={styles.dateText}>
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEdit(campaign);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color={Colors.primary} />
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF(campaign);
                  }}
                >
                  <MaterialIcons name="picture-as-pdf" size={20} color="#E53935" />
                  <Text style={[styles.actionText, { color: '#E53935' }]}>PDF</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/gimcana/${campaign._id}`);
                  }}
                >
                  <MaterialIcons name="settings" size={20} color="#2196F3" />
                  <Text style={[styles.actionText, { color: '#2196F3' }]}>Gestionar</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(campaign._id);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Eliminar</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Modal 1: Dades bàsiques de la gimcana */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCampaign ? 'Editar Gimcana' : 'Nova Gimcana'}
              </Text>
              <Pressable onPress={() => { setShowModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nom de la gimcana *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Ex: Gimcana dels Follets Coia i Pere"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Descripció</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Descripció de la gimcana..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Quantitat de QR codes *</Text>
              <TextInput
                style={styles.input}
                value={qrCount}
                onChangeText={setQrCount}
                placeholder="15"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Data d'inici</Text>
              <TextInput
                style={styles.input}
                value={formData.start_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Data de fi</Text>
              <TextInput
                style={styles.input}
                value={formData.end_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              {/* Imatge de la campanya */}
              <Text style={styles.label}>Imatge de la campanya</Text>
              <Pressable 
                style={styles.imagePickerButton}
                onPress={() => pickImage('image_url')}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : formData.image_url ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: formData.image_url }} style={styles.imagePreview} />
                    <Pressable 
                      style={styles.removeImageButton}
                      onPress={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    >
                      <MaterialIcons name="close" size={16} color={Colors.white} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={40} color={Colors.primary} />
                    <Text style={styles.imagePickerText}>Toca per afegir imatge</Text>
                    <Text style={styles.imagePickerHint}>Format recomanat: 16:9</Text>
                  </View>
                )}
              </Pressable>

              {/* Tipus de premi */}
              <Text style={styles.label}>Tipus de premi *</Text>
              <View style={styles.prizeTypeContainer}>
                <Pressable
                  style={[
                    styles.prizeTypeButton,
                    formData.prize_type === 'direct' && styles.prizeTypeButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, prize_type: 'direct' }))}
                >
                  <MaterialIcons 
                    name="card-giftcard" 
                    size={24} 
                    color={formData.prize_type === 'direct' ? Colors.white : Colors.primary} 
                  />
                  <Text style={[
                    styles.prizeTypeText,
                    formData.prize_type === 'direct' && styles.prizeTypeTextActive
                  ]}>Premi Directe</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.prizeTypeButton,
                    formData.prize_type === 'raffle' && styles.prizeTypeButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, prize_type: 'raffle' }))}
                >
                  <MaterialIcons 
                    name="emoji-events" 
                    size={24} 
                    color={formData.prize_type === 'raffle' ? Colors.white : '#FF9800'} 
                  />
                  <Text style={[
                    styles.prizeTypeText,
                    formData.prize_type === 'raffle' && styles.prizeTypeTextActive
                  ]}>Sorteig</Text>
                </Pressable>
              </View>
              <Text style={styles.prizeTypeHint}>
                {formData.prize_type === 'direct' 
                  ? '🎁 El premi es rep automàticament al completar la gimcana'
                  : '🎰 Els participants entren en un sorteig que es realitzarà posteriorment'}
              </Text>

              {/* Data del sorteig (només si és sorteig) */}
              {formData.prize_type === 'raffle' && (
                <>
                  <Text style={styles.label}>Data del sorteig</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.raffle_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, raffle_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                  />
                </>
              )}

              <Text style={styles.label}>Descripció del premi</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.prize_description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, prize_description: text }))}
                placeholder={formData.prize_type === 'direct' 
                  ? "Ex: Descompte del 10% a tots els establiments participants!"
                  : "Ex: Entra en el sorteig de 3 vals de 50€!"}
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />

              <Text style={styles.label}>Bases de participació (text)</Text>
              <TextInput
                style={[styles.input, { height: 100 }]}
                value={formData.rules}
                onChangeText={(text) => setFormData(prev => ({ ...prev, rules: text }))}
                placeholder="Condicions i regles de participació..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>URL document de bases (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.rules_url}
                onChangeText={(text) => setFormData(prev => ({ ...prev, rules_url: text }))}
                placeholder="https://... (enllaç a PDF de bases)"
                placeholderTextColor="#999"
              />

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              >
                <MaterialIcons
                  name={formData.is_active ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Gimcana activa</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => { setShowModal(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNextStep}>
                <Text style={styles.nextButtonText}>Següent: Configurar QR</Text>
                <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Configurar els QR codes */}
      <Modal visible={showQRModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => { setShowQRModal(false); setShowModal(true); }}>
                <MaterialIcons name="arrow-back" size={24} color="#333" />
              </Pressable>
              <Text style={styles.modalTitle}>Configurar QR Codes ({qrItems.length})</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.qrInstructions}>
                Defineix el nom de cada punt i opcionalment una pista d'ubicació.
                Després podràs descarregar un PDF amb tots els QR per imprimir.
              </Text>
              
              {qrItems.map((item, index) => (
                <View key={item.id} style={styles.qrItemCard}>
                  <View style={styles.qrItemNumber}>
                    <Text style={styles.qrItemNumberText}>{item.id}</Text>
                  </View>
                  <View style={styles.qrItemInputs}>
                    <TextInput
                      style={styles.qrItemInput}
                      value={item.name}
                      onChangeText={(text) => updateQRItem(index, 'name', text)}
                      placeholder={`Nom del punt ${item.id}`}
                      placeholderTextColor="#999"
                    />
                    <TextInput
                      style={[styles.qrItemInput, styles.qrItemHint]}
                      value={item.location_hint}
                      onChangeText={(text) => updateQRItem(index, 'location_hint', text)}
                      placeholder="Pista d'ubicació (opcional)"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => { setShowQRModal(false); setShowModal(true); }}
              >
                <Text style={styles.cancelButtonText}>Enrere</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <MaterialIcons name="save" size={20} color={Colors.white} />
                <Text style={styles.saveButtonText}>Crear i Descarregar PDF</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pdfOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pdfText: { color: Colors.white, fontSize: FontSizes.lg, marginTop: Spacing.md },
  content: { flex: 1, padding: Spacing.md },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: '#333', marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: '#666', textAlign: 'center', marginTop: Spacing.sm },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  campaignName: { fontSize: FontSizes.lg, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: { color: Colors.white, fontSize: FontSizes.xs, fontWeight: 'bold' },
  description: { fontSize: FontSizes.sm, color: '#555', marginBottom: Spacing.md },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statText: { fontSize: FontSizes.sm, color: '#555' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  dateText: { fontSize: FontSizes.sm, color: '#666' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: Spacing.md,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.xs },
  actionText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.md },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'center' },
  modalBody: { padding: Spacing.lg, maxHeight: 400 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: '#333', marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  checkboxLabel: { fontSize: FontSizes.md, color: '#333' },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#999',
  },
  cancelButtonText: { color: '#666', fontSize: FontSizes.md },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  nextButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
  qrInstructions: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.lg,
    lineHeight: 20,
    backgroundColor: '#FFF9C4',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  qrItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  qrItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  qrItemNumberText: { color: Colors.white, fontWeight: 'bold' },
  qrItemInputs: { flex: 1 },
  qrItemInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: Spacing.xs,
  },
  qrItemHint: { fontSize: FontSizes.xs },
  prizeTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  prizeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  prizeTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  prizeTypeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  prizeTypeTextActive: {
    color: Colors.white,
  },
  prizeTypeHint: {
    fontSize: FontSizes.xs,
    color: '#666',
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
});
