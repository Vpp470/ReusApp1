import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface UserWithTag {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  participation_count: number;
  first_participation: string;
  last_participation: string;
}

interface TagStats {
  unique_users: number;
  total_participations: number;
  first_use: string;
  last_use: string;
}

export default function TagUsersScreen() {
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { token } = useAuthStore();
  const [users, setUsers] = useState<UserWithTag[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithTag[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (tag) {
      loadUsers();
    }
  }, [tag]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/admin/tags/${encodeURIComponent(tag!)}/users`,
        {
          headers: { Authorization: token! },
        }
      );
      setUsers(response.data.users || []);
      setStats(response.data.stats || null);
    } catch (error) {
      console.error('Error carregant usuaris:', error);
      Alert.alert('Error', 'No s\'han pogut carregar els usuaris');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderUserItem = ({ item }: { item: UserWithTag }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <MaterialIcons name="person" size={32} color={Colors.white} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || 'Sense nom'}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.phone && (
          <Text style={styles.userPhone}>📞 {item.phone}</Text>
        )}
        <View style={styles.userStats}>
          <View style={styles.userStatItem}>
            <MaterialIcons name="timeline" size={14} color={Colors.primary} />
            <Text style={styles.userStatText}>{item.participation_count} participacions</Text>
          </View>
          <View style={styles.userStatItem}>
            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
            <Text style={styles.userStatText}>Última: {formatDate(item.last_participation)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant usuaris...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="label" size={20} color={Colors.white} />
          <Text style={styles.headerTitle} numberOfLines={1}>{tag}</Text>
        </View>
        <Pressable onPress={loadUsers} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {/* Estadístiques */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialIcons name="people" size={28} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats.unique_users}</Text>
            <Text style={styles.statLabel}>Usuaris únics</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons name="timeline" size={28} color={Colors.success} />
            <Text style={styles.statNumber}>{stats.total_participations}</Text>
            <Text style={styles.statLabel}>Participacions</Text>
          </View>
        </View>
      )}

      {/* Llistat d'usuaris */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Usuaris amb aquest marcador</Text>
        
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="person-off" size={60} color={Colors.lightGray} />
            <Text style={styles.emptyTitle}>Cap usuari trobat</Text>
            <Text style={styles.emptyText}>
              Encara no hi ha usuaris amb aquest marcador.
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: '#666666',
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
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: '#666666',
    marginTop: Spacing.xs,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  listTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: FontSizes.sm,
    color: '#666666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: FontSizes.sm,
    color: '#666666',
    marginBottom: Spacing.xs,
  },
  userStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userStatText: {
    fontSize: FontSizes.xs,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: '#666666',
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
});
