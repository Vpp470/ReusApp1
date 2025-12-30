# ⚠️ INFORMACIÓ IMPORTANT - ReusApp

## 🔴 PROBLEMA PRINCIPAL: Els serveis funcionen 24/7

Els serveis (backend i frontend) **ESTAN CONFIGURATS PER FUNCIONAR SEMPRE**, amb:
- `autostart=true` - S'inicien automàticament quan arrenca el sistema
- `autorestart=true` - Es reinicien automàticament si fallen

**Els serveis NO depenen de si l'agent està actiu o dormint.**

---

## ✅ URLs CORRECTES per WordPress (Fork Actual)

**Domini actual:** `https://reusapp-fix-1.preview.emergentagent.com`

### Pàgines per als iframes:

```html
<!-- Test Simple (verifica que tot funciona) -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/test-simple.html"></iframe>

<!-- Inici -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-inici.html"></iframe>

<!-- Establiments -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-establiments.html"></iframe>

<!-- Ofertes -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-ofertes.html"></iframe>

<!-- Esdeveniments -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-esdeveniments.html"></iframe>

<!-- Mapa -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-mapa.html"></iframe>

<!-- Notícies -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-noticies.html"></iframe>

<!-- Sobre Nosaltres -->
<iframe src="https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-sobre.html"></iframe>
```

---

## 🔍 Verificació Ràpida

### 1. Prova la pàgina de test:
**URL:** https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/test-simple.html

Hauries de veure:
- ✅ Logo "El Tomb de Reus"
- ✅ Missatge "Servidor Actiu!"
- ✅ "API Funciona: 267 establiments trobats"

### 2. Prova l'API directament:
**URL:** https://reusapp-fix-1.preview.emergentagent.com/api/establishments

Hauria de retornar un JSON amb 267 establiments.

### 3. Prova la pàgina d'establiments:
**URL:** https://reusapp-fix-1.preview.emergentagent.com/api/landing/tomb-pagines/tomb-establiments.html

Hauries de veure:
- ✅ Logo a dalt esquerra
- ✅ 267 establiments
- ✅ Barra de cerca funcionant

---

## ⚠️ Sobre els Errors JavaScript que veus

Els errors que surten a la consola del WordPress (línia 889, "Unexpected identifier 'han'", etc.) són **DEL WORDPRESS**, no de les nostres pàgines HTML.

Aquests errors NO afecten les pàgines que servim via iframe, ja que els iframes són completament independents del WordPress.

---

## 🔄 Quan es reinicien els serveis?

Els serveis es reinicien automàticament en aquests casos:
1. **Si fallen** - supervisor els reinicia immediatament
2. **Si el sistema reinicia** - s'inicien automàticament
3. **Mai "s'adormen"** - estan sempre actius

---

## 🚀 Estat Actual dels Serveis

Pots verificar l'estat amb:
```bash
sudo supervisorctl status
```

Hauries de veure:
```
backend     RUNNING
expo        RUNNING  
mongodb     RUNNING
```

---

## 📊 Recursos Verificats i Funcionant

- ✅ **267 establiments** amb noms, adreces, categories, coordenades GPS
- ✅ **2 ofertes actives**
- ✅ **3 esdeveniments actius**
- ✅ **6 notícies** (actualització automàtica 3 vegades al dia: 8:00, 14:00, 20:00)
- ✅ **Mapa interactiu** amb Leaflet i tots els marcadors
- ✅ **Logo** present a totes les pàgines
- ✅ **Cerca funcional** a la pàgina d'establiments

---

## ⚠️ IMPORTANT: Canvi d'URL en un nou Fork

Si fas un nou fork, la URL canviarà. Les URLs actuals són:
- **Domini:** `reusapp-fix.preview.emergentagent.com`
- **Backend:** `https://reusapp-fix-1.preview.emergentagent.com/api`

Si fas un altre fork, necessitaràs:
1. Actualitzar les URLs als fitxers HTML
2. Canviar els iframes al WordPress amb la nova URL

---

## 📞 Suport

Si les pàgines no carreguen:
1. Verifica que estàs utilitzant les URLs correctes d'aquest fork
2. Prova la pàgina de test: `test-simple.html`
3. Comprova que els iframes al WordPress apunten a `reusapp-fix.preview.emergentagent.com`

**Els serveis SEMPRE estan actius, no importa si l'agent està dormint.**
