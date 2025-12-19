# 🎓 GUIA PAS A PAS PER PRINCIPIANTS - Desplegar Backend a Railway

## 📚 Índex
1. [Pujar Codi a GitHub](#pas-1-pujar-codi-a-github)
2. [Crear Base de Dades MongoDB Atlas](#pas-2-crear-base-de-dades-mongodb-atlas)
3. [Desplegar a Railway](#pas-3-desplegar-a-railway)
4. [Configurar Variables](#pas-4-configurar-variables)
5. [Verificar que Funciona](#pas-5-verificar-que-funciona)

---

## 🚀 PAS 1: Pujar Codi a GitHub

### 1.1. Crear Repositori a GitHub

1. **Obre el teu navegador** i ves a: https://github.com/new

2. **Omple els camps:**
   - **Repository name:** `reusapp-backend`
   - **Description:** "Backend FastAPI per El Tomb de Reus"
   - **Visibilitat:** Deixa **Private** (recomanat) o Public
   - **NO marquis** "Add a README file" (ja el tenim)
   - **NO afegeixis** .gitignore ni license

3. **Clica** el botó verd "**Create repository**"

4. **Copia la URL** que apareix (quelcom com):
   ```
   https://github.com/EL_TEU_USUARI/reusapp-backend.git
   ```

### 1.2. Pujar el Codi

**Ara necessito que em diguis el teu usuari de GitHub** perquè pugui preparar les comandes específiques per tu.

**Exemple:** Si el teu usuari és `victorperales`, escriu: `victorperales`

Després d'això, et donaré les comandes exactes per copiar i enganxar! 📋

---

## 🗄️ PAS 2: Crear Base de Dades MongoDB Atlas

### 2.1. Registrar-se a MongoDB Atlas

1. **Obre:** https://www.mongodb.com/cloud/atlas/register

2. **Registra't** amb:
   - Email i contrasenya, O
   - Botó "Sign up with Google" (més ràpid)

3. **Omple el qüestionari inicial** (pots saltar-lo clicant "Skip"):
   - What brings you to Atlas today? → **"I'm learning MongoDB"**
   - What is your goal? → **"Build a new application"**

4. **Crea un cluster gratuït:**
   - Pla: **M0 Sandbox** (GRATUÏT) - Selecciona aquest!
   - Cloud Provider: **AWS** (per defecte està bé)
   - Regió: Tria la més propera:
     - **Europe (Ireland) - eu-west-1** ← Recomanat per Espanya
     - O qualsevol altre de Europe
   - Cluster Name: Deixa `Cluster0` o canvia a `ReusAppDB`

5. **Clica** "**Create Cluster**" (triga 1-3 minuts a crear-se)

### 2.2. Crear Usuari de Base de Dades

Mentre es crea el cluster, configura l'accés:

1. **Security Quickstart** apareixerà automàticament:

2. **Authentication:**
   - Username: `reusapp`
   - Password: Clica "**Autogenerate Secure Password**" 
   - **IMPORTANT:** Copia i guarda aquesta contrasenya! (la necessitaràs després)
   - O pots escriure la teva pròpia (fàcil de recordar)
   - Clica "**Create User**"

3. **Network Access:**
   - IP Address: Escriu `0.0.0.0/0`
   - Description: `Allow from anywhere`
   - Clica "**Add Entry**"
   - ⚠️ Això permet l'accés des de qualsevol lloc (necessari per Railway)

4. **Clica** "**Finish and Close**"

### 2.3. Obtenir Connection String

1. Un cop el cluster estigui llest (veuràs **Cluster0** amb un tick verd):

2. **Clica** el botó "**Connect**"

3. **Selecciona** "**Drivers**" (el del mig)

4. **Driver:** Python, **Version:** 3.12 or later

5. **Copia** el **connection string**:
   ```
   mongodb+srv://reusapp:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **IMPORTANT:** 
   - Reemplaça `<password>` amb la contrasenya que vas crear/copiar abans
   - Afegeix el nom de la base de dades al final: `/tomb_reus_db`
   
   **Exemple final:**
   ```
   mongodb+srv://reusapp:MevaContrasenya123@cluster0.abc12.mongodb.net/tomb_reus_db?retryWrites=true&w=majority
   ```

7. **Guarda aquest string** - el necessitarem a Railway!

---

## 🚂 PAS 3: Desplegar a Railway

### 3.1. Crear Compte a Railway

1. **Obre:** https://railway.app/

2. **Clica** "**Start a New Project**" o "**Login**"

3. **Login amb GitHub:**
   - Clica "**Login with GitHub**"
   - Autoritza Railway a accedir al teu GitHub
   - Et redirigirà de nou a Railway

### 3.2. Crear Nou Projecte

1. **Clica** el botó gran "**+ New Project**"

2. **Selecciona** "**Deploy from GitHub repo**"

3. **Configura GitHub App:**
   - Si és la primera vegada, clica "**Configure GitHub App**"
   - Selecciona el teu compte de GitHub
   - Pots triar:
     - **All repositories** (tots els repositoris), o
     - **Only select repositories** → Marca `reusapp-backend`
   - Clica "**Install & Authorize**"

4. **Selecciona el repositori:**
   - Busca i clica `reusapp-backend`
   - Railway començarà a desplegar automàticament!

5. **Espera 2-5 minuts:**
   - Veuràs logs desfilant (és normal)
   - Al final hauria de dir "**Deployment successful**" o similar
   - ⚠️ Pot fallar la primera vegada (perquè falten les variables d'entorn)

---

## ⚙️ PAS 4: Configurar Variables d'Entorn

### 4.1. Afegir Variables a Railway

1. **Al teu projecte a Railway**, clica la pestanya "**Variables**" (a la barra superior)

2. **Afegeix aquestes variables UNA PER UNA:**

   Clica "**+ New Variable**" per cada una:

   ```
   Variable 1:
   Key: MONGO_URL
   Value: [ENGANXA AQUÍ EL TEU CONNECTION STRING DE MONGODB]
   
   Variable 2:
   Key: DB_NAME
   Value: tomb_reus_db
   
   Variable 3:
   Key: PORT
   Value: 8001
   
   Variable 4:
   Key: PYTHON_VERSION
   Value: 3.11
   ```

3. **Clica** "**Add**" després de cada variable

4. **Railway redesplegarà automàticament** (espera 2-3 minuts)

### 4.2. Generar Domini Públic

1. **Ves a** "**Settings**" (configuració, a la barra superior)

2. **Baixa fins** a la secció "**Networking**"

3. **Clica** "**Generate Domain**"

4. Railway crearà una URL com:
   ```
   https://reusapp-backend-production.up.railway.app
   ```

5. **COPIA AQUESTA URL** - és la teva API pública! 🎉

---

## ✅ PAS 5: Verificar que Funciona

### 5.1. Provar l'API

1. **Obre aquesta URL al navegador:**
   ```
   https://LA_TEVA_URL.railway.app/api/health
   ```

2. **Hauries de veure:**
   ```json
   {
     "status": "healthy",
     "service": "El Tomb de Reus API"
   }
   ```

3. ✅ **Si veus això, FELICITATS! L'API funciona!**

### 5.2. Provar Endpoints

Prova altres endpoints:

```
https://LA_TEVA_URL.railway.app/api/establishments
```

**⚠️ IMPORTANT:** Això encara estarà buit perquè no hem importat les dades! 

---

## 📊 PAS 6: Importar Dades a MongoDB Atlas

Ara necessitem pujar les dades dels 267 establiments a MongoDB Atlas.

### Opció A: Des del teu ordinador (Recomanat)

**Necessitaràs:**
- Els fitxers JSON exportats (a `/app/backend/mongodb_export/`)
- MongoDB Compass (eina visual)

**Passos:**

1. **Descarrega MongoDB Compass:**
   - Ves a: https://www.mongodb.com/try/download/compass
   - Descarrega i instal·la

2. **Connecta a Atlas:**
   - Obre Compass
   - Enganxa el teu connection string (el de MongoDB Atlas)
   - Clica "**Connect**"

3. **Crear Base de Dades:**
   - Clica "**Create Database**"
   - Database Name: `tomb_reus_db`
   - Collection Name: `establishments`
   - Clica "**Create Database**"

4. **Importar Dades:**
   - Selecciona la col·lecció `establishments`
   - Clica "**ADD DATA**" → "**Import JSON or CSV file**"
   - Selecciona `/app/backend/mongodb_export/establishments.json`
   - Clica "**Import**"

5. **Repeteix** per altres col·leccions (users, offers, news, etc.)

### Opció B: Amb script Python

**Si prefereixes fer-ho amb codi:**

1. Crea aquest fitxer Python:

```python
# import_to_atlas.py
from pymongo import MongoClient
import json
import os

# Connection string de MongoDB Atlas
ATLAS_URL = "mongodb+srv://reusapp:CONTRASENYA@cluster0.xxxxx.mongodb.net/tomb_reus_db"

client = MongoClient(ATLAS_URL)
db = client['tomb_reus_db']

# Importar cada fitxer JSON
for filename in os.listdir('mongodb_export'):
    if filename.endswith('.json'):
        collection_name = filename.replace('.json', '')
        
        with open(f'mongodb_export/{filename}', 'r') as f:
            data = json.load(f)
        
        if data:
            db[collection_name].insert_many(data)
            print(f"✅ Importat {len(data)} docs a {collection_name}")

print("🎉 Importació completada!")
```

2. Executa:
```bash
python3 import_to_atlas.py
```

---

## 🎉 FINALITZACIÓ!

### Si tot ha anat bé, ara tens:

✅ Codi pujat a GitHub
✅ Base de dades MongoDB Atlas al cloud
✅ Backend desplegat i funcionant a Railway
✅ API pública accessible
✅ Dades importades (267 establiments i més)

### 🌐 La teva API pública:

```
https://LA_TEVA_URL.railway.app/api/
```

### 📱 Pròxims Passos:

1. Actualitza el frontend Expo amb la nova URL
2. Actualitza WordPress amb la nova URL
3. Prova l'app mòbil
4. Celebra! 🎊

---

## 🆘 Ajuda i Errors Comuns

### Error: "Application failed to respond"
**Solució:** Verifica que PORT=8001 estigui a les variables d'entorn

### Error: "MongoServerError"
**Solució:** 
- Verifica el connection string
- Assegura't que IP 0.0.0.0/0 està permesa a MongoDB Atlas

### Error: "Module not found"
**Solució:** Railway ho detecta automàticament, espera uns minuts

---

## 📞 On Trobar Ajuda

- **Railway Docs:** https://docs.railway.app/
- **MongoDB Docs:** https://www.mongodb.com/docs/atlas/
- **Pregunta'm a mi!** Estic aquí per ajudar-te! 😊

---

**Comença amb el PAS 1 i després continua pas a pas!**
