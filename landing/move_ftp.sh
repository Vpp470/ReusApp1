#!/bin/bash

HOST="access-5018936893.webspace-host.com"
PORT="22"
USER="su33453"
PASS="Vpp39875073Vpp2019"

echo "📁 Movent fitxer a public_html..."

# Crear script SFTP per moure el fitxer
cat > sftp_commands.txt << 'SFTP_EOF'
rename /app-wordpress-embedded.js /public_html/app-wordpress-embedded.js
cd /public_html
ls -la app-wordpress-embedded.js
bye
SFTP_EOF

# Executar SFTP
sshpass -p "$PASS" sftp -o StrictHostKeyChecking=no -o Port=$PORT $USER@$HOST < sftp_commands.txt

# Netejar
rm sftp_commands.txt

echo "✅ Fitxer mogut a public_html!"
