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
  Modal,
  TouchableOpacity,
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

interface Event {
  _id: string;
  title: string;
  participant_count?: number;
}

interface SegmentationFilters {
  tags: string[];
  gender: string | null;
  ageMin: string;
  ageMax: string;
  campaigns: string[];
  events: string[];
  city: string;
  postalCode: string;
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  // Broadcast notification
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  // Stats, history, tags, campaigns and events
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [campaigns, setCampaigns] = useState<TicketCampaign[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Modal de segmentació
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [filters, setFilters] = useState<SegmentationFilters>({
    tags: [],
    gender: null,
    ageMin: '',
    ageMax: '',
    campaigns: [],
    events: [],
    city: '',
    postalCode: '',
  });
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  useEffect(() => {
    loadStats();
    loadHistory();
    loadTags();
    loadCampaigns();
    loadEvents();
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
      setHistory(response.data || []);
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

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/admin/tickets/campaigns', {
        headers: { Authorization: token }
      });
      if (Array.isArray(response.data)) {
        setCampaigns(response.data);
      }
    } catch (error) {
      console.error('Error carregant campanyes:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await api.get('/admin/events?limit=50', {
        headers: { Authorization: token }
      });
      if (response.data?.events) {
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error('Error carregant events:', error);
    }
  };

  // Estimar nombre de destinataris segons els filtres
  const estimateRecipients = async () => {
    setLoadingEstimate(true);
    try {
      const response = await api.post('/admin/notifications/estimate', {
        filters: filters
      }, {
        headers: { Authorization: token }
      });
      setEstimatedRecipients(response.data.count || 0);
    } catch (error) {
      console.error('Error estimant destinataris:', error);
      setEstimatedRecipients(null);
    } finally {
      setLoadingEstimate(false);
    }
  };

  // Quan canvien els filtres, estimar destinataris
  useEffect(() => {
    if (showSegmentModal) {
      const hasFilters = filters.tags.length > 0 || 
                        filters.gender || 
                        filters.ageMin || 
                        filters.ageMax || 
                        filters.campaigns.length > 0 || 
                        filters.events.length > 0 ||
                        filters.city ||
                        filters.postalCode;
      if (hasFilters) {
        const timer = setTimeout(estimateRecipients, 500);
        return () => clearTimeout(timer);
      } else {
        setEstimatedRecipients(null);
      }
    }
  }, [filters, showSegmentModal]);

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) {
      Alert.alert('Error', 'Títol i missatge són obligatoris');
      return;
    }

    // Determinar el target final
    let finalTarget = broadcastTarget;
    let targetLabel = getTargetLabel(broadcastTarget);

    // Si hi ha filtres de segmentació, crear un target especial
    if (broadcastTarget === 'segmented') {
      finalTarget = `segmented:${JSON.stringify(filters)}`;
      targetLabel = `${estimatedRecipients || '?'} usuaris segons els filtres seleccionats`;
    }

    const confirmSend = async () => {
      setBroadcastLoading(true);
      try {
        const response = await api.post('/admin/notifications/broadcast', {
          title: broadcastTitle,
          body: broadcastBody,
          target: finalTarget,
          filters: broadcastTarget === 'segmented' ? filters : undefined,
        }, {
          headers: { Authorization: token }
        });
        
        const webSent = response.data?.web_sent || 0;
        Alert.alert(
          'Notificació enviada',
          `S'han enviat ${webSent} notificacions web push.`
        );
        
        setBroadcastTitle('');
        setBroadcastBody('');
        setBroadcastTarget('all');
        setFilters({
          tags: [],
          gender: null,
          ageMin: '',
          ageMax: '',
          campaigns: [],
          events: [],
        });
        loadHistory();
        loadStats();
      } catch (error: any) {
        console.error('Error enviant notificació:', error);
        Alert.alert(
          'Error',
          error.response?.data?.detail || 'No s\'ha pogut enviar la notificació'
        );
      } finally {
        setBroadcastLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Estàs segur que vols enviar aquesta notificació a ${targetLabel}?`)) {
        confirmSend();
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
      'segmented': 'usuaris seleccionats',
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

  const handleTargetSelect = (value: string) => {
    if (value === 'users') {
      // Obrir modal de segmentació
      setShowSegmentModal(true);
    } else {
      setBroadcastTarget(value);
    }
  };

  const applySegmentation = () => {
    const hasFilters = filters.tags.length > 0 || 
                      filters.gender || 
                      filters.ageMin || 
                      filters.ageMax || 
                      filters.campaigns.length > 0 || 
                      filters.events.length > 0;
    
    if (hasFilters) {
      setBroadcastTarget('segmented');
    } else {
      setBroadcastTarget('users');
    }
    setShowSegmentModal(false);
  };

  const clearFilters = () => {
    setFilters({
      tags: [],
      gender: null,
      ageMin: '',
      ageMax: '',
      campaigns: [],
      events: [],
      city: '',
      postalCode: '',
    });
    setEstimatedRecipients(null);
  };

  const toggleTag = (tagName: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName) 
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }));
  };

  const toggleCampaign = (campaignId: string) => {
    setFilters(prev => ({
      ...prev,
      campaigns: prev.campaigns.includes(campaignId) 
        ? prev.campaigns.filter(c => c !== campaignId)
        : [...prev.campaigns, campaignId]
    }));
  };

  const toggleEvent = (eventId: string) => {
    setFilters(prev => ({
      ...prev,
      events: prev.events.includes(eventId) 
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.tags.length > 0) count += filters.tags.length;
    if (filters.gender) count += 1;
    if (filters.ageMin || filters.ageMax) count += 1;
    if (filters.campaigns.length > 0) count += filters.campaigns.length;
    if (filters.events.length > 0) count += filters.events.length;
    return count;
  };

  const targetOptions = [
    { value: 'all', label: 'Tots els usuaris', icon: 'people' },
    { value: 'users', label: 'Només usuaris', icon: 'person', hasModal: true },
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

        {/* Send Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enviar Notificació</Text>
          <Text style={styles.sectionSubtitle}>
            Envia notificacions a tots els usuaris o a grups específics
          </Text>

          {/* Destinataris per Rol */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destinataris per Rol</Text>
            <View style={styles.targetButtons}>
              {targetOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.targetButton,
                    (broadcastTarget === option.value || 
                     (option.value === 'users' && broadcastTarget === 'segmented')) && 
                    styles.targetButtonSelected
                  ]}
                  onPress={() => handleTargetSelect(option.value)}
                >
                  <MaterialIcons 
                    name={option.icon as any} 
                    size={20} 
                    color={(broadcastTarget === option.value || 
                           (option.value === 'users' && broadcastTarget === 'segmented')) 
                           ? Colors.white : Colors.primary} 
                  />
                  <Text style={[
                    styles.targetButtonText,
                    (broadcastTarget === option.value || 
                     (option.value === 'users' && broadcastTarget === 'segmented')) && 
                    styles.targetButtonTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {option.hasModal && (
                    <MaterialIcons 
                      name="tune" 
                      size={16} 
                      color={(broadcastTarget === option.value || broadcastTarget === 'segmented') 
                             ? Colors.white : Colors.gray} 
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Mostrar filtres actius */}
          {broadcastTarget === 'segmented' && getActiveFiltersCount() > 0 && (
            <View style={styles.activeFiltersContainer}>
              <View style={styles.activeFiltersHeader}>
                <MaterialIcons name="filter-list" size={20} color={Colors.primary} />
                <Text style={styles.activeFiltersTitle}>
                  {getActiveFiltersCount()} filtres actius
                </Text>
                <TouchableOpacity onPress={() => setShowSegmentModal(true)}>
                  <Text style={styles.editFiltersButton}>Editar</Text>
                </TouchableOpacity>
              </View>
              {estimatedRecipients !== null && (
                <Text style={styles.estimatedText}>
                  ~{estimatedRecipients} destinataris
                </Text>
              )}
              <View style={styles.filterChips}>
                {filters.tags.map(tag => (
                  <View key={tag} style={styles.filterChip}>
                    <Text style={styles.filterChipText}>🏷️ {tag}</Text>
                  </View>
                ))}
                {filters.gender && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      {filters.gender === 'male' ? '👨 Homes' : filters.gender === 'female' ? '👩 Dones' : '⚧️ Altres'}
                    </Text>
                  </View>
                )}
                {(filters.ageMin || filters.ageMax) && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      📅 {filters.ageMin || '?'} - {filters.ageMax || '?'} anys
                    </Text>
                  </View>
                )}
                {filters.campaigns.map(cId => {
                  const campaign = campaigns.find(c => c._id === cId);
                  return (
                    <View key={cId} style={styles.filterChip}>
                      <Text style={styles.filterChipText}>🎫 {campaign?.name || cId}</Text>
                    </View>
                  );
                })}
                {filters.events.map(eId => {
                  const event = events.find(e => e._id === eId);
                  return (
                    <View key={eId} style={styles.filterChip}>
                      <Text style={styles.filterChipText}>📅 {event?.title || eId}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Títol */}
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

          {/* Missatge */}
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

          {/* Botó Enviar */}
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

        {/* Historial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial d'enviaments</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No hi ha notificacions enviades</Text>
          ) : (
            history.map((item) => (
              <View key={item._id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyDate}>{formatDate(item.sent_at)}</Text>
                </View>
                <Text style={styles.historyBody} numberOfLines={2}>{item.body}</Text>
                <View style={styles.historyFooter}>
                  <Text style={styles.historyTarget}>
                    📤 {getTargetLabel(item.target)}
                  </Text>
                  {item.web_sent !== undefined && (
                    <Text style={styles.historySent}>
                      ✅ {item.web_sent} enviades
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de Segmentació */}
      <Modal
        visible={showSegmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSegmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Segmentació d'Usuaris</Text>
              <TouchableOpacity onPress={() => setShowSegmentModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Estimació de destinataris */}
              <View style={styles.estimateBox}>
                {loadingEstimate ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : estimatedRecipients !== null ? (
                  <>
                    <Text style={styles.estimateNumber}>{estimatedRecipients}</Text>
                    <Text style={styles.estimateLabel}>destinataris estimats</Text>
                  </>
                ) : (
                  <Text style={styles.estimateLabel}>Selecciona filtres per estimar destinataris</Text>
                )}
              </View>

              {/* Filtres per Marcadors/Tags */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="label" size={18} color={Colors.primary} /> Marcadors
                </Text>
                <Text style={styles.filterSectionDesc}>
                  Selecciona usuaris amb aquests marcadors assignats
                </Text>
                <View style={styles.filterOptions}>
                  {tags.length === 0 ? (
                    <Text style={styles.noOptionsText}>No hi ha marcadors disponibles</Text>
                  ) : (
                    tags.map(tag => (
                      <TouchableOpacity
                        key={tag.name}
                        style={[
                          styles.filterOption,
                          filters.tags.includes(tag.name) && styles.filterOptionSelected
                        ]}
                        onPress={() => toggleTag(tag.name)}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.tags.includes(tag.name) && styles.filterOptionTextSelected
                        ]}>
                          {tag.name} ({tag.count})
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>

              {/* Filtres per Gènere */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="wc" size={18} color={Colors.primary} /> Gènere
                </Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'male', label: '👨 Homes' },
                    { value: 'female', label: '👩 Dones' },
                    { value: 'other', label: '⚧️ Altres' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.gender === option.value && styles.filterOptionSelected
                      ]}
                      onPress={() => setFilters(prev => ({
                        ...prev,
                        gender: prev.gender === option.value ? null : option.value
                      }))}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.gender === option.value && styles.filterOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtres per Edat */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="cake" size={18} color={Colors.primary} /> Rang d'Edat
                </Text>
                <View style={styles.ageInputs}>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Mínim"
                    placeholderTextColor={Colors.gray}
                    keyboardType="numeric"
                    value={filters.ageMin}
                    onChangeText={(val) => setFilters(prev => ({ ...prev, ageMin: val }))}
                  />
                  <Text style={styles.ageSeparator}>-</Text>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Màxim"
                    placeholderTextColor={Colors.gray}
                    keyboardType="numeric"
                    value={filters.ageMax}
                    onChangeText={(val) => setFilters(prev => ({ ...prev, ageMax: val }))}
                  />
                  <Text style={styles.ageLabel}>anys</Text>
                </View>
              </View>

              {/* Filtres per Ciutat */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="location-city" size={18} color={Colors.primary} /> Ciutat
                </Text>
                <TextInput
                  style={styles.textInputFilter}
                  placeholder="Escriu el nom de la ciutat..."
                  placeholderTextColor={Colors.gray}
                  value={filters.city}
                  onChangeText={(val) => setFilters(prev => ({ ...prev, city: val }))}
                />
              </View>

              {/* Filtres per Codi Postal */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="markunread-mailbox" size={18} color={Colors.primary} /> Codi Postal
                </Text>
                <TextInput
                  style={styles.textInputFilter}
                  placeholder="Escriu el codi postal..."
                  placeholderTextColor={Colors.gray}
                  keyboardType="numeric"
                  value={filters.postalCode}
                  onChangeText={(val) => setFilters(prev => ({ ...prev, postalCode: val }))}
                />
              </View>

              {/* Filtres per Campanyes de Sorteig */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="confirmation-number" size={18} color={Colors.primary} /> Campanyes de Sorteig
                </Text>
                <Text style={styles.filterSectionDesc}>
                  Usuaris que han participat en aquestes campanyes
                </Text>
                <View style={styles.filterOptions}>
                  {campaigns.length === 0 ? (
                    <Text style={styles.noOptionsText}>No hi ha campanyes disponibles</Text>
                  ) : (
                    campaigns.map(campaign => (
                      <TouchableOpacity
                        key={campaign._id}
                        style={[
                          styles.filterOption,
                          filters.campaigns.includes(campaign._id) && styles.filterOptionSelected
                        ]}
                        onPress={() => toggleCampaign(campaign._id)}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.campaigns.includes(campaign._id) && styles.filterOptionTextSelected
                        ]}>
                          🎫 {campaign.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>

              {/* Filtres per Events */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <MaterialIcons name="event" size={18} color={Colors.primary} /> Participants d'Events
                </Text>
                <Text style={styles.filterSectionDesc}>
                  Usuaris que s'han registrat en aquests events
                </Text>
                <View style={styles.filterOptions}>
                  {events.length === 0 ? (
                    <Text style={styles.noOptionsText}>No hi ha events disponibles</Text>
                  ) : (
                    events.slice(0, 10).map(event => (
                      <TouchableOpacity
                        key={event._id}
                        style={[
                          styles.filterOption,
                          filters.events.includes(event._id) && styles.filterOptionSelected
                        ]}
                        onPress={() => toggleEvent(event._id)}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.events.includes(event._id) && styles.filterOptionTextSelected
                        ]} numberOfLines={1}>
                          📅 {event.title}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Botons del modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <MaterialIcons name="clear-all" size={20} color={Colors.danger} />
                <Text style={styles.clearButtonText}>Netejar filtres</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applySegmentation}>
                <MaterialIcons name="check" size={20} color={Colors.white} />
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
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
    backgroundColor: Colors.primary,
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
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
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
    color: Colors.textDark,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight || '#E3F2FD',
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
    padding: Spacing.md,
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
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  targetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  targetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  targetButtonSelected: {
    backgroundColor: Colors.primary,
  },
  targetButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  targetButtonTextSelected: {
    color: Colors.white,
  },
  activeFiltersContainer: {
    backgroundColor: Colors.primaryLight || '#E3F2FD',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  activeFiltersTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  editFiltersButton: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  estimatedText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterChip: {
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    color: Colors.textDark,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  historyItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
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
    marginBottom: Spacing.sm,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTarget: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  historySent: {
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  modalBody: {
    padding: Spacing.md,
  },
  estimateBox: {
    backgroundColor: Colors.primaryLight || '#E3F2FD',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  estimateNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  estimateLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterSectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  filterSectionDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    backgroundColor: Colors.background,
  },
  filterOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark,
  },
  filterOptionTextSelected: {
    color: Colors.white,
  },
  noOptionsText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  ageInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ageInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    textAlign: 'center',
  },
  ageSeparator: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  ageLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    gap: Spacing.xs,
  },
  clearButtonText: {
    fontSize: FontSizes.md,
    color: Colors.danger,
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  applyButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
});
