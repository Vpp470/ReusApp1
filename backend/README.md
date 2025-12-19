# 🏪 El Tomb de Reus - Backend API

Backend FastAPI per l'aplicació El Tomb de Reus

## 🚀 Desplegament Ràpid a Railway

### Variables d'Entorn Necessàries

```env
MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/tomb_reus_db
DB_NAME=tomb_reus_db
PORT=8001
PYTHON_VERSION=3.11
```

### Endpoints Principals

- `GET /api/health` - Health check
- `GET /api/establishments` - Llistat d'establiments
- `GET /api/offers` - Ofertes actives
- `GET /api/news` - Notícies
- `POST /api/auth/login` - Login d'usuaris
- `POST /api/auth/register` - Registre d'usuaris

## 📚 Documentació

Més detalls a `DEPLOY_RAILWAY_INSTRUCCIONS.md`

## 🔧 Desenvolupament Local

```bash
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

## 📊 Base de Dades

MongoDB amb les següents col·leccions:
- establishments (267 documents)
- users
- offers
- news
- events
- promotions
- i més...
