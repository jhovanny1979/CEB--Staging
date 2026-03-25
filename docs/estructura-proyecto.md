# Estructura recomendada del proyecto CEB

## Carpetas activas (trabajo diario)
- `backend/`: API FastAPI, modelos, migraciones, pruebas y scripts.
- `comercioebogota_3/comercioebogota/`: frontend activo (look & feel oficial).
- `docs/`: documentación funcional/técnica.
- `var/`: datos operativos locales (uploads, etc.).

## Carpeta de archivo
- `archive/snapshots/`: copias históricas de carpetas usadas como referencia.
- `archive/zips/`: archivos `.zip` de respaldo o importación.

## Scripts de operación
- `START_CEB.bat`: levanta backend + frontend.
- `STOP_CEB.bat`: detiene servicios locales.
- `VER_DATOS.bat`: inspección rápida de datos guardados.
- `start-all.ps1`: arranque alterno por PowerShell.

## Buenas prácticas de orden
1. No crear carpetas nuevas en raíz sin necesidad; usar `docs/`, `archive/`, `var/`.
2. Mover entregables o snapshots antiguos a `archive/`.
3. Mantener solo un frontend activo en raíz (actual: `comercioebogota_3/comercioebogota`).
4. Limpiar periódicamente cachés (`pytest-cache-files-*`, `__pycache__`).
5. Documentar cambios de estructura en este archivo.

## Nota
Si alguna ruta histórica externa dependía de carpetas movidas, ahora se encuentra en `archive/snapshots/`.

## Control de ruido local
- `.gitignore` en raíz (`C:\\Proyectos Codex\\CEB\\.gitignore`) evita que caches/logs vuelvan a ensuciar el proyecto.

