import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roles?: string[];
  created_at?: string;
  establishment_id?: string;
  establishment_name?: string;
}

interface Establishment {
  _id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  'all': 'Tots els Usuaris',
  'admin': 'Administradors',
  'user': 'Usuaris',
  'local_associat': 'Locals Associats',
  'entitat_colaboradora': 'Entitats Col·laboradores',
  'membre_consell': 'Membres del Consell',
};

const roleColors: Record<string, string> = {
  'admin': '#E53935',
  'user': '#43A047',
  'local_associat': '#FB8C00',
  'entitat_colaboradora': '#1E88E5',
  'membre_consell': '#8E24AA',
  'all': Colors.primary,
};

export default function UsersListByRoleScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();
  const { token } = useAuthStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (role) {
      loadData();
    }
  }, [role]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar establiments per tenir el mapa d'IDs a noms
      const estResponse = await api.get('/establishments', {
        headers: { Authorization: token }
      });
      const estMap: Record<string, string> = {};
      (estResponse.data || []).forEach((est: Establishment) => {
        estMap[est._id] = est.name;
      });
      setEstablishments(estMap);
      
      // Carregar usuaris
      const response = await api.get(`/admin/users?skip=0&limit=10000&role=${role}`, {
        headers: { Authorization: token }
      });
      
      const userData = response.data.users || response.data || [];
      // Afegir nom d'establiment als usuaris
      const usersWithEst = userData.map((user: User) => ({
        ...user,
        establishment_name: user.establishment_id ? estMap[user.establishment_id] : undefined
      }));
      
      setUsers(usersWithEst);
    } catch (error) {
      console.error('Error carregant dades:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (Platform.OS !== 'web') {
      return;
    }

    setGenerating(true);
    
    try {
      const roleTitle = roleLabels[role || 'all'] || role;
      const currentDate = new Date().toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Crear contingut HTML per al PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${roleTitle} - El Tomb de Reus</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid ${roleColors[role || 'all']};
            }
            .header h1 {
              color: ${roleColors[role || 'all']};
              font-size: 28px;
              margin-bottom: 8px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .stats {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-bottom: 30px;
            }
            .stat-box {
              text-align: center;
              padding: 15px 25px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .stat-number {
              font-size: 32px;
              font-weight: bold;
              color: ${roleColors[role || 'all']};
            }
            .stat-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: ${roleColors[role || 'all']};
              color: white;
              padding: 12px 15px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 10px 15px;
              border-bottom: 1px solid #eee;
            }
            tr:nth-child(even) {
              background: #fafafa;
            }
            tr:hover {
              background: #f0f0f0;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #999;
              font-size: 11px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${roleTitle}</h1>
            <p class="subtitle">El Tomb de Reus - Llistat generat el ${currentDate}</p>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <div class="stat-number">${users.length}</div>
              <div class="stat-label">Total Usuaris</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Telèfon</th>
                ${role === 'local_associat' ? '<th>Local Associat</th>' : ''}
              </tr>
            </thead>
            <tbody>
              \${users.map((user, index) => \`
                <tr>
                  <td>\${index + 1}</td>
                  <td>\${user.name || '-'}</td>
                  <td>${user.email}</td>
                  <td>${user.phone || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Document generat automàticament per El Tomb de Reus</p>
          </div>
        </body>
        </html>
      `;

      // Obrir en una nova finestra per imprimir/guardar com PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar que es carregui i després imprimir
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error) {
      console.error('Error generant PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const roleTitle = roleLabels[role || 'all'] || role;
  const roleColor = roleColors[role || 'all'] || Colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{roleTitle}</Text>
          <Text style={styles.headerSubtitle}>{users.length} usuaris</Text>
        </View>
        <Pressable 
          onPress={generatePDF} 
          style={styles.pdfButton}
          disabled={generating || loading}
        >
          {generating ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <MaterialIcons name="picture-as-pdf" size={24} color={Colors.white} />
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColor} />
          <Text style={styles.loadingText}>Carregant usuaris...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Info box */}
          <View style={[styles.infoBox, { borderLeftColor: roleColor }]}>
            <MaterialIcons name="info-outline" size={20} color={roleColor} />
            <Text style={styles.infoText}>
              Fes clic al botó PDF per descarregar el llistat complet
            </Text>
          </View>

          {/* Llista d'usuaris */}
          {users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-off" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No hi ha usuaris amb aquest rol</Text>
            </View>
          ) : (
            users.map((user, index) => (
              <View key={user._id || user.id || index} style={styles.userCard}>
                <View style={[styles.userIndex, { backgroundColor: roleColor }]}>
                  <Text style={styles.userIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name || 'Sense nom'}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  {user.phone && (
                    <Text style={styles.userPhone}>
                      <MaterialIcons name="phone" size={12} color={Colors.gray} /> {user.phone}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  pdfButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userIndexText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: FontSizes.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
  },
  userEmail: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 4,
  },
});
