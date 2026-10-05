"""ສ້າງ deploy-output/ ແລະ deploy.zip ສຳລັບອັບໂຫຼດຂຶ້ນ cPanel (public_html)
ໃຊ້: python deploy/build.py   (ແລ່ນຈາກໂຟນເດີໂປຣເຈັກ)
ໃສ່ສະເພາະ index.html + demo-img/ + .htaccess — ບໍ່ມີ Code.gs, ຄູ່ມື, Excel, ວິດີໂອ"""
import os, shutil, zipfile, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'deploy-output')
ZIP = os.path.join(ROOT, 'deploy.zip')
FILES = [('index.html', 'index.html'), ('deploy/.htaccess', '.htaccess')]
DIRS = ['demo-img']
IMG = ('.jpg', '.jpeg', '.png', '.webp', '.svg')

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
for src, dst in FILES:
    shutil.copy2(os.path.join(ROOT, src), os.path.join(OUT, dst))
for d in DIRS:
    for base, _, names in os.walk(os.path.join(ROOT, d)):
        for n in names:
            if not n.lower().endswith(IMG):
                continue
            s = os.path.join(base, n)
            t = os.path.join(OUT, os.path.relpath(s, ROOT))
            os.makedirs(os.path.dirname(t), exist_ok=True)
            shutil.copy2(s, t)

# ກວດ: ບໍ່ມີໄຟລ໌ທີ່ຫ້າມ ແລະ index.html ຢູ່ຊັ້ນເທິງສຸດ
bad = [f for b, _, ns in os.walk(OUT) for f in ns if f.lower().endswith(('.gs', '.md', '.xlsx', '.xls', '.mp4', '.env'))]
assert not bad, 'ພົບໄຟລ໌ທີ່ຫ້າມອັບໂຫຼດ: %s' % bad
assert os.path.isfile(os.path.join(OUT, 'index.html'))

if os.path.exists(ZIP):
    os.remove(ZIP)
n = size = 0
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, names in os.walk(OUT):
        for f in sorted(names):
            p = os.path.join(base, f)
            z.write(p, os.path.relpath(p, OUT).replace(os.sep, '/'))
            n += 1
            size += os.path.getsize(p)
h = hashlib.sha256(open(os.path.join(OUT, 'index.html'), 'rb').read()).hexdigest()[:12]
print('OK deploy.zip: %d files, %.1f MB (zip %.1f MB) · index.html sha256 %s' % (n, size / 1e6, os.path.getsize(ZIP) / 1e6, h))

# server (Node.js) — ອັບໂຫຼດໄປ ~/stpos-api (ບໍ່ແມ່ນ public_html): app.js + gas-shim.js + package.json + Code.gs
SZIP = os.path.join(ROOT, 'stpos-server.zip')
if os.path.exists(SZIP):
    os.remove(SZIP)
with zipfile.ZipFile(SZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in ('app.js', 'gas-shim.js', 'delta.js', 'package.json'):
        z.write(os.path.join(ROOT, 'server', f), f)
    z.write(os.path.join(ROOT, 'Code.gs'), 'Code.gs')
    sec = os.path.join(ROOT, 'server', 'secrets.json')  # ລະຫັດ (git-ignored) — ຖ້າບໍ່ມີ ຕ້ອງຕັ້ງໃນ env ຂອງ cPanel
    if os.path.isfile(sec):
        z.write(sec, 'secrets.json')
print('OK stpos-server.zip: %.0f KB (app.js, gas-shim.js, delta.js, package.json, Code.gs%s)' % (os.path.getsize(SZIP) / 1e3, ', secrets.json' if os.path.isfile(sec) else ' — NO secrets.json'))
