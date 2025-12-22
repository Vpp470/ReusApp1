import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface LocalAssociat {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Establishment {
  _id: string;
  name: string;
  address?: string;
  category?: string;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
}

export default function OwnershipManagement() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [localAssociats, setLocalAssociats] = useState<LocalAssociat[]>([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // Estats per cerca i creació d'usuaris
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEstablishments(establishments);
    } else {
      const filtered = establishments.filter(
        (est) =>
          est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          est.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEstablishments(filtered);
    }
  }, [searchQuery, establishments]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar establiments
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const establishmentsResponse = await fetch(`${backendUrl}/api/admin/establishments`, {
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      });
      
      if (!establishmentsResponse.ok) {
        throw new Error('Error carregant establiments');
      }
      
      const establishmentsData = await establishmentsResponse.json();
      
      // Carregar usuaris local_associat
      const usersResponse = await fetch(`${backendUrl}/api/admin/users/local-associats`, {
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      });
      
      if (!usersResponse.ok) {
        throw new Error('Error carregant usuaris');
      }
      
      const usersData = await usersResponse.json();
      
      // Enriquir establiments amb info del propietari
      const enrichedEstablishments = establishmentsData.map((est: Establishment) => {
        if (est.owner_id) {
          const owner = usersData.find((u: LocalAssociat) => u.id === est.owner_id);
          if (owner) {
            return {
              ...est,
              owner_name: owner.name,
              owner_email: owner.email,
            };
          }
        }
        return est;
      });
      
      setEstablishments(enrichedEstablishments);
      setFilteredEstablishments(enrichedEstablishments);
      setLocalAssociats(usersData);
    } catch (error) {
      console.error('Error carregant dades:', error);
      Alert.alert('Error', 'No s\'han pogut carregar les dades');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOwner = (establishment: Establishment) => {
    setSelectedEstablishment(establishment);
    setSelectedUserId(establishment.owner_id || '');
    setModalVisible(true);
  };

  const handleSearchUser = async () => {
    if (!userSearchQuery.trim()) {
      Alert.alert('Error', 'Introdueix un email per cercar');
      return;
    }
    
    try {
      setSearchingUser(true);
      
      // Cercar a la API per email
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(
        `${backendUrl}/api/admin/users/local-associats?email=${encodeURIComponent(userSearchQuery.trim())}`,
        {
          headers: {
            'Authorization': token || '',
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Error cercant usuari');
      }
      
      const users = await response.json();
      
      if (users && users.length > 0) {
        const found = users[0];
        setSelectedUserId(found.id);
        Alert.alert(
          'Usuari trobat!',
          `${found.name} (${found.email})\nRol actual: ${found.role}`
        );
      } else {
        Alert.alert(
          'Usuari no trobat',
          `No s'ha trobat cap usuari amb l'email ${userSearchQuery}.\n\nVols crear aquest usuari?`,
          [
            { text: 'Cancel·lar', style: 'cancel' },
            {
              text: 'Crear Usuari',
              onPress: () => {
                setNewUserEmail(userSearchQuery);
                setShowCreateUserForm(true);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error cercant usuari:', error);
      Alert.alert('Error', 'No s\'ha pogut cercar l\'usuari');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleCreateUserForEstablishment = async () => {
    if (!newUserEmail || !newUserName) {
      Alert.alert('Error', 'Omple tots els camps');
      return;
    }

    if (!selectedEstablishment) {
      Alert.alert('Error', 'No hi ha establiment seleccionat');
      return;
    }

    try {
      setCreatingUser(true);
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      const params = new URLSearchParams({
        email: newUserEmail.trim(),
        name: newUserName.trim(),
        role: 'local_associat',
        establishment_id: selectedEstablishment._id,
      });
      
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
      
      // Guardar credencials per mostrar-les
      setGeneratedCredentials({
        email: result.email,
        password: result.password,
      });
      
      // Actualitzar la llista d'usuaris
      await loadData();
      
      // Tancar formulari i mostrar credencials
      setShowCreateUserForm(false);
      setModalVisible(false);
      setShowCredentialsModal(true);
      
      // Reset form
      setNewUserEmail('');
      setNewUserName('');
      setUserSearchQuery('');
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No s\'ha pogut crear l\'usuari');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedEstablishment) return;

    try {
      setSaving(true);
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      const url = `${backendUrl}/api/admin/establishments/${selectedEstablishment._id}/assign-owner`;
      const params = selectedUserId ? `?user_id=${selectedUserId}` : '';
      
      const response = await fetch(url + params, {
        method: 'PUT',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error assignant propietari');
      }

      const result = await response.json();
      
      Alert.alert(
        'Èxit',
        result.message || 'Propietari assignat correctament'
      );
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      console.error('Error assignant propietari:', error);
      Alert.alert('Error', error.message || 'No s\'ha pogut assignar el propietari');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOwner = async (establishment: Establishment) => {
    Alert.alert(
      'Confirmar',
      `Vols desassignar el propietari de "${establishment.name}"?`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Desassignar',
          style: 'destructive',
          onPress: async () => {
            try {
              const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
              const response = await fetch(
                `${backendUrl}/api/admin/establishments/${establishment._id}/assign-owner`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': token || '',
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Error desassignant propietari');
              }

              Alert.alert('Èxit', 'Propietari desassignat correctament');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No s\'ha pogut desassignar el propietari');
            }
          },
        },
      ]
    );
  };

  const getOwnerBadge = (establishment: Establishment) => {
    if (establishment.owner_id && establishment.owner_name) {
      return (
        <View style={styles.ownerBadge}>
          <MaterialIcons name="person" size={14} color={Colors.white} />
          <Text style={styles.ownerBadgeText}>{establishment.owner_name}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.ownerBadge, styles.noOwnerBadge]}>
        <MaterialIcons name="person-off" size={14} color={Colors.textSecondary} />
        <Text style={[styles.ownerBadgeText, styles.noOwnerText]}>Sense assignar</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignar Establiments</Text>
          <View style={styles.placeholder} />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignar Establiments</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca establiments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textSecondary}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{establishments.length}</Text>
          <Text style={styles.statLabel}>Total Establiments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {establishments.filter((e) => e.owner_id).length}
          </Text>
          <Text style={styles.statLabel}>Assignats</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{localAssociats.length}</Text>
          <Text style={styles.statLabel}>Locals Associats</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredEstablishments.map((establishment) => (
          <View key={establishment._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <MaterialIcons name="store" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {establishment.name}
                </Text>
              </View>
              {getOwnerBadge(establishment)}
            </View>

            {establishment.address && (
              <Text style={styles.cardAddress} numberOfLines={2}>
                {establishment.address}
              </Text>
            )}

            {establishment.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{establishment.category}</Text>
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAssignOwner(establishment)}
              >
                <MaterialIcons name="edit" size={18} color={Colors.white} />
                <Text style={styles.actionButtonText}>
                  {establishment.owner_id ? 'Canviar' : 'Assignar'}
                </Text>
              </TouchableOpacity>

              {establishment.owner_id && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={() => handleRemoveOwner(establishment)}
                >
                  <MaterialIcons name="person-remove" size={18} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Desassignar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {filteredEstablishments.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No s'han trobat establiments</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal per assignar propietari */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assignar Propietari</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            {selectedEstablishment && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <Text style={styles.modalEstablishmentName}>
                  {selectedEstablishment.name}
                </Text>

                {/* Buscador d'usuaris per email */}
                {!showCreateUserForm && (
                  <>
                    <Text style={styles.modalLabel}>Cerca usuari per email:</Text>
                    <View style={styles.searchContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="email@exemple.com"
                        value={userSearchQuery}
                        onChangeText={setUserSearchQuery}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleSearchUser}
                        disabled={searchingUser}
                      >
                        {searchingUser ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <MaterialIcons name="search" size={20} color={Colors.white} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.orText}>O selecciona de la llista:</Text>
                  </>
                )}

                {/* Formulari de creació d'usuari */}
                {showCreateUserForm && (
                  <View style={styles.createUserForm}>
                    <View style={styles.createUserHeader}>
                      <MaterialIcons name="person-add" size={24} color={Colors.primary} />
                      <Text style={styles.createUserTitle}>Crear Nou Usuari</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Email:</Text>
                    <TextInput
                      style={[styles.input, styles.inputReadonly]}
                      value={newUserEmail}
                      editable={false}
                    />

                    <Text style={styles.fieldLabel}>Nom complet:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nom del propietari"
                      value={newUserName}
                      onChangeText={setNewUserName}
                      autoCapitalize="words"
                    />

                    <View style={styles.createUserInfo}>
                      <MaterialIcons name="info" size={16} color={Colors.primary} />
                      <Text style={styles.createUserInfoText}>
                        Es generarà una contrasenya automàticament que hauràs d'enviar al propietari.
                      </Text>
                    </View>

                    <View style={styles.createUserButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => {
                          setShowCreateUserForm(false);
                          setNewUserEmail('');
                          setNewUserName('');
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel·lar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.button, styles.createButton, creatingUser && styles.disabledButton]}
                        onPress={handleCreateUserForEstablishment}
                        disabled={creatingUser}
                      >
                        {creatingUser ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <MaterialIcons name="add" size={20} color={Colors.white} />
                            <Text style={styles.createButtonText}>Crear i Assignar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {!showCreateUserForm && (
                  <>
                    <Text style={styles.modalLabel}>Selecciona un usuari:</Text>

                <ScrollView style={styles.usersList}>
                  <TouchableOpacity
                    style={[
                      styles.userOption,
                      !selectedUserId && styles.userOptionSelected,
                    ]}
                    onPress={() => setSelectedUserId('')}
                  >
                    <MaterialIcons
                      name="person-off"
                      size={20}
                      color={!selectedUserId ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.userOptionText,
                        !selectedUserId && styles.userOptionTextSelected,
                      ]}
                    >
                      Sense assignar
                    </Text>
                  </TouchableOpacity>

                  {localAssociats.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.userOption,
                        selectedUserId === user.id && styles.userOptionSelected,
                      ]}
                      onPress={() => setSelectedUserId(user.id)}
                    >
                      <MaterialIcons
                        name="person"
                        size={20}
                        color={
                          selectedUserId === user.id ? Colors.primary : Colors.textSecondary
                        }
                      />
                      <View style={styles.userOptionInfo}>
                        <Text
                          style={[
                            styles.userOptionText,
                            selectedUserId === user.id && styles.userOptionTextSelected,
                          ]}
                        >
                          {user.name}
                        </Text>
                        <Text style={styles.userOptionEmail}>{user.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveAssignment}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={20} color={Colors.white} />
                      <Text style={styles.saveButtonText}>Guardar</Text>
                    </>
                  )}
                </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de credencials generades */}
      <Modal
        visible={showCredentialsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCredentialsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.credentialsModal}>
            <View style={styles.credentialsHeader}>
              <MaterialIcons name="check-circle" size={48} color={Colors.success} />
              <Text style={styles.credentialsTitle}>Usuari Creat i Assignat!</Text>
            </View>

            {generatedCredentials && (
              <>
                <View style={styles.credentialsBox}>
                  <Text style={styles.credentialsLabel}>Envia aquestes credencials al propietari:</Text>
                  
                  <View style={styles.credentialItem}>
                    <MaterialIcons name="email" size={20} color={Colors.primary} />
                    <View style={styles.credentialContent}>
                      <Text style={styles.credentialLabel}>Email:</Text>
                      <Text style={styles.credentialValue}>{generatedCredentials.email}</Text>
                    </View>
                  </View>

                  <View style={styles.credentialItem}>
                    <MaterialIcons name="lock" size={20} color={Colors.primary} />
                    <View style={styles.credentialContent}>
                      <Text style={styles.credentialLabel}>Contrasenya:</Text>
                      <Text style={styles.credentialPassword}>{generatedCredentials.password}</Text>
                    </View>
                  </View>

                  <View style={styles.credentialItem}>
                    <MaterialIcons name="link" size={20} color={Colors.primary} />
                    <View style={styles.credentialContent}>
                      <Text style={styles.credentialLabel}>URL:</Text>
                      <Text style={styles.credentialValue}>www.reusapp.com</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.emailTemplate}>
                  <Text style={styles.emailTemplateTitle}>📧 Text per enviar:</Text>
                  <View style={styles.emailTemplateBox}>
                    <Text style={styles.emailTemplateText}>
                      Hola!{'\n\n'}
                      Benvingut a la nova aplicació d'REUS COMERÇ i FUTUR!{'\n\n'}
                      Hem creat un compte perquè puguis gestionar el teu establiment:
                      {'\n\n'}
                      📧 Email: {generatedCredentials.email}{'\n'}
                      🔑 Contrasenya: {generatedCredentials.password}{'\n'}
                      🌐 Accés: www.reusapp.com{'\n\n'}
                      Pots canviar la contrasenya des del teu perfil.{'\n\n'}
                      Salutacions,{'\n'}
                      L'equip d'REUS COMERÇ i FUTUR
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeCredentialsButton}
                  onPress={() => {
                    setShowCredentialsModal(false);
                    setGeneratedCredentials(null);
                  }}
                >
                  <Text style={styles.closeCredentialsButtonText}>Entesos</Text>
                </TouchableOpacity>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginLeft: Spacing.sm,
    flex: 1,
  },
  cardAddress: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  noOwnerBadge: {
    backgroundColor: Colors.border,
  },
  ownerBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
  noOwnerText: {
    color: Colors.darkGray, // Text gris per fons blanc
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  removeButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  modalBody: {
    maxHeight: '70%',
  },
  modalBodyContent: {
    padding: Spacing.md,
  },
  modalEstablishmentName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
  },
  usersList: {
    maxHeight: 300,
    marginBottom: Spacing.md,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  userOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  userOptionInfo: {
    flex: 1,
  },
  userOptionText: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontWeight: '500',
  },
  userOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  userOptionEmail: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  // Styles for credentials modal
  credentialsModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    margin: Spacing.lg,
    maxHeight: '90%',
  },
  credentialsHeader: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  credentialsTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  credentialsBox: {
    padding: Spacing.lg,
  },
  credentialsLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  credentialContent: {
    flex: 1,
  },
  credentialLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    fontWeight: '500',
  },
  credentialValue: {
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontWeight: '600',
    marginTop: 2,
  },
  credentialPassword: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  emailTemplate: {
    margin: Spacing.lg,
    marginTop: 0,
  },
  emailTemplateTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
  },
  emailTemplateBox: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emailTemplateText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    lineHeight: 20,
  },
  closeCredentialsButton: {
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    marginTop: 0,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  closeCredentialsButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  // Styles for create user form
  createUserForm: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  createUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  createUserTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  fieldLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  inputReadonly: {
    backgroundColor: Colors.background,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  createUserInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  createUserInfoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 18,
  },
  createUserButtons: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  createButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  orText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    marginVertical: Spacing.md,
    fontStyle: 'italic',
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
});
