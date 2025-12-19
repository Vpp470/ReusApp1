# Landing Page - El Tomb de Reus

## 🔧 Solució del Problema de Caché Agressiu

### Problema Original
La pàgina web eltombdereus.com tenia un sistema de caché molt agressiu que impedia que les actualitzacions de dades es mostressin als usuaris, fins i tot després de netejar la caché del navegador.

### Solucions Implementades

#### 1. **Actualització de l'API a Producció**
- `app.js` ara utilitza l'API pública de Railway en lloc de l'API de desenvolupament
- URL: `https://reusapp-backend-production.up.railway.app/api`

#### 2. **Headers Meta Anti-Caché**
Afegits al `<head>` de `index.html`:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

#### 3. **Cache Busting amb Timestamps**
- El script `app.js` ara es carrega amb un paràmetre de versió: `app.js?v=2025011201`
- Cada cop que es desplega, s'actualitza aquest timestamp

#### 4. **Arxiu .htaccess**
Configura el servidor Apache/Nginx per:
- Desactivar caché per HTML i JS
- Permetre caché limitat per CSS i imatges
- Configurar CORS adequadament

#### 5. **Script d'Automatització**
`deploy_with_cache_bust.sh` automatitza:
- Generació de nou timestamp
- Actualització automàtica del HTML
- Preparació dels arxius per pujar

### 📦 Com Desplegar

#### Opció 1: Script Automàtic (Recomanat)
```bash
cd /app/landing
./deploy_with_cache_bust.sh
```

Després puja els arxius al servidor via SFTP.

#### Opció 2: Manual
1. Actualitza el timestamp a `index.html` (línia 218)
2. Puja els següents arxius via FTP/SFTP:
   - `index.html`
   - `app.js`
   - `.htaccess`
   - `styles.css`

### 🔍 Verificació
Després del desplegament:
1. Obre el navegador en mode incògnit
2. Visita https://eltombdereus.com
3. Obre la consola del navegador (F12)
4. Comprova que l'API carrega dades dinàmiques
5. Verifica els endpoints: `/api/establishments`, `/api/offers`, `/api/events`, `/api/news`

### ✅ Resultat Esperat
- Les dades es carreguen directament des de l'API de Railway
- Els usuaris veuen sempre les dades més recents
- No cal esborrar la caché del navegador manualment
- Les actualitzacions de contingut es reflecteixen immediatament

---

# Landing Page - El Tomb de Reus (Original)

Aquesta és la pàgina de destinació estàtica per a El Tomb de Reus que substituirà el lloc WordPress actual.

## Fitxers

- `index.html` - Estructura HTML principal
- `styles.css` - Estils CSS
- `app.js` - JavaScript per carregar dades dinàmiques de l'API

## ⚠️ IMPORTANT: URL de l'API

L'arxiu `app.js` està configurat per connectar-se a:
```javascript
const API_BASE_URL = 'https://reusapp-landing.emergent.host/api';
```

Si la teva URL de l'API és diferent, modifica aquesta línia a l'arxiu `app.js` abans de desplegar.

## Desplegament al WordPress

### Pas 1: Accedir al File Manager
1. Accedeix al teu panell de WordPress
2. Ves a **cPanel** → **Gestor d'arxius** (File Manager)
3. Navega fins al directori on està instal·lat WordPress (normalment `public_html`)

### Pas 2: Fer còpia de seguretat
1. Descarrega una còpia de seguretat del teu `index.php` actual
2. Descarrega qualsevol altre arxiu important

### Pas 3: Pujar els arxius
1. Puja els tres arxius:
   - `index.html` → substitueix o renomena l'`index.php` actual
   - `styles.css` → puja al directori arrel
   - `app.js` → puja al directori arrel

### Pas 4: Configurar la redirecció
Si el teu servidor intenta carregar `index.php` primer:
1. Reanomena o elimina `index.php`
2. O afegeix aquesta línia al teu `.htaccess`:
```
DirectoryIndex index.html index.php
```

### Pas 5: Verificar
1. Visita el teu lloc web
2. Hauries de veure la nova landing page
3. Verifica que les dades (establiments, ofertes, notícies) es carreguin correctament des de l'API
4. Obre la consola del navegador (F12) per veure si hi ha errors de connexió a l'API

## Característiques

- **Disseny modern i responsive** - Funciona en tots els dispositius
- **Mapa interactiu** - Mostra tots els establiments geolocalitzats
- **Dades dinàmiques** - Carrega establiments, ofertes i notícies des de l'API de l'app
- **Filtres d'establiments** - Per tipus (Local Associat, Patrocinador)
- **Enllaços a xarxes socials** - Facebook i Instagram
- **Animacions i transicions** - Per una millor experiència d'usuari

## Notes tècniques

- La pàgina utilitza l'API de l'aplicació mòbil per carregar dades
- Els mapes utilitzen Leaflet.js (codi obert)
- No requereix base de dades al servidor web
- Completament estàtic excepte les crides a l'API
- Compatible amb CORS (Cross-Origin Resource Sharing)

## Solució de problemes

### Les dades no es carreguen
1. Obre la consola del navegador (F12 → Console)
2. Busca errors relacionats amb l'API
3. Verifica que l'URL de l'API sigui correcta a `app.js`
4. Verifica que l'API estigui accessible públicament
5. Comprova que el backend tingui CORS habilitat per permetre peticions des del domini de WordPress

### El mapa no es mostra
1. Verifica la connexió a internet
2. Comprova que els scripts de Leaflet.js es carreguin correctament
3. Verifica que els establiments tinguin coordenades (latitude/longitude)

### Els estils no s'apliquen
1. Assegura't que `styles.css` estigui al mateix directori que `index.html`
2. Neteja la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
