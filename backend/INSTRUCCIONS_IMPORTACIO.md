# 📋 Instruccions per Importar l'Excel d'Establiments

## 🎯 Camps Reconeguts

L'script d'importació reconeix els següents camps de l'Excel:

### Camps Principals
- **Nom** (obligatori)
- **NIF**: `NIF`, `nif`, `CIF`, `cif`, `NIF/CIF`, `vad number`, `Vad number`, `VAD number`
- **Categoria**: `Categoria`, `categoria`
- **Subcategoria**: `Subcategoria`, `subcategoria`, `Tipus`

### Contacte
- **Adreça**: `Adreça`, `adreça`, `Direcció`
- **Telèfon**: `Telèfon`, `telèfon`, `Telèfon de contacte`, `Telefon`
- **WhatsApp**: `WhatsApp`, `whatsapp`, `Whatsapp`
- **Email**: `E-mail`, `e-mail`, `Email`, `Correu electrònic`
- **Web**: `Web`, `web`, `Adreça web`, `Website`

### Coordenades GPS
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

## 🚀 Com Importar

### Pas 1: Col·locar el Fitxer Excel
Copia el fitxer Excel a:
```bash
/tmp/establiments.xlsx
```

O deixa'l amb el nom original:
```bash
/tmp/2025-10_JPS_BD_establiments_eltomb_expogo_V02.xlsx
```

### Pas 2: Executar l'Script
```bash
cd /app/backend
python import_excel_comprehensive.py
```

### Pas 3: Revisar els Resultats
L'script mostrarà:
- ✅ Establiments creats
- 🔄 Establiments actualitzats
- ⚠️ Establiments saltats
- ❌ Errors

## ⚙️ Comportament de l'Script

1. **Actualització**: Si un establiment ja existeix (mateix NIF o nom) → S'ACTUALITZA
2. **Creació**: Si no existeix → ES CREA
3. **Validació**: El camp "Nom" és obligatori

## 📝 Notes Importants

- **VAD number = NIF**: El camp "vad number" de l'Excel s'importa com a NIF
- **Coordenades GPS**: Necessàries per mostrar al mapa
- **Format**: Fitxers .xlsx o .xls
- **Camps buits**: NO sobreescriuen els existents

## ✅ Després de la Importació

Pots editar manualment els establiments des de:
**Admin Panel → Gestió d'Establiments → Editar**

Tots els camps són editables, incloent:
- WhatsApp
- Coordenades GPS (Latitud, Longitud)
- Xarxes socials
- Descripció completa
