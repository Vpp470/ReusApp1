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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface Account {
  _id: string;
  title: string;
  period: string;
  comments: string;
  file_name: string;
  file_type: string;
  has_file: boolean;
  created_by_name: string;
  created_at: string;
}

export default function EstatComptesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    period: '',
    comments: '',
    file_data: '',
    file_name: '',
    file_type: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await api.get('/consell/comptes', {
        headers: { Authorization: token },
      });
      setAccounts(response.data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        setFormData(prev => ({
          ...prev,
          file_data: fileContent,
          file_name: asset.name,
          file_type: asset.name.endsWith('.pdf') ? 'pdf' : 'xlsx',
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

    try {
      await api.post('/consell/comptes', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ title: '', period: '', comments: '', file_data: '', file_name: '', file_type: '' });
      loadAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleDownload = async (accountId: string) => {
    try {
      const response = await api.get(`/consell/comptes/${accountId}/file`, {
        headers: { Authorization: token },
      });
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:application/${response.data.file_type};base64,${response.data.file_data}`;
        link.download = response.data.file_name;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading file:', error);
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
      if (window.confirm('Estàs segur?')) confirmDelete();
    } else {
      Alert.alert('Confirmar', 'Estàs segur?', [
        { text: 'Cancel·lar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES');
    } catch {
      return dateStr;
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
            <Text style={styles.emptyText}>Clica + per pujar un document comptable</Text>
          </View>
        ) : (
          accounts.map(account => (
            <View key={account._id} style={styles.accountCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <MaterialIcons name="description" size={24} color="#4CAF50" />
                  <Text style={styles.accountTitle}>{account.title}</Text>
                </View>
                <Pressable onPress={() => handleDelete(account._id)}>
                  <MaterialIcons name="delete" size={24} color={Colors.error} />
                </Pressable>
              </View>
              
              <Text style={styles.periodText}>Període: {account.period}</Text>
              {account.comments && <Text style={styles.commentsText}>{account.comments}</Text>}
              
              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>
                  {account.created_by_name} - {formatDate(account.created_at)}
                </Text>
                {account.has_file && (
                  <Pressable style={styles.downloadButton} onPress={() => handleDownload(account._id)}>
                    <MaterialIcons name="download" size={18} color={Colors.white} />
                    <Text style={styles.downloadText}>Descarregar</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nou Document</Text>
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
                placeholder="Ex: Balanç Trimestral"
              />
              
              <Text style={styles.label}>Període *</Text>
              <TextInput
                style={styles.input}
                value={formData.period}
                onChangeText={(text) => setFormData(prev => ({ ...prev, period: text }))}
                placeholder="Ex: Q1 2025, Gener 2025"
              />
              
              <Text style={styles.label}>Comentaris</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.comments}
                onChangeText={(text) => setFormData(prev => ({ ...prev, comments: text }))}
                placeholder="Comentaris opcionals..."
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.label}>Document (PDF o Excel)</Text>
              <Pressable style={styles.fileButton} onPress={pickDocument}>
                <MaterialIcons name="attach-file" size={24} color="#4CAF50" />
                <Text style={styles.fileButtonText}>
                  {formData.file_name || 'Seleccionar fitxer'}
                </Text>
              </Pressable>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: '#4CAF50' }]} onPress={handleCreate}>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  accountTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textDark },
  periodText: { fontSize: FontSizes.md, color: '#4CAF50', fontWeight: '600', marginBottom: Spacing.xs },
  commentsText: { fontSize: FontSizes.sm, color: Colors.darkGray, marginBottom: Spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.lightGray, paddingTop: Spacing.sm },
  metaText: { fontSize: FontSizes.xs, color: Colors.gray },
  downloadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.xs },
  downloadText: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark },
  modalBody: { padding: Spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.textDark },
  textArea: { height: 80, textAlignVertical: 'top' },
  fileButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: '#4CAF50', borderStyle: 'dashed' },
  fileButtonText: { fontSize: FontSizes.md, color: Colors.darkGray },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gray },
  cancelButtonText: { color: Colors.gray, fontSize: FontSizes.md },
  saveButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
