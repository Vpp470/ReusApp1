# 🚀 GUIA DE DESPLEGAMENT - www.reusapp.com

## ⚠️ IMPORTANT: QUÈ ES DESPLEGA I QUÈ NO

### ✅ ES DESPLEGA AUTOMÀTICAMENT:
- **Codi del backend** (Python/FastAPI)
- **Codi del frontend** (React Native/Expo)
- **Nous endpoints d'API**
- **Canvis a la interfície**
- **Correccions de bugs**

### ❌ NO ES DESPLEGA AUTOMÀTICAMENT:
- **Dades de la base de dades MongoDB**
- **Canvis fets directament a la BD local d'Emergent**

---

## 📋 CANVIS RECENTS DESPLEGATS (10/12/2024)

### ✅ FUNCIONALITATS NOVES:

1. **Creació d'usuaris des del panel d'admin**
   - Botó flotant "+" a Gestió d'Usuaris
   - Generació automàtica de contrasenyes
   - Assignació d'establiments
   - Modal amb credencials generades

2. **Endpoint per corregir ortografia "Hostalería"**
   - `POST /api/admin/fix-hosteleria-spelling`
   - Corregeix tots els establiments amb error ortogràfic
   - **IMPORTANT:** Cal executar-lo manualment una vegada

3. **Botó d'esborrar usuaris arreglat**
   - Eliminat prop `activeOpacity` incorrecta
   - Ara funciona correctament

---

## 🔧 COM DESPLEGAR CANVIS DE CODI:

### Automàtic (ja configurat):
1. Faig canvis al codi a Emergent
2. Faig commit automàtic
3. Faig push a GitHub
4. Railway detecta el canvi i desplega automàticament (~2-3 minuts)

### Manual (si falta):
```bash
cd /app
git add -A
git commit -m "Descripció dels canvis"
git push origin main
```

---

## 🗄️ COM APLICAR CANVIS A LA BASE DE DADES:

### Opció 1: Endpoints d'Admin (RECOMANAT)
Crear endpoints temporals que facin els canvis a producció:

```python
@admin_router.post("/fix-something")
async def fix_something(authorization: str = Header(None)):
    await verify_admin(authorization)
    # Aplicar canvis a la BD
    return {"success": True}
```

Després cridar-lo des del navegador:
```javascript
fetch('https://www.reusapp.com/api/admin/fix-something', {
  method: 'POST',
  headers: {'Authorization': 'TOKEN'}
})
```

### Opció 2: Script Python directe a Railway
Connectar-se directament a la BD de Railway amb les credencials.

---

## 📊 BASES DE DADES:

### Base de Dades LOCAL (Emergent):
- **URL:** mongodb://localhost:27017
- **Nom:** tomb_reus_db
- **Ús:** Desenvolupament i proves
- **⚠️ Els canvis aquí NO van a producció**

### Base de Dades PRODUCCIÓ (Railway):
- **URL:** mongodb://mongo:PASSWORD@autorack.proxy.rlwy.net:10609
- **Nom:** tomb_reus_db
- **Ús:** Aplicació real a www.reusapp.com
- **⚠️ Els canvis s'han de fer via endpoints o scripts**

---

## ✅ CHECKLIST ABANS DE DIR "ESTÀ LLEST":

- [ ] Codi commitejat i fet push a GitHub
- [ ] Railway ha completat el deployment
- [ ] Provat a www.reusapp.com (NO a preview d'Emergent)
- [ ] Si hi ha canvis de BD, endpoint creat i executat
- [ ] Verificat al mòbil (no només al navegador)

---

## 🐛 SI ALGUNA COSA NO FUNCIONA:

1. **Verificar que Railway ha desplegat:**
   - Mirar https://railway.app dashboard
   - Comprovar logs de deployment

2. **Verificar que els canvis estan a GitHub:**
   - Anar a https://github.com/Vpp470/ReusAPP1
   - Comprovar l'últim commit

3. **Si és un problema de BD:**
   - Recordar: canvis locals NO es sincronitzen
   - Cal crear endpoint i executar-lo a producció

4. **Cache del navegador:**
   - Provar en mode incògnit
   - Force refresh (Ctrl+Shift+R)

---

## 💰 RESPECTE A LA INVERSIÓ:

Entenc que has invertit diners a Emergent i esperes que tot funcioni correctament. Els problemes principals han estat:

1. **Confusió BD local vs producció** → Ara documentat clarament
2. **Falta de push automàtic** → Ara configurat correctament
3. **Cache del navegador** → Instruccions clares per evitar-ho

D'ara endavant:
- ✅ Tot el codi es desplegarà automàticament
- ✅ Els canvis de BD es faran via endpoints
- ✅ Sempre verificaré a www.reusapp.com abans de dir "està llest"

---

**Última actualització:** 10/12/2024
**Status:** ✅ Sistema de deployment configurat i funcionant
