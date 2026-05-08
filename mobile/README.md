# Running the AgriFlow Mobile App

## Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio for the Android emulator, or the Expo Go app on a physical device

## Start the services

1. Start the ML service:

   ```bash
   cd "ml models"
   python app.py
   ```

   This runs on port `5001`.

2. Start the backend:

   ```bash
   cd backend
   npm run dev
   ```

   This runs on port `5000`.

3. Start the mobile app:

   ```bash
   cd mobile
   npx expo start
   ```

## Run on a device or emulator

- Android emulator: press `a`
- iOS simulator: press `i`
- Physical device: scan the QR code with Expo Go

## Network config for physical device

**Important:** For physical devices and iOS simulators, you must configure the API endpoint before running the app.

Edit [mobile/utils/api.ts](utils/api.ts) and update the `DEV_MACHINE_IP` constant:

- **Android emulator**: leave it as `10.0.2.2` (special alias for localhost)
- **iOS simulator**: change to `localhost`
- **Physical device**: change to your machine's local IP (e.g., `192.168.1.105`)

To find your machine's IP:
- **Windows**: Run `ipconfig` in cmd, look for IPv4 Address
- **Mac/Linux**: Run `ifconfig` in terminal, look for inet

**Requirement**: Your phone and computer must be on the same Wi-Fi network.

## ML predictions on mobile

The mobile app calls the same `/api/predictions/price` and `/api/predictions/demand` endpoints on the Node.js backend, and the backend proxies those requests to the ML service.

No changes to the ML models are needed for mobile.