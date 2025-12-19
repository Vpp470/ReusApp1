import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/colors';

interface Establishment {
  _id: string;
  id?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  participantIds: string[];
  allEstablishments: Establishment[];
  onEstablishmentPress?: (establishmentId: string) => void;
  eventId: string;
}

export default function ParticipantsMapModal({
  visible,
  onClose,
  participantIds,
  allEstablishments,
  onEstablishmentPress,
  eventId,
}: Props) {
  const participants = allEstablishments.filter(est =>
    participantIds.includes(est._id) || participantIds.includes(est.id || '')
  );

  // Construir la URL completa del backend utilitzant Constants
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     Constants.manifest?.extra?.EXPO_PUBLIC_BACKEND_URL ||
                     process.env.EXPO_PUBLIC_BACKEND_URL ||
                     'https://www.reusapp.com';
  const mapUrl = `${backendUrl}/event-map.html?eventId=${eventId}`;
  
  console.log('ParticipantsMapModal - Backend URL:', backendUrl);
  console.log('ParticipantsMapModal - Map URL:', mapUrl);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <MaterialIcons name="close" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Mapa de Locals Participants</Text>
          <View style={{ width: 40 }} />
        </View>

        {Platform.OS === 'web' ? (
          <iframe
            src={mapUrl}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
            }}
            title="Mapa dels participants"
            allow="geolocation"
          />
        ) : (
          <WebView
            source={{ uri: mapUrl }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            geolocationEnabled={true}
          />
        )}
      </SafeAreaView>
    </Modal>
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
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  map: {
    flex: 1,
  },
});
