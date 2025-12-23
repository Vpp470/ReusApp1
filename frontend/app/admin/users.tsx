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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { adminService } from '../../src/services/api';
import api from '../../src/services/api';
import type { User } from '../../src/types';
import * as DocumentPicker from 'expo-document-picker';

export default function AdminUsers() {
  const router = useRouter();
  const { token, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Paginació
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(100);
  
  // Comptadors per rol
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  
  // Estats per assignar establiment
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState<any[]>([]);
  const [establishmentSearchQuery, setEstablishmentSearchQuery] = useState('');
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [currentEstablishment, setCurrentEstablishment] = useState<any>(null);
  const [loadingEstablishment, setLoadingEstablishment] = useState(false);
  const [showEstablishmentPicker, setShowEstablishmentPicker] = useState(false);
  
  // Estats per crear nou usuari
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin' | 'local_associat' | 'entitat_colaboradora' | 'membre_consell'>('local_associat');
  const [newUserEstablishmentId, setNewUserEstablishmentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Estats per importació massiva
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sendEmails, setSendEmails] = useState(true);
  const [selectedFile, setSelectedFile] = useState<{uri: string; name: string; mimeType?: string} | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    created: number;
    skipped: number;
    errors: string[];
    emails_sent: number;
    emails_failed: number;
  } | null>(null);
  const [showImportResultModal, setShowImportResultModal] = useState(false);

  useEffect(() => {
    loadUsers();
    loadUserCounts();
  }, []);

  const loadUserCounts = async () => {
    try {
      const counts = await adminService.users.getCount(token!);
      setUserCounts(counts);
    } catch (error) {
      console.error('Error carregant comptadors:', error);
    }
  };

  useEffect(() => {
    // Filtrar usuaris segons cerca
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const loadUsers = async (page: number = 0, search?: string) => {
    try {
      setLoading(true);
      const skip = page * pageSize;
      const response = await adminService.users.getAll(token!, skip, pageSize, search);
      
      // El backend ara retorna { users, total, skip, limit }
      if (response.users) {
        setUsers(response.users);
        setFilteredUsers(response.users);
        setTotalUsers(response.total);
      } else {
        // Compatibilitat amb resposta antiga (array directe)
        setUsers(response);
        setFilteredUsers(response);
        setTotalUsers(response.length);
      }
      setCurrentPage(page);
    } catch (error) {
      Alert.alert('Error', 'No s\'han pogut carregar els usuaris');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = (user: User) => {
    if (user.email === currentUser?.email) {
      Alert.alert(
        'Error',
        'No pots canviar el teu propi rol'
      );
      return;
    }

    setSelectedUser(user);
    // Suportar tant role com a string com array
    const roles = Array.isArray(user.role) ? user.role : [user.role || 'user'];
    setSelectedRoles(roles);
    setModalVisible(true);
    
    // Carregar establiments si és local associat
    if (user.role === 'local_associat' || true) {
      loadEstablishments();
    }
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    if (selectedRoles.length === 0) {
      Alert.alert('Error', 'Has de seleccionar almenys un rol');
      return;
    }
    try {
      console.log('Saving roles for user:', selectedUser.email, 'New roles:', selectedRoles);
      await adminService.users.update(token!, selectedUser.id, {
        roles: selectedRoles, // Ara enviem array de rols
      });
      console.log('Roles updated successfully');
      Alert.alert('Èxit', 'Rols actualitzats correctament');
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      console.error('Error updating roles:', error);
      Alert.alert('Error', 'No s\'han pogut actualitzar els rols');
    }
  };

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      // Eliminar rol
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      // Afegir rol
      setSelectedRoles([...selectedRoles, role]);
    }
  };


  const loadEstablishments = async () => {
    try {
      const response = await api.get('/establishments');
      setEstablishments(response.data);
      setFilteredEstablishments(response.data); // Inicialitzar la llista filtrada
    } catch (error) {
      console.error('Error loading establishments:', error);
    }
  };

  // Efecte per filtrar establiments segons la cerca
  useEffect(() => {
    if (establishmentSearchQuery.trim() === '') {
      setFilteredEstablishments(establishments);
    } else {
      const filtered = establishments.filter((est) =>
        est.name.toLowerCase().includes(establishmentSearchQuery.toLowerCase())
      );
      setFilteredEstablishments(filtered);
    }
  }, [establishmentSearchQuery, establishments]);

  const loadUserEstablishment = async (userEmail: string) => {
    try {
      setLoadingEstablishment(true);
      // Buscar si aquest usuari té algun establiment assignat
      const allEstablishments = await api.get('/establishments');
      const userEstablishment = allEstablishments.data.find((est: any) => {
        // Necesitem comparar owner_id amb user._id, però això requereix una cerca més elaborada
        // Per ara, només carreguem tots els establiments
        return false;
      });
      setCurrentEstablishment(userEstablishment);
    } catch (error) {
      console.error('Error loading user establishment:', error);
    } finally {
      setLoadingEstablishment(false);
    }
  };

  const handleAssignEstablishment = async () => {
    if (!selectedUser || !selectedEstablishmentId) {
      Alert.alert('Error', 'Si us plau, selecciona un establiment');
      return;
    }

    try {
      setLoadingEstablishment(true);
      
      // Utilitzar api.post amb paràmetres de query
      const response = await api.post(
        `/admin/establishments/${selectedEstablishmentId}/assign-owner`,
        {},
        {
          params: {
            owner_email: selectedUser.email
          },
          headers: {
            'Authorization': token || '',
          },
        }
      );

      Alert.alert('Èxit', response.data.message || 'Establiment assignat correctament');
      setShowEstablishmentPicker(false);
      setSelectedEstablishmentId('');
      
      // Recarregar usuaris per actualitzar la vista
      loadUsers();
    } catch (error: any) {
      console.error('Error assigning establishment:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'No s\'ha pogut assignar l\'establiment';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoadingEstablishment(false);
    }
  };


  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin':
        return {
          backgroundColor: Colors.error + '20',
          color: Colors.error,
        };
      case 'local_associat':
        return {
          backgroundColor: Colors.accent + '20',
          color: Colors.accent,
        };
      case 'entitat_colaboradora':
        return {
          backgroundColor: Colors.primary + '20',
          color: Colors.primary,
        };
      case 'membre_consell':
        return {
          backgroundColor: '#9C27B0' + '20', // Morat
          color: '#9C27B0',
        };
      default:
        return {
          backgroundColor: Colors.success + '20',
          color: Colors.success,
        };
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'local_associat':
        return 'Local Associat';
      case 'entitat_colaboradora':
        return 'Entitat Col·laboradora';
      case 'membre_consell':
        return 'Membre del Consell';
      default:
        return 'Usuari';
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.email === currentUser?.email) {
      Alert.alert(
        'Acció no permesa',
        'No pots eliminar el teu propi compte'
      );
      return;
    }

    Alert.alert(
      'Confirmar eliminació',
      `Estàs segur que vols eliminar l'usuari ${user.name}? Aquesta acció no es pot desfer.`,
      [
        {
          text: 'Cancel·lar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.users.delete(token!, user.id);
              Alert.alert('Èxit', 'Usuari eliminat correctament');
              loadUsers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'No s\'ha pogut eliminar l\'usuari');
            }
          },
        },
      ]
    );
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName) {
      Alert.alert('Error', 'Si us plau, omple l\'email i el nom');
      return;
    }

    try {
      setCreating(true);
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      const params = new URLSearchParams({
        email: newUserEmail,
        name: newUserName,
        role: newUserRole,
      });
      
      if (newUserEstablishmentId && newUserRole === 'local_associat') {
        params.append('establishment_id', newUserEstablishmentId);
      }
      
      const response = await fetch(`${backendUrl}/api/admin/users/create?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': token || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error creant usuari');
      }

      const result = await response.json();
      
      setGeneratedPassword(result.password);
      setCreateModalVisible(false);
      setShowPasswordModal(true);
      
      // Reset form
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('local_associat');
      setNewUserEstablishmentId('');
      
      loadUsers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No s\'ha pogut crear l\'usuari');
    } finally {
      setCreating(false);
    }
  };
  
  const openCreateModal = () => {
    loadEstablishments();
    setCreateModalVisible(true);
  };

  // Funcions per importació massiva
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      });
    } catch (error: any) {
      console.error('Error seleccionant fitxer:', error);
      Alert.alert('Error', 'No s\'ha pogut seleccionar el fitxer');
    }
  };

  const handleImportUsers = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Has de seleccionar un fitxer primer');
      return;
    }

    try {
      setImporting(true);

      // Crear FormData
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // Per web, obtenim el fitxer directament
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name);
      } else {
        // Per mobile
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          name: selectedFile.name,
        } as any);
      }
      
      formData.append('send_emails', sendEmails ? 'true' : 'false');

      const apiResponse = await api.post('/admin/users/import', formData, {
        headers: {
          'Authorization': token || '',
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(apiResponse.data);
      setImportModalVisible(false);
      setSelectedFile(null);
      setShowImportResultModal(true);
      loadUsers();

    } catch (error: any) {
      console.error('Error importació:', error);
      Alert.alert('Error', error.response?.data?.detail || error.message || 'Error important usuaris');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      if (Platform.OS === 'web') {
        // Per web, obrim directament l'URL de descàrrega
        const baseUrl = api.defaults.baseURL || '/api';
        window.open(`${baseUrl}/admin/users/import/template`, '_blank');
      } else {
        Alert.alert('Info', 'La plantilla es descarregarà al navegador');
      }
    } catch (error) {
      Alert.alert('Error', 'No s\'ha pogut descarregar la plantilla');
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
        <Text style={styles.headerTitle}>Gestió d'Usuaris</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar per nom o email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={24} color={Colors.gray} />
          </Pressable>
        )}
      </View>

      {/* Botons d'acció */}
      <View style={styles.actionButtonsContainer}>
        <Pressable 
          style={[styles.actionButton, styles.importButton]} 
          onPress={() => setImportModalVisible(true)}
        >
          <MaterialIcons name="upload-file" size={20} color={Colors.white} />
          <Text style={styles.actionButtonText}>Importar Usuaris</Text>
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.createButton]} 
          onPress={openCreateModal}
        >
          <MaterialIcons name="person-add" size={20} color={Colors.white} />
          <Text style={styles.actionButtonText}>Nou Usuari</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScrollView}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userCounts.total || totalUsers}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {userCounts.admin || 0}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {userCounts.membre_consell || 0}
            </Text>
            <Text style={styles.statLabel}>Consell</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {userCounts.local_associat || 0}
            </Text>
            <Text style={styles.statLabel}>Locals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {userCounts.entitat_colaboradora || 0}
            </Text>
            <Text style={styles.statLabel}>Entitats</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {userCounts.user || 0}
            </Text>
            <Text style={styles.statLabel}>Usuaris</Text>
          </View>
        </View>
      </ScrollView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="person-off" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No s\'han trobat usuaris' : 'No hi ha usuaris'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user, index) => (
            <View key={user.id || `user-${index}`} style={styles.card}>
              {/* Informació d'usuari */}
              <View style={styles.userRow}>
                <View style={styles.avatarCircle}>
                  <MaterialIcons
                    name="person"
                    size={30}
                    color={Colors.white}
                  />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View
                    style={[
                      styles.roleTag,
                      { backgroundColor: getRoleBadgeStyle(user.role).backgroundColor },
                    ]}
                  >
                    <Text style={[styles.roleTagText, { color: getRoleBadgeStyle(user.role).color }]}>
                      {getRoleLabel(user.role)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botons grans i clars */}
              {user.email === currentUser?.email ? (
                // Si és l'usuari actual, mostrar badge especial
                <View style={styles.currentUserInfo}>
                  <MaterialIcons name="stars" size={24} color={Colors.accent} />
                  <Text style={styles.currentUserText}>Aquest és el teu compte</Text>
                </View>
              ) : (
                // Si és un altre usuari, mostrar botons d'edició
                <View style={styles.buttonRow}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => {
                      console.log('Edit button pressed for user:', user.email);
                      handleChangeRole(user);
                    }}
                  >
                    <MaterialIcons name="edit" size={24} color={Colors.white} />
                    <Text style={styles.editButtonText}>EDITAR ROL</Text>
                  </Pressable>
                  
                  <Pressable
                    style={styles.deleteButtonNew}
                    onPress={() => {
                      console.log('Delete button pressed for user:', user.email);
                      handleDeleteUser(user);
                    }}
                  >
                    <MaterialIcons name="delete" size={24} color={Colors.white} />
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Paginació */}
      {totalUsers > pageSize && (
        <View style={styles.paginationContainer}>
          <Pressable
            style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
            onPress={() => loadUsers(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <MaterialIcons name="chevron-left" size={24} color={currentPage === 0 ? Colors.lightGray : Colors.primary} />
            <Text style={[styles.paginationButtonText, currentPage === 0 && styles.paginationButtonTextDisabled]}>Anterior</Text>
          </Pressable>
          
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalUsers)} de {totalUsers}
            </Text>
          </View>
          
          <Pressable
            style={[styles.paginationButton, (currentPage + 1) * pageSize >= totalUsers && styles.paginationButtonDisabled]}
            onPress={() => loadUsers(currentPage + 1)}
            disabled={(currentPage + 1) * pageSize >= totalUsers}
          >
            <Text style={[styles.paginationButtonText, (currentPage + 1) * pageSize >= totalUsers && styles.paginationButtonTextDisabled]}>Següent</Text>
            <MaterialIcons name="chevron-right" size={24} color={(currentPage + 1) * pageSize >= totalUsers ? Colors.lightGray : Colors.primary} />
          </Pressable>
        </View>
      )}

      {/* Modal for role change */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Canviar Rol d'Usuari</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <Text style={styles.modalUserName}>{selectedUser?.name}</Text>
              <Text style={styles.modalUserEmail}>{selectedUser?.email}</Text>

              <Text style={styles.label}>Selecciona els rols (pots triar múltiples):</Text>

              <Pressable
                style={[
                  styles.roleOption,
                  selectedRoles.includes('user') && styles.roleOptionSelected,
                ]}
                onPress={() => toggleRole('user')}
              >
                <MaterialIcons
                  name={selectedRoles.includes('user') ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={selectedRoles.includes('user') ? Colors.success : Colors.gray}
                />
                <View style={styles.roleOptionInfo}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      selectedRoles.includes('user') && styles.roleOptionTitleSelected,
                    ]}
                  >
                    Usuari
                  </Text>
                  <Text style={styles.roleOptionDescription}>
                    Accés normal a l'aplicació
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.roleOption,
                  selectedRoles.includes('local_associat') && styles.roleOptionSelected,
                ]}
                onPress={() => toggleRole('local_associat')}
              >
                <MaterialIcons
                  name={selectedRoles.includes('local_associat') ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={selectedRoles.includes('local_associat') ? Colors.accent : Colors.gray}
                />
                <View style={styles.roleOptionInfo}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      selectedRoles.includes('local_associat') && styles.roleOptionTitleSelected,
                    ]}
                  >
                    Local Associat
                  </Text>
                  <Text style={styles.roleOptionDescription}>
                    Pot crear promocions i gestionar el seu establiment
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.roleOption,
                  selectedRoles.includes('entitat_colaboradora') && styles.roleOptionSelected,
                ]}
                onPress={() => toggleRole('entitat_colaboradora')}
              >
                <MaterialIcons
                  name={selectedRoles.includes('entitat_colaboradora') ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={selectedRoles.includes('entitat_colaboradora') ? Colors.primary : Colors.gray}
                />
                <View style={styles.roleOptionInfo}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      selectedRoles.includes('entitat_colaboradora') && styles.roleOptionTitleSelected,
                    ]}
                  >
                    Entitat Col·laboradora
                  </Text>
                  <Text style={styles.roleOptionDescription}>
                    Pot crear promocions i continguts
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.roleOption,
                  selectedRoles.includes('membre_consell') && styles.roleOptionSelected,
                ]}
                onPress={() => toggleRole('membre_consell')}
              >
                <MaterialIcons
                  name={selectedRoles.includes('membre_consell') ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={selectedRoles.includes('membre_consell') ? '#9C27B0' : Colors.gray}
                />
                <View style={styles.roleOptionInfo}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      selectedRoles.includes('membre_consell') && styles.roleOptionTitleSelected,
                    ]}
                  >
                    Membre del Consell
                  </Text>
                  <Text style={styles.roleOptionDescription}>
                    Membre del consell rector amb accés especial
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.roleOption,
                  selectedRoles.includes('admin') && styles.roleOptionSelected,
                ]}
                onPress={() => toggleRole('admin')}
              >
                <MaterialIcons
                  name={selectedRoles.includes('admin') ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={selectedRoles.includes('admin') ? Colors.error : Colors.gray}
                />
                <View style={styles.roleOptionInfo}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      selectedRoles.includes('admin') && styles.roleOptionTitleSelected,
                    ]}
                  >
                    Administrador
                  </Text>
                  <Text style={styles.roleOptionDescription}>
                    Accés complet al backoffice
                  </Text>
                </View>
              </Pressable>
              
              {/* Secció per assignar establiment si té rol de local associat */}
              {selectedRoles.includes('local_associat') && (
                <View style={styles.establishmentSection}>
                  <Text style={styles.sectionTitle}>📍 Assignar Establiment</Text>
                  
                  <Pressable
                    style={styles.establishmentPickerButton}
                    onPress={() => setShowEstablishmentPicker(!showEstablishmentPicker)}
                  >
                    <MaterialIcons name="store" size={20} color={Colors.primary} />
                    <Text style={styles.establishmentPickerText}>
                      {selectedEstablishmentId 
                        ? establishments.find(e => e._id === selectedEstablishmentId || e.id === selectedEstablishmentId)?.name || 'Seleccionar establiment'
                        : 'Seleccionar establiment'}
                    </Text>
                    <MaterialIcons 
                      name={showEstablishmentPicker ? "expand-less" : "expand-more"} 
                      size={24} 
                      color={Colors.textDark} 
                    />
                  </Pressable>
                  
                  {showEstablishmentPicker && (
                    <View style={styles.establishmentPickerContainer}>
                      {/* Camp de cerca amb lupa */}
                      <View style={styles.establishmentSearchContainer}>
                        <MaterialIcons name="search" size={20} color={Colors.gray} />
                        <TextInput
                          style={styles.establishmentSearchInput}
                          placeholder="Buscar establiment per nom..."
                          value={establishmentSearchQuery}
                          onChangeText={setEstablishmentSearchQuery}
                          autoCapitalize="none"
                        />
                        {establishmentSearchQuery.length > 0 && (
                          <Pressable onPress={() => setEstablishmentSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color={Colors.gray} />
                          </Pressable>
                        )}
                      </View>

                      {/* Llista d'establiments filtrats */}
                      <ScrollView style={styles.establishmentList} nestedScrollEnabled>
                        {filteredEstablishments.length === 0 ? (
                          <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsText}>
                              No s'han trobat establiments
                            </Text>
                          </View>
                        ) : (
                          filteredEstablishments.map((est) => (
                            <Pressable
                              key={est._id || est.id}
                              style={({ pressed }) => [
                                styles.establishmentItem,
                                (selectedEstablishmentId === est._id || selectedEstablishmentId === est.id) && 
                                styles.establishmentItemSelected,
                                pressed && { opacity: 0.7 }
                              ]}
                              onPress={() => {
                                console.log('Establishment selected:', est.name);
                                setSelectedEstablishmentId(est._id || est.id);
                                setShowEstablishmentPicker(false);
                                setEstablishmentSearchQuery(''); // Netejar la cerca
                              }}
                            >
                              <Text style={styles.establishmentItemName}>{est.name}</Text>
                              {est.address && (
                                <Text style={styles.establishmentItemAddress}>{est.address}</Text>
                              )}
                            </Pressable>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                  
                  {selectedEstablishmentId && (
                    <Pressable
                      style={styles.assignButton}
                      onPress={handleAssignEstablishment}
                      disabled={loadingEstablishment}
                    >
                      {loadingEstablishment ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <>
                          <MaterialIcons name="link" size={20} color={Colors.white} />
                          <Text style={styles.assignButtonText}>Assignar Establiment</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.saveButton,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => {
                  console.log('Save button pressed');
                  handleSaveRole();
                }}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal per crear nou usuari */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Nou Usuari</Text>
              <Pressable onPress={() => setCreateModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="usuari@exemple.com"
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Nom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                value={newUserName}
                onChangeText={setNewUserName}
              />

              <Text style={styles.fieldLabel}>Rol *</Text>
              <View style={styles.roleButtons}>
                {['user', 'local_associat', 'entitat_colaboradora', 'membre_consell', 'admin'].map((role) => (
                  <Pressable
                    key={role}
                    style={[
                      styles.roleButton,
                      newUserRole === role && styles.roleButtonActive,
                    ]}
                    onPress={() => setNewUserRole(role as any)}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        newUserRole === role && styles.roleButtonTextActive,
                      ]}
                    >
                      {getRoleLabel(role)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {newUserRole === 'local_associat' && (
                <>
                  <Text style={styles.fieldLabel}>Establiment (opcional)</Text>
                  <Pressable
                    style={styles.establishmentButton}
                    onPress={() => setShowEstablishmentPicker(true)}
                  >
                    <Text style={styles.establishmentButtonText}>
                      {newUserEstablishmentId
                        ? establishments.find((e) => e._id === newUserEstablishmentId)?.name || 'Seleccionar establiment'
                        : 'Seleccionar establiment'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={Colors.textDark} />
                  </Pressable>
                </>
              )}

              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>
                  La contrasenya es generarà automàticament i es mostrarà després de crear l'usuari.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.saveButton, creating && styles.disabledButton]}
                onPress={handleCreateUser}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Crear Usuari</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal per mostrar contrasenya generada */}
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModalContainer}>
            <View style={styles.passwordModalHeader}>
              <MaterialIcons name="check-circle" size={48} color={Colors.success} />
              <Text style={styles.passwordModalTitle}>Usuari Creat Correctament!</Text>
            </View>

            <View style={styles.passwordBox}>
              <Text style={styles.passwordLabel}>Contrasenya generada:</Text>
              <View style={styles.passwordDisplay}>
                <Text style={styles.passwordText}>{generatedPassword}</Text>
                <Pressable
                  onPress={() => {
                    // Copiar al portapapers (necessitarà expo-clipboard)
                    Alert.alert('Copiat', 'Contrasenya copiada al portapapers');
                  }}
                >
                  <MaterialIcons name="content-copy" size={24} color={Colors.primary} />
                </Pressable>
              </View>
              <Text style={styles.passwordWarning}>
                ⚠️ Guarda aquesta contrasenya! No es podrà recuperar més tard.
              </Text>
            </View>

            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsTitle}>Credencials per enviar a l'usuari:</Text>
              <Text style={styles.credentialsText}>Email: {newUserEmail}</Text>
              <Text style={styles.credentialsText}>Contrasenya: {generatedPassword}</Text>
              <Text style={styles.credentialsText}>URL: www.reusapp.com</Text>
            </View>

            <Pressable
              style={[styles.modalButton, styles.saveButton, { marginTop: Spacing.lg }]}
              onPress={() => {
                setShowPasswordModal(false);
                setGeneratedPassword('');
              }}
            >
              <Text style={styles.saveButtonText}>Entesos</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Picker d'establiments dins del modal de creació */}
      {showEstablishmentPicker && (
        <Modal
          visible={showEstablishmentPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEstablishmentPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Seleccionar Establiment</Text>
                <Pressable onPress={() => setShowEstablishmentPicker(false)}>
                  <MaterialIcons name="close" size={24} color={Colors.textDark} />
                </Pressable>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Cerca establiment..."
                value={establishmentSearchQuery}
                onChangeText={setEstablishmentSearchQuery}
              />

              <ScrollView style={styles.pickerList}>
                {filteredEstablishments.map((est) => (
                  <Pressable
                    key={est._id}
                    style={[
                      styles.pickerItem,
                      newUserEstablishmentId === est._id && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setNewUserEstablishmentId(est._id);
                      setShowEstablishmentPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{est.name}</Text>
                    {est.address && (
                      <Text style={styles.pickerItemSubtext}>{est.address}</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal Importació Massiva */}
      <Modal
        visible={importModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setImportModalVisible(false);
          setSelectedFile(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📥 Importar Usuaris</Text>
              <Pressable onPress={() => {
                setImportModalVisible(false);
                setSelectedFile(null);
              }}>
                <MaterialIcons name="close" size={24} color={Colors.gray} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.importDescription}>
                Importa usuaris des d'un fitxer Excel (.xlsx) o CSV amb les dades de l'antiga app El Tomb de Reus.
              </Text>

              <View style={styles.importInfoBox}>
                <MaterialIcons name="info" size={24} color={Colors.primary} />
                <Text style={styles.importInfoText}>
                  El fitxer ha de tenir com a mínim la columna <Text style={styles.bold}>email</Text>.{'\n'}
                  Columnes opcionals: nom, cognoms, telefon, adreca
                </Text>
              </View>

              <Pressable style={styles.templateButton} onPress={downloadTemplate}>
                <MaterialIcons name="download" size={20} color={Colors.primary} />
                <Text style={styles.templateButtonText}>Descarregar Plantilla Excel</Text>
              </Pressable>

              {/* Secció de selecció de fitxer */}
              <View style={styles.fileSelectionSection}>
                <Text style={styles.sectionLabel}>Fitxer a importar:</Text>
                
                <Pressable 
                  style={styles.selectFileButton} 
                  onPress={handleSelectFile}
                >
                  <MaterialIcons name="folder-open" size={24} color={Colors.primary} />
                  <Text style={styles.selectFileButtonText}>
                    {selectedFile ? 'Canviar fitxer' : 'Seleccionar fitxer Excel/CSV'}
                  </Text>
                </Pressable>

                {selectedFile && (
                  <View style={styles.selectedFileBox}>
                    <MaterialIcons name="insert-drive-file" size={24} color={Colors.success} />
                    <View style={styles.selectedFileInfo}>
                      <Text style={styles.selectedFileName} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <Text style={styles.selectedFileReady}>✓ Fitxer preparat per importar</Text>
                    </View>
                    <Pressable onPress={() => setSelectedFile(null)}>
                      <MaterialIcons name="close" size={20} color={Colors.error} />
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.checkboxContainer}>
                <Pressable 
                  style={[styles.checkbox, sendEmails && styles.checkboxChecked]}
                  onPress={() => setSendEmails(!sendEmails)}
                >
                  {sendEmails && <MaterialIcons name="check" size={18} color={Colors.white} />}
                </Pressable>
                <Text style={styles.checkboxLabel}>
                  Enviar email de benvinguda als nous usuaris
                </Text>
              </View>

              <Text style={styles.importNote}>
                ⚠️ Cada usuari importat rebrà una contrasenya temporal d'un sol ús i un email amb les instruccions per completar el registre.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setImportModalVisible(false);
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton, 
                  styles.importActionButton,
                  !selectedFile && styles.importActionButtonDisabled
                ]}
                onPress={handleImportUsers}
                disabled={importing || !selectedFile}
              >
                {importing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <MaterialIcons name="cloud-upload" size={20} color={Colors.white} />
                    <Text style={styles.importActionButtonText}>
                      {selectedFile ? 'Importar Usuaris' : 'Selecciona un fitxer'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Resultat Importació */}
      <Modal
        visible={showImportResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImportResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Resultat Importació</Text>
              <Pressable onPress={() => setShowImportResultModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.gray} />
              </Pressable>
            </View>

            {importResult && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.resultSummary}>
                  <View style={styles.resultItem}>
                    <MaterialIcons name="people" size={28} color={Colors.gray} />
                    <Text style={styles.resultNumber}>{importResult.total}</Text>
                    <Text style={styles.resultLabel}>Total processats</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <MaterialIcons name="check-circle" size={28} color={Colors.success} />
                    <Text style={[styles.resultNumber, { color: Colors.success }]}>{importResult.created}</Text>
                    <Text style={styles.resultLabel}>Creats</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <MaterialIcons name="skip-next" size={28} color={Colors.warning} />
                    <Text style={[styles.resultNumber, { color: Colors.warning }]}>{importResult.skipped}</Text>
                    <Text style={styles.resultLabel}>Omesos</Text>
                  </View>
                </View>

                <View style={styles.emailResults}>
                  <Text style={styles.emailResultsTitle}>📧 Emails enviats</Text>
                  <View style={styles.emailResultsRow}>
                    <View style={styles.emailResultItem}>
                      <MaterialIcons name="mark-email-read" size={24} color={Colors.success} />
                      <Text style={styles.emailResultNumber}>{importResult.emails_sent}</Text>
                      <Text style={styles.emailResultLabel}>Enviats</Text>
                    </View>
                    <View style={styles.emailResultItem}>
                      <MaterialIcons name="mark-email-unread" size={24} color={Colors.error} />
                      <Text style={[styles.emailResultNumber, { color: Colors.error }]}>{importResult.emails_failed}</Text>
                      <Text style={styles.emailResultLabel}>Fallits</Text>
                    </View>
                  </View>
                </View>

                {importResult.errors.length > 0 && (
                  <View style={styles.errorsContainer}>
                    <Text style={styles.errorsTitle}>⚠️ Errors ({importResult.errors.length})</Text>
                    <ScrollView style={styles.errorsList} nestedScrollEnabled>
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <Text key={index} style={styles.errorItem}>• {error}</Text>
                      ))}
                      {importResult.errors.length > 10 && (
                        <Text style={styles.errorItem}>... i {importResult.errors.length - 10} més</Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => setShowImportResultModal(false)}
              >
                <Text style={styles.primaryButtonText}>Tancar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Botó flotant per crear usuari */}
      <Pressable
        style={styles.fabButton}
        onPress={openCreateModal}
      >
        <MaterialIcons name="add" size={28} color={Colors.white} />
      </Pressable>
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
  // Paginació
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E5E5',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: Colors.lightGray,
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    color: Colors.textDark,
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
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
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  userEmail: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  detailText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginLeft: Spacing.xs,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  changeRoleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  changeRoleText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  statsScrollView: {
    maxHeight: 80,
  },
  currentUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  currentUserText: {
    color: Colors.accent,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
  modalUserName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    textAlign: 'center',
  },
  modalUserEmail: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.md,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  roleOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  roleOptionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  roleOptionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  roleOptionTitleSelected: {
    color: Colors.primary,
  },
  roleOptionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 2,
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
  // New styles for simplified UI
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  roleTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  editButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  deleteButtonNew: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
  },
  currentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent + '20',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  establishmentSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.md,
  },
  establishmentPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.sm,
  },
  establishmentPickerText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  establishmentPickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  establishmentSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  establishmentSearchInput: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  noResultsContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
  },
  establishmentList: {
    maxHeight: 200,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  establishmentItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  establishmentItemSelected: {
    backgroundColor: Colors.primary + '15',
  },
  establishmentItemName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  establishmentItemAddress: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 2,
  },
  assignButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  assignButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  // Botó flotant
  fabButton: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Estils del modal de creació
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    backgroundColor: Colors.background,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  roleButtonTextActive: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  establishmentButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  establishmentButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Modal de contrasenya
  passwordModalContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  passwordModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  passwordModalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  passwordBox: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  passwordLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
  },
  passwordDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  passwordText: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
  },
  passwordWarning: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  credentialsBox: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  credentialsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
  },
  credentialsText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginVertical: 2,
  },
  // Picker d'establiments
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  pickerItemText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontWeight: '500',
  },
  pickerItemSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 4,
  },
  // NOTA: actionButtonsContainer ja està definit més amunt
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  importButton: {
    backgroundColor: '#FF9800',
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  // Estils per modal d'importació
  importDescription: {
    fontSize: FontSizes.md,
    color: Colors.textDark,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  importInfoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  importInfoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  templateButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark,
  },
  importNote: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    backgroundColor: '#FFF3E0',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    lineHeight: 20,
  },
  importActionButton: {
    flex: 2,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  importActionButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  importActionButtonDisabled: {
    backgroundColor: Colors.lightGray,
    opacity: 0.6,
  },
  fileSelectionSection: {
    marginVertical: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  selectFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  selectFileButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  selectedFileInfo: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
  },
  selectedFileReady: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    marginTop: 2,
  },
  // Estils per resultat d'importació
  resultSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.textDark,
  },
  resultLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  emailResults: {
    marginBottom: Spacing.lg,
  },
  emailResultsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  emailResultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emailResultItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emailResultNumber: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.success,
  },
  emailResultLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  errorsContainer: {
    backgroundColor: '#FFEBEE',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorsList: {
    maxHeight: 150,
  },
  errorItem: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginBottom: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
});
