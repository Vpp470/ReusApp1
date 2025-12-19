#!/bin/bash

# Script per afegir filtre blanc a tots els logos

for file in tomb-ofertes-responsive.html tomb-esdeveniments-responsive.html tomb-mapa-responsive.html tomb-noticies-responsive.html tomb-sobre-responsive.html; do
    sed -i 's/display: block;$/display: block;\n            filter: brightness(0) invert(1);/g' "$file"
    echo "Actualitzat: $file"
done

echo "Tots els logos ara són blancs!"
