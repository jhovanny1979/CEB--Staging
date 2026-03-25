# APK movil (Comercio e-Bogota)

Este modulo genera un APK Android de prueba que abre la plataforma en red local.

## Archivos clave
- APK final: `C:\Proyectos Codex\CEB\CEB-mobile-debug.apk`
- Build rapido: `C:\Proyectos Codex\CEB\BUILD_APK.bat`
- Instalacion por USB: `C:\Proyectos Codex\CEB\INSTALL_APK.bat`

## Flujo recomendado
1. Inicia backend+frontend para red local:
   - `START_CEB_MOVIL.bat` (recomendado, configura puertos 5500/8000)
   - o `START_CEB.bat sqlite 0.0.0.0`
2. Compila APK:
   - doble clic en `BUILD_APK.bat`
3. Instala APK:
   - conecta celular con depuracion USB
   - doble clic en `INSTALL_APK.bat`

## Nota de conectividad
- El APK apunta a `http://IP_LOCAL_PC:5500/index.html`.
- `BUILD_APK.bat` detecta y actualiza la IP automaticamente en cada build.
