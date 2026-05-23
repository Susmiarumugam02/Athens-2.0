#!/usr/bin/env bash
set -euo pipefail

ATH="/var/www/athens-2.0/frontend"
SAP="/var/www/SAP-Python/frontend"

cd "$ATH"

echo "==> (1) Ensure base folders"
mkdir -p src assets public

echo "==> (2) Copy common high-level folders (safe, non-destructive)"
for d in components pages layouts lib store hooks services contexts utils types styles assets; do
  if [ -d "$SAP/src/$d" ]; then
    mkdir -p "src/$d"
    cp -an "$SAP/src/$d/." "src/$d/" 2>/dev/null || true
  fi
done

echo "==> (3) Copy other likely shared folders (if present)"
for d in features app common constants config; do
  if [ -d "$SAP/src/$d" ]; then
    mkdir -p "src/$d"
    cp -an "$SAP/src/$d/." "src/$d/" 2>/dev/null || true
  fi
done

echo "==> (4) Copy assets (images, svg, fonts) if any"
if [ -d "$SAP/src/assets" ]; then
  mkdir -p src/assets
  cp -an "$SAP/src/assets/." src/assets/ 2>/dev/null || true
fi
if [ -d "$SAP/public" ]; then
  cp -an "$SAP/public/." public/ 2>/dev/null || true
fi

echo "==> (5) Patch: if LoginPage expects logo.jpeg, ensure it exists"
if [ ! -f "src/assets/logo.jpeg" ] && [ -f "$SAP/src/assets/logo.jpeg" ]; then
  cp -a "$SAP/src/assets/logo.jpeg" src/assets/logo.jpeg
fi

echo "==> (6) Find missing relative imports by scanning TS/TSX files"
python3 - << 'PY'
import os, re, sys

ATH="/var/www/athens-2.0/frontend"
SAP="/var/www/SAP-Python/frontend"

# collect missing imports
missing=set()

# matches: import ... from "..."
pat = re.compile(r'from\s+[\'"]([^\'"]+)[\'"]')
# matches: import("...")
pat_dyn = re.compile(r'import\(\s*[\'"]([^\'"]+)[\'"]?\s*\)')

def check_import(src_file, spec):
    # ignore packages
    if not spec.startswith(('.', '/')):
        return
    # only handle relative imports under src
    base = os.path.dirname(src_file)

    # candidate paths
    cand=[]
    if spec.startswith('/'):
        # treat as /src/...
        cand.append(os.path.join(ATH, spec.lstrip('/')))
    else:
        cand.append(os.path.normpath(os.path.join(base, spec)))

    exts = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]
    # allow index.* resolution
    idx_exts = ["/index.ts","/index.tsx","/index.js","/index.jsx"]

    for c in cand:
        # exact file or folder
        for e in exts:
            if os.path.isfile(c+e):
                return
        for ie in idx_exts:
            if os.path.isfile(c+ie):
                return
    missing.add((src_file.replace(ATH+"/",""), spec))

def scan_file(path):
    try:
        txt=open(path,'r',encoding='utf-8',errors='ignore').read()
    except:
        return
    for m in pat.finditer(txt):
        check_import(path, m.group(1))
    for m in pat_dyn.finditer(txt):
        check_import(path, m.group(1))

for root,_,files in os.walk(os.path.join(ATH,"src")):
    for f in files:
        if f.endswith((".ts",".tsx",".js",".jsx")):
            scan_file(os.path.join(root,f))

# print missing in a helpful way
print("\n=== MISSING IMPORTS (Athens 2.0) ===")
if not missing:
    print("None ✅")
else:
    for src,spec in sorted(missing)[:300]:
        print(f"{src}  ->  {spec}")
    if len(missing)>300:
        print(f"...and {len(missing)-300} more")

# try to copy missing items from SAP to ATH
def try_copy(spec):
    # returns True if copied something
    copied=False
    # ignore packages
    if not spec.startswith(('.', '/')):
        return False
    # we map /src/... or relative paths to SAP/src equivalents
    # Strategy: try a few likely locations in SAP.
    # We'll attempt to resolve spec to a file in SAP using common extensions.
    exts = ["", ".ts", ".tsx", ".js", ".jsx", ".json"]
    idx_exts = ["/index.ts","/index.tsx","/index.js","/index.jsx"]
    # possible roots in SAP
    roots = [
        os.path.join(SAP,"src"),
        SAP
    ]

    for r in roots:
        # if spec starts with '/', assume it's under src
        if spec.startswith('/'):
            base = os.path.join(r, spec.lstrip('/'))
            candidates=[base]
        else:
            # for relative, we can't know exact folder. We'll try under SAP/src with same relative tail
            candidates=[os.path.join(r, spec.lstrip('./'))]

        for c in candidates:
            # try file forms
            for e in exts:
                srcp=c+e
                if os.path.isfile(srcp):
                    rel = os.path.relpath(srcp, os.path.join(SAP,"src"))
                    dstp=os.path.join(ATH,"src",rel) if not spec.startswith('/') else os.path.join(ATH, spec.lstrip('/'))+e
                    os.makedirs(os.path.dirname(dstp), exist_ok=True)
                    if not os.path.exists(dstp):
                        import shutil
                        shutil.copy2(srcp,dstp)
                        copied=True
            # try index forms
            for ie in idx_exts:
                srcp=c+ie
                if os.path.isfile(srcp):
                    rel = os.path.relpath(srcp, os.path.join(SAP,"src"))
                    dstp=os.path.join(ATH,"src",rel)
                    os.makedirs(os.path.dirname(dstp), exist_ok=True)
                    if not os.path.exists(dstp):
                        import shutil
                        shutil.copy2(srcp,dstp)
                        copied=True
    return copied

copied_any=False
for _,spec in sorted(missing):
    if try_copy(spec):
        copied_any=True

print("\n=== AUTO-COPY RESULT ===")
print("Copied some missing files ✅" if copied_any else "No additional files copied (either already exist or not found in SAP)")
PY

echo "==> (7) Ensure required deps are installed (minimal)"
npm install --no-audit --no-fund react-hot-toast axios zustand react-router-dom >/dev/null 2>&1 || true

echo "==> DONE. Now run: npm run dev -- --host 0.0.0.0 --port 5173"
