#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"

echo "📂 Explorant estructura de public_html..."

cat > sftp_commands.txt << 'SFTP_EOF'
cd /public_html
ls -la
pwd
bye
SFTP_EOF

sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

rm sftp_commands.txt
