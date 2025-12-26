import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface NotificationStats {
  total_users_with_token: number;
  total_web_push: number;
  by_role: Record<string, number>;
  notifications_last_30_days: number;
}

interface NotificationHistoryItem {
  _id: string;
  title: string;
  body: string;
  target: string;
  web_sent?: number;
  sent_at: string;
}

interface Tag {
  name: string;
  count: number;
}

interface TicketCampaign {
  _id: string;
  name: string;
  description?: string;
  is_active: boolean;
  participant_count?: number;
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  // Broadcast notification
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  // Stats, history, tags and campaigns
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [campaigns, setCampaigns] = useState<TicketCampaign[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Modal per seleccionar criteri
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState<'tag' | 'campaign' | null>(null);

  useEffect(() => {
    loadStats();
    loadHistory();
    loadTags();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/notifications/stats', {
        headers: { Authorization: token }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error carregant estadístiques:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/admin/notifications/history?limit=10', {
        headers: { Authorization: token }
      });
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error carregant historial:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await api.get('/admin/tags', {
        headers: { Authorization: token }
      });
      if (response.data.tags) {
        setTags(response.data.tags);
      }
    } catch (error) {
      console.error('Error carregant marcadors:', error);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) {
      Alert.alert('Error', 'Títol i missatge són obligatoris');
      return;
    }

    const finalTarget = selectedTag ? `tag:${selectedTag}` : broadcastTarget;

    const confirmSend = async () => {
      try {
        setBroadcastLoading(true);
        const response = await api.post('/admin/notifications/send', {
          title: broadcastTitle,
          body: broadcastBody,
          target: finalTarget,
        }, {
          headers: { Authorization: token }
        });
        
        if (response.data.success) {
          Alert.alert(
            'Èxit!', 
            `${response.data.message}\n\nEnviats: ${response.data.sent_count}`
          );
          setBroadcastTitle('');
          setBroadcastBody('');
          setSelectedTag(null);
          loadHistory();
          loadStats();
        } else {
          Alert.alert('Error', response.data.message);
        }
      } catch (error: any) {
        console.error('Error enviant notificació:', error);
        Alert.alert('Error', error.response?.data?.message || error.response?.data?.detail || 'No s\'ha pogut enviar la notificació');
      } finally {
        setBroadcastLoading(false);
      }
    };

    const targetLabel = selectedTag ? `usuaris amb marcador "${selectedTag}"` : getTargetLabel(broadcastTarget);
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Estàs segur que vols enviar aquesta notificació a ${targetLabel}?`);
      if (confirmed) {
        await confirmSend();
      }
    } else {
      Alert.alert(
        'Confirmar enviament',
        `Estàs segur que vols enviar aquesta notificació a ${targetLabel}?`,
        [
          { text: 'Cancel·lar', style: 'cancel' },
          { text: 'Enviar', onPress: confirmSend }
        ]
      );
    }
  };

  const getTargetLabel = (target: string): string => {
    const labels: Record<string, string> = {
      'all': 'tots els usuaris',
      'admins': 'només administradors',
      'users': 'només usuaris normals',
      'role:local_associat': 'locals associats',
      'role:entitat_colaboradora': 'entitats col·laboradores',
      'role:membre_consell': 'membres del consell',
    };
    return labels[target] || target;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const targetOptions = [
    { value: 'all', label: 'Tots els usuaris', icon: 'people' },
    { value: 'users', label: 'Només usuaris', icon: 'person' },
    { value: 'admins', label: 'Administradors', icon: 'admin-panel-settings' },
    { value: 'role:local_associat', label: 'Locals associats', icon: 'store' },
    { value: 'role:entitat_colaboradora', label: 'Entitats', icon: 'business' },
    { value: 'role:membre_consell', label: 'Consell', icon: 'groups' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Notificacions Push</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Stats */}
        {loadingStats ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginBottom: Spacing.lg }} />
        ) : stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="devices" size={28} color={Colors.primary} />
              <Text style={styles.statNumber}>{stats.total_web_push || 0}</Text>
              <Text style={styles.statLabel}>Dispositius subscrits</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="notifications-active" size={28} color={Colors.success} />
              <Text style={styles.statNumber}>{stats.notifications_last_30_days || 0}</Text>
              <Text style={styles.statLabel}>Enviades (30 dies)</Text>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Les notificacions s'envien als usuaris que han activat les notificacions a l'app web (PWA).
          </Text>
        </View>

        {/* Broadcast Notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enviar Notificació</Text>
          <Text style={styles.sectionSubtitle}>
            Envia notificacions a tots els usuaris o a grups específics
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destinataris per Rol</Text>
            <View style={styles.targetGrid}>
              {targetOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.targetOption,
                    broadcastTarget === option.value && !selectedTag && styles.targetOptionSelected
                  ]}
                  onPress={() => {
                    setBroadcastTarget(option.value);
                    setSelectedTag(null);
                  }}
                >
                  <MaterialIcons 
                    name={option.icon as any} 
                    size={20} 
                    color={broadcastTarget === option.value && !selectedTag ? Colors.white : Colors.primary} 
                  />
                  <Text style={[
                    styles.targetOptionText,
                    broadcastTarget === option.value && !selectedTag && styles.targetOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Secció de Marcadors/Tags */}
          {tags.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>O selecciona un Marcador</Text>
              <Text style={styles.sublabel}>Envia només als participants d'aquest esdeveniment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                <View style={styles.tagsContainer}>
                  {tags.slice(0, 10).map((tag) => (
                    <Pressable
                      key={tag.name}
                      style={[
                        styles.tagChip,
                        selectedTag === tag.name && styles.tagChipSelected
                      ]}
                      onPress={() => {
                        if (selectedTag === tag.name) {
                          setSelectedTag(null);
                        } else {
                          setSelectedTag(tag.name);
                        }
                      }}
                    >
                      <MaterialIcons 
                        name="local-offer" 
                        size={16} 
                        color={selectedTag === tag.name ? Colors.white : Colors.primary} 
                      />
                      <Text style={[
                        styles.tagChipText,
                        selectedTag === tag.name && styles.tagChipTextSelected
                      ]}>
                        {tag.name}
                      </Text>
                      <Text style={[
                        styles.tagChipCount,
                        selectedTag === tag.name && styles.tagChipCountSelected
                      ]}>
                        {tag.count}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              {selectedTag && (
                <View style={styles.selectedTagInfo}>
                  <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                  <Text style={styles.selectedTagText}>
                    Enviaràs a {tags.find(t => t.name === selectedTag)?.count || 0} usuaris del marcador "{selectedTag}"
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Títol *</Text>
            <TextInput
              style={styles.input}
              placeholder="Títol de la notificació"
              placeholderTextColor={Colors.gray}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Missatge *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Contingut de la notificació"
              placeholderTextColor={Colors.gray}
              value={broadcastBody}
              onChangeText={setBroadcastBody}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={[styles.sendButton, broadcastLoading && styles.sendButtonDisabled]}
            onPress={handleSendBroadcast}
            disabled={broadcastLoading}
          >
            {broadcastLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color={Colors.white} />
                <Text style={styles.sendButtonText}>Enviar Notificació</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial d'enviaments</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No hi ha notificacions enviades</Text>
          ) : (
            history.map((item) => (
              <View key={item._id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.historyDate}>{formatDate(item.sent_at)}</Text>
                </View>
                <Text style={styles.historyBody} numberOfLines={2}>{item.body}</Text>
                <View style={styles.historyFooter}>
                  <MaterialIcons name="people" size={14} color={Colors.textSecondary} />
                  <Text style={styles.historyMeta}>
                    {item.web_sent || 0} enviats • {getTargetLabel(item.target)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryLight || '#E8F5E9',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  sublabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E5E5',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  targetOptionSelected: {
    backgroundColor: Colors.primary,
  },
  targetOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  targetOptionTextSelected: {
    color: Colors.white,
  },
  tagsScroll: {
    marginTop: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  tagChipSelected: {
    backgroundColor: Colors.primary,
  },
  tagChipText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: Colors.white,
  },
  tagChipCount: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 20,
    textAlign: 'center',
  },
  tagChipCountSelected: {
    backgroundColor: Colors.white,
    color: Colors.primary,
  },
  selectedTagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight || '#E8F5E9',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  selectedTagText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    flex: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  historyItem: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  historyDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  historyBody: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
