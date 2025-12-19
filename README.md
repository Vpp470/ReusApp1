# El Tomb de Reus - Aplicación Móvil Multiplataforma

Aplicación móvil para Android, iOS y Web que integra las funcionalidades de la app de Play Store y el sitio web de El Tomb de Reus en una sola plataforma.

## 🚀 Características Principales

### ✅ Implementadas en MVP

- **🔐 Autenticación de usuarios**: Registro e inicio de sesión
- **🏪 Directorio de Establecimientos**: Más de 200 asociados con geolocalización
- **🗺️ Mapa Interactivo**: Visualización de establecimientos en mapa con Google Maps
- **🎁 Ofertas y Promociones**: Listado de ofertas activas de los establecimientos
- **📅 Eventos**: Calendario de eventos y actividades en Reus
- **🎟️ Escaneo de Tickets QR**: Escanear tickets de compra para sorteos
- **💳 Tarjetas Regalo**: 
  - Compra con PayPal (integrado)
  - Compra con Redsys/TPV (pendiente de configuración)
  - Gestión y visualización de saldo
- **👤 Perfil de Usuario**: Gestión de datos personales y tarjetas regalo
- **📱 Diseño Responsive**: Compatible con todas las plataformas y tamaños de pantalla

### 📋 Funcionalidades Pendientes (Fase 2)

- 🔔 Notificaciones Push
- 🎂 Felicitaciones de cumpleaños automáticas
- 📊 Segmentaciones por edad, sexo, procedencia
- 📈 Panel de administración CRM
- 🏆 Sistema de sorteos
- ✉️ Correos masivos
- 📰 Integración con noticias municipales
- 📱 Redes sociales de establecimientos
- 🎯 Campañas publicitarias

## 🏗️ Arquitectura Técnica

- **Frontend**: Expo React Native (Android, iOS, Web)
- **Backend**: FastAPI (Python)
- **Base de Datos**: MongoDB
- **APIs Externas**:
  - Neuromobile API (datos de establecimientos)
  - PayPal (pagos)
  - Redsys TPV (pagos - pendiente de configuración)

## 📦 Instalación y Configuración

### Backend

1. Instalar dependencias:
```bash
cd backend
pip install -r requirements.txt
```

2. Configurar variables de entorno en `backend/.env`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="tomb_reus_db"

# Neuromobile API
NEUROMOBILE_TOKEN="Z2ogV78mJsG4k0z8lPXQZVEABjaJCF852rvlUKtgJtHxQmMuDI0DS00Bfa67"

# PayPal Configuration (REQUERIDO para pagos)
PAYPAL_MODE="sandbox"  # o "live" para producción
PAYPAL_CLIENT_ID="TU_CLIENT_ID_DE_PAYPAL"
PAYPAL_SECRET="TU_SECRET_DE_PAYPAL"

# Redsys Configuration (Opcional - para futuro)
REDSYS_MERCHANT_CODE=""
REDSYS_TERMINAL="001"
REDSYS_SECRET_KEY=""
REDSYS_ENVIRONMENT="test"
```

3. Inicializar datos de prueba:
```bash
python seed.py
```

### Frontend

1. Instalar dependencias:
```bash
cd frontend
yarn install
```

2. La URL del backend ya está configurada automáticamente

## 🔑 Configuración de PayPal

Para que funcionen los pagos de tarjetas regalo, necesitas configurar una cuenta de PayPal:

### Modo Sandbox (Desarrollo/Pruebas):

1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Crea una cuenta de desarrollador si no tienes
3. En "My Apps & Credentials", crea una nueva app
4. Copia el Client ID y Secret del modo Sandbox
5. Agrégalos al archivo `backend/.env`:
```env
PAYPAL_MODE="sandbox"
PAYPAL_CLIENT_ID="tu_client_id_sandbox"
PAYPAL_SECRET="tu_secret_sandbox"
```

### Modo Live (Producción):

1. En el mismo dashboard, cambia a modo Live
2. Copia el Client ID y Secret del modo Live
3. Actualiza el archivo `backend/.env`:
```env
PAYPAL_MODE="live"
PAYPAL_CLIENT_ID="tu_client_id_live"
PAYPAL_SECRET="tu_secret_live"
```

## 🚀 Ejecución

### Desarrollo Local

El proyecto ya está corriendo en Emergent. Los servicios están activos:
- Backend: `http://localhost:8001`
- Frontend: Accesible a través del preview de Emergent

Para reiniciar servicios:
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart expo
```

## 📱 Navegación de la App

La app utiliza navegación por tabs en la parte inferior:

1. **🏠 Inicio**: Vista principal con ofertas y eventos destacados
2. **🗺️ Mapa**: Mapa interactivo con establecimientos geolocalizados
3. **🏷️ Ofertas**: Listado completo de ofertas disponibles
4. **📷 Escanear**: Escáner de códigos QR para tickets
5. **👤 Perfil**: Gestión de cuenta y tarjetas regalo

## 🧪 Testing

### Usuarios de Prueba

Usuario creado para testing:
- Email: `usuario@test.com`
- Contraseña: `123456`

### Datos de Prueba

La base de datos incluye:
- 5 establecimientos en Reus
- 5 ofertas activas
- 4 eventos próximos

### Tarjetas de Prueba PayPal (Sandbox)

Al usar PayPal en modo sandbox, puedes usar las cuentas de prueba que PayPal proporciona en el dashboard.

## 🔐 Seguridad

⚠️ **IMPORTANTE para Producción**:

1. **Contraseñas**: Actualmente se almacenan en texto plano. Implementar bcrypt:
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

2. **JWT Tokens**: Implementar tokens JWT reales en lugar del simple `token_<user_id>`

3. **Variables de Entorno**: Nunca commitear el archivo `.env` al repositorio

4. **HTTPS**: Usar HTTPS en producción para todas las comunicaciones

5. **Validación**: Agregar validación robusta en todos los endpoints

## 📊 Estructura del Proyecto

```
/app
├── backend/
│   ├── server.py          # API FastAPI principal
│   ├── seed.py            # Script para datos de prueba
│   ├── .env               # Variables de entorno
│   └── requirements.txt   # Dependencias Python
│
├── frontend/
│   ├── app/               # Pantallas de la app (Expo Router)
│   │   ├── index.tsx      # Splash/Router inicial
│   │   ├── (tabs)/        # Navegación por tabs
│   │   │   ├── home.tsx
│   │   │   ├── map.tsx
│   │   │   ├── offers.tsx
│   │   │   ├── scanner.tsx
│   │   │   └── profile.tsx
│   │   ├── auth/          # Autenticación
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   └── gift-cards/    # Tarjetas regalo
│   │       └── purchase.tsx
│   │
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── services/      # API calls y servicios
│   │   ├── store/         # Zustand stores (estado global)
│   │   ├── constants/     # Colores, estilos
│   │   └── types/         # TypeScript types
│   │
│   ├── app.json           # Configuración Expo
│   └── package.json       # Dependencias Node
│
└── README.md
```

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión

### Establecimientos
- `GET /api/establishments` - Listar todos
- `GET /api/establishments/{id}` - Detalle de uno

### Ofertas
- `GET /api/offers` - Listar todas
- `GET /api/offers/{id}` - Detalle de una

### Eventos
- `GET /api/events` - Listar todos
- `GET /api/events/{id}` - Detalle de uno

### Tarjetas Regalo
- `POST /api/gift-cards/create` - Crear tarjeta
- `GET /api/gift-cards/user/{user_id}` - Tarjetas de un usuario
- `GET /api/gift-cards/{code}` - Buscar por código

### Pagos
- `POST /api/payments/paypal/create` - Crear pago PayPal
- `POST /api/payments/paypal/execute` - Ejecutar pago PayPal

### Tickets
- `POST /api/tickets/scan` - Escanear ticket
- `GET /api/tickets/user/{user_id}` - Tickets de un usuario

## 🎨 Diseño y Estilo

La app utiliza el siguiente esquema de colores:
- **Primario**: #D84315 (Rojo terracota - representa Reus)
- **Secundario**: #FF6F00 (Naranja)
- **Acento**: #FFA726 (Naranja claro)
- **Fondo**: #F5F5F5 (Gris claro)

## 📝 Próximos Pasos

1. **Configurar Cuenta PayPal**: Agregar credenciales al `.env`
2. **Configurar Redsys**: Obtener credenciales del banco para pagos con tarjeta
3. **Implementar Notificaciones Push**: Con Expo Notifications
4. **Panel Admin**: Crear panel web para gestión CRM
5. **Migrar Usuarios**: Importar los 3500 usuarios actuales
6. **Migrar Establecimientos**: Sincronizar los 200 asociados desde Neuromobile
7. **Testing Completo**: Probar en dispositivos reales iOS y Android
8. **Publicación**: Subir a App Store y Google Play

## 🐛 Problemas Conocidos

- Las contraseñas no están hasheadas (usar bcrypt en producción)
- PayPal necesita configuración de credenciales
- Redsys pendiente de implementación completa
- Falta implementar deep links para return URLs de pagos
- Notificaciones push no implementadas

## 📞 Soporte

Para cualquier duda o problema:
1. Revisa la documentación de Expo: https://docs.expo.dev
2. Documentación de FastAPI: https://fastapi.tiangolo.com
3. PayPal Developer: https://developer.paypal.com

## 📄 Licencia

© 2025 El Tomb de Reus. Todos los derechos reservados.
<!-- Force deploy Fri Dec  5 03:56:26 UTC 2025 -->

<!-- Deploy forçat: 2025-12-05T04:00:04.147787 -->
