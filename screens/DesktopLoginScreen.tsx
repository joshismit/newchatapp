import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import {
  createQRChallenge,
  checkQRStatus,
  confirmQRChallenge,
  setAuthToken,
} from '../utils/api';
import type { RootStackParamList } from '../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QRStatus {
  status: 'pending' | 'authorized' | 'expired';
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function DesktopLoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [status, setStatus] = useState<QRStatus['status']>('pending');
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptRef = useRef(0);
  const maxPollAttempts = 60; // 2 minutes max (60 * 2s)

  useEffect(() => {
    initializeQRChallenge();
    
    return () => {
      // Cleanup polling on unmount
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (challengeId && status === 'pending') {
      startPolling();
    } else if (status === 'authorized') {
      stopPolling();
      handleAuthorized();
    } else if (status === 'expired') {
      stopPolling();
      handleExpired();
    }

    return () => {
      stopPolling();
    };
  }, [challengeId, status]);

  const initializeQRChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await createQRChallenge();
      setChallengeId(result.challengeId);
      setQrPayload(result.qrPayload);
      setStatus('pending');
      setLoading(false);
    } catch (err: any) {
      console.error('Error creating QR challenge:', err);
      setError(err.message || 'Failed to create QR code');
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) {
      return; // Already polling
    }

    setPolling(true);
    pollAttemptRef.current = 0;

    const poll = async () => {
      if (!challengeId || !pollIntervalRef.current) return;

      pollAttemptRef.current += 1;

      // Stop polling after max attempts
      if (pollAttemptRef.current > maxPollAttempts) {
        stopPolling();
        setStatus('expired');
        return;
      }

      try {
        const statusResult = await checkQRStatus(challengeId);
        setStatus(statusResult.status);

        if (statusResult.status === 'authorized') {
          // Stop polling immediately
          stopPolling();
        } else if (statusResult.status === 'expired') {
          stopPolling();
        }
      } catch (err: any) {
        console.error('Error checking QR status:', err);
        // Continue polling on error (will retry on next interval)
        // Exponential backoff is handled by the interval delay
      }
    };

    // Initial poll
    poll();

    // Set up interval polling (every 2 seconds)
    pollIntervalRef.current = setInterval(() => {
      poll();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPolling(false);
  };

  const handleAuthorized = async () => {
    if (!challengeId) return;

    try {
      const result = await confirmQRChallenge(challengeId);

      if (result.success && result.token) {
        // Save JWT token
        await setAuthToken(result.token);

        // Show success toast
        Alert.alert('Success', 'You are logged in.', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home screen
              navigation.replace('Home');
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to complete login');
        // Retry QR challenge
        initializeQRChallenge();
      }
    } catch (err: any) {
      console.error('Error confirming QR challenge:', err);
      Alert.alert('Error', err.message || 'Failed to complete login');
      // Retry QR challenge
      initializeQRChallenge();
    }
  };

  const handleExpired = () => {
    Alert.alert(
      'QR Code Expired',
      'The QR code has expired. Please generate a new one.',
      [
        {
          text: 'Generate New QR Code',
          onPress: initializeQRChallenge,
        },
      ]
    );
  };

  const handleRefresh = () => {
    stopPolling();
    initializeQRChallenge();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Generating QR code...</Text>
        </View>
      </View>
    );
  }

  if (error && !qrPayload) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryButton} onPress={initializeQRChallenge}>
            Try Again
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="qr-code" size={64} color="#25D366" />
        </View>

        <Text style={styles.title}>Desktop Login</Text>
        <Text style={styles.subtitle}>
          Scan this QR code with your mobile app to log in
        </Text>

        {qrPayload && (
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrPayload}
                size={250}
                color="#000000"
                backgroundColor="#FFFFFF"
                logo={undefined}
                logoSize={0}
                logoBackgroundColor="transparent"
                logoMargin={0}
                logoBorderRadius={0}
                quietZone={10}
              />
            </View>

            {status === 'pending' && polling && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color="#25D366" />
                <Text style={styles.statusText}>Waiting for scan...</Text>
              </View>
            )}

            {status === 'authorized' && (
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#25D366" />
                <Text style={[styles.statusText, styles.statusSuccess]}>
                  Authorized! Completing login...
                </Text>
              </View>
            )}

            {status === 'expired' && (
              <View style={styles.statusContainer}>
                <Ionicons name="time-outline" size={24} color="#ff4444" />
                <Text style={[styles.statusText, styles.statusError]}>
                  QR code expired
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.instructions}>
          1. Open the mobile app{'\n'}
          2. Tap "Scan QR Code"{'\n'}
          3. Point your camera at this QR code
        </Text>

        {(status === 'expired' || error) && (
          <Text style={styles.refreshButton} onPress={handleRefresh}>
            Generate New QR Code
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statusSuccess: {
    color: '#25D366',
    fontWeight: '600',
  },
  statusError: {
    color: '#ff4444',
  },
  instructions: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    fontSize: 16,
    color: '#25D366',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    fontSize: 16,
    color: '#25D366',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

