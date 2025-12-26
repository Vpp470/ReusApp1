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

interface UrgentNotice {
  _id: string;
  title: string;
  content: string;
  priority: string;
  created_by_name: string;
  created_at: string;
}

export default function AssumptesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [notices, setNotices] = useState<UrgentNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
  });

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const response = await api.get('/consell/assumptes', {
        headers: { Authorization: token },
      });
      setNotices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading notices:', error);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      const msg = 'El títol i el contingut són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      await api.post('/consell/assumptes', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ title: '', content: '', priority: 'normal' });
      loadNotices();
    } catch (error) {
      console.error('Error creating notice:', error);
    }
  };

  const handleDelete = async (noticeId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/consell/assumptes/${noticeId}`, {
          headers: { Authorization: token },
        });
        loadNotices();
      } catch (error) {
        console.error('Error deleting notice:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Estàs segur que vols eliminar aquest assumpte?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Confirmar', 'Estàs segur que vols eliminar aquest assumpte?', [
        { text: 'Cancel·lar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#E53935';
      case 'high': return '#FF9800';
      default: return Colors.primary;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'URGENT';
      case 'high': return 'Alta';
      default: return 'Normal';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Assumptes Sobrevinguts</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
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
        <Text style={styles.headerTitle}>Assumptes Sobrevinguts</Text>
        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {notices.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No hi ha assumptes</Text>
            <Text style={styles.emptyText}>
              Clica el botó + per afegir un nou assumpte sobrevingut
            </Text>
          </View>
        ) : (
          notices.map(notice => (
            <View key={notice._id} style={styles.noticeCard}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(notice.priority) }]}>
                <Text style={styles.priorityText}>{getPriorityLabel(notice.priority)}</Text>
              </View>
              
              <View style={styles.noticeHeader}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Pressable onPress={() => handleDelete(notice._id)}>
                  <MaterialIcons name="delete" size={24} color={Colors.error} />
                </Pressable>
              </View>
              
              <Text style={styles.noticeContent}>{notice.content}</Text>
              
              <View style={styles.noticeMeta}>
                <Text style={styles.noticeAuthor}>
                  <MaterialIcons name="person" size={14} color={Colors.gray} /> {notice.created_by_name}
                </Text>
                <Text style={styles.noticeDate}>{formatDate(notice.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Notice Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nou Assumpte</Text>
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
                placeholder="Títol de l'assumpte"
              />
              
              <Text style={styles.label}>Prioritat</Text>
              <View style={styles.priorityOptions}>
                {['normal', 'high', 'urgent'].map(p => (
                  <Pressable
                    key={p}
                    style={[
                      styles.priorityOption,
                      formData.priority === p && styles.priorityOptionSelected,
                      { borderColor: getPriorityColor(p) },
                      formData.priority === p && { backgroundColor: getPriorityColor(p) },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, priority: p }))}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      formData.priority === p && styles.priorityOptionTextSelected,
                    ]}>
                      {getPriorityLabel(p)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              
              <Text style={styles.label}>Contingut *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                placeholder="Escriu el contingut de l'assumpte..."
                multiline
                numberOfLines={6}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: '#FF9800' }]} onPress={handleCreate}>
                <Text style={styles.saveButtonText}>Publicar</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF9800',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  addButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  noticeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  priorityText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  noticeTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    flex: 1,
    marginRight: Spacing.md,
  },
  noticeContent: {
    fontSize: FontSizes.md,
    color: Colors.darkGray,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  noticeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: Spacing.sm,
  },
  noticeAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  noticeDate: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
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
    color: Colors.textDark,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityOptionSelected: {},
  priorityOptionText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  priorityOptionTextSelected: {
    color: Colors.white,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  cancelButtonText: {
    color: Colors.gray,
    fontSize: FontSizes.md,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
