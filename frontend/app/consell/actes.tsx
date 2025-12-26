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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface Acta {
  _id: string;
  title: string;
  meeting_date: string;
  file_name: string;
  has_file: boolean;
  notes: string;
  created_by_name: string;
  created_at: string;
}

export default function ActesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [actes, setActes] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    file_data: '',
    file_name: '',
    notes: '',
  });

  useEffect(() => {
    loadActes();
  }, []);

  const loadActes = async () => {
    try {
      const response = await api.get('/consell/actes', {
        headers: { Authorization: token },
      });
      setActes(response.data);
    } catch (error) {
      console.error('Error loading actes:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
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
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.meeting_date || !formData.file_data) {
      const msg = 'El títol, la data i el fitxer PDF són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      await api.post('/consell/actes', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ title: '', meeting_date: '', file_data: '', file_name: '', notes: '' });
      loadActes();
    } catch (error) {
      console.error('Error creating acta:', error);
    }
  };

  const handleDownload = async (actaId: string) => {
    try {
      const response = await api.get(`/consell/actes/${actaId}/file`, {
        headers: { Authorization: token },
      });
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${response.data.file_data}`;
        link.download = response.data.file_name;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async (actaId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/consell/actes/${actaId}`, {
          headers: { Authorization: token },
        });
        loadActes();
      } catch (error) {
        console.error('Error deleting acta:', error);
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
      return new Date(dateStr).toLocaleDateString('ca-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
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
          <Text style={styles.headerTitle}>Actes del Consell</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3F51B5" />
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
        <Text style={styles.headerTitle}>Actes del Consell</Text>
        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {actes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="description" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha actes</Text>
            <Text style={styles.emptyText}>Clica + per pujar una acta del consell</Text>
          </View>
        ) : (
          actes.map(acta => (
            <View key={acta._id} style={styles.actaCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <MaterialIcons name="description" size={24} color="#3F51B5" />
                  <Text style={styles.actaTitle}>{acta.title}</Text>
                </View>
                <Pressable onPress={() => handleDelete(acta._id)}>
                  <MaterialIcons name="delete" size={24} color={Colors.error} />
                </Pressable>
              </View>
              
              <View style={styles.dateRow}>
                <MaterialIcons name="event" size={18} color="#3F51B5" />
                <Text style={styles.dateText}>{formatDate(acta.meeting_date)}</Text>
              </View>
              
              {acta.notes && <Text style={styles.notesText}>{acta.notes}</Text>}
              
              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>
                  Pujat per {acta.created_by_name}
                </Text>
                {acta.has_file && (
                  <Pressable style={styles.downloadButton} onPress={() => handleDownload(acta._id)}>
                    <MaterialIcons name="picture-as-pdf" size={18} color={Colors.white} />
                    <Text style={styles.downloadText}>Descarregar PDF</Text>
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
              <Text style={styles.modalTitle}>Nova Acta</Text>
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
                placeholder="Ex: Acta reunió 15 gener 2025"
              />
              
              <Text style={styles.label}>Data de la Reunió *</Text>
              <TextInput
                style={styles.input}
                value={formData.meeting_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, meeting_date: text }))}
                placeholder="YYYY-MM-DD"
              />
              
              <Text style={styles.label}>Document PDF *</Text>
              <Pressable style={styles.fileButton} onPress={pickDocument}>
                <MaterialIcons name="picture-as-pdf" size={24} color="#3F51B5" />
                <Text style={styles.fileButtonText}>
                  {formData.file_name || 'Seleccionar PDF'}
                </Text>
              </Pressable>
              
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Notes addicionals..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: '#3F51B5' }]} onPress={handleCreate}>
                <Text style={styles.saveButtonText}>Pujar</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3F51B5', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: Spacing.md },
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  actaCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  actaTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textDark },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  dateText: { fontSize: FontSizes.sm, color: '#3F51B5', fontWeight: '600', textTransform: 'capitalize' },
  notesText: { fontSize: FontSizes.sm, color: Colors.darkGray, marginBottom: Spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.lightGray, paddingTop: Spacing.sm },
  metaText: { fontSize: FontSizes.xs, color: Colors.gray },
  downloadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3F51B5', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.xs },
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
  fileButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: '#3F51B5', borderStyle: 'dashed' },
  fileButtonText: { fontSize: FontSizes.md, color: Colors.darkGray },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gray },
  cancelButtonText: { color: Colors.gray, fontSize: FontSizes.md },
  saveButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
