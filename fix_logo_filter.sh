#!/bin/bash

# Script to add filter: brightness(0) invert(1); to logo-container img CSS rules

# Find all HTML files that have width: 140px but don't have filter: brightness
files=$(find /app -name "*.html" -exec grep -l "width: 140px" {} \; | xargs grep -L "filter: brightness")

echo "Found $(echo "$files" | wc -l) files to fix"

for file in $files; do
    echo "Processing: $file"
    
    # Check if file has the pattern with empty line between rules
    if grep -q -A 5 "\.logo-container img {" "$file" | grep -q "^        $"; then
        # Pattern with empty line
        sed -i 's/\(\.logo-container img {\s*\n\s*width: 140px;\s*\n\s*height: auto;\s*\n\s*display: block;\)/\1\n            filter: brightness(0) invert(1);/g' "$file"
    else
        # Pattern without empty line - use a more targeted approach
        # Add filter to each occurrence of the CSS rule
        sed -i '/\.logo-container img {/{
            N
            N
            N
            s/\(display: block;\)/\1\n            filter: brightness(0) invert(1);/
        }' "$file"
    fi
done

echo "Logo filter fix completed!"