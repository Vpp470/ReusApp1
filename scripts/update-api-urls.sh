#!/bin/bash

# Script per actualitzar totes les URLs de l'API a les pàgines HTML

echo "Actualitzant URLs de l'API a reusapp.com..."

# Canviar la URL en tots els fitxers HTML
find /app/landing/tomb-pagines -name "*.html" -type f -exec sed -i "s|https://merchant-connect-15.preview.emergentagent.com/api|https://reusapp.com/api|g" {} \;

echo "✅ URLs actualitzades correctament!"
echo "Nova URL: https://reusapp.com/api"
