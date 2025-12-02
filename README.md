# WhatsApp-like Chat App

A React Native + Expo + TypeScript chat application scaffold.

## Quick Fixes

For common issues and improvements, see [ITERATIVE_FIXES.md](./ITERATIVE_FIXES.md) for exact prompts to use.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npm start
```

## Project Structure

```
newchatapp/
├── App.tsx                 # Main app entry with navigation and React Query
├── screens/
│   └── LoginScreen.tsx     # Login screen with vector icons
├── package.json
├── tsconfig.json
├── app.json
└── babel.config.js
```

## Tech Stack

- Expo (managed workflow)
- TypeScript
- React Navigation (Native Stack)
- React Query (@tanstack/react-query)
- @expo/vector-icons
- axios
- eventsource-polyfill
- @react-native-async-storage/async-storage
- nanoid
- dayjs
- react-native-qrcode-svg

