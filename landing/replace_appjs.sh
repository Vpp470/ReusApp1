#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"

echo "🔄 Reemplaçant app.js amb el contingut complet..."
echo "📦 Fent backup primer..."

cat > sftp_commands.txt << 'SFTP_EOF'
cd /public_html
rename app.js app.js.old_backup
put app-wordpress-embedded.js app.js
ls -la app.js*
bye
SFTP_EOF

sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

rm sftp_commands.txt

echo "✅ app.js reemplaçat amb les dades incrustades!"
echo "📦 Backup: app.js.old_backup"
