# 📦 ReusAPP - Guia d'Instal·lació

## 📂 Contingut del ZIP

```
ReusAPP_Complete/
├── backend/          # Servidor FastAPI (Python)
├── frontend/         # App Mòbil (React Native/Expo)
└── landing/          # Pàgines Web (HTML/CSS/JS)
```

---

## 🚀 Instal·lació Backend (FastAPI)

### Requisits:
- Python 3.12+
- MongoDB (local o Atlas)

### Passos:

```bash
cd backend

# Crear entorn virtual
python -m venv venv

# Activar entorn virtual
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Instal·lar dependències
pip install -r requirements.txt

# Configurar variables d'entorn
# Crea un fitxer .env amb:
MONGO_URL=mongodb://localhost:27017
DB_NAME=tomb_reus_db
PAYPAL_MODE=sandbox

# Executar servidor
uvicorn server:app --reload --port 8001
```

El backend estarà disponible a: http://localhost:8001

---

## 📱 Instal·lació Frontend (React Native/Expo)

### Requisits:
- Node.js 18+
- Yarn

### Passos:

```bash
cd frontend

# Instal·lar dependències
yarn install

# Configurar .env
# El fitxer ja existeix, però comprova:
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Executar app
yarn start
```

Opcions després d'executar:
- Prem `w` per obrir al navegador
- Escaneja QR amb l'app Expo Go (mòbil)
- Prem `a` per Android Emulator
- Prem `i` per iOS Simulator

---

## 🌐 Instal·lació Web (Landing Pages)

### Opció A: Servidor Local Simple

```bash
cd landing/tomb-pagines

# Python:
python -m http.server 8080

# Node.js:
npx http-server -p 8080
```

Obre: http://localhost:8080/tomb-inici.html

### Opció B: WordPress

Els fitxers HTML dins de `landing/tomb-pagines/` estan preparats per incrustar-se a WordPress via iframe:

```html
<iframe src="https://LA_TEVA_URL/tomb-inici.html" 
        width="100%" 
        height="1500" 
        frameborder="0">
</iframe>
```

---

## 🗄️ Base de Dades

### MongoDB Local:

```bash
# Instal·la MongoDB Community Edition
# https://www.mongodb.com/try/download/community

# Executa MongoDB
mongod --dbpath /path/to/data
```

### MongoDB Atlas (Cloud):

1. Crea compte a https://www.mongodb.com/cloud/atlas
2. Crea un cluster gratuït
3. Obté la connection string
4. Afegeix-la al .env com MONGO_URL

---

## 🔧 Configuració URLs

### Per Desenvolupament Local:

**Backend:** `.env`
```
MONGO_URL=mongodb://localhost:27017
```

**Frontend:** `.env`
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

**Web HTML:** Edita `API_BASE_URL` a cada fitxer:
```javascript
const API_BASE_URL = 'http://localhost:8001/api';
```

### Per Producció:

Canvia les URLs per les de Railway/servidor real.

---

## 📝 Scripts Útils

### Backend:
```bash
# Crear usuari admin
python create_admin_user.py

# Importar dades
python import_excel.py
```

### Frontend:
```bash
# Build Android
yarn build:android

# Build iOS
yarn build:ios
```

---

## 🆘 Problemes Comuns

### Error MongoDB Connection:
- Verifica que MongoDB està executant-se
- Comprova la URL al .env

### Error Port 8001 en ús:
```bash
# Troba el procés
lsof -i :8001
# Mata'l
kill -9 [PID]
```

### App Expo no carrega:
- Assegura't que backend està executant-se
- Comprova que mòbil i ordinador estan a la mateixa xarxa

---

## 📧 Suport

Per qualsevol dubte:
- Email: gestio@eltombdereus.com
- Tel: 656 331 410

---

**Fet amb ❤️ per El Tomb de Reus**
