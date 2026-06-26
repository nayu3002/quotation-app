import os, glob, re

files = glob.glob(r'f:\quotation\mobile\app\(tabs)\*.tsx')
files.append(r'f:\quotation\mobile\app\(tabs)\quotations\[id].tsx')

def patch(file):
    if 'create-quotation.tsx' in file or '_layout.tsx' in file:
        return
    with open(file, 'r', encoding='utf-8') as f:
        t = f.read()
    if 'SafeAreaView' in t:
        return
        
    print(f"Patching {file}")
    # Import
    t = re.sub(r"(import .* from 'react-native';?)", r"\1\nimport { SafeAreaView } from 'react-native-safe-area-context';", t, count=1)
    
    # Replace root View with SafeAreaView
    t = re.sub(r'(return \(\s*)<View style={{ flex: 1([^>]*)>', r'\1<SafeAreaView style={{ flex: 1\2>', t, count=1)
    
    # Replace the final </View> before );
    # Specifically: </View>\s*\);\s*}
    t = re.sub(r'</View>\s*\);\s*\}', '</SafeAreaView>\n  );\n}', t, count=1)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(t)

for f in files: patch(f)
