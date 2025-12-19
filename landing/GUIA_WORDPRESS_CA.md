# 🎯 Guia Pas a Pas: Solucionar Problema de Caché a WordPress

## 📋 Resum del Problema
El teu lloc web WordPress d'eltombdereus.com té un sistema de caché que impedeix que les dades actualitzades de l'API es mostrin als usuaris.

## ✅ Solució Definitiva

He creat un codi complet que:
- Carrega les dades directament des de l'API de Railway en producció
- Evita completament la caché del navegador
- Mostra els establiments, ofertes i esdeveniments en temps real
- Funciona en qualsevol pàgina de WordPress

---

## 🚀 MÈTODE 1: Plugin "Insert Headers and Footers" (RECOMANAT)

### Pas 1: Instal·lar el Plugin
1. Accedeix al WordPress Admin: `https://eltombdereus.com/wp-admin`
2. Ves a **Plugins > Afegir Nou**
3. Cerca: **"Insert Headers and Footers"**
4. Instal·la el plugin de **WPBeginner** (és gratuït i segur)
5. Fes clic a **Activar**

### Pas 2: Afegir el Codi
1. Ves a **Configuració > Insert Headers and Footers**
2. Busca la secció **"Scripts in Footer"**
3. Obre l'arxiu `/app/landing/wordpress-solution.html`
4. **Copia TOT el codi** (des de la línia 1 fins al final)
5. **Enganxa'l** al camp "Scripts in Footer"
6. Fes clic a **Desar**

### Pas 3: Crear una Pàgina per Mostrar-ho
1. Ves a **Pàgines > Afegir Nova**
2. Títol: "Establiments" (o el que vulguis)
3. No cal afegir res al contingut (el codi ja ho farà tot)
4. Publica la pàgina
5. Visita la pàgina i veuràs els establiments carregant-se automàticament

---

## 🎨 MÈTODE 2: Widget HTML Personalitzat

### Quan usar-ho:
Si vols mostrar els establiments només a la barra lateral o al footer.

### Passos:
1. Ves a **Aparença > Widgets**
2. Afegeix un widget **"HTML Personalitzat"**
3. Arrossega'l a la ubicació desitjada (barra lateral, footer, etc.)
4. Enganxa el codi de `wordpress-solution.html`
5. Desa el widget

---

## 📝 MÈTODE 3: Afegir a una Pàgina Específica

### Passos:
1. Ves a **Pàgines > Totes les Pàgines**
2. Edita la pàgina on vols mostrar els establiments
3. Canvia a l'editor **"HTML"** o **"Codi"** (no visual)
4. Enganxa el codi de `wordpress-solution.html`
5. Actualitza la pàgina

---

## 🔍 Verificació que Funciona

### 1. Obre la Pàgina
Visita la pàgina on has afegit el codi

### 2. Obre la Consola del Navegador
- **Chrome/Edge**: Prem `F12` o `Ctrl+Shift+I`
- **Firefox**: Prem `F12`
- **Safari**: `Cmd+Option+I`

### 3. Busca aquests Missatges
Hauries de veure a la consola:
```
🚀 Carregant dades des de l'API de Railway...
✅ Carregats X establiments
✅ Ofertes actives: X
✅ Esdeveniments actius: X
✅ Script El Tomb de Reus carregat correctament
```

### 4. Comprova Visualment
- Hauries de veure:
  - 3 targetes amb estadístiques (Establiments, Ofertes, Esdeveniments)
  - Una graella d'establiments amb imatges, noms, adreces i telèfons
  - Tot carregant-se en temps real des de l'API

---

## ⚙️ Característiques del Codi

✅ **Anti-Caché Automàtic**
- Afegeix un timestamp únic a cada petició
- Headers Cache-Control configurats
- Les dades es carreguen SEMPRE en temps real

✅ **Responsive Design**
- S'adapta automàticament a mòbils, tablets i escriptoris
- Grid layout modern i flexible

✅ **Gestió d'Errors**
- Si l'API falla, mostra un missatge amigable
- Imatges amb fallback si no carreguen

✅ **Optimitzat**
- Només mostra 12 establiments per no saturar
- Animacions suaus per als números
- Càrrega asíncrona (no bloqueja la pàgina)

---

## 🔧 Personalització (Opcional)

### Canviar el Nombre d'Establiments Mostrats
Busca aquesta línia al codi:
```javascript
const limitedEstablishments = establishments.slice(0, 12);
```
Canvia `12` per el nombre que vulguis.

### Canviar els Colors
Al principi del codi, a la secció `<style>`, pots modificar:
```css
color: #e74c3c;  /* Color vermell dels números */
background: #f8f9fa;  /* Color de fons */
```

### Filtrar per Tipus d'Establiment
Si només vols mostrar "local_associat":
```javascript
const filtered = establishments.filter(est => 
    est.establishment_type === 'local_associat'
);
```

---

## 🆘 Solució de Problemes

### ❌ No es veuen els establiments
1. Obre la consola (F12) i busca errors
2. Comprova que l'API de Railway està activa: 
   - https://reusapp-backend-production.up.railway.app/api/establishments
3. Assegura't que has enganxat TOT el codi (inclosos els `<style>` i `<script>`)

### ❌ Apareix "Error carregant establiments"
- Pot ser un problema temporal de l'API de Railway
- Refresca la pàgina després d'uns segons
- Comprova que Railway no està en manteniment

### ❌ El disseny no es veu bé
- Assegura't que el teu tema de WordPress no té CSS que sobreescrigui els estils
- Pots afegir `!important` als estils que vulguis forçar

### ❌ Conflicte amb altres plugins
- Desactiva temporalment altres plugins per identificar conflictes
- El nostre codi està envoltat en una funció anònima per evitar conflictes

---

## 📞 Suport Tècnic

Si tens problemes:
1. Comprova la consola del navegador per errors
2. Verifica que l'API funciona visitant: 
   https://reusapp-backend-production.up.railway.app/api/establishments
3. Assegura't que el codi està a la secció correcta de WordPress

---

## ✨ Resultat Final

Després d'implementar aquesta solució:
- ✅ Les dades es carregaran SEMPRE actualitzades
- ✅ No caldrà esborrar la caché mai més
- ✅ Els usuaris veuran les ofertes i establiments en temps real
- ✅ Funciona en tots els navegadors (Chrome, Firefox, Safari, Edge)
- ✅ Compatible amb mòbils i tablets

---

## 📁 Arxiu a Usar

Obre aquest arxiu i copia tot el contingut:
```
/app/landing/wordpress-solution.html
```

---

**Data de creació:** 12 de novembre de 2025  
**Versió:** 1.0  
**Estat:** Llest per implementar ✅
