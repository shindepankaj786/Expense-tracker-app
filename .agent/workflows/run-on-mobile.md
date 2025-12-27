---
description: How to build and run the fintech app on an Android device or emulator.
---

Follow these steps to deploy your app to a mobile environment:

### 1. Prerequisites
Ensure you have the following installed:
- **Android Studio**
- **Java JDK 17** (standard for modern Android/Capacitor)
- **USB Debugging** enabled on your phone (if using a physical device)

### 2. Build the Web Assets
First, you need to create the production build of your React app.
// turbo
```powershell
npm run build
```

### 3. Sync with Capacitor
This command copies your built files into the Android project and updates any plugins.
// turbo
```powershell
npx cap sync
```

### 4. Open in Android Studio
This will launch Android Studio with your project loaded, where you can click 'Run' to install it on your device/emulator.
// turbo
```powershell
npx cap open android
```

### 5. Run via Command Line (Alternative)
If you have a device connected and want to bypass Android Studio:
// turbo
```powershell
npx cap run android
```
