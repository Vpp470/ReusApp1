# 📊 Importació d'Establiments des d'Excel - Guia Completa

## 🎯 Objectiu
Aquest script permet importar o actualitzar dades completes d'establiments des d'un fitxer Excel, incloent:
- ✅ Dades bàsiques (nom, NIF, categoria, subcategoria)
- ✅ Contacte (telèfon, WhatsApp, email)
- ✅ Xarxes socials (Facebook, Instagram, Twitter, YouTube)
- ✅ Coordenades GPS (latitud, longitud)
- ✅ Descripció completa i logotips

## 📋 Columnes Suportades a l'Excel

El script és **flexible** i reconeix diferents noms de columnes:

### Camps Principals
- **Nom** (obligatori): `Nom`, `nom`, `Nom establiment`
- **NIF/CIF**: `NIF`, `nif`, `CIF`, `cif`, `NIF/CIF`
- **Categoria**: `Categoria`, `categoria`
- **Subcategoria**: `Subcategoria`, `subcategoria`, `Tipus`

### Contacte
- **Adreça**: `Adreça`, `adreça`, `Direcció`
- **Telèfon**: `Telèfon`, `telèfon`, `Telèfon de contacte`, `Telefon`
- **WhatsApp**: `WhatsApp`, `whatsapp`, `Whatsapp`
- **Email**: `E-mail`, `e-mail`, `Email`, `Correu electrònic`
- **Web**: `Web`, `web`, `Adreça web`, `Website`

### Coordenades GPS (IMPORTANT!)
- **Latitud**: `Latitud`, `latitud`, `Lat`
- **Longitud**: `Longitud`, `longitud`, `Lng`, `Lon`

### Xarxes Socials
- **Facebook**: `Facebook`, `facebook`, `FB`
- **Instagram**: `Instagram`, `instagram`, `IG`
- **Twitter**: `Twitter`, `twitter`, `X`
- **YouTube**: `YouTube`, `youtube`, `Youtube`

### Altres
- **Descripció**: `Descripció`, `descripció`, `Descripció completa`
- **Logo**: `Logo URL`, `logo_url`, `Imatge`, `URL Logo`
- **Nom Comercial**: `Nom comercial`, `nom_comercial`

## 🚀 Com Utilitzar

### Pas 1: Col·locar el Fitxer Excel

Copia el teu fitxer Excel a una d'aquestes ubicacions:

```bash
# Opció 1 - Ubicació temporal (recomanada)
/tmp/establiments.xlsx

# Opció 2 - Dins del backend
/app/backend/establiments.xlsx

# Opció 3 - Arrel del projecte
/app/establiments.xlsx

# Opció 4 - Nom específic del fitxer proporcionat
/tmp/2025-10_JPS_BD_establiments_eltomb_expogo_V02.xlsx
```

### Pas 2: Executar l'Script

```bash
# Des del directori backend
cd /app/backend
python import_excel_comprehensive.py
```

### Pas 3: Revisar els Resultats

L'script mostrarà:
```
🚀 IMPORTACIÓ COMPLETA D'ESTABLIMENTS DES D'EXCEL
📁 Fitxer: /tmp/establiments.xlsx

📊 Columnes detectades (XX):
   1. Nom
   2. NIF
   3. Categoria
   ...

📝 Total files: XXX

  ✅ CREAT: Nom Establiment (NIF: BXXXXXXX)
  🔄 ACTUALITZAT: Altre Establiment (NIF: AXXXXXXX)
  ...

============================================================
📊 RESUM DE LA IMPORTACIÓ
============================================================
  ✅ Creats:        XX
  🔄 Actualitzats:  XX
  ⚠️  Saltats:       XX
  ❌ Errors:        XX
  📈 TOTAL:         XXX
============================================================

📈 ESTADÍSTIQUES DE LA BASE DE DADES:
   Total establiments:      XXX
   Amb NIF:                 XXX
   Amb coordenades GPS:     XXX

✅ IMPORTACIÓ FINALITZADA!
```

## 🔄 Actualització vs. Creació

### L'script ACTUALITZARÀ un establiment existent si:
1. Té el mateix **NIF/CIF** que un establiment existent, o
2. Té el mateix **nom** que un establiment existent (si no hi ha NIF)

### L'script CREARÀ un nou establiment si:
- No troba cap coincidència per NIF ni per nom

## 📍 Coordenades GPS

Les coordenades GPS són **crucials** per mostrar els establiments al mapa:

- **Latitud**: Coordenada Nord-Sud (exemple: 41.1564 per Reus)
- **Longitud**: Coordenada Est-Oest (exemple: 1.1073 per Reus)

Si el teu Excel no té coordenades GPS:
1. Pots trobar-les a Google Maps fent clic dret sobre l'establiment
2. O utilitzar eines com [GPS Coordinates](https://www.gps-coordinates.net/)
3. Després pots editar-les manualment al panell d'admin

## 🛠️ Edició Manual

Després de la importació, tots els camps són **editables** al panell d'administració:

1. Accedeix a: **Admin Panel → Gestió d'Establiments**
2. Clica **Editar** sobre qualsevol establiment
3. Modifica els camps que necessitis
4. Guarda els canvis

Els nous camps disponibles al formulari:
- ✅ WhatsApp
- ✅ Latitud GPS
- ✅ Longitud GPS
- ✅ Subcategoria
- ✅ Tots els camps de xarxes socials
- ✅ Descripció completa

## 📝 Format Excel Recomanat

```
| Nom          | NIF       | Categoria  | Subcategoria | Adreça        | Telèfon    | WhatsApp   | Email           | Latitud  | Longitud | Facebook              | Instagram           |
|--------------|-----------|------------|--------------|---------------|------------|------------|-----------------|----------|----------|-----------------------|---------------------|
| Bar Exemple  | B12345678 | Hostaleria | Bar          | C/ Major, 1   | 977123456  | 677123456  | info@exemple.cat| 41.1564  | 1.1073   | facebook.com/exemple  | instagram.com/ex    |
```

## ⚠️ Notes Importants

1. **Nom és obligatori**: Les files sense nom es saltaran
2. **NIF recomanat**: Facilita identificar duplicats
3. **Coordenades GPS**: Necessàries per mostrar al mapa
4. **Xarxes socials**: Mostren icones al panell d'admin
5. **Actualitzacions**: Els camps buits NO sobreescriuen els existents

## 🐛 Resolució de Problemes

### Error: "No s'ha trobat cap fitxer Excel"
- Verifica que el fitxer està a una de les ubicacions correctes
- Comprova que el fitxer té extensió `.xlsx` o `.xls`

### Error: "Columnes no trobades"
- Revisa que les columnes tenen els noms correctes (veure llista superior)
- El script és flexible amb majúscules/minúscules i accents

### Alguns establiments no s'importen
- Verifica que tenen el camp `Nom` emplenat
- Comprova els logs per veure el motiu específic

### Coordenades GPS no funcionen
- Assegura't que són números decimals (exemple: 41.1564, no "41,1564")
- Format: sense comas, utilitzar punt decimal
- Rang vàlid: Latitud [-90, 90], Longitud [-180, 180]

## 📞 Suport

Per qualsevol dubte o problema, revisa els logs de l'script que mostren informació detallada de cada establiment processat.

---
**Creat per:** ReusApp Development Team  
**Última actualització:** 2025-10-21
