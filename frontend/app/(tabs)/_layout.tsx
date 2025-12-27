import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import i18n from '../../src/i18n';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InstallPWA from '../../src/components/InstallPWA';
import { useAuthStore } from '../../src/store/authStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  // Comprovar si l'usuari és membre del consell
  const isConsellMember = user && (
    user.role === 'membre_consell' ||
    user.role === 'admin' ||
    (Array.isArray(user.roles) && user.roles.includes('membre_consell'))
  );
  
  return (
    <>
      <InstallPWA />
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.lightGray,
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 70 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 25 + insets.bottom : 10 + insets.bottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: i18n.t('tabs.home'),
          headerTitle: `${i18n.t('home.greeting')}, ${user?.name || 'Usuario'}`,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'Notícies',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="article" size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: i18n.t('tabs.map'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          href: null, // Ocultar - utilitzem promotions
          title: 'Ofertes',
          tabBarIcon: ({ color, size}) => (
            <MaterialIcons name="local-offer" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: i18n.t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Promocions',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="card-giftcard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          href: null, // Accessible des del perfil
          title: i18n.t('tabs.scanner'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="consell"
        options={{
          href: isConsellMember ? '/consell' : null, // Només visible per membres del consell
          title: 'Consell',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-balance" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}