param()
Set-StrictMode -Version Latest

Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.html.save' -Destination 'index.html.save' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.head-backup.html' -Destination 'index.head-backup.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.broken.txt' -Destination 'index.broken.txt' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.before_v1.9.8.html' -Destination 'index.before_v1.9.8.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.before_v1.9.7.html' -Destination 'index.before_v1.9.7.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.before_v1.9.6.html' -Destination 'index.before_v1.9.6.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/154fb94fa50fb36a703706fa968beb5192a08a144b82513aa3777a49ad92c966/index.before_v1.9.5.html' -Destination 'index.before_v1.9.5.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.before_v1.9.0.html' -Destination 'index.before_v1.9.0.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.before_v1.8.8.1.html' -Destination 'index.before_v1.8.8.1.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.backup.20250915-201556.html' -Destination 'index.backup.20250915-201556.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/d7e4ff06f53329f706ccd22d1229b3a6ee77f7b12b724db44803a41fceb1eba6/index.backup.20250915-195725.html' -Destination 'index.backup.20250915-195725.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.backup.20250915-184025.html' -Destination 'index.backup.20250915-184025.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.backup.20250915-173751.html' -Destination 'index.backup.20250915-173751.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.backup.20250915-170241.html' -Destination 'index.backup.20250915-170241.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.backup.20250915-163515.html' -Destination 'index.backup.20250915-163515.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/11c813705ad820a37671479284ed5dbb0415c17b14e54b8c4f5d2831911bf12a/index.backup-20250915-211835.html' -Destination 'index.backup-20250915-211835.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/11c813705ad820a37671479284ed5dbb0415c17b14e54b8c4f5d2831911bf12a/index.backup-20250915-211525.html' -Destination 'index.backup-20250915-211525.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.backup-20250915-211503.html' -Destination 'index.backup-20250915-211503.html' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/f3745a179fcd5ce75a33beb0cdf66c0463d931fd0ea64e2f9c4c7e82919c2cd5/index.broken.1757900208.txt' -Destination 'index.broken.1757900208.txt' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/legacy-indexes/index.1.8.6.backup.html' -Destination 'index.1.8.6.backup.html' -Force
if (-not (Test-Path 'icons')) { New-Item -ItemType Directory -Path 'icons' | Out-Null }
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/347c33cc70a9744f47d9721fb6b422d6955053a4c711112eade96c24a98223d2/icons/scribecat-src.png' -Destination 'icons/scribecat-src.png' -Force
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/duplicates/d39eb6949b56f6a79f56b7f493a56cb49ca7465c20173f76beab15df3d26ad5a/nugget-32.png' -Destination 'nugget-32.png' -Force
if (-not (Test-Path 'extension')) { New-Item -ItemType Directory -Path 'extension' | Out-Null }
Move-Item -LiteralPath 'backups/organized-2025-09-17T15-29-04Z/secrets/extension/scribecat-canvas-helper.pem' -Destination 'extension/scribecat-canvas-helper.pem' -Force
if (-not (Test-Path 'extension')) { New-Item -ItemType Directory -Path 'extension' | Out-Null }
Move-Item -LiteralPath 'docs/extension/scribecat-canvas-helper.crx' -Destination 'extension/scribecat-canvas-helper.crx' -Force
if (-not (Test-Path 'extension/scribecat-canvas-helper')) { New-Item -ItemType Directory -Path 'extension/scribecat-canvas-helper' | Out-Null }
Move-Item -LiteralPath 'docs/extension/scribecat-canvas-helper/manifest.firefox.json' -Destination 'extension/scribecat-canvas-helper/manifest.firefox.json' -Force
if (-not (Test-Path 'extension/scribecat-canvas-helper')) { New-Item -ItemType Directory -Path 'extension/scribecat-canvas-helper' | Out-Null }
Move-Item -LiteralPath 'docs/extension/scribecat-canvas-helper/manifest.json' -Destination 'extension/scribecat-canvas-helper/manifest.json' -Force
if (-not (Test-Path 'extension/scribecat-canvas-helper')) { New-Item -ItemType Directory -Path 'extension/scribecat-canvas-helper' | Out-Null }
Move-Item -LiteralPath 'docs/extension/scribecat-canvas-helper/icon128.png' -Destination 'extension/scribecat-canvas-helper/icon128.png' -Force
if (-not (Test-Path 'extension/scribecat-canvas-helper')) { New-Item -ItemType Directory -Path 'extension/scribecat-canvas-helper' | Out-Null }
Move-Item -LiteralPath 'docs/extension/scribecat-canvas-helper/content.js' -Destination 'extension/scribecat-canvas-helper/content.js' -Force
if (-not (Test-Path 'extension/scribecat-canvas-helper')) { New-Item -ItemType Directory -Path 'extension/scribecat-canvas-helper' | Out-Null }
Move-Item -LiteralPath 'docs/extension/scribecat-canvas-helper/background.js' -Destination 'extension/scribecat-canvas-helper/background.js' -Force
Move-Item -LiteralPath 'docs/__app_version.txt' -Destination '__app_version.txt' -Force
Move-Item -LiteralPath 'scripts/ScribeCat.command' -Destination 'ScribeCat.command' -Force
if (-not (Test-Path 'icons')) { New-Item -ItemType Directory -Path 'icons' | Out-Null }
Move-Item -LiteralPath 'src-tauri/icons/scribecat-512.png' -Destination 'icons/scribecat-512.png' -Force
if (-not (Test-Path 'icons')) { New-Item -ItemType Directory -Path 'icons' | Out-Null }
Move-Item -LiteralPath 'src-tauri/icons/scribecat-180.png' -Destination 'icons/scribecat-180.png' -Force
if (-not (Test-Path 'icons')) { New-Item -ItemType Directory -Path 'icons' | Out-Null }
Move-Item -LiteralPath 'src-tauri/icons/icon32.png' -Destination 'icons/icon32.png' -Force
if (-not (Test-Path 'src')) { New-Item -ItemType Directory -Path 'src' | Out-Null }
Move-Item -LiteralPath 'src-tauri/src/main.rs' -Destination 'src/main.rs' -Force
Move-Item -LiteralPath 'src-tauri/Cargo.toml' -Destination 'Cargo.toml' -Force
Move-Item -LiteralPath 'web/nugget.png' -Destination 'nugget.png' -Force
Move-Item -LiteralPath 'web/nugget-180.png' -Destination 'nugget-180.png' -Force
Move-Item -LiteralPath 'web/nugget-16.png' -Destination 'nugget-16.png' -Force
Move-Item -LiteralPath 'web/favicon.ico' -Destination 'favicon.ico' -Force
if (-not (Test-Path 'fonts')) { New-Item -ItemType Directory -Path 'fonts' | Out-Null }
Move-Item -LiteralPath 'web/fonts/GalaxyCaterpillar.ttf' -Destination 'fonts/GalaxyCaterpillar.ttf' -Force
Move-Item -LiteralPath 'web/index.html' -Destination 'index.html' -Force
