#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"

echo "🔄 Fent backup i actualitzant index.html..."

cat > sftp_commands.txt << 'SFTP_EOF'
cd /public_html
rename index.html index.html.backup
put index_updated.html index.html
ls -la index*
bye
SFTP_EOF

sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

rm sftp_commands.txt

echo "✅ Index.html actualitzat!"
echo "📦 Backup guardat com: index.html.backup"
