# GUIA PAS A PAS: Configurar WordPress per Mostrar les Pàgines Noves

## ❗ IMPORTANT: Segueix aquests passos EN ORDRE

---

## PASSA 1: Verificar que les pàgines existeixen

1. Al WordPress, ves a **Pàgines → Totes les pàgines**
2. Busca aquestes 7 pàgines i verifica que totes diuen **"Publicat"**:
   - inici vell (o Inici)
   - mapa
   - Què és El Tomb?
   - Establiments
   - Ofertes
   - Notícies
   - Esdeveniments

3. Si alguna diu "Esborrany", clica **Editar** → **Publica**

---

## PASSA 2: Identificar la pàgina antiga

1. A **Pàgines → Totes les pàgines**
2. Busca una pàgina que:
   - NO sigui cap de les 7 pàgines noves
   - Tingui molt contingut (la landing llarga)
   - Potser es diu "Home", "Inici", o no té nom
3. **ANOTA EL NOM** d'aquesta pàgina antiga

---

## PASSA 3: Configurar la pàgina d'inici

1. Ves a **Configuració → Lectura**
2. Mira la secció **"La teva pàgina principal mostra"**
3. Selecciona **"Una pàgina estàtica"**
4. Al desplegable **"Pàgina principal:"**, selecciona **"inici vell"**
5. Clica **"Desa els canvis"** (botó blau a baix)
6. **MOLT IMPORTANT:** Espera que surti el missatge "Configuració desada"

---

## PASSA 4: Ocultar la pàgina antiga

1. Torna a **Pàgines → Totes les pàgines**
2. Busca la pàgina antiga (la que vas anotar al PASSA 2)
3. Passa el ratolí per sobre del nom
4. Clica **"Escombraries"**

---

## PASSA 5: Esborrar la memòria cau

### Opció A: Si veus "SG Optimizer" o "Purge Cache" a la barra superior
1. Clica sobre aquest botó
2. Selecciona "Purge Everything" o "Esborrar tot"

### Opció B: Si tens un altre plugin de cache
1. Busca al menú lateral algun plugin de cache (WP Super Cache, W3 Total Cache, etc.)
2. Entra i esborra la cache

### Opció C: Si no veus cap opció de cache
1. Simplement continua al següent pas

---

## PASSA 6: Comprovar el resultat

1. Obre una **finestra d'incògnit** al navegador (Ctrl+Shift+N o Cmd+Shift+N)
2. Ves a **https://eltombdereus.com**
3. Què veus?
   - ✅ Les pàgines noves amb els botons → PERFECTE!
   - ❌ Encara la landing antiga → Continua al PASSA 7

---

## PASSA 7: Si encara no funciona

### Comprova l'estat actual:

1. Torna a **Configuració → Lectura**
2. Fes una captura de pantalla d'aquesta pàgina
3. Envia'm la captura

### També comprova:

1. Ves a **Aparença → Temes**
2. Quin tema tens actiu?
3. Alguns temes poden tenir configuracions especials per a la pàgina d'inici

---

## 📋 RESUM RÀPID:

```
1. Verificar que les 7 pàgines estan publicades
2. Identificar la pàgina antiga
3. Configuració → Lectura → Una pàgina estàtica → inici vell → Desar
4. Esborrar la pàgina antiga
5. Esborrar cache
6. Comprovar en mode incògnit
```

---

## ❓ PREGUNTES FREQÜENTS:

**P: No veig l'opció "Una pàgina estàtica"**
R: Assegura't que estàs a Configuració → Lectura. Hauria d'estar allà sempre.

**P: El desplegable "Pàgina principal" està buit**
R: Significa que no tens cap pàgina publicada. Torna al PASSA 1.

**P: Després de desar, torno a mirar i està en "Les teves últimes entrades"**
R: Pot ser un problema amb el tema. Prova a canviar temporalment a un tema per defecte com "Twenty Twenty-Four".

---

## 🆘 SI RES FUNCIONA:

Si després de seguir tots aquests passos encara veus la landing antiga:

1. Fes una captura de **Configuració → Lectura**
2. Fes una captura de **Pàgines → Totes les pàgines**
3. Digues-me quin tema de WordPress tens actiu
4. Envia'm les captures i continuarem des d'aquí
