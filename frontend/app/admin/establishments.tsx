import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { establishmentsService, adminService } from '../../src/services/api';
import type { Establishment } from '../../src/types';

export default function AdminEstablishments() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState<Establishment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [managementModalVisible, setManagementModalVisible] = useState(false);
  const [managingEstablishment, setManagingEstablishment] = useState<Establishment | null>(null);
  const [collaborationModalVisible, setCollaborationModalVisible] = useState(false);
  const [collaborationText, setCollaborationText] = useState('');
  const [editingItem, setEditingItem] = useState<Establishment | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    commercial_name: '',
    description: '',
    category: '',
    subcategory: '',
    address: '',
    postal_code: '',
    phone: '',
    whatsapp: '',
    website: '',
    email: '',
    nif: '',
    image_url: '',
    latitude: '',
    longitude: '',
    external_id: '',
    partner_id: '',
    google_maps_url: '',
    video_url: '',
    video_url_2: '',
    // Xarxes socials
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    // Camps nous de l'Excel
    status: '',
    vat_number: '',
    iban: '',
    collectiu: '',
    quota: '',
    logo_url: '',
    imatge1_url: '',
    imatge2_url: '',
    web_url: '',
    tourvirtual_url: '',
    altres_categories: '',
    lbac: '',
    tiquets: '',
    gimcana: '',
    tombs: '',
  });
  
  const [ownerEmail, setOwnerEmail] = useState('');
  const [currentOwner, setCurrentOwner] = useState<any>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);

  useEffect(() => {
    if (token) {
      loadEstablishments();
    }
  }, [token]);

  useEffect(() => {
    filterEstablishments();
  }, [searchQuery, establishments]);

  const filterEstablishments = () => {
    if (!searchQuery.trim()) {
      setFilteredEstablishments(establishments);
      return;
    }

    // Funció per normalitzar text (eliminar accents)
    const normalize = (text: string) => {
      return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const query = normalize(searchQuery);
    const filtered = establishments.filter(
      (est) =>
        normalize(est.name).includes(query) ||
        normalize(est.category || '').includes(query) ||
        normalize(est.address || '').includes(query) ||
        normalize(est.nif || '').includes(query)
    );
    setFilteredEstablishments(filtered);
  };

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      
      // Verificar que tenim token
      if (!token) {
        console.error('No token available');
        return;
      }
      
      // Usar endpoint d'admin per obtenir TOTS els establiments (incloent tancats)
      console.log('Loading establishments with admin endpoint...');
      const data = await adminService.establishments.getAll(token);
      console.log('Establishments loaded:', data.length);
      
      // Assegurar que tots tenen el camp 'id' correcte
      const normalizedData = data.map((est: any) => ({
        ...est,
        id: est.id || est._id,
      }));
      setEstablishments(normalizedData);
      setFilteredEstablishments(normalizedData);
    } catch (error: any) {
      console.error('Error loading establishments:', error);
      console.error('Error response:', error.response?.data);
      // No mostrar alert per no bloquejar en web
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!token) {
        Alert.alert('Error', 'No tens permisos per exportar');
        return;
      }

      setLoading(true);

      // Generar nom del fitxer amb data actual
      const fileName = `establiments_correus_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Construir la URL completa del backend
      const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const downloadUrl = `${backendUrl}/api/admin/establishments/export-emails`;
      
      console.log('Descarregant Excel de:', downloadUrl);

      // Descarregar directament a través de FileSystem
      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        fileUri,
        {
          headers: {
            'Authorization': token,
          }
        }
      );

      setLoading(false);

      if (downloadResult.status === 200) {
        // Compartir el fitxer
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Exportar correus d\'establiments',
            UTI: 'com.microsoft.excel.xlsx',
          });
        } else {
          Alert.alert('Èxit', `Fitxer guardat a: ${fileUri}`);
        }
      } else {
        Alert.alert('Error', 'No s\'ha pogut descarregar el fitxer');
      }

    } catch (error: any) {
      setLoading(false);
      console.error('Error exportant Excel:', error);
      Alert.alert(
        'Error',
        error.message || 'No s\'ha pogut exportar el fitxer Excel'
      );
    }
  };


  const handleExportPDF = async () => {
    try {
      const dataToExport = searchQuery ? filteredEstablishments : establishments;
      
      if (dataToExport.length === 0) {
        Alert.alert('Error', 'No hi ha establiments per exportar');
        return;
      }

      // HTML per al PDF amb suport per múltiples pàgines
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Llistat d'Establiments - REUS COMERÇ i FUTUR</title>
            <style>
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                thead {
                  display: table-header-group !important;
                }
                tfoot {
                  display: table-footer-group !important;
                }
                tr {
                  page-break-inside: avoid !important;
                }
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: Arial, Helvetica, sans-serif;
                padding: 10px;
                font-size: 9px;
                line-height: 1.2;
                color: #333;
              }
              h1 {
                color: #C8102E;
                text-align: center;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .header-info {
                text-align: center;
                margin-bottom: 10px;
                color: #666;
                font-size: 10px;
              }
              .header-info p {
                margin: 2px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 8px;
              }
              thead {
                display: table-header-group;
              }
              tbody {
                display: table-row-group;
              }
              tr {
                page-break-inside: avoid;
              }
              th {
                background-color: #C8102E !important;
                color: white !important;
                padding: 4px 3px;
                text-align: left;
                font-weight: bold;
                font-size: 8px;
                border: 1px solid #C8102E;
              }
              td {
                border: 1px solid #ccc;
                padding: 3px;
                font-size: 8px;
                word-wrap: break-word;
                overflow: hidden;
                vertical-align: top;
              }
              tr:nth-child(even) {
                background-color: #f5f5f5 !important;
              }
              th:nth-child(1), td:nth-child(1) { width: 20%; }
              th:nth-child(2), td:nth-child(2) { width: 11%; }
              th:nth-child(3), td:nth-child(3) { width: 13%; }
              th:nth-child(4), td:nth-child(4) { width: 23%; }
              th:nth-child(5), td:nth-child(5) { width: 11%; }
              th:nth-child(6), td:nth-child(6) { width: 22%; }
              .footer {
                margin-top: 15px;
                text-align: center;
                font-size: 7px;
                color: #999;
                page-break-inside: avoid;
              }
              .no-print {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
              }
              .no-print button {
                background: #C8102E;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
                border-radius: 5px;
                margin-left: 10px;
              }
              .no-print button:hover {
                background: #a00d24;
              }
              @media print {
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="no-print">
              <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
              <button onclick="window.close()">✕ Tancar</button>
            </div>
            <h1>Llistat d'Establiments</h1>
            <div class="header-info">
              <p><strong>REUS COMERÇ i FUTUR</strong></p>
              <p>Total d'establiments: ${dataToExport.length}</p>
              <p>Data: ${new Date().toLocaleDateString('ca-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${searchQuery ? `<p>Filtrat per: "${searchQuery}"</p>` : ''}
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>NIF</th>
                  <th>Categoria</th>
                  <th>Adreça</th>
                  <th>Telèfon</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                ${dataToExport.map(est => `
                  <tr>
                    <td>${(est.name || '-').substring(0, 35)}</td>
                    <td>${est.nif || '-'}</td>
                    <td>${(est.category || '-').substring(0, 18)}</td>
                    <td>${(est.address || '-').substring(0, 45)}</td>
                    <td>${est.phone || '-'}</td>
                    <td>${(est.email || '-').substring(0, 35)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Document generat per l'aplicació REUS COMERÇ i FUTUR</p>
              <p>© ${new Date().getFullYear()} REUS COMERÇ i FUTUR - Tots els drets reservats</p>
            </div>
          </body>
        </html>
      `;

      // A web, obrir una nova finestra amb el contingut per imprimir
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          // Donar temps a carregar els estils
          setTimeout(() => {
            printWindow.focus();
          }, 500);
        } else {
          Alert.alert('Error', 'No s\'ha pogut obrir la finestra d\'impressió. Comprova que el navegador permet pop-ups.');
        }
        return;
      }

      // Per a mòbil, utilitzar expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      Alert.alert(
        'PDF Generat',
        'El PDF s\'ha generat correctament. Vols compartir-lo?',
        [
          {
            text: 'Cancel·lar',
            style: 'cancel',
          },
          {
            text: 'Compartir',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
              } else {
                Alert.alert('Error', 'No es pot compartir el fitxer en aquest dispositiu');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'No s\'ha pogut generar el PDF');
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      commercial_name: '',
      description: '',
      category: '',
      subcategory: '',
      address: '',
      postal_code: '',
      phone: '',
      whatsapp: '',
      website: '',
      email: '',
      nif: '',
      image_url: '',
      latitude: '',
      longitude: '',
      external_id: '',
      partner_id: '',
      google_maps_url: '',
      video_url: '',
      video_url_2: '',
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (item: Establishment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      commercial_name: item.commercial_name || '',
      description: item.description || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      address: item.address || '',
      postal_code: item.postal_code || '',
      phone: item.phone || '',
      whatsapp: item.whatsapp || '',
      website: item.website || '',
      email: item.email || '',
      nif: item.nif || '',
      image_url: item.image_url || '',
      latitude: item.latitude?.toString() || '',
      longitude: item.longitude?.toString() || '',
      external_id: item.external_id || '',
      partner_id: item.partner_id || '',
      google_maps_url: item.google_maps_url || '',
      video_url: item.video_url || '',
      video_url_2: item.video_url_2 || '',
      facebook: item.social_media?.facebook || '',
      instagram: item.social_media?.instagram || '',
      twitter: item.social_media?.twitter || '',
      youtube: item.social_media?.youtube || '',
    });
    // Carregar propietari actual
    loadCurrentOwner(item.id);
    setModalVisible(true);
  };

  
  const loadCurrentOwner = async (establishmentId: string) => {
    try {
      setLoadingOwner(true);
      const EXPO_BACKEND_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${EXPO_BACKEND_URL}/api/admin/establishments/${establishmentId}/owner`, {
        headers: {
          'Authorization': token || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.owner) {
          setCurrentOwner(data.owner);
          setOwnerEmail(data.owner.email);
        } else {
          setCurrentOwner(null);
          setOwnerEmail('');
        }
      }
    } catch (error) {
      console.error('Error loading owner:', error);
    } finally {
      setLoadingOwner(false);
    }
  };
  
  const handleAssignOwner = async () => {
    if (!editingItem || !ownerEmail.trim()) {
      Alert.alert('Error', 'Si us plau, introdueix un email vàlid');
      return;
    }
    
    try {
      setLoadingOwner(true);
      const EXPO_BACKEND_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(
        `${EXPO_BACKEND_URL}/api/admin/establishments/${editingItem.id}/assign-owner?owner_email=${encodeURIComponent(ownerEmail)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': token || '',
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('Èxit', data.message || 'Propietari assignat correctament');
        loadCurrentOwner(editingItem.id);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'No s\'ha pogut assignar el propietari');
      }
    } catch (error) {
      console.error('Error assigning owner:', error);
      Alert.alert('Error', 'No s\'ha pogut assignar el propietari');
    } finally {
      setLoadingOwner(false);
    }
  };


  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permís requerit', 'Necessites donar permís per accedir a les imatges');
        return;
      }

      // Obrir selector - SIN aspect ni edició per no retallar res
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // NO editar = imatge completa
        quality: 0.6, // Qualitat mitjana per equilibrar mida/qualitat
        base64: true,
        exif: false, // No dades EXIF per reduir mida
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploadingImage(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData({ ...formData, image_url: base64Image });
        
        // Log de la mida per debug
        const sizeKB = (result.assets[0].base64.length * 0.75) / 1024;
        console.log(`Imatge carregada: ${sizeKB.toFixed(0)}KB`);
        
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No s\'ha pogut seleccionar la imatge');
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'El nom és obligatori');
      return;
    }

    try {
      // Preparar xarxes socials com a objecte
      const social_media: Record<string, string> = {};
      if (formData.facebook) social_media.facebook = formData.facebook;
      if (formData.instagram) social_media.instagram = formData.instagram;
      if (formData.twitter) social_media.twitter = formData.twitter;
      if (formData.youtube) social_media.youtube = formData.youtube;

      // Preparar dades per enviar (eliminar camps individuals de xarxes socials)
      const dataToSend = {
        name: formData.name,
        commercial_name: formData.commercial_name || undefined,
        description: formData.description || undefined,
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        address: formData.address || undefined,
        postal_code: formData.postal_code || undefined,
        phone: formData.phone || undefined,
        whatsapp: formData.whatsapp || undefined,
        website: formData.website || undefined,
        email: formData.email || undefined,
        nif: formData.nif || undefined,
        image_url: formData.image_url || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        external_id: formData.external_id || undefined,
        partner_id: formData.partner_id || undefined,
        google_maps_url: formData.google_maps_url || undefined,
        video_url: formData.video_url || undefined,
        video_url_2: formData.video_url_2 || undefined,
        social_media: Object.keys(social_media).length > 0 ? social_media : undefined,
        // Camps nous
        status: formData.status || undefined,
        vat_number: formData.vat_number || undefined,
        iban: formData.iban || undefined,
        collectiu: formData.collectiu || undefined,
        quota: formData.quota || undefined,
        logo_url: formData.logo_url || undefined,
        imatge1_url: formData.imatge1_url || undefined,
        imatge2_url: formData.imatge2_url || undefined,
        web_url: formData.web_url || undefined,
        tourvirtual_url: formData.tourvirtual_url || undefined,
        altres_categories: formData.altres_categories || undefined,
        lbac: formData.lbac || undefined,
        tiquets: formData.tiquets || undefined,
        gimcana: formData.gimcana || undefined,
        tombs: formData.tombs || undefined,
      };

      if (editingItem) {
        // Update
        await adminService.establishments.update(token!, editingItem.id, dataToSend);
        Alert.alert('Èxit', 'Establiment actualitzat correctament');
      } else {
        // Create
        await adminService.establishments.create(token!, dataToSend);
        Alert.alert('Èxit', 'Establiment creat correctament');
      }
      setModalVisible(false);
      loadEstablishments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut guardar l\'establiment');
    }
  };

  const handleManage = (item: Establishment) => {
    setManagingEstablishment(item);
    setManagementModalVisible(true);
  };

  const handleSetEstablishmentType = async (type: string) => {
    if (!managingEstablishment) return;

    try {
      // Configuració segons el tipus
      let updateData: any = {
        ...managingEstablishment,
        establishment_type: type,
      };

      // Lògica específica per cada tipus
      if (type === 'local_associat' || type === 'patrocinador') {
        // Local associat i patrocinador: visibles a tot arreu (mapa, directori, cerca)
        updateData.visible_in_public_list = true;
        updateData.status = 'active';
        
        await saveEstablishmentType(updateData);
        return;
      } else if (type === 'local_tancat') {
        // Local tancat: NO visible enlloc públic, només al panel d'administració
        updateData.visible_in_public_list = false;
        updateData.status = 'closed';
        
        console.log(`Setting establishment to closed - only visible in admin panel`);
        await saveEstablishmentType(updateData);
        return;
      } else if (type === 'local_no_soci') {
        // Local no soci: completament no visible
        updateData.visible_in_public_list = false;
        updateData.status = 'inactive';
        
        console.log(`Setting establishment to inactive - not visible anywhere`);
        await saveEstablishmentType(updateData);
        return;
      } else if (type === 'altres') {
        // Altres: preguntar tipus de col·laboració i visibilitat
        setCollaborationText('');
        setManagementModalVisible(false);
        setCollaborationModalVisible(true);
        return;
      }

      // Actualitzar rol del propietari si existeix
      if (managingEstablishment.owner_id && (type === 'local_associat' || type === 'patrocinador')) {
        const newRole = type === 'local_associat' ? 'local_associat' : 'patrocinador';
        // TODO: Cridar endpoint per actualitzar el rol del user
        // await adminService.updateUserRole(managingEstablishment.owner_id, newRole, token);
      }

      await saveEstablishmentType(updateData);
    } catch (error) {
      console.error('Error updating establishment type:', error);
      // Just log the error, don't block with Alert in web
    }
  };

  const saveEstablishmentType = async (updateData: any) => {
    try {
      await establishmentsService.update(updateData.id, updateData, token || '');
      
      Alert.alert('Èxit', `Establiment actualitzat: ${getTypeLabel(updateData.establishment_type)}`);
      setManagementModalVisible(false);
      loadEstablishments();
    } catch (error) {
      console.error('Error saving establishment:', error);
      Alert.alert('Error', 'No s\'ha pogut guardar els canvis');
    }
  };

  const handleCollaborationSubmit = async (visible: boolean) => {
    if (!collaborationText.trim()) {
      Alert.alert('Error', 'Cal especificar el tipus de col·laboració');
      return;
    }

    if (!managingEstablishment) return;

    const updateData = {
      ...managingEstablishment,
      establishment_type: 'altres',
      collaboration_type: collaborationText,
      visible_in_public_list: visible,
    };

    setCollaborationModalVisible(false);
    await saveEstablishmentType(updateData);
  };

  const getTypeLabel = (type: string | null | undefined) => {
    switch (type) {
      case 'local_associat': return 'Local Associat';
      case 'local_no_soci': return 'Local No Soci';
      case 'local_tancat': return 'Local Tancat';
      case 'patrocinador': return 'Patrocinador';
      case 'altres': return 'Altres';
      default: return 'Sense classificar';
    }
  };

  const handleDelete = (item: Establishment) => {
    Alert.alert(
      'Confirmar eliminació',
      `Estàs segur que vols eliminar "${item.name}"?`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.establishments.delete(token!, item.id);
              Alert.alert('Èxit', 'Establiment eliminat correctament');
              loadEstablishments();
            } catch (error) {
              Alert.alert('Error', 'No s\'ha pogut eliminar l\'establiment');
            }
          },
        },
      ]
    );
  };

  const handleImportExcel = async () => {
    Alert.alert(
      'Importar des d\'Excel',
      'Selecciona la categoria per als establiments que importaràs:',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Restauració',
          onPress: () => pickAndUploadExcel('Restauració'),
        },
        {
          text: 'Comerç i Serveis',
          onPress: () => pickAndUploadExcel('Comerç i Serveis'),
        },
        {
          text: 'Sense categoria',
          onPress: () => pickAndUploadExcel(''),
        },
      ]
    );
  };

  const pickAndUploadExcel = async (category: string) => {
    try {
      // Seleccionar fitxer Excel
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file.uri) {
        Alert.alert('Error', 'No s\'ha pogut obtenir el fitxer');
        return;
      }

      setLoading(true);

      // Crear FormData amb Fetch API (millor suport en React Native)
      const formData = new FormData();
      
      // Afegir fitxer (format específic per React Native)
      const fileToUpload: any = {
        uri: file.uri,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: file.name,
      };
      formData.append('file', fileToUpload);
      
      // Afegir categoria (opcional, per si no es detecta per color)
      formData.append('category', category || '');

      // Usar Fetch en lloc d'axios per millor compatibilitat amb React Native
      const apiUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/admin/import-establishments`, {
        method: 'POST',
        headers: {
          'Authorization': token!,
          // NO establir Content-Type - el navegador ho fa automàticament amb boundary correcte
        },
        body: formData,
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        throw new Error(data.detail || 'Error en la importació');
      }

      if (data.success) {
        Alert.alert(
          'Importació completada',
          `✅ Importats: ${data.imported}\n⚠️  Saltats: ${data.skipped}\n${data.errors.length > 0 ? `❌ Errors: ${data.errors.length}` : ''}`,
          [
            {
              text: 'Veure establiments',
              onPress: () => loadEstablishments(),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No s\'ha pogut completar la importació');
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Error importació Excel:', error);
      Alert.alert(
        'Error',
        error.message || 'No s\'ha pogut importar el fitxer Excel'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Gestió d'Establiments</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.headerButtonsScroll}
          contentContainerStyle={styles.headerButtons}
        >
          <Pressable onPress={handleExportExcel} style={styles.exportExcelButton}>
            <MaterialIcons name="table-chart" size={22} color={Colors.white} />
          </Pressable>
          <Pressable onPress={handleExportPDF} style={styles.exportButton}>
            <MaterialIcons name="picture-as-pdf" size={22} color={Colors.white} />
          </Pressable>
          <Pressable onPress={handleImportExcel} style={styles.importButton}>
            <MaterialIcons name="upload-file" size={22} color={Colors.white} />
          </Pressable>
          <Pressable onPress={handleCreate} style={styles.addButton}>
            <MaterialIcons name="add" size={22} color={Colors.white} />
          </Pressable>
        </ScrollView>
      </View>

      {/* Cercador */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cercar per nom, categoria, adreça o NIF..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Resultats de la cerca */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredEstablishments.length} {filteredEstablishments.length === 1 ? 'resultat' : 'resultats'}
          </Text>
          {filteredEstablishments.length > 0 && (
            <TouchableOpacity 
              style={styles.pdfButton}
              onPress={handleExportPDF}
              activeOpacity={0.7}
            >
              <MaterialIcons name="picture-as-pdf" size={20} color={Colors.white} />
              <Text style={styles.pdfButtonText}>Descarregar PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {filteredEstablishments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="store" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No s\'han trobat resultats' : 'No hi ha establiments'}
            </Text>
            {!token && (
              <Text style={styles.errorText}>
                Error: No token disponible. Si us plau, tanca sessió i torna a entrar.
              </Text>
            )}
            {token && !loading && (
              <Text style={styles.errorText}>
                Si has marcat locals com a tancats, assegura't que tens permisos d'admin.
              </Text>
            )}
            {!searchQuery && (
              <Pressable style={styles.createButton} onPress={handleCreate}>
                <Text style={styles.createButtonText}>Crear Primer Establiment</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredEstablishments.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {/* Logotip de l'establiment */}
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.establishmentLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="store" size={24} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  {/* Icones de xarxes socials */}
                  {item.social_media && (item.social_media.facebook || item.social_media.instagram || item.social_media.twitter || item.social_media.youtube) && (
                    <View style={styles.socialIconsRow}>
                      {item.social_media.facebook && (
                        <MaterialIcons name="facebook" size={18} color="#1877F2" style={styles.socialIcon} />
                      )}
                      {item.social_media.instagram && (
                        <MaterialIcons name="camera-alt" size={18} color="#E4405F" style={styles.socialIcon} />
                      )}
                      {item.social_media.twitter && (
                        <MaterialIcons name="message" size={18} color="#1DA1F2" style={styles.socialIcon} />
                      )}
                      {item.social_media.youtube && (
                        <MaterialIcons name="videocam" size={18} color="#FF0000" style={styles.socialIcon} />
                      )}
                    </View>
                  )}
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.establishment_type && (
                      <View style={[
                        styles.typeBadge,
                        item.establishment_type === 'local_associat' && styles.typeBadgeAssociat,
                        item.establishment_type === 'patrocinador' && styles.typeBadgePatrocinador,
                        item.establishment_type === 'local_tancat' && styles.typeBadgeTancat,
                        item.establishment_type === 'local_no_soci' && styles.typeBadgeNoSoci,
                        item.establishment_type === 'altres' && styles.typeBadgeAltres,
                      ]}>
                        <Text style={styles.typeBadgeText}>
                          {getTypeLabel(item.establishment_type)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.category && (
                    <Text style={styles.cardCategory}>{item.category}</Text>
                  )}
                  {item.establishment_type === 'altres' && item.collaboration_type && (
                    <Text style={styles.collaborationTypeText}>
                      <MaterialIcons name="info-outline" size={14} color={Colors.textSecondary} />
                      {' '}{item.collaboration_type}
                    </Text>
                  )}
                </View>
              </View>
              
              {item.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              
              {item.address && (
                <View style={styles.cardRow}>
                  <MaterialIcons name="location-on" size={16} color={Colors.textSecondary} />
                  <Text style={styles.cardDetail}>{item.address}</Text>
                </View>
              )}
              
              {item.phone && (
                <View style={styles.cardRow}>
                  <MaterialIcons name="phone" size={16} color={Colors.textSecondary} />
                  <Text style={styles.cardDetail}>{item.phone}</Text>
                </View>
              )}

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(item)}
                >
                  <MaterialIcons name="edit" size={20} color={Colors.primary} />
                  <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>
                
                <Pressable
                  style={[styles.actionButton, styles.manageButton]}
                  onPress={() => handleManage(item)}
                >
                  <MaterialIcons name="category" size={20} color={Colors.secondary} />
                  <Text style={styles.manageButtonText}>Gestió</Text>
                </Pressable>
                
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item)}
                >
                  <MaterialIcons name="delete" size={20} color={Colors.error} />
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Gestió d'Establiment */}
      <Modal
        visible={managementModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManagementModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.managementModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipus d'Establiment</Text>
              <Pressable onPress={() => setManagementModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>
            
            <View style={styles.managementOptions}>
              <Text style={styles.managementSubtitle}>
                {managingEstablishment?.name}
              </Text>
              <Text style={styles.managementCurrentType}>
                Estat actual: {getTypeLabel(managingEstablishment?.establishment_type)}
              </Text>
              
              <Pressable
                style={[styles.typeOption, managingEstablishment?.establishment_type === 'local_associat' && styles.typeOptionSelected]}
                onPress={() => handleSetEstablishmentType('local_associat')}
              >
                <MaterialIcons name="star" size={24} color={Colors.primary} />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Local Associat</Text>
                  <Text style={styles.typeOptionDescription}>Soci actiu d'REUS COMERÇ i FUTUR</Text>
                </View>
                {managingEstablishment?.establishment_type === 'local_associat' && (
                  <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                )}
              </Pressable>
              
              <Pressable
                style={[styles.typeOption, managingEstablishment?.establishment_type === 'local_no_soci' && styles.typeOptionSelected]}
                onPress={() => handleSetEstablishmentType('local_no_soci')}
              >
                <MaterialIcons name="store" size={24} color={Colors.secondary} />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Local No Soci</Text>
                  <Text style={styles.typeOptionDescription}>Establiment no associat</Text>
                </View>
                {managingEstablishment?.establishment_type === 'local_no_soci' && (
                  <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                )}
              </Pressable>
              
              <Pressable
                style={[styles.typeOption, managingEstablishment?.establishment_type === 'local_tancat' && styles.typeOptionSelected]}
                onPress={() => handleSetEstablishmentType('local_tancat')}
              >
                <MaterialIcons name="lock" size={24} color={Colors.error} />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Local Tancat</Text>
                  <Text style={styles.typeOptionDescription}>Establiment tancat temporalment o permanentment</Text>
                </View>
                {managingEstablishment?.establishment_type === 'local_tancat' && (
                  <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                )}
              </Pressable>
              
              <Pressable
                style={[styles.typeOption, managingEstablishment?.establishment_type === 'patrocinador' && styles.typeOptionSelected]}
                onPress={() => handleSetEstablishmentType('patrocinador')}
              >
                <MaterialIcons name="workspace-premium" size={24} color="#FFD700" />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Patrocinador</Text>
                  <Text style={styles.typeOptionDescription}>Patrocinador d'REUS COMERÇ i FUTUR</Text>
                </View>
                {managingEstablishment?.establishment_type === 'patrocinador' && (
                  <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                )}
              </Pressable>
              
              <Pressable
                style={[styles.typeOption, managingEstablishment?.establishment_type === 'altres' && styles.typeOptionSelected]}
                onPress={() => handleSetEstablishmentType('altres')}
              >
                <MaterialIcons name="more-horiz" size={24} color={Colors.gray} />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Altres</Text>
                  <Text style={styles.typeOptionDescription}>Altres tipus d'establiment</Text>
                </View>
                {managingEstablishment?.establishment_type === 'altres' && (
                  <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Col·laboració (per tipus "Altres") */}
      <Modal
        visible={collaborationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCollaborationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.managementModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipus de Col·laboració</Text>
              <Pressable onPress={() => setCollaborationModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>
            
            <View style={styles.managementOptions}>
              <Text style={styles.managementSubtitle}>
                {managingEstablishment?.name}
              </Text>
              
              <Text style={styles.label}>Descriu el tipus de col·laboració:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Patrocinador d'esdeveniments, Col·laborador cultural..."
                value={collaborationText}
                onChangeText={setCollaborationText}
                multiline
                numberOfLines={4}
              />
              
              <Text style={[styles.label, { marginTop: Spacing.lg }]}>Visibilitat pública:</Text>
              
              <Pressable
                style={[styles.typeOption, { marginTop: Spacing.sm }]}
                onPress={() => handleCollaborationSubmit(true)}
              >
                <MaterialIcons name="visibility" size={24} color={Colors.primary} />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Visible a la llista</Text>
                  <Text style={styles.typeOptionDescription}>Apareixerà a la llista pública d'establiments</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
              </Pressable>
              
              <Pressable
                style={styles.typeOption}
                onPress={() => handleCollaborationSubmit(false)}
              >
                <MaterialIcons name="visibility-off" size={24} color={Colors.gray} />
                <View style={styles.typeOptionText}>
                  <Text style={styles.typeOptionTitle}>Només al backoffice</Text>
                  <Text style={styles.typeOptionDescription}>No apareixerà a la llista pública</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.gray} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar Establiment' : 'Nou Establiment'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nom de l'establiment"
              />

              <Text style={styles.label}>NIF / CIF *</Text>
              <TextInput
                style={styles.input}
                value={formData.nif}
                onChangeText={(text) => setFormData({ ...formData, nif: text.toUpperCase() })}
                placeholder="Ex: B12345678"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Logotip (Format 3x3)</Text>
              {formData.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: formData.image_url }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <View style={styles.imageActions}>
                    <Pressable
                      style={styles.changeImageButton}
                      onPress={handlePickImage}
                      disabled={uploadingImage}
                    >
                      <MaterialIcons name="edit" size={20} color={Colors.primary} />
                      <Text style={styles.changeImageText}>Canviar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => setFormData({ ...formData, image_url: '' })}
                    >
                      <MaterialIcons name="delete" size={20} color={Colors.error} />
                      <Text style={styles.removeImageText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <>
                      <MaterialIcons name="add-photo-alternate" size={48} color={Colors.gray} />
                      <Text style={styles.uploadText}>Seleccionar Logotip</Text>
                      <Text style={styles.uploadHint}>Format recomanat: 3x3 (ex: 600x600px)</Text>
                    </>
                  )}
                </Pressable>
              )}

              <Text style={styles.label}>Categoria</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="Ex: Restaurant, Botiga, etc."
              />

              <Text style={styles.label}>Subcategoria</Text>
              <TextInput
                style={styles.input}
                value={formData.subcategory}
                onChangeText={(text) => setFormData({ ...formData, subcategory: text })}
                placeholder="Ex: Pizzeria, Roba, etc."
              />

              <Text style={styles.label}>Nom Comercial</Text>
              <TextInput
                style={styles.input}
                value={formData.commercial_name}
                onChangeText={(text) => setFormData({ ...formData, commercial_name: text })}
                placeholder="Nom comercial (si és diferent del nom legal)"
              />

              <Text style={styles.label}>Descripció</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripció de l'establiment"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Adreça</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Adreça completa"
              />

              <Text style={styles.label}>Codi Postal</Text>
              <TextInput
                style={styles.input}
                value={formData.postal_code}
                onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                placeholder="43201"
                keyboardType="numeric"
                maxLength={5}
              />

              {/* Contacte */}
              <Text style={[styles.label, styles.sectionTitle]}>📞 Contacte</Text>

              <Text style={styles.label}>Telèfon</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+34 XXX XXX XXX"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="correu@exemple.cat"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={formData.whatsapp}
                onChangeText={(text) => setFormData({ ...formData, whatsapp: text })}
                placeholder="+34 XXX XXX XXX"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Web</Text>
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(text) => setFormData({ ...formData, website: text })}
                placeholder="https://www.exemple.cat"
                keyboardType="url"
                autoCapitalize="none"
              />

              {/* Coordenades GPS */}
              <Text style={[styles.label, styles.sectionTitle]}>📍 Coordenades GPS</Text>

              <Text style={styles.label}>Latitud</Text>
              <TextInput
                style={styles.input}
                value={formData.latitude}
                onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                placeholder="41.1564"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Longitud</Text>
              <TextInput
                style={styles.input}
                value={formData.longitude}
                onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                placeholder="1.1073"
                keyboardType="numeric"
              />

              {/* Xarxes Socials */}
              <Text style={[styles.label, styles.sectionTitle]}>🌐 Xarxes Socials</Text>

              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={formData.facebook}
                onChangeText={(text) => setFormData({ ...formData, facebook: text })}
                placeholder="https://facebook.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={formData.instagram}
                onChangeText={(text) => setFormData({ ...formData, instagram: text })}
                placeholder="https://instagram.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Twitter</Text>
              <TextInput
                style={styles.input}
                value={formData.twitter}
                onChangeText={(text) => setFormData({ ...formData, twitter: text })}
                placeholder="https://twitter.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={styles.input}
                value={formData.youtube}
                onChangeText={(text) => setFormData({ ...formData, youtube: text })}
                placeholder="https://youtube.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              {/* Enllaços Addicionals */}
              <Text style={[styles.label, styles.sectionTitle]}>🔗 Enllaços Addicionals</Text>

              <Text style={styles.label}>Google Maps URL</Text>
              <TextInput
                style={styles.input}
                value={formData.google_maps_url}
                onChangeText={(text) => setFormData({ ...formData, google_maps_url: text })}
                placeholder="https://maps.google.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Vídeo URL</Text>
              <TextInput
                style={styles.input}
                value={formData.video_url}
                onChangeText={(text) => setFormData({ ...formData, video_url: text })}
                placeholder="https://youtube.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Vídeo URL 2</Text>
              <TextInput
                style={styles.input}
                value={formData.video_url_2}
                onChangeText={(text) => setFormData({ ...formData, video_url_2: text })}
                placeholder="https://youtube.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />

              {/* IDs Externs */}
              <Text style={[styles.label, styles.sectionTitle]}>🆔 IDs (Ús Intern)</Text>

              <Text style={styles.label}>ID Extern</Text>
              <TextInput
                style={styles.input}
                value={formData.external_id}
                onChangeText={(text) => setFormData({ ...formData, external_id: text })}
                placeholder="ID del sistema extern"
              />

              <Text style={styles.label}>ID Soci</Text>
              <TextInput
                style={styles.input}
                value={formData.partner_id}
                onChangeText={(text) => setFormData({ ...formData, partner_id: text })}
                placeholder="ID de soci"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  headerButtonsScroll: {
    flexShrink: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  exportExcelButton: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  exportButton: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  importButton: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  addButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  clearButton: {
    padding: Spacing.xs,
  },
  resultsInfo: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    fontWeight: '500',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  pdfButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  createButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  establishmentLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    backgroundColor: Colors.lightGray,
  },
  cardInfo: {
    flex: 1,
  },
  socialIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  socialIcon: {
    marginRight: 2,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  cardCategory: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  cardDetail: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginLeft: Spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  editButton: {
    backgroundColor: Colors.primary + '20',
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  deleteButton: {
    backgroundColor: Colors.error + '20',
  },
  deleteButtonText: {
    color: Colors.error,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  modalBody: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.white, // Text blanc per fons fosc
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  uploadText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per fons fosc
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  uploadHint: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.xs,
  },
  imagePreviewContainer: {
    marginBottom: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  imageActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  changeImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  changeImageText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  removeImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  removeImageText: {
    color: Colors.error,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  cancelButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  manageButtonText: {
    color: Colors.secondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  managementModalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  managementOptions: {
    marginTop: Spacing.md,
  },
  managementSubtitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.xs,
  },
  managementCurrentType: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  typeOptionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  typeOptionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: 4,
  },
  typeOptionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  typeBadgeAssociat: {
    backgroundColor: Colors.primary + '20',
  },
  typeBadgePatrocinador: {
    backgroundColor: '#FFD70020',
  },
  typeBadgeTancat: {
    backgroundColor: Colors.error + '20',
  },
  typeBadgeNoSoci: {
    backgroundColor: Colors.secondary + '20',
  },
  typeBadgeAltres: {
    backgroundColor: Colors.gray + '20',
  },
  typeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  collaborationTypeText: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
    fontStyle: 'italic',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
