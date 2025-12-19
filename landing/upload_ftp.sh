#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"
FILE="app-wordpress-embedded.js"

echo "🔗 Connectant al servidor FTP..."

# Crear script SFTP
cat > sftp_commands.txt << 'SFTP_EOF'
cd /
ls -la
put app-wordpress-embedded.js
ls -la app-wordpress-embedded.js
bye
SFTP_EOF

# Executar SFTP amb sshpass
sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

# Netejar
rm sftp_commands.txt

echo "✅ Procés completat!"
