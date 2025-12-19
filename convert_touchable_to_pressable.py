#!/usr/bin/env python3
"""
Script per convertir TouchableOpacity a Pressable en fitxers React Native
"""
import re
import sys
from pathlib import Path

def convert_file(filepath):
    """Converteix TouchableOpacity a Pressable en un fitxer"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = 0
    
    # 1. Afegir Pressable a les importacions si no existeix
    if 'TouchableOpacity' in content and 'Pressable' not in content:
        # Buscar la línia d'importació de react-native
        import_pattern = r'(import\s*{\s*[^}]*)(TouchableOpacity)([^}]*}\s*from\s*[\'"]react-native[\'"];)'
        match = re.search(import_pattern, content)
        if match:
            # Afegir Pressable després de TouchableOpacity
            before = match.group(1)
            touchable = match.group(2)
            after = match.group(3)
            
            # Comprovar si ja hi ha Pressable
            if 'Pressable' not in before + after:
                new_import = f"{before}{touchable},\n  Pressable{after}"
                content = content[:match.start()] + new_import + content[match.end():]
                changes += 1
                print("  ✓ Added Pressable to imports")
    
    # 2. Convertir <TouchableOpacity a <Pressable
    content = re.sub(r'<TouchableOpacity\b', '<Pressable', content)
    
    # 3. Convertir </TouchableOpacity> a </Pressable>
    content = re.sub(r'</TouchableOpacity>', '</Pressable>', content)
    
    if content != original_content:
        # Fer backup
        backup_path = str(filepath) + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(original_content)
        
        # Escriure el fitxer modificat
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✓ Converted (backup: {backup_path})")
        return True
    else:
        print("  - No changes needed")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_touchable_to_pressable.py <file_or_directory>")
        sys.exit(1)
    
    path = Path(sys.argv[1])
    
    if path.is_file():
        files = [path]
    elif path.is_dir():
        files = list(path.rglob("*.tsx"))
    else:
        print(f"Error: {path} is not a valid file or directory")
        sys.exit(1)
    
    converted = 0
    for file in files:
        if convert_file(file):
            converted += 1
    
    print(f"\n✓ Converted {converted} files")

if __name__ == "__main__":
    main()
