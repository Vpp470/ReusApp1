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

interface AgendaEvent {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: string[];
  attendee_names?: string[];
}

interface Member {
  id: string;
  name: string;
  email: string;
}

export default function AgendaPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  // Només admins poden editar
  const canEdit = user?.role === 'admin';
  
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, membersRes] = await Promise.all([
        api.get('/consell/agenda', { headers: { Authorization: token } }),
        api.get('/consell/members', { headers: { Authorization: token } }),
      ]);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setEvents([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.date) {
      const msg = 'El títol i la data són obligatoris';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      await api.post('/consell/agenda', formData, {
        headers: { Authorization: token },
      });
      setShowModal(false);
      setFormData({ title: '', description: '', date: '', time: '', location: '' });
      loadData();
      const msg = 'Esdeveniment creat correctament';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Èxit', msg);
    } catch (error) {
      console.error('Error creating event:', error);
      const msg = 'Error creant l\'esdeveniment';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const handleDelete = async (eventId: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/consell/agenda/${eventId}`, {
          headers: { Authorization: token },
        });
        loadData();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Estàs segur que vols eliminar aquest esdeveniment?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Confirmar', 'Estàs segur que vols eliminar aquest esdeveniment?', [
        { text: 'Cancel·lar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const handleToggleAttendance = async (eventId: string) => {
    try {
      await api.post(`/consell/agenda/${eventId}/attend`, {}, {
        headers: { Authorization: token },
      });
      loadData();
    } catch (error) {
      console.error('Error toggling attendance:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ca-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(selectedMonth);
    const weeks = [];
    let days = [];
    
    // Empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const hasEvents = dayEvents.length > 0;
      const isToday = new Date().toDateString() === new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).toDateString();
      
      days.push(
        <Pressable
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.calendarDayToday,
            hasEvents && styles.calendarDayWithEvent,
          ]}
          onPress={() => {
            const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, date: dateStr }));
            setShowModal(true);
          }}
        >
          <Text style={[
            styles.calendarDayText,
            isToday && styles.calendarDayTextToday,
            hasEvents && styles.calendarDayTextWithEvent,
          ]}>
            {day}
          </Text>
          {hasEvents && (
            <View style={styles.eventDot} />
          )}
        </Pressable>
      );
      
      if ((startingDay + day) % 7 === 0) {
        weeks.push(
          <View key={`week-${weeks.length}`} style={styles.calendarWeek}>
            {days}
          </View>
        );
        days = [];
      }
    }
    
    // Add remaining days
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(<View key={`empty-end-${days.length}`} style={styles.calendarDay} />);
      }
      weeks.push(
        <View key={`week-${weeks.length}`} style={styles.calendarWeek}>
          {days}
        </View>
      );
    }
    
    return weeks;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Agenda dels Actes</Text>
          <View style={{ width: 44 }} />
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
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Agenda dels Actes</Text>
        {canEdit ? (
          <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
            <MaterialIcons name="add" size={28} color={Colors.white} />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>
              <MaterialIcons name="chevron-left" size={32} color={Colors.primary} />
            </Pressable>
            <Text style={styles.calendarTitle}>
              {selectedMonth.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>
              <MaterialIcons name="chevron-right" size={32} color={Colors.primary} />
            </Pressable>
          </View>
          
          <View style={styles.calendarWeekdays}>
            {['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'].map(day => (
              <Text key={day} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>
          
          {renderCalendar()}
        </View>

        {/* Events List */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Propers Esdeveniments</Text>
          
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>No hi ha esdeveniments programats</Text>
            </View>
          ) : (
            events.map(event => (
              <View key={event._id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventDate}>
                    <MaterialIcons name="event" size={20} color={Colors.primary} />
                    <Text style={styles.eventDateText}>{formatDate(event.date)}</Text>
                    {event.time && <Text style={styles.eventTime}>{event.time}</Text>}
                  </View>
                  <Pressable onPress={() => handleDelete(event._id)}>
                    <MaterialIcons name="delete" size={24} color={Colors.error} />
                  </Pressable>
                </View>
                
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.description && <Text style={styles.eventDescription}>{event.description}</Text>}
                
                {event.location && (
                  <View style={styles.eventLocation}>
                    <MaterialIcons name="place" size={16} color={Colors.gray} />
                    <Text style={styles.eventLocationText}>{event.location}</Text>
                  </View>
                )}
                
                <View style={styles.attendeesSection}>
                  <Text style={styles.attendeesTitle}>
                    Assistents ({event.attendees?.length || 0}):
                  </Text>
                  {event.attendee_names && event.attendee_names.length > 0 ? (
                    <Text style={styles.attendeesList}>
                      {event.attendee_names.join(', ')}
                    </Text>
                  ) : (
                    <Text style={styles.attendeesEmpty}>Cap assistent confirmat</Text>
                  )}
                  
                  <Pressable
                    style={styles.attendButton}
                    onPress={() => handleToggleAttendance(event._id)}
                  >
                    <MaterialIcons name="how-to-reg" size={18} color={Colors.white} />
                    <Text style={styles.attendButtonText}>Confirmar/Cancel·lar assistència</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nou Esdeveniment</Text>
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
                placeholder="Títol de l'esdeveniment"
              />
              
              <Text style={styles.label}>Data *</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
              />
              
              <Text style={styles.label}>Hora</Text>
              <TextInput
                style={styles.input}
                value={formData.time}
                onChangeText={(text) => setFormData(prev => ({ ...prev, time: text }))}
                placeholder="HH:MM"
              />
              
              <Text style={styles.label}>Ubicació</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="Lloc de l'esdeveniment"
              />
              
              <Text style={styles.label}>Descripció</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Descripció..."
                multiline
                numberOfLines={4}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel·lar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleCreate}>
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
  },
  calendarContainer: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    textTransform: 'capitalize',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.gray,
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDayToday: {
    backgroundColor: Colors.primaryLight,
  },
  calendarDayWithEvent: {
    backgroundColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: FontSizes.sm,
    color: Colors.textDark,
  },
  calendarDayTextToday: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  calendarDayTextWithEvent: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
    position: 'absolute',
    bottom: 4,
  },
  eventsSection: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.md,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eventDateText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginLeft: Spacing.sm,
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  eventDescription: {
    fontSize: FontSizes.md,
    color: Colors.darkGray,
    marginBottom: Spacing.sm,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  eventLocationText: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  attendeesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: Spacing.md,
  },
  attendeesTitle: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  attendeesList: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray,
    marginBottom: Spacing.sm,
  },
  attendeesEmpty: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  attendButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
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
    height: 100,
    textAlignVertical: 'top',
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
    backgroundColor: Colors.primary,
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
