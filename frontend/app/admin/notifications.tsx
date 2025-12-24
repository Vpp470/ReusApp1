import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { sendLocalNotification } from '../../src/services/notifications';
import api from '../../src/services/api';

interface NotificationStats {
  total_users_with_token: number;
  total_web_push: number;
  total_expo_push: number;
  by_role: Record<string, number>;
  notifications_last_30_days: number;
}

interface NotificationHistoryItem {
  _id: string;
  title: string;
  body: string;
  target: string;
  tokens_count?: number;
  expo_sent?: number;
  web_sent?: number;
  sent_at: string;
}

interface Tag {
  name: string;
  count: number;
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  // Test notification
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  
  // Broadcast notification
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  // Stats, history and tags
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showTagSelector, setShowTagSelector] = useState(false);

  useEffect(() => {
    loadStats();
    loadHistory();
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
      // Assegurar que sempre és un array
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error carregant historial:', error);
    }
  };

  const handleSendTestNotification = async () => {
    if (!testTitle || !testBody) {
      Alert.alert('Error', 'Títol i missatge són obligatoris');
      return;
    }

    try {
      setTestLoading(true);
      await sendLocalNotification(testTitle, testBody);
      Alert.alert('Èxit', 'Notificació de prova enviada!');
      setTestTitle('');
      setTestBody('');
    } catch (error) {
      Alert.alert('Error', 'No s\'ha pogut enviar la notificació');
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) {
      Alert.alert('Error', 'Títol i missatge són obligatoris');
      return;
    }

    // Per a web, usar window.confirm; per a mòbil, usar Alert.alert
    const confirmSend = async () => {
      try {
        setBroadcastLoading(true);
        const response = await api.post('/admin/notifications/send', {
          title: broadcastTitle,
          body: broadcastBody,
          target: broadcastTarget,
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

    // Confirmació segons plataforma
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Estàs segur que vols enviar aquesta notificació a ${getTargetLabel(broadcastTarget)}?`);
      if (confirmed) {
        await confirmSend();
      }
    } else {
      Alert.alert(
        'Confirmar enviament',
        `Estàs segur que vols enviar aquesta notificació a ${getTargetLabel(broadcastTarget)}?`,
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
              <Text style={styles.statNumber}>{stats.total_users_with_token}</Text>
              <Text style={styles.statLabel}>Dispositius registrats</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="notifications-active" size={28} color={Colors.success} />
              <Text style={styles.statNumber}>{stats.notifications_last_30_days}</Text>
              <Text style={styles.statLabel}>Enviades (30 dies)</Text>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Les notificacions push s'envien als dispositius que tenen l'app instal·lada amb Expo Go o l'app compilada.
          </Text>
        </View>

        {/* Broadcast Notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enviar Notificació Massiva</Text>
          <Text style={styles.sectionSubtitle}>
            Envia notificacions a tots els usuaris o a grups específics
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destinataris *</Text>
            <View style={styles.targetGrid}>
              {targetOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.targetOption,
                    broadcastTarget === option.value && styles.targetOptionSelected
                  ]}
                  onPress={() => setBroadcastTarget(option.value)}
                >
                  <MaterialIcons 
                    name={option.icon as any} 
                    size={20} 
                    color={broadcastTarget === option.value ? Colors.white : Colors.primary} 
                  />
                  <Text style={[
                    styles.targetOptionText,
                    broadcastTarget === option.value && styles.targetOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {stats && option.value === 'all' && (
                    <Text style={[
                      styles.targetCount,
                      broadcastTarget === option.value && styles.targetCountSelected
                    ]}>
                      {stats.total_users_with_token}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Títol *</Text>
            <TextInput
              style={styles.input}
              placeholder="Títol de la notificació"
              placeholderTextColor={Colors.lightGray}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Missatge *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Contingut de la notificació"
              placeholderTextColor={Colors.lightGray}
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
                <Text style={styles.sendButtonText}>Enviar a {getTargetLabel(broadcastTarget)}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial d'enviaments</Text>
            {history.map((item) => (
              <View key={item._id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.historyDate}>{formatDate(item.sent_at)}</Text>
                </View>
                <Text style={styles.historyBody} numberOfLines={2}>{item.body}</Text>
                <View style={styles.historyFooter}>
                  <MaterialIcons name="people" size={14} color={Colors.textSecondary} />
                  <Text style={styles.historyMeta}>{item.tokens_count} dispositius</Text>
                  <Text style={styles.historyTarget}>• {getTargetLabel(item.target)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Test Notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificació de Prova (Local)</Text>
          <Text style={styles.sectionSubtitle}>
            Envia una notificació local al teu dispositiu per provar
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Títol *</Text>
            <TextInput
              style={styles.input}
              placeholder="Títol de la notificació"
              placeholderTextColor={Colors.lightGray}
              value={testTitle}
              onChangeText={setTestTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Missatge *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Contingut de la notificació"
              placeholderTextColor={Colors.lightGray}
              value={testBody}
              onChangeText={setTestBody}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={[styles.sendButton, styles.secondaryButton]}
            onPress={handleSendTestNotification}
            disabled={testLoading}
          >
            {testLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <MaterialIcons name="phone-android" size={20} color={Colors.primary} />
                <Text style={[styles.sendButtonText, styles.secondaryButtonText]}>Enviar Prova Local</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Com funciona?</Text>
          
          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Els usuaris han d'obrir l'app amb Expo Go o la versió compilada per registrar el seu dispositiu
            </Text>
          </View>

          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Selecciona el grup de destinataris i escriu el missatge
            </Text>
          </View>

          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              La notificació s'enviarà a tots els dispositius registrats del grup seleccionat
            </Text>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 100,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statNumber: {
    fontSize: FontSizes.xxl || 28,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '15',
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
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
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
    marginBottom: Spacing.md,
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
  input: {
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
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
  targetCount: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  targetCountSelected: {
    color: Colors.primary,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
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
  historyTarget: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textDark,
    lineHeight: 20,
  },
});
