# Instruccions per Configurar les Pàgines al WordPress

## Pas 1: Crear les 7 Pàgines al WordPress

Al teu panell d'administració de WordPress (wp-admin), crea 7 pàgines noves amb aquests noms:

1. **Inici** (aquesta serà la pàgina principal)
2. **Mapa**
3. **Sobre Nosaltres**
4. **Establiments**
5. **Ofertes**
6. **Notícies**
7. **Esdeveniments**

## Pas 2: Afegir el Codi a Cada Pàgina

A cada pàgina, canvia a l'editor de codi HTML i pega el codi corresponent:

### 1. PÀGINA: Inici
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-inici.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

### 2. PÀGINA: Mapa
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-mapa.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

### 3. PÀGINA: Sobre Nosaltres
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-sobre.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

### 4. PÀGINA: Establiments
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-establiments.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

### 5. PÀGINA: Ofertes
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-ofertes.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

### 6. PÀGINA: Notícies
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-noticies.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

### 7. PÀGINA: esdeveniments
```html
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-esdeveniments.html" style="width:100%; height:100vh; border:none; display:block; margin:0; padding:0;" frameborder="0" scrolling="yes" allowfullscreen></iframe>
```

## Pas 3: Configurar la Pàgina d'Inici

1. Ves a **Configuració → Lectura** al teu WordPress
2. A "La teva pàgina principal mostra", selecciona **Una pàgina estàtica**
3. A "Pàgina principal", selecciona **Inici**
4. Desa els canvis

## Pas 4: Crear el Menú de Navegació

1. Ves a **Aparença → Menús**
2. Crea un menú nou anomenat "Menú Principal"
3. Afegeix les 7 pàgines al menú en aquest ordre:
   - Inici
   - Mapa
   - Sobre Nosaltres
   - Establiments
   - Ofertes
   - Notícies
   - Esdeveniments
4. Assigna el menú a la ubicació "Menú principal" del teu tema
5. Desa el menú

## Pas 5: Afegir CSS Personalitzat (Opcional)

Si els iframes no es veuen bé o hi ha marges, afegeix aquest CSS personalitzat:

Ves a **Aparença → Personalitzar → CSS Addicional** i pega:

```css
/* Eliminar marges i padding del body per iframes de pantalla completa */
body.page iframe {
    width: 100% !important;
    height: 100vh !important;
    border: none !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Eliminar marges del contingut */
.entry-content {
    margin: 0 !important;
    padding: 0 !important;
}

/* Ocultar títols de pàgina si interfereixin */
.page .entry-header {
    display: none !important;
}

/* Fer que el contingut ocupi tota l'amplada */
.site-content {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
}
```

## Notes Importants:

- Les ofertes i notícies ara s'actualitzen automàticament des de l'API
- Els establiments es carreguen dinàmicament des de la base de dades
- El mapa mostra tots els establiments amb la seva ubicació real
- Els esdeveniments es mostren amb els seus establiments participants

## Resolució de Problemes:

Si les pàgines no es carreguen:
1. Verifica que has copiat les URLs correctament
2. Comprova que el teu WordPress permet iframes (alguns plugins de seguretat els bloquegen)
3. Assegura't que les pàgines estan publicades (no en esborrany)

Si els iframes tenen marges o no ocupen tota la pantalla:
1. Afegeix el CSS personalitzat del Pas 5
2. Pot ser necessari ajustar el CSS segons el teu tema de WordPress
