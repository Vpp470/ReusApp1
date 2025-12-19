# 📤 INSTRUCCIONS PER PUJAR EL FITXER AL WORDPRESS VIA FTP

## 🔐 Credencials FTP (SFTP)

```
Host: access-5018936893.webspace-host.com
Port: 22
Protocol: SFTP
Usuari: su33453
Contrasenya: [La que vas establir]
```

---

## 📥 Pas 1: Descarregar el Fitxer

El fitxer està aquí: `/app/landing/app-wordpress-embedded.js`

**Mida:** ~350 KB  
**Línies:** 7,258  
**Contingut:** Codi JavaScript + 267 establiments incrustats

---

## 🔧 Pas 2: Client FTP Recomanat

### Opció A: FileZilla (Recomanat)
1. Descarrega: https://filezilla-project.org/
2. Instal·la i obre FileZilla
3. Ves a **Fitxer** → **Gestor de llocs**
4. Clica **"Nou lloc"**
5. Configura:
   - **Protocol:** SFTP
   - **Servidor:** access-5018936893.webspace-host.com
   - **Port:** 22
   - **Tipus d'accés:** Normal
   - **Usuari:** su33453
   - **Contrasenya:** [la teva]
6. Clica **"Connecta"**

### Opció B: Cyberduck
1. Descarrega des d'IONOS o https://cyberduck.io/
2. Obre Cyberduck
3. Clica **"Nova connexió"**
4. Selecciona **"SFTP"**
5. Introdueix les credencials
6. Connecta

---

## 📂 Pas 3: Navegar al Directori de WordPress

Un cop connectat via FTP, navega fins al directori on tens WordPress instal·lat:

**Rutes típiques:**
```
/public_html/
/www/
/htdocs/
/eltombdereus.com/
```

Busca on tens els fitxers de WordPress (normalment veuràs carpetes com `wp-content`, `wp-admin`, `wp-includes`).

---

## 📤 Pas 4: Pujar el Fitxer JavaScript

1. **Local (esquerra):** Navega fins a on hagis descarregat `app-wordpress-embedded.js`
2. **Servidor (dreta):** Posa't al directori arrel de WordPress (on hi ha `index.php`)
3. **Arrossega** el fitxer `app-wordpress-embedded.js` des de local al servidor
4. **Espera** que es completi la pujada (~30 segons)

---

## 🌐 Pas 5: Actualitzar la Pàgina WordPress

### Opció A: Editar pàgina existent
1. Accedeix al teu WordPress Admin
2. Ves a **Pàgines** → Edita la pàgina on vols mostrar els establiments
3. Afegeix un bloc **HTML personalitzat**
4. Enganxa aquest codi:

```html
<div id="map" style="height: 500px; width: 100%; margin-bottom: 30px;"></div>

<div style="margin-bottom: 20px;">
  <button onclick="filterByType('all')" style="margin: 5px; padding: 10px 20px; cursor: pointer;">Tots</button>
  <button onclick="filterByType('local_associat')" style="margin: 5px; padding: 10px 20px; cursor: pointer;">Locals Associats</button>
  <button onclick="filterByType('patrocinador')" style="margin: 5px; padding: 10px 20px; cursor: pointer;">Patrocinadors</button>
</div>

<div id="establishments-grid"></div>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/app-wordpress-embedded.js"></script>
```

5. **Desa** la pàgina

### Opció B: Crear pàgina nova
1. Ves a **Pàgines** → **Afegeix nova**
2. Títol: "Establiments Associats"
3. Afegeix el mateix codi HTML de dalt
4. **Publica** la pàgina

---

## 🎨 Pas 6: (Opcional) Afegir Estils CSS

Si vols millorar l'aspecte visual, afegeix aquest CSS:

**Opció 1: Al mateix bloc HTML (abans del div#map)**
```html
<style>
.establishment-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.establishment-card h3 {
  color: #E63946;
  margin-top: 0;
}

.establishment-status {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.establishment-status.actiu { background: #28a745; color: white; }
.establishment-status.inactiu { background: #dc3545; color: white; }
.establishment-status.pendent { background: #ffc107; color: black; }

#establishments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}
</style>
```

**Opció 2: Afegir al fitxer CSS del tema**
1. Ves a **Aparença** → **Editor de temes**
2. Troba `style.css`
3. Afegeix el CSS al final
4. Desa

---

## ✅ Pas 7: Verificar que Funciona

1. Visita la pàgina on has afegit el codi
2. Hauries de veure:
   - ✅ Mapa interactiu amb marcadors
   - ✅ Botons de filtre (Tots, Locals Associats, Patrocinadors)
   - ✅ Llista d'establiments amb tota la informació
   - ✅ 267 establiments mostrats

3. Obre la consola del navegador (F12) i verifica:
   - ✅ No hi ha errors
   - ✅ Veus: "Carregats 267 establiments"

---

## 🆘 Problemes Comuns

### El mapa no carrega
**Solució:** Assegura't que Leaflet.js s'està carregant correctament. Verifica la consola del navegador.

### Els establiments no es mostren
**Solució:** 
1. Verifica que el fitxer `app-wordpress-embedded.js` s'ha pujat correctament
2. Comprova la ruta: ha de ser `/app-wordpress-embedded.js` (arrel del domini)
3. Prova accedir directament: `https://eltombdereus.com/app-wordpress-embedded.js`

### Error 404 al carregar el JS
**Solució:** El fitxer no està al directori correcte. Assegura't de pujar-lo a l'arrel de WordPress.

### Els estils no s'apliquen
**Solució:** Afegeix el CSS directament al bloc HTML dins de `<style>` tags.

---

## 📞 Suport Tècnic

Si tens problemes amb l'FTP o la configuració:
- **IONOS Support:** Pots contactar amb el suport d'IONOS des del teu panell de control
- **FileZilla Forum:** https://forum.filezilla-project.org/

---

**Última actualització:** Novembre 2025  
**Versió:** 1.0 amb dades incrustades
