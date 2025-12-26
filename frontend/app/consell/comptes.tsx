import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface Account {
  _id: string;
  title: string;
  period: string;
  comments: string;
  has_file: boolean;
  file_name?: string;
  file_type?: string;
  created_by_name: string;
  created_at: string;
}

export default function ComptesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    period: '',
    comments: '',
    file_data: null as string | null,
    file_name: null as string | null,
    file_type: null as string | null,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await api.get('/consell/comptes', {
        headers: { Authorization: token },
      });
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileData = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const extension = asset.name?.split('.').pop()?.toLowerCase() || 'pdf';
        
        setFormData(prev => ({
          ...prev,
          file_data: fileData,
          file_name: asset.name || 'document',
          file_type: extension,
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.period) {
      const msg = 'El títol i el període són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setUploading(true);
    try {
      await api.post('/consell/comptes', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ title: '', period: '', comments: '', file_data: null, file_name: null, file_type: null });
      loadAccounts();
      const msg = 'Document creat correctament';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
    } catch (error) {
      console.error('Error creating account:', error);
      const msg = 'Error creant el document';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/consell/comptes/${accountId}`, {
          headers: { Authorization: token },
        });
        loadAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Estàs segur que vols eliminar aquest document?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Confirmar', 'Estàs segur que vols eliminar?', [
        { text: 'Cancel·lar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const downloadFile = async (accountId: string, fileName: string) => {
    try {
      const response = await api.get(`/consell/comptes/${accountId}/file`, {
        headers: { Authorization: token },
      });
      
      if (response.data && response.data.file_data) {
        // For web, create download link
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          const mimeType = getMimeType(response.data.file_type || 'pdf');
          link.href = `data:${mimeType};base64,${response.data.file_data}`;
          link.download = response.data.file_name || fileName;
          link.click();
        } else {
          // For native, save to file system
          const fileUri = FileSystem.documentDirectory + (response.data.file_name || fileName);
          await FileSystem.writeAsStringAsync(fileUri, response.data.file_data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert('Èxit', `Fitxer guardat a: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getMimeType = (ext: string) => {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf': return 'picture-as-pdf';
      case 'xlsx': 
      case 'xls': return 'table-chart';
      case 'docx':
      case 'doc': return 'description';
      default: return 'insert-drive-file';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Estat de Comptes</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
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
        <Text style={styles.headerTitle}>Estat de Comptes</Text>
        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="account-balance" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha documents</Text>
            <Text style={styles.emptyText}>
              Clica el botó + per afegir un nou document comptable
            </Text>
          </View>
        ) : (
          accounts.map(account => (
            <View key={account._id} style={styles.accountCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <MaterialIcons name={getFileIcon(account.file_type)} size={24} color="#4CAF50" />
                  <Text style={styles.accountTitle}>{account.title}</Text>
                </View>
                <Pressable onPress={() => handleDelete(account._id)}>
                  <MaterialIcons name="delete" size={24} color={Colors.error} />
                </Pressable>
              </View>
              
              <View style={styles.periodBadge}>
                <Text style={styles.periodText}>{account.period}</Text>
              </View>
              
              {account.comments && (
                <Text style={styles.comments}>{account.comments}</Text>
              )}
              
              {account.has_file && (
                <Pressable 
                  style={styles.downloadButton}
                  onPress={() => downloadFile(account._id, account.file_name || 'document')}
                >
                  <MaterialIcons name="download" size={20} color={Colors.white} />
                  <Text style={styles.downloadButtonText}>
                    Descarregar {account.file_name || 'document'}
                  </Text>
                </Pressable>
              )}
              
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  <MaterialIcons name="person" size={14} color={Colors.gray} /> {account.created_by_name}
                </Text>
                <Text style={styles.metaText}>{formatDate(account.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Account Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nou Document Comptable</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Títol *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Ex: Balanç mensual"
              />
              
              <Text style={styles.label}>Període *</Text>
              <TextInput
                style={styles.input}
                value={formData.period}
                onChangeText={(text) => setFormData(prev => ({ ...prev, period: text }))}
                placeholder="Ex: Gener 2025, Q1 2025"
              />
              
              <Text style={styles.label}>Comentaris</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.comments}
                onChangeText={(text) => setFormData(prev => ({ ...prev, comments: text }))}
                placeholder="Notes o comentaris..."
                multiline
                numberOfLines={4}
              />
              
              <Text style={styles.label}>Document adjunt</Text>
              <Pressable style={styles.uploadButton} onPress={pickDocument}>
                <MaterialIcons 
                  name={formData.file_name ? 'check-circle' : 'cloud-upload'} 
                  size={24} 
                  color={formData.file_name ? '#4CAF50' : Colors.gray} 
                />
                <Text style={styles.uploadButtonText}>
                  {formData.file_name || 'Seleccionar fitxer (PDF, Excel, Word, Imatge)'}
                </Text>
              </Pressable>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable 
                style={[styles.saveButton, uploading && { opacity: 0.5 }]} 
                onPress={handleCreate}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4CAF50', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: Spacing.md },
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  accountCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  accountTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textDark, flex: 1 },
  periodBadge: { alignSelf: 'flex-start', backgroundColor: '#4CAF50' + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  periodText: { color: '#4CAF50', fontSize: FontSizes.sm, fontWeight: '600' },
  comments: { fontSize: FontSizes.md, color: Colors.darkGray, marginBottom: Spacing.md },
  downloadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: Spacing.xs, marginBottom: Spacing.md },
  downloadButtonText: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.lightGray, paddingTop: Spacing.sm },
  metaText: { fontSize: FontSizes.sm, color: Colors.gray },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark },
  modalBody: { padding: Spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.textDark },
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.lightGray, gap: Spacing.sm },
  uploadButtonText: { fontSize: FontSizes.md, color: Colors.gray, flex: 1 },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gray },
  cancelButtonText: { color: Colors.gray, fontSize: FontSizes.md },
  saveButton: { backgroundColor: '#4CAF50', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
