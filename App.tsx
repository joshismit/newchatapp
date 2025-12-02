// Note: expo-modules-core polyfill removed - SDK 54 handles this automatically
// The previous polyfill was causing "Cannot override host object" errors on mobile

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, StyleSheet } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ConversationsListScreen from './screens/ConversationsListScreen';
import ArchivedScreen from './screens/ArchivedScreen';
import ChatScreen from './screens/ChatScreen';

// Import screens directly - React Navigation handles platform compatibility
import QRScannerScreen from './screens/QRScannerScreen';
import DesktopLoginScreen from './screens/DesktopLoginScreen';

// Conditionally import web-incompatible modules
let NetInfo: any = null;
let sseService: any = null;
let messageQueue: any = null;
let getAuthToken: any = null;

if (Platform.OS !== 'web') {
  try {
    NetInfo = require('@react-native-community/netinfo').default;
    sseService = require('./services/sse').sseService;
    messageQueue = require('./services/queue').messageQueue;
    getAuthToken = require('./utils/api').getAuthToken;
  } catch (error) {
    console.warn('Failed to load native modules:', error);
  }
}

export type RootStackParamList = {
  Login: undefined;
  QRScanner: undefined;
  DesktopLogin: undefined;
  Home: undefined;
  Conversations: undefined;
  Archived: undefined;
  Chat: {
    conversationId: string;
    conversationTitle?: string;
    otherMemberName?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Ensure root and body are properly styled for web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.getElementById('root');
      if (root) {
        root.style.width = '100%';
        root.style.height = '100%';
      }
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
    }

    // Only run network monitoring on native platforms
    if (Platform.OS === 'web') {
      // On web, assume always online
      setIsOnline(true);
      return;
    }

    if (!NetInfo) {
      return;
    }

    // Monitor network connectivity
    const unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      // If we just came back online, flush the queue
      if (online && wasOffline && messageQueue) {
        console.log('Network reconnected, flushing message queue...');
        messageQueue.flushQueue();
      }

      setWasOffline(!online);
    });

    // Connect to SSE when app starts if token exists (only on native)
    const initializeSSE = async () => {
      if (!sseService || !getAuthToken) {
        return;
      }

      try {
        const token = await getAuthToken();
        if (token) {
          console.log('Connecting to SSE...');
          await sseService.connectSSE(token, (event: any) => {
            console.log('SSE Event received:', event.type, event.data);
          });

          // Flush queue when SSE connection is established
          const handleSSEConnected = (event: any) => {
            if (event.type === 'connected') {
              console.log('SSE connected, flushing message queue...');
              if (messageQueue) {
                messageQueue.flushQueue();
              }
            }
          };
          sseService.addEventHandler(handleSSEConnected);

          return () => {
            sseService.removeEventHandler(handleSSEConnected);
          };
        }
      } catch (error) {
        console.error('Error initializing SSE:', error);
      }
    };

    initializeSSE();

    // Initial queue flush if online
    if (isOnline && messageQueue) {
      messageQueue.flushQueue();
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeNetInfo) {
        unsubscribeNetInfo();
      }
      console.log('Disconnecting SSE on app unmount');
      if (sseService) {
        sseService.disconnectSSE();
      }
    };
  }, [wasOffline]);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen 
            name="QRScanner" 
            component={QRScannerScreen}
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen 
            name="DesktopLogin" 
            component={DesktopLoginScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Conversations" 
            component={ConversationsListScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Archived" 
            component={ArchivedScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
