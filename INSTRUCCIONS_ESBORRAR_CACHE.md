# 🚨 INSTRUCCIONS CRÍTIQUES - ESBORRAR CACHE I SERVICE WORKER

## EL PROBLEMA:

El teu navegador està carregant el fitxer: `entry-15e90b07b879f0c59651e5973b9b9b0a.js`
Però el servidor té el fitxer nou: `entry-ecb7588fba82427ca0c2a465fe530a13.js`

Això significa que el **Service Worker** del navegador està servint fitxers antics de cache.

---

## SOLUCIÓ PAS A PAS:

### 📱 **AL MÒBIL:**

#### iPhone/iPad (Safari):

1. **TANCA Safari completament:**
   - Llisca cap amunt des de baix
   - Troba Safari i llisca'l cap amunt per tancar-lo

2. **Esborra TOTES les dades de Safari:**
   - **Configuració** → **Safari**
   - **Esborrar historial i dades de llocs web**
   - Confirma **Esborrar historial i dades**

3. **Reinicia el telèfon:**
   - Apaga i torna a encendre el telèfon

4. **Obre Safari i ves a www.reusapp.com**

#### Android (Chrome):

1. **Tanca Chrome completament**

2. **Esborra dades de l'app Chrome:**
   - **Configuració** → **Aplicacions** → **Chrome**
   - **Emmagatzematge i caché**
   - **Esborrar emmagatzematge** (NO només cache!)
   - **Gestionar espai** → Cerca **reusapp.com** → Esborra

3. **Reinicia el telèfon**

4. **Obre Chrome i ves a www.reusapp.com**

---

### 💻 **A L'ORDINADOR (Chrome/Edge):**

1. **Obre Chrome/Edge**

2. **Ves a www.reusapp.com**

3. **Obre DevTools (F12)**

4. **Ves a la pestanya "Application" / "Aplicació"**

5. **Al menú lateral esquerre:**
   - Expandeix **"Service Workers"**
   - Si hi ha un service worker per a reusapp.com:
     - Clic a **"Unregister"** / **"Donar de baixa"**
   
6. **Esborra Storage:**
   - Clic a **"Storage"** al menú lateral
   - Clic a **"Clear site data"** / **"Esborrar dades del lloc"**
   - Marca TOTES les opcions:
     - ✅ Local storage
     - ✅ Session storage
     - ✅ IndexedDB
     - ✅ Web SQL
     - ✅ Cookies
     - ✅ Cache storage
   - Clic a **"Clear site data"**

7. **Recarrega amb force refresh:**
   - Windows: **Ctrl + Shift + R**
   - Mac: **Cmd + Shift + R**
   
8. **Verifica a la pestanya Network:**
   - Hauries de veure `entry-ecb7588fba82427ca0c2a465fe530a13.js` (NO `entry-15e90b07b879f0c59651e5973b9b9b0a.js`)

---

### 💻 **A L'ORDINADOR (Firefox):**

1. **Obre Firefox**

2. **Ves a www.reusapp.com**

3. **Prem Shift + F5** (force reload)

4. **Obre DevTools (F12)**

5. **Ves a la pestanya "Storage" / "Emmagatzematge"**

6. **Esborra tot:**
   - Clic dret a **reusapp.com** → **"Delete All"**

7. **Tanca i torna a obrir Firefox**

8. **Torna a www.reusapp.com**

---

### 💻 **A L'ORDINADOR (Safari Mac):**

1. **Obre Safari**

2. **Menu Safari → Preferències → Avançat**

3. **Marca "Mostrar el menú Desenvolupament a la barra de menús"**

4. **Menú Desenvolupament → Buidar memòries cau**

5. **Menú Safari → Esborrar historial...**
   - Selecciona **"Tot l'historial"**
   - Clic **Esborrar historial**

6. **Tanca Safari completament (Cmd + Q)**

7. **Torna a obrir Safari i ves a www.reusapp.com**

---

## 🧪 COM VERIFICAR QUE FUNCIONA:

Després de seguir els passos, obre DevTools (F12) i mira la consola:

### ✅ CORRECTE (hauries de veure):
```
POST https://www.reusapp.com/api/auth/login
Status: 200 OK
```

### ❌ INCORRECTE (NO hauries de veure):
```
POST https://admin-stats-fix-2.preview.emergentagent.com/api/auth/login
Status: ERR_FAILED
```

---

## 🎯 CREDENCIALS DE PROVA:

**Email:** admin@eltombdereus.com  
**Password:** admin123

---

## ⚠️ MOLT IMPORTANT:

Si després de seguir TOTS aquests passos encara veus el fitxer `entry-15e90b07b879f0c59651e5973b9b9b0a.js`:

1. **Prova en MODE INCÒGNIT/PRIVAT** (això bypassa tots els caches)
2. **Prova amb un ALTRE NAVEGADOR** que no hagis utilitzat abans
3. **Si funciona en incògnit**, confirma que el problema és cache del navegador
4. **Fes servir el navegador en mode incògnit** temporalment fins que puguis esborrar completament la cache

---

## 🔍 VERIFICACIÓ TÈCNICA:

**Fitxer que HAURIES de carregar:** `entry-ecb7588fba82427ca0c2a465fe530a13.js`  
**Fitxer que estàs carregant:** `entry-15e90b07b879f0c59651e5973b9b9b0a.js`

Això confirma 100% que és un problema de cache del navegador.

---

## 💡 SOLUCIÓ RÀPIDA PER PROVAR ARA MATEIX:

**USA MODE INCÒGNIT/PRIVAT:**
- Chrome/Edge: Ctrl + Shift + N (Windows) o Cmd + Shift + N (Mac)
- Firefox: Ctrl + Shift + P (Windows) o Cmd + Shift + P (Mac)
- Safari: Botó de pestanyes → Privat

Després ves a **www.reusapp.com** en mode incògnit i prova de fer login.

**SI FUNCIONA EN INCÒGNIT = Problema de cache confirmat!**

---

**PROVA EN MODE INCÒGNIT PRIMER! 🚀**
