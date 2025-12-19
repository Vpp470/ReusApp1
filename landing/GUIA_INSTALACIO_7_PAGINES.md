# 📚 Guia Completa: Integrar 7 Pàgines a WordPress

## 🎯 Resum

Aquesta guia t'explica com afegir 7 pàgines noves al teu WordPress d'**eltombdereus.com**:
1. Inici (Home)
2. Mapa
3. Què és El Tomb?
4. Establiments
5. Ofertes
6. Notícies
7. Esdeveniments

---

## 📋 PAS 1: Instal·lar el Plugin

### 1.1 Accedeix al WordPress Admin
- Ves a: `https://eltombdereus.com/wp-admin`
- Inicia sessió amb les teves credencials

### 1.2 Instal·la "Insert Headers and Footers"
1. Al menú lateral, clica **Plugins > Afegir Nou**
2. A la barra de cerca, escriu: **"Insert Headers and Footers"**
3. Busca el plugin de **WPBeginner** (és gratuït i segur)
4. Clica **Instal·lar Ara**
5. Quan acabi, clica **Activar**

---

## 📝 PAS 2: Afegir el Codi JavaScript

### 2.1 Obre la Configuració del Plugin
1. Al menú lateral, ves a **Configuració > Insert Headers and Footers**
2. Veuràs 3 camps: Header, Body, Footer

### 2.2 Copia el Codi
1. Obre el fitxer `/app/landing/wordpress-7-pagines.html`
2. Selecciona **TOT** el contingut (des de la línia 1 fins al final)
3. Copia'l (Ctrl+C o Cmd+C)

### 2.3 Enganxa el Codi
1. Torna al WordPress Admin
2. Al camp **"Scripts in Footer"** (el tercer camp)
3. Enganxa el codi que has copiat (Ctrl+V o Cmd+V)
4. Clica el botó **Desar** a la part inferior

✅ **Ja tens el codi instal·lat!** Ara cal crear les pàgines.

---

## 🌐 PAS 3: Crear les 7 Pàgines

Ara crearàs 7 pàgines noves al WordPress. Cada pàgina mostrarà contingut diferent automàticament.

### 3.1 PÀGINA 1: Inici

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Inici`
3. **Permalink/Slug**: Clica "Edita" al costat del títol i posa: `inici`
4. **Contingut**: Canvia a l'editor de TEXT (no Visual) i escriu només:
   ```
   [tomb-home]
   ```
5. Clica **Publicar**

### 3.2 PÀGINA 2: Mapa

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Mapa`
3. **Permalink/Slug**: `mapa`
4. **Contingut** (en mode TEXT):
   ```
   [tomb-mapa]
   ```
5. Clica **Publicar**

### 3.3 PÀGINA 3: Què és El Tomb?

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Què és El Tomb?`
3. **Permalink/Slug**: `que-es-el-tomb`
4. **Contingut** (en mode TEXT):
   ```
   [tomb-sobre]
   ```
5. Clica **Publicar**

### 3.4 PÀGINA 4: Establiments

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Establiments`
3. **Permalink/Slug**: `establiments`
4. **Contingut** (en mode TEXT):
   ```
   [tomb-establiments]
   ```
5. Clica **Publicar**

### 3.5 PÀGINA 5: Ofertes

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Ofertes`
3. **Permalink/Slug**: `ofertes`
4. **Contingut** (en mode TEXT):
   ```
   [tomb-ofertes]
   ```
5. Clica **Publicar**

### 3.6 PÀGINA 6: Notícies

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Notícies`
3. **Permalink/Slug**: `noticies`
4. **Contingut** (en mode TEXT):
   ```
   [tomb-noticies]
   ```
5. Clica **Publicar**

### 3.7 PÀGINA 7: Esdeveniments

1. Ves a **Pàgines > Afegir Nova**
2. **Títol**: `Esdeveniments`
3. **Permalink/Slug**: `esdeveniments`
4. **Contingut** (en mode TEXT):
   ```
   [tomb-esdeveniments]
   ```
5. Clica **Publicar**

---

## 🧭 PAS 4: Afegir les Pàgines al Menú

Ara faràs que les pàgines apareguin al menú de navegació del teu web.

### 4.1 Accedeix als Menús
1. Ves a **Aparença > Menús**
2. Si ja tens un menú, selecciona'l. Si no, crea'n un de nou.

### 4.2 Afegeix les Pàgines
1. A l'esquerra, veuràs un panell **"Pàgines"**
2. Clica **"Mostra-les totes"**
3. Selecciona les 7 pàgines que acabes de crear:
   - Inici
   - Mapa
   - Què és El Tomb?
   - Establiments
   - Ofertes
   - Notícies
   - Esdeveniments
4. Clica **Afegeix al menú**

### 4.3 Ordena les Pàgines
Arrossega les pàgines per ordenar-les com vulguis al menú.

### 4.4 Assigna el Menú
1. A la part inferior, assegura't que el menú està assignat a **"Menú Principal"** o la ubicació que utilitzes
2. Clica **Desar Menú**

---

## ✅ PAS 5: Verificar que Funciona

### 5.1 Visita les Pàgines
Obre el teu navegador i visita:

- `https://eltombdereus.com/inici/` → Hauries de veure la pàgina d'inici amb 6 botons
- `https://eltombdereus.com/mapa/` → Hauries de veure un mapa interactiu
- `https://eltombdereus.com/establiments/` → Hauries de veure una graella d'establiments
- I així amb totes les pàgines...

### 5.2 Comprova la Consola (Opcional)
Si vols veure si el codi s'ha carregat correctament:

1. Prem **F12** al navegador (o Cmd+Option+I al Mac)
2. Ves a la pestanya **Console**
3. Hauries de veure missatges com:
   ```
   El Tomb de Reus: Carregant pàgina home
   ✅ El Tomb de Reus: Pàgina carregada correctament
   ```

---

## 🎨 Característiques del Sistema

### ✅ Menú de Navegació Automàtic
Cada pàgina té un menú flotant a la part superior que et permet navegar entre totes les seccions.

### ✅ Dades en Temps Real
- **Establiments**: Es carreguen des de l'API de Railway
- **Ofertes**: Es filtren automàticament per mostrar només les actives
- **Notícies**: Es mostren les darreres notícies publicades
- **Esdeveniments**: Es filtren per mostrar només els actius
- **Mapa**: Mostra tots els establiments amb coordenades

### ✅ Funcions Interactives
- **Cerca d'establiments**: Pots cercar per nom o adreça
- **Mapa amb markers**: Clica als marcadors per veure informació
- **Dissenys responsives**: S'adapta a mòbils i tablets

### ✅ Anti-Caché
Totes les dades es carreguen sempre actualitzades, sense problemes de caché.

---

## 🔧 Personalització Avançada (Opcional)

Si vols personalitzar els colors o l'aspecte:

### Canviar Colors
Al codi JavaScript que has enganxat, busca aquesta secció al principi:

```css
:root {
    --tomb-primary: #E63946;      /* Color principal (vermell) */
    --tomb-secondary: #457B9D;    /* Color secundari (blau) */
    --tomb-text-dark: #1D3557;    /* Text fosc */
    --tomb-text-light: #6C757D;   /* Text clar */
}
```

Pots canviar aquests valors per altres colors en format hexadecimal.

### Canviar l'API
Si en algun moment canvies l'API, busca aquesta línia:

```javascript
const API_BASE_URL = 'https://reusapp-backend-production.up.railway.app/api';
```

I substitueix la URL per la nova.

---

## 🆘 Solució de Problemes

### ❌ No es veuen les pàgines, només el shortcode
**Problema**: Veus el text `[tomb-home]` en lloc del contingut.

**Solucions**:
1. Assegura't que has enganxat el codi al camp **"Scripts in Footer"** correcte
2. Comprova que has fet clic a **Desar**
3. Neteja la caché del WordPress (si tens un plugin de caché com WP Super Cache o W3 Total Cache)
4. Refresca la pàgina amb Ctrl+F5 (o Cmd+Shift+R al Mac)

### ❌ El mapa no es mostra
**Problema**: La pàgina del mapa està en blanc o dóna error.

**Solucions**:
1. Comprova que tens connexió a Internet (el mapa usa OpenStreetMap)
2. Obre la consola del navegador (F12) i busca errors
3. Comprova que l'API de Railway està activa: https://reusapp-backend-production.up.railway.app/api/establishments

### ❌ Els establiments/ofertes no carreguen
**Problema**: Veus "Carregant..." però no apareixen dades.

**Solucions**:
1. Comprova que l'API de Railway funciona (visita la URL directament al navegador)
2. Obre la consola (F12) i busca errors de CORS o de xarxa
3. Espera uns segons i refresca la pàgina

### ❌ El menú flotant no apareix
**Problema**: No veus el menú de navegació a la part superior de les pàgines.

**Solucions**:
1. Comprova que els slugs de les pàgines són correctes (sense espais ni accents)
2. Edita el codi JavaScript i busca la constant `SITE_URL` - comprova que és correcta
3. Neteja la caché del navegador i del WordPress

---

## 📞 Suport Tècnic

Si tens problemes després de seguir aquests passos:

1. **Comprova la consola del navegador** (F12 > Console) per veure errors
2. **Verifica que l'API funciona**: Visita https://reusapp-backend-production.up.railway.app/api/establishments
3. **Comprova els slugs**: Assegura't que les URLs de les pàgines són exactament com a la guia
4. **Neteja la caché**: Tant del navegador com del WordPress

---

## 📁 Fitxers Importants

- **Codi principal**: `/app/landing/wordpress-7-pagines.html`
- **Aquesta guia**: `/app/landing/GUIA_INSTALACIO_7_PAGINES.md`

---

## ✨ Resultat Final

Després d'implementar aquesta solució tindràs:

✅ 7 pàgines completament funcionals
✅ Menú de navegació automàtic entre pàgines
✅ Dades en temps real des de l'API
✅ Disseny modern i responsive
✅ Mapa interactiu amb geolocalització
✅ Cercador d'establiments
✅ Filtres automàtics per ofertes i esdeveniments actius

---

**Data de creació**: 14 de novembre de 2025  
**Versió**: 1.0  
**Estat**: Llest per implementar ✅

---

## 📸 Captures de Pantalla Esperades

### Pàgina d'Inici
- Hero amb gradient vermell-blau
- 6 botons grans per navegar a les altres seccions
- Menú flotant a la part superior

### Pàgina del Mapa
- Mapa interactiu d'OpenStreetMap centrat a Reus
- Marcadors vermells per cada establiment
- Popups amb informació en clicar els marcadors

### Pàgina d'Establiments
- Barra de cerca a la part superior
- Graella de targetes amb nom, adreça i telèfon
- Hover effect amb elevació de les targetes

### Pàgina d'Ofertes
- Targetes amb imatges (si disponible)
- Badge amb el descompte
- Informació de validesa de l'oferta

### Pàgina de Notícies
- Llista de notícies en format blog
- Data de publicació
- Enllaç per llegir més (si disponible)

### Pàgina d'Esdeveniments
- Targetes amb imatges d'esdeveniments
- Categoria, descripció i dates
- Nombre d'establiments participants

---

Bon treball! 🎉
