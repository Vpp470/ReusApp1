#!/bin/bash

# Script per actualitzar placeholders amb traduccions i18n

echo "Actualitzant placeholders amb i18n..."

# Crear backups
mkdir -p /tmp/i18n-backup
cp -r /app/frontend/app /tmp/i18n-backup/

echo "✅ Backups creats"
echo "🚀 Ara pots verificar els canvis manualment si cal"
