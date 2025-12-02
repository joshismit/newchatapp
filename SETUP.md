# Expo + TypeScript Chat App Setup

## 1. Initialize Expo Project (Managed Workflow, Blank + TypeScript)

```bash
npx create-expo-app@latest . --template blank-typescript
```

## 2. Install Dependencies

```bash
npm install @expo/vector-icons axios eventsource-polyfill @react-native-async-storage/async-storage @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @tanstack/react-query nanoid dayjs react-native-qrcode-svg
```

## 3. Start Development Server

```bash
npm start
```

## Package.json Dependencies

```json
{
  "dependencies": {
    "@expo/vector-icons": "^14.0.0",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "@tanstack/react-query": "^5.17.9",
    "axios": "^1.6.5",
    "dayjs": "^1.11.10",
    "eventsource-polyfill": "^0.9.6",
    "expo": "~50.0.0",
    "expo-status-bar": "~1.11.1",
    "nanoid": "^5.0.4",
    "react": "18.2.0",
    "react-native": "0.73.2",
    "react-native-qrcode-svg": "^6.3.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0"
  }
}
```

## tsconfig.json (Minimal)

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native",
    "moduleResolution": "node",
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Project Structure

```
newchatapp/
├── App.tsx                 # React Navigation + React Query + Login screen
├── screens/
│   └── LoginScreen.tsx     # Placeholder login UI with vector icons
├── package.json
├── tsconfig.json
└── app.json
```

## Run the App

After installation, run:

```bash
npm start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan QR code with Expo Go app.
