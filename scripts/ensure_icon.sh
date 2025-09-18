#!/usr/bin/env bash
set -euo pipefail
mkdir -p src-tauri/icons
python3 - <<'PY'
import struct,zlib,binascii,os
os.makedirs("src-tauri/icons",exist_ok=True)
def chunk(tag,data): return struct.pack(">I",len(data))+tag+data+struct.pack(">I",binascii.crc32(tag+data)&0xffffffff)
w,h=64,64
sig=b"\x89PNG\r\n\x1a\n"
ihdr=struct.pack(">IIBBBBB",w,h,8,6,0,0,0)
px=bytes([124,58,237,255])
row=bytes([0])+px*w
raw=row*h
idat=zlib.compress(raw,9)
open("src-tauri/icons/icon.png","wb").write(sig+chunk(b'IHDR',ihdr)+chunk(b'IDAT',idat)+chunk(b'IEND',b''))
data=open("src-tauri/icons/icon.png","rb").read()
assert data[:8]==sig
print("color_type",data[25])
PY
[ -f src-tauri/icons/icon.png ] || { echo "icon missing"; exit 1; }
