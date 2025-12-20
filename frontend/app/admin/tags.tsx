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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface Tag {
  _id: string;
  tag: string;
  total_participations: number;
  unique_users_count: number;
  first_use: string;
  last_use: string;
  activities: string[];
}

export default function TagsManagementScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingTag, setExportingTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    // Filtrar marcadors quan canvia la cerca
    if (searchQuery.trim() === '') {
      setFilteredTags(tags);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTags(tags.filter(tag => 
        tag.tag.toLowerCase().includes(query)
      ));
    }
  }, [searchQuery, tags]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/tags`, {
        headers: { Authorization: token! },
      });
      setTags(response.data.tags || []);
      setFilteredTags(response.data.tags || []);
    } catch (error) {
      console.error('Error carregant marcadors:', error);
      Alert.alert('Error', 'No s\'han pogut carregar els marcadors');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async (tag: string) => {
    try {
      setExportingTag(tag);
      
      // Descarregar el fitxer Excel
      const response = await axios.get(
        `${API_URL}/api/admin/tags/${encodeURIComponent(tag)}/export`,
        {
          headers: { Authorization: token! },
          responseType: 'arraybuffer',
        }
      );

      // Guardar temporalment
      const filename = `usuaris_${tag}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      // Convertir a base64
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Èxit', `Fitxer guardat a: ${fileUri}`);
      }
    } catch (error) {
      console.error('Error exportant Excel:', error);
      Alert.alert('Error', 'No s\'ha pogut exportar l\'Excel');
    } finally {
      setExportingTag(null);
    }
  };

  const handleViewUsers = async (tag: string) => {
    // Navegar a la pantalla de detall del marcador
    router.push(`/admin/tag-users?tag=${encodeURIComponent(tag)}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'ticket_scan':
        return 'receipt';
      case 'promotion':
        return 'local-offer';
      case 'gift_card':
        return 'card-giftcard';
      case 'offer':
        return 'star';
      default:
        return 'label';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregant marcadors...</Text>
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
        <Text style={styles.headerTitle}>🏷️ Marcadors</Text>
        <Pressable onPress={loadTags} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {/* Cercador */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cercar marcadors..."
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#666666" />
          </Pressable>
        )}
      </View>

      {/* Contingut */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {filteredTags.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="label-off" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyTitle}>{searchQuery ? 'Cap resultat' : 'Cap marcador disponible'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Prova amb una altra cerca.' : 'Els marcadors apareixeran quan creïs promocions o campanyes amb etiquetes.'}
            </Text>
          </View>
        ) : (
          filteredTags.map((tag) => (
            <View key={tag.tag} style={styles.tagCard}>
              {/* Header del Tag */}
              <View style={styles.tagHeader}>
                <View style={styles.tagTitleContainer}>
                  <MaterialIcons name="label" size={24} color={Colors.primary} />
                  <Text style={styles.tagTitle}>{tag.tag}</Text>
                </View>
                
                {/* Icones d'activitats */}
                <View style={styles.activityIcons}>
                  {tag.activities.map((activity, index) => (
                    <MaterialIcons
                      key={index}
                      name={getActivityIcon(activity)}
                      size={20}
                      color={Colors.textSecondary}
                      style={styles.activityIcon}
                    />
                  ))}
                </View>
              </View>

              {/* Estadístiques */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialIcons name="people" size={20} color={Colors.primary} />
                  <Text style={styles.statNumber}>{tag.unique_users_count}</Text>
                  <Text style={styles.statLabel}>Usuaris</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <MaterialIcons name="timeline" size={20} color={Colors.success} />
                  <Text style={styles.statNumber}>{tag.total_participations}</Text>
                  <Text style={styles.statLabel}>Participacions</Text>
                </View>
              </View>

              {/* Dates */}
              <View style={styles.datesRow}>
                <Text style={styles.dateText}>
                  Primera: {formatDate(tag.first_use)}
                </Text>
                <Text style={styles.dateText}>
                  Última: {formatDate(tag.last_use)}
                </Text>
              </View>

              {/* Accions */}
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => handleViewUsers(tag.tag)}
                >
                  <MaterialIcons name="visibility" size={20} color={Colors.primary} />
                  <Text style={styles.viewButtonText}>Veure Usuaris</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionButton, styles.exportButton]}
                  onPress={() => handleExportExcel(tag.tag)}
                  disabled={exportingTag === tag.tag}
                >
                  {exportingTag === tag.tag ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons name="file-download" size={20} color={Colors.white} />
                      <Text style={styles.exportButtonText}>Exportar Excel</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    color: Colors.darkGray, // Text gris per fons blanc
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: '#212121',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray, // Text gris per fons blanc
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  tagCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tagTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  activityIcons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  activityIcon: {
    marginLeft: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.lightGray,
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textDark, // Text fosc per fons blanc // Text blanc per llegibilitat
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  dateText: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray, // Text gris per fons blanc
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  viewButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: Colors.success,
  },
  exportButtonText: {
    color: Colors.textDark, // Text fosc per fons blanc
    fontWeight: '600',
  },
});
