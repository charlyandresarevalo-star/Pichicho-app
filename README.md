# Pichicho 🐶

App comunitaria (solo perros) para reportar casos de perros perdidos, encontrados, heridos o vistos sueltos.

## Stack
- Expo + React Native + TypeScript
- Firebase Authentication + Firestore + Storage
- react-native-maps
- expo-location
- expo-notifications

## Configuración
1. Creá un proyecto en Firebase.
2. Habilitá Authentication (email/password), Firestore y Storage.
3. Copiá `.env.example` a `.env` y completá las variables `EXPO_PUBLIC_FIREBASE_*`.
4. Instalá dependencias:
   ```bash
   npm install
   ```
5. Ejecutá la app:
   ```bash
   npx expo start
   ```

## Estructura
- `src/screens`: pantallas
- `src/components`: componentes reutilizables
- `src/services`: Firebase y lógica de datos
- `src/types`: tipos de dominio
- `src/utils`: utilidades

## MVP incluido
- Login/registro por email
- Publicación de casos con wizard (fotos + GPS + datos básicos)
- Feed de casos recientes (últimos 7 días) con filtros base
- Mapa con pines por urgencia/estado
- Detalle de caso con comentarios, acciones y reportes
- Flujo “Perdí mi perro” con ubicación aproximada en UI
- Ajustes con permisos para notificaciones

## Assets de Expo (ícono/splash)
- El proyecto referencia estos archivos en `app.json`:
  - `assets/icon.png`
  - `assets/splash.png`
  - `assets/adaptive-icon.png`
  - `assets/favicon.png`
  - `assets/notification-icon.png`
- **No se versionan en este repositorio**. Subilos manualmente en `assets/` antes de correr `npx expo start`.
