#!/bin/bash

# Script per desplegar la landing page amb cache busting automàtic
# Aquest script actualitza el timestamp al HTML i puja els arxius via FTP

echo "🚀 Desplegament Landing Page amb Cache Busting"
echo "=" * 60

# Generar nou timestamp
TIMESTAMP=$(date +%Y%m%d%H%M)
echo "📅 Nou timestamp: $TIMESTAMP"

# Crear còpia de seguretat
cp index.html index_backup_$(date +%Y%m%d_%H%M%S).html
echo "💾 Còpia de seguretat creada"

# Actualitzar timestamp al HTML
sed -i "s/app\.js?v=[0-9]*/app.js?v=$TIMESTAMP/" index.html
echo "✅ Timestamp actualitzat a index.html"

echo ""
echo "📦 Arxius preparats per pujar:"
echo "  - index.html (amb nou timestamp)"
echo "  - app.js (amb API pública de Railway)"
echo "  - .htaccess (headers anti-caché)"
echo "  - styles.css"
echo ""
echo "⚠️  Pròxim pas: Puja aquests arxius al servidor eltombdereus.com via FTP/SFTP"
echo ""
echo "📝 Comandes SFTP recomanades:"
echo "  cd /path/to/web/root"
echo "  put index.html"
echo "  put app.js"
echo "  put .htaccess"
echo "  put styles.css"
echo ""
echo "✅ Un cop pujats, els usuaris obtindran la nova versió sense caché!"
