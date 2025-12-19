#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"

echo "📤 Pujant establishments.json..."

cat > sftp_commands.txt << 'SFTP_EOF'
cd /public_html
put establishments.json
ls -la establishments.json
bye
SFTP_EOF

sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

rm sftp_commands.txt

echo "✅ establishments.json pujat!"
