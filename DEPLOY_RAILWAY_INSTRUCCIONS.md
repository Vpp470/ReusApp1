# 🚀 INSTRUCCIONS PER DESPLEGAR EL BACKEND A RAILWAY.APP

## ✅ Fitxers Preparats

He preparat tots els fitxers necessaris per al deploy:
- ✅ `railway.toml` - Configuració de Railway
- ✅ `requirements.txt` - Dependencies de Python
- ✅ `server.py` - Backend FastAPI amb health check
- ✅ Tots els fitxers del backend

---

## 📋 Pas 1: Crear Compte a Railway

1. Ves a https://railway.app/
2. Clica "**Start a New Project**" o "**Login**"
3. Registra't amb **GitHub** (recomanat) o amb email
4. És **gratuït** (no necessites targeta de crèdit inicialment)

---

## 🗄️ Pas 2: Crear Base de Dades MongoDB (MongoDB Atlas)

**Railway ja no ofereix MongoDB gratuït**, així que usarem MongoDB Atlas:

### 2.1. Crear compte MongoDB Atlas

1. Ves a https://www.mongodb.com/cloud/atlas/register
2. Registra't (gratuït)
3. Crea un **cluster gratuït** (M0 Sandbox)
4. Selecciona la regió més propera (ex: Frankfurt, Paris)

### 2.2. Configurar accés

1. A **Database Access**, crea un usuari:
   - Username: `reusapp`
   - Password: (genera'n una automàticament o crea'n una)
   - Database User Privileges: **Read and write to any database**

2. A **Network Access**, afegeix:
   - IP Address: `0.0.0.0/0` (permet accés des de qualsevol lloc)
   - ⚠️ Això és necessari perquè Railway pugui connectar

### 2.3. Obtenir connection string

1. Clica "**Connect**" al teu cluster
2. Selecciona "**Connect your application**"
3. Copia el **connection string**:
   ```
   mongodb+srv://reusapp:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Reemplaça `<password>` amb la contrasenya del usuari que vas crear
5. Afegeix el nom de la base de dades al final:
   ```
   mongodb+srv://reusapp:CONTRASENYA@cluster0.xxxxx.mongodb.net/tomb_reus_db?retryWrites=true&w=majority
   ```

---

## 📤 Pas 3: Desplegar el Backend a Railway

### 3.1. Opció A: Deploy amb GitHub (Recomanat)

1. **Crea un repositori a GitHub:**
   - Ves a https://github.com/new
   - Nom: `reusapp-backend`
   - Privat o Públic (com prefereixis)

2. **Puja el codi al repositori:**
   ```bash
   cd /app/backend
   git init
   git add .
   git commit -m "Initial commit - ReusApp Backend"
   git remote add origin https://github.com/EL_TEU_USUARI/reusapp-backend.git
   git branch -M main
   git push -u origin main
   ```

3. **A Railway:**
   - Clica "**New Project**"
   - Selecciona "**Deploy from GitHub repo**"
   - Autoritza Railway a accedir al teu GitHub
   - Selecciona el repositori `reusapp-backend`
   - Railway començarà el deploy automàticament

### 3.2. Opció B: Deploy amb Railway CLI (Alternativa)

1. **Instal·la Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login a Railway:**
   ```bash
   railway login
   ```

3. **Inicialitza el projecte:**
   ```bash
   cd /app/backend
   railway init
   ```

4. **Desplega:**
   ```bash
   railway up
   ```

---

## 🔐 Pas 4: Configurar Variables d'Entorn a Railway

Un cop desplegat, afegeix aquestes variables d'entorn:

1. A Railway, ves al teu projecte
2. Clica "**Variables**"
3. Afegeix les següents variables:

```env
MONGO_URL=mongodb+srv://reusapp:CONTRASENYA@cluster0.xxxxx.mongodb.net/tomb_reus_db?retryWrites=true&w=majority
DB_NAME=tomb_reus_db
PORT=8001

# PayPal (opcional, si vols pagaments)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=

# Neuromobile (opcional)
NEUROMOBILE_TOKEN=

# Python
PYTHON_VERSION=3.11
```

4. **Desa** les variables
5. Railway **redesplegarà automàticament** el servei

---

## 🌐 Pas 5: Obtenir la URL Pública

1. A Railway, ves a "**Settings**"
2. A la secció "**Networking**", clica "**Generate Domain**"
3. Railway generarà una URL pública com:
   ```
   https://reusapp-backend-production.up.railway.app
   ```
4. **Copia aquesta URL** - la necessitarem!

---

## 🧪 Pas 6: Provar l'API

Prova que l'API funciona:

```bash
# Health check
curl https://LA_TEVA_URL.railway.app/api/health

# Obtenir establiments
curl https://LA_TEVA_URL.railway.app/api/establishments
```

Hauries de veure:
```json
{"status": "healthy", "service": "El Tomb de Reus API"}
```

---

## 📊 Pas 7: Importar Dades a MongoDB Atlas

Necessitem pujar les dades dels 267 establiments a MongoDB Atlas:

### Opció A: Usar mongoimport (Recomanat)

1. **Exporta les dades locals:**
   ```bash
   cd /app/backend
   mongodump --uri="mongodb://localhost:27017/tomb_reus_db" --out=dump
   ```

2. **Importa a Atlas:**
   ```bash
   mongorestore --uri="mongodb+srv://reusapp:CONTRASENYA@cluster0.xxxxx.mongodb.net" dump
   ```

### Opció B: Usar el script d'importació

1. **Actualitza el script** `import_establishments_v04.py` amb la nova URL de MongoDB Atlas
2. **Executa'l:**
   ```bash
   python import_establishments_v04.py
   ```

---

## 🔄 Pas 8: Actualitzar el Frontend i WordPress

### 8.1. Actualitzar Frontend Expo

Actualitza `/app/frontend/.env`:

```env
EXPO_PUBLIC_BACKEND_URL=https://LA_TEVA_URL.railway.app
```

### 8.2. Actualitzar WordPress

A `/app/landing/app.js` (o el fitxer que uses):

```javascript
// Canvia això:
const API_BASE_URL = 'http://localhost:8001/api';

// Per això:
const API_BASE_URL = 'https://LA_TEVA_URL.railway.app/api';
```

Després puja el fitxer al servidor via FTP (com vam fer abans).

---

## 📈 Monitoratge i Logs

### Veure logs en temps real:

```bash
railway logs
```

### A la interfície web de Railway:

1. Ves al teu projecte
2. Clica "**Deployments**"
3. Selecciona el deployment actiu
4. Clica "**View Logs**"

---

## 💰 Límits del Pla Gratuït de Railway

- **$5 USD de crèdit mensual** (gratuït)
- **500 hores d'execució** per mes
- **100 GB de trànsit de xarxa**

Això és **més que suficient** per començar!

---

## 🆘 Solució de Problemes

### Error: "Application failed to respond"

**Solució:** Assegura't que el PORT està configurat correctament:
```env
PORT=8001
```

### Error: "Module not found"

**Solució:** Verifica que `requirements.txt` està complet:
```bash
pip freeze > requirements.txt
```

### Error de connexió a MongoDB

**Solució:** 
1. Verifica que la IP `0.0.0.0/0` està permesa a MongoDB Atlas
2. Comprova que la connection string és correcta
3. Assegura't que la contrasenya no té caràcters especials sense escapar

---

## ✅ Checklist Final

- [ ] Compte creat a Railway
- [ ] Cluster MongoDB Atlas creat
- [ ] Usuari i contrasenya de MongoDB creats
- [ ] IP 0.0.0.0/0 afegida a Network Access
- [ ] Codi pujat a GitHub (o desplegat amb CLI)
- [ ] Variables d'entorn configurades a Railway
- [ ] Domini generat a Railway
- [ ] Health check funciona
- [ ] Dades importades a MongoDB Atlas
- [ ] Frontend actualitzat amb la nova URL
- [ ] WordPress actualitzat amb la nova URL

---

**Un cop tot estigui fet, la teva API estarà publicada i accessible des d'internet!** 🎉

**Avisa'm quan ho hagis fet i t'ajudaré amb qualsevol problema!**
