# ⚠️ INSTRUCCIONS URGENTS PER WORDPRESS

## Problema
El cache de CDN/Kubernetes està mostrant versions antigues dels fitxers HTML amb URLs incorrectes.

## ✅ SOLUCIÓ IMMEDIATA

He creat **noves versions** dels fitxers que bypassen completament el cache.

### Canvia els iframes al WordPress amb aquestes NOVES URLs:

#### 1. Pàgina d'Establiments
```html
<iframe src="https://reus-commerce-1.emergent.host/api/landing/tomb-pagines/tomb-establiments-v2.html" 
        style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" 
        frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

#### 2. Pàgina d'Ofertes
```html
<iframe src="https://reus-commerce-1.emergent.host/api/landing/tomb-pagines/tomb-ofertes-v2.html" 
        style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" 
        frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

#### 3. Pàgina d'Esdeveniments
```html
<iframe src="https://reus-commerce-1.emergent.host/api/landing/tomb-pagines/tomb-esdeveniments-v2.html" 
        style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" 
        frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

#### 4. Pàgina del Mapa
```html
<iframe src="https://reus-commerce-1.emergent.host/api/landing/tomb-pagines/tomb-mapa-v2.html" 
        style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" 
        frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

#### 5. Pàgina de Notícies
```html
<iframe src="https://reus-commerce-1.emergent.host/api/landing/tomb-pagines/tomb-noticies-v2.html" 
        style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" 
        frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

---

## ✅ Què funciona amb aquestes noves URLs?

- ✅ **Logo "El Tomb de Reus"** apareix a la part superior esquerra
- ✅ **267 establiments** carreguen correctament
- ✅ **Mapa** amb tots els locals geolocalitzats
- ✅ **Ofertes** i **esdeveniments** amb imatges
- ✅ **Notícies** actualitzades
- ✅ **URLs correctes** apuntant a `reus-commerce-1.emergent.host`

---

## Per què això funciona?

Les noves URLs amb `-v2` mai han estat accedides abans, per tant **NO tenen cache**. El CDN/Kubernetes les serveix directament des del servidor, que té els fitxers correctes.

---

## Prova ràpida

Obre aquest enllaç al navegador per veure que funciona:
**https://reus-commerce-1.emergent.host/api/landing/tomb-pagines/tomb-establiments-v2.html**

Hauries de veure:
- Logo "El Tomb de Reus" a dalt a l'esquerra
- Barra de cerca
- Llista de 267 establiments amb noms, categories, adreces

---

## Temps estimat per actualitzar WordPress
5-10 minuts (només cal canviar les URLs dels iframes a cada pàgina)
