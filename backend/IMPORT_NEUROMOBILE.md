# Com Importar Dades de Neuromobile

L'API de Neuromobile té problemes de connectivitat SSL que impedeixen la importació automàtica.

## Opcions per Importar les Dades:

### Opció 1: Descarregar Manualment (RECOMANADA)

1. **Accedeix al panell de Neuromobile**:
   - Entra a https://duc.neuromobile.com o el teu panell d'administració
   - Cerca l'opció d'exportar dades o API

2. **Descarrega les dades en format JSON**:
   - Establiments (commerces)
   - Propostes (ofertes)

3. **Desa els arxius aquí**:
   ```
   /app/backend/data/commerces.json
   /app/backend/data/proposals.json
   ```

4. **Executa l'script d'importació**:
   ```bash
   cd /app/backend
   python import_from_json.py
   ```

### Opció 2: Usa l'eina de Neuromobile

Si Neuromobile té una eina CLI o un export automàtic:

1. Descarrega l'eina oficial
2. Executa l'export
3. Copia els JSON generats a `/app/backend/data/`
4. Executa `python import_from_json.py`

### Opció 3: Contacta amb Suport de Neuromobile

Demana'ls:
- La URL correcta de l'API
- El format correcte del header d'autorització
- Documentació actualitzada
- Un export de les dades en JSON

## Format Esperat dels Arxius JSON:

### commerces.json
```json
[
  {
    "id": "1",
    "name": "Nom del Commerce",
    "description": "Descripció",
    "category": "Categoria",
    "address": "Adreça completa",
    "latitude": 41.1533,
    "longitude": 1.1073,
    "phone": "+34 977 123 456",
    "website": "https://...",
    "image": "https://...",
    "social_media": {}
  }
]
```

### proposals.json
```json
[
  {
    "id": "1",
    "commerce_id": "1",
    "title": "Oferta especial",
    "description": "Descripció de l'oferta",
    "discount": "20% descompte",
    "valid_from": "2025-01-01T00:00:00Z",
    "valid_until": "2025-12-31T23:59:59Z",
    "image": "https://...",
    "terms": "Condicions"
  }
]
```

## Verificar la Importació:

Després d'importar, comprova:

```bash
cd /app/backend
python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['tomb_reus_db']
    
    est_count = await db.establishments.count_documents({})
    off_count = await db.offers.count_documents({})
    
    print(f'Establiments: {est_count}')
    print(f'Ofertes: {off_count}')
    
    client.close()

asyncio.run(check())
"
```

## Problemes Coneguts:

- ❌ SSL Error: `tlsv1 unrecognized name` - El servidor de Neuromobile té problemes SSL
- ❌ Max retries: El servidor no respon o la URL és incorrecta
- ✅ Solució: Importació manual des de JSON

## Contacte Neuromobile:

Per obtenir suport oficial:
- Web: https://neuromobile.readme.io
- Demana documentació actualitzada de l'API
- Sol·licita un export manual de les dades
