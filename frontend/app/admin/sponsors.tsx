import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

interface Sponsor {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  category?: string;
  description?: string;
}

export default function SponsorsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/establishments', {
        headers: { Authorization: token }
      });
      
      // Filtrar només les entitats col·laboradores (categoria "X Entitats Socials")
      const allEstablishments = response.data || [];
      const sponsorsList = allEstablishments.filter((est: any) => 
        est.category === 'X Entitats Socials' || 
        est.establishment_type === 'entitat_colaboradora' ||
        est.is_sponsor === true
      );
      
      setSponsors(sponsorsList);
    } catch (error) {
      console.error('Error carregant entitats:', error);
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
      const currentDate = new Date().toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Entitats Col·laboradores - El Tomb de Reus</title>
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
              border-bottom: 3px solid #9C27B0;
            }
            .header h1 {
              color: #9C27B0;
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
              color: #9C27B0;
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
              background: #9C27B0;
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
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤝 Entitats Col·laboradores</h1>
            <p class="subtitle">El Tomb de Reus - Llistat generat el ${currentDate}</p>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <div class="stat-number">${sponsors.length}</div>
              <div class="stat-label">Total Entitats</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Adreça</th>
                <th>Telèfon</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${sponsors.map((sponsor, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${sponsor.name || '-'}</strong></td>
                  <td>${sponsor.address || '-'}</td>
                  <td>${sponsor.phone || '-'}</td>
                  <td>${sponsor.email || '-'}</td>
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

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Entitats Col·laboradores</Text>
          <Text style={styles.headerSubtitle}>{sponsors.length} entitats</Text>
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
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Carregant entitats...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Info box */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color="#9C27B0" />
            <Text style={styles.infoText}>
              Les entitats col·laboradores són patrocinadors i col·laboradors d'El Tomb de Reus
            </Text>
          </View>

          {/* Llista d'entitats */}
          {sponsors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="business" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No hi ha entitats col·laboradores</Text>
            </View>
          ) : (
            sponsors.map((sponsor, index) => (
              <View key={sponsor._id || index} style={styles.sponsorCard}>
                <View style={styles.sponsorIndex}>
                  <Text style={styles.sponsorIndexText}>{index + 1}</Text>
                </View>
                
                {sponsor.logo_url ? (
                  <Image 
                    source={{ uri: sponsor.logo_url }} 
                    style={styles.sponsorLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.sponsorLogoPlaceholder}>
                    <MaterialIcons name="business" size={24} color={Colors.gray} />
                  </View>
                )}
                
                <View style={styles.sponsorInfo}>
                  <Text style={styles.sponsorName}>{sponsor.name || 'Sense nom'}</Text>
                  {sponsor.address && (
                    <Text style={styles.sponsorDetail}>
                      <MaterialIcons name="place" size={12} color={Colors.gray} /> {sponsor.address}
                    </Text>
                  )}
                  {sponsor.phone && (
                    <Text style={styles.sponsorDetail}>
                      <MaterialIcons name="phone" size={12} color={Colors.gray} /> {sponsor.phone}
                    </Text>
                  )}
                  {sponsor.email && (
                    <Text style={styles.sponsorDetail}>
                      <MaterialIcons name="email" size={12} color={Colors.gray} /> {sponsor.email}
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
    backgroundColor: '#9C27B0',
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
    borderLeftColor: '#9C27B0',
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
  sponsorCard: {
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
  sponsorIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sponsorIndexText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: FontSizes.sm,
  },
  sponsorLogo: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  sponsorLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  sponsorDetail: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
});
