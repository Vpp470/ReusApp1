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

interface Acta {
  _id: string;
  title: string;
  meeting_date: string;
  notes: string;
  has_file: boolean;
  file_name?: string;
  created_by_name: string;
  created_at: string;
}

export default function ActaPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  // Només admins poden editar
  const canEdit = user?.role === 'admin';
  
  const [actes, setActes] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    notes: '',
    file_data: '',
    file_name: '',
  });

  useEffect(() => {
    loadActes();
  }, []);

  const loadActes = async () => {
    try {
      const response = await api.get('/consell/actes', {
        headers: { Authorization: token },
      });
      setActes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading actes:', error);
      setActes([]);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileData = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        setFormData(prev => ({
          ...prev,
          file_data: fileData,
          file_name: asset.name || 'acta.pdf',
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.meeting_date || !formData.file_data) {
      const msg = 'El títol, la data i el fitxer són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setUploading(true);
    try {
      await api.post('/consell/actes', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ title: '', meeting_date: '', notes: '', file_data: '', file_name: '' });
      loadActes();
      const msg = 'Acta pujada correctament';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
    } catch (error) {
      console.error('Error creating acta:', error);
      const msg = 'Error pujant l\'acta';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setUploading(false);
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
      if (window.confirm('Estàs segur que vols eliminar aquesta acta?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Confirmar', 'Estàs segur?', [
        { text: 'Cancel·lar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const downloadFile = async (actaId: string, fileName: string) => {
    try {
      const response = await api.get(`/consell/actes/${actaId}/file`, {
        headers: { Authorization: token },
      });
      
      if (response.data && response.data.file_data) {
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${response.data.file_data}`;
          link.download = response.data.file_name || fileName;
          link.click();
        } else {
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
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
          <ActivityIndicator size="large" color={Colors.error} />
        </View>
      </SafeAreaView>
    );
  }

  // Get the most recent acta
  const lastActa = actes.length > 0 ? actes[0] : null;

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
        {/* Featured Last Acta */}
        {lastActa && (
          <View style={styles.featuredCard}>
            <View style={styles.featuredBadge}>
              <MaterialIcons name="star" size={16} color={Colors.white} />
              <Text style={styles.featuredBadgeText}>Última Acta</Text>
            </View>
            
            <Text style={styles.featuredTitle}>{lastActa.title}</Text>
            <Text style={styles.featuredDate}>{formatDate(lastActa.meeting_date)}</Text>
            
            {lastActa.notes && (
              <Text style={styles.featuredNotes}>{lastActa.notes}</Text>
            )}
            
            <Pressable 
              style={styles.downloadFeatured}
              onPress={() => downloadFile(lastActa._id, lastActa.file_name || 'acta.pdf')}
            >
              <MaterialIcons name="download" size={24} color={Colors.white} />
              <Text style={styles.downloadFeaturedText}>Descarregar Acta</Text>
            </Pressable>
          </View>
        )}

        {/* All Actes List */}
        <Text style={styles.sectionTitle}>Historial d'Actes</Text>
        
        {actes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="description" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha actes</Text>
            <Text style={styles.emptyText}>
              Clica el botó + per pujar una nova acta del consell
            </Text>
          </View>
        ) : (
          actes.map((acta, index) => (
            <View key={acta._id} style={[styles.actaCard, index === 0 && styles.actaCardFirst]}>
              <View style={styles.actaHeader}>
                <MaterialIcons name="picture-as-pdf" size={24} color={Colors.error} />
                <View style={styles.actaInfo}>
                  <Text style={styles.actaTitle}>{acta.title}</Text>
                  <Text style={styles.actaDate}>{formatDate(acta.meeting_date)}</Text>
                </View>
                <Pressable onPress={() => handleDelete(acta._id)}>
                  <MaterialIcons name="delete" size={22} color={Colors.gray} />
                </Pressable>
              </View>
              
              <View style={styles.actaActions}>
                <Pressable 
                  style={styles.downloadSmall}
                  onPress={() => downloadFile(acta._id, acta.file_name || 'acta.pdf')}
                >
                  <MaterialIcons name="download" size={16} color={Colors.error} />
                  <Text style={styles.downloadSmallText}>Descarregar</Text>
                </Pressable>
                <Text style={styles.actaMeta}>
                  Pujat per {acta.created_by_name}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Upload Acta Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pujar Nova Acta</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Títol de l'Acta *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Ex: Acta Consell Ordinari Gener 2025"
              />
              
              <Text style={styles.label}>Data de la Reunió *</Text>
              <TextInput
                style={styles.input}
                value={formData.meeting_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, meeting_date: text }))}
                placeholder="YYYY-MM-DD"
              />
              
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Notes o resum de la reunió..."
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.label}>Fitxer de l'Acta (PDF) *</Text>
              <Pressable style={styles.uploadButton} onPress={pickDocument}>
                <MaterialIcons 
                  name={formData.file_name ? 'check-circle' : 'cloud-upload'} 
                  size={32} 
                  color={formData.file_name ? '#4CAF50' : Colors.gray} 
                />
                <Text style={styles.uploadButtonText}>
                  {formData.file_name || 'Seleccionar fitxer PDF'}
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
                  <Text style={styles.saveButtonText}>Pujar Acta</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.error, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white },
  addButton: { padding: Spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: Spacing.md },
  featuredCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderLeftWidth: 4, borderLeftColor: Colors.error },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, gap: Spacing.xs, marginBottom: Spacing.md },
  featuredBadgeText: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: 'bold' },
  featuredTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs },
  featuredDate: { fontSize: FontSizes.md, color: Colors.gray, textTransform: 'capitalize', marginBottom: Spacing.md },
  featuredNotes: { fontSize: FontSizes.md, color: Colors.darkGray, marginBottom: Spacing.lg, lineHeight: 22 },
  downloadFeatured: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.error, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  downloadFeaturedText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.white, marginBottom: Spacing.md },
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center' },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', marginTop: Spacing.sm },
  actaCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  actaCardFirst: { opacity: 0.7 },
  actaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actaInfo: { flex: 1 },
  actaTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textDark },
  actaDate: { fontSize: FontSizes.sm, color: Colors.gray, textTransform: 'capitalize' },
  actaActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  downloadSmall: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  downloadSmallText: { fontSize: FontSizes.sm, color: Colors.error, fontWeight: '600' },
  actaMeta: { fontSize: FontSizes.xs, color: Colors.gray },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textDark },
  modalBody: { padding: Spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  label: { fontSize: FontSizes.sm, fontWeight: 'bold', color: Colors.textDark, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.textDark },
  textArea: { height: 80, textAlignVertical: 'top' },
  uploadButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.lightGray, gap: Spacing.sm },
  uploadButtonText: { fontSize: FontSizes.md, color: Colors.gray },
  cancelButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gray },
  cancelButtonText: { color: Colors.gray, fontSize: FontSizes.md },
  saveButton: { backgroundColor: Colors.error, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md },
  saveButtonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
});
