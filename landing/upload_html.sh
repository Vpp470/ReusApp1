#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"

echo "📤 Pujant pàgina HTML de prova..."

cat > sftp_commands.txt << 'SFTP_EOF'
cd /public_html
put establiments.html
ls -la establiments.html
bye
SFTP_EOF

sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

rm sftp_commands.txt

echo "✅ Pàgina pujada!"
echo "🌐 Prova-la a: https://eltombdereus.com/establiments.html"
