import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { scanQRCode } from '../utils/api';
import { parseQRToken, isValidQRPayload } from '../utils/qrParser';
import { getUserId } from '../utils/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QRScannerScreenProps {
  userId?: string; // Optional prop - if passed, use it; otherwise get from storage
}

function QRScannerScreenContent({ userId: propUserId }: QRScannerScreenProps) {
  // Hooks must be called unconditionally
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  
  // Use camera permissions hook (will be handled by platform check below)
  const [permission, requestPermission] = useCameraPermissions();
  
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [navigationReady, setNavigationReady] = useState(false);
  
  // Check if navigation object is valid and has required methods
  const isNavigationValid = navigation && 
    typeof navigation === 'object' &&
    (typeof navigation.goBack === 'function' || 
     typeof navigation.dispatch === 'function' || 
     typeof navigation.navigate === 'function');
  
  // Safety check for navigation - ensure it exists before using
  // MUST be called before any early returns (Rules of Hooks)
  const goBack = useCallback(() => {
    if (!isNavigationValid || !navigationReady) {
      console.warn('Navigation not ready or invalid');
      return;
    }
    
    try {
      // Use CommonActions.dispatch as fallback if goBack doesn't work
      if (navigation.goBack && typeof navigation.goBack === 'function') {
        navigation.goBack();
        return;
      }
    } catch (goBackError) {
      console.warn('goBack() failed, trying CommonActions:', goBackError);
    }
    
    // Fallback: Use CommonActions to navigate back
    try {
      if (navigation.dispatch && typeof navigation.dispatch === 'function') {
        navigation.dispatch(CommonActions.goBack());
        return;
      }
    } catch (dispatchError) {
      console.warn('CommonActions.goBack() failed:', dispatchError);
    }
    
    // Last resort: navigate to Login screen
    try {
      if (navigation.navigate && typeof navigation.navigate === 'function') {
        navigation.navigate('Login');
        return;
      }
    } catch (navigateError) {
      console.warn('navigate() failed:', navigateError);
    }
    
    console.warn('All navigation methods failed');
  }, [navigation, isNavigationValid, navigationReady]);

  // Define loadUserId before useEffect (not a hook, so can be defined here)
  const loadUserId = async () => {
    if (propUserId) {
      setUserId(propUserId);
      return;
    }

    // Try to get userId from AsyncStorage (stored after mobile login)
    const storedUserId = await getUserId();
    if (storedUserId) {
      setUserId(storedUserId);
      return;
    }

    // If no userId found, user must be logged in first
    // In production, userId should always be available from auth context
  };

  // Wait for navigation to be ready
  useEffect(() => {
    if (isNavigationValid && isFocused) {
      // Small delay to ensure navigation is fully initialized
      const timer = setTimeout(() => {
        setNavigationReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Reset ready state if navigation becomes invalid
      setNavigationReady(false);
    }
  }, [isNavigationValid, isFocused]);

  useEffect(() => {
    // Get current user ID from stored token or props
    loadUserId();
  }, []);

  // Show loading state until navigation is ready
  // MUST be after all hooks (Rules of Hooks)
  if (!isNavigationValid || !navigationReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>
          {!isNavigationValid ? 'Initializing navigation...' : 'Loading scanner...'}
        </Text>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || scanning) return;
    
    // Validate navigation is ready
    if (!navigationReady || !isNavigationValid) {
      console.warn('Navigation not ready, cannot process QR code');
      return;
    }

    setScanned(true);
    setScanning(true);

    try {
      // Validate QR payload
      if (!isValidQRPayload(data)) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not valid for desktop login.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setScanning(false);
              },
            },
          ]
        );
        return;
      }

      // Parse token from QR data
      const token = parseQRToken(data);
      if (!token) {
        Alert.alert(
          'Error',
          'Could not extract token from QR code.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setScanning(false);
              },
            },
          ]
        );
        return;
      }

      // Get userId (should be from authenticated user context)
      // If not available, show error - user must be logged in first
      if (!userId) {
        Alert.alert(
          'Authentication Required',
          'Please log in first before scanning QR codes for desktop login.',
          [
            {
              text: 'OK',
              onPress: () => {
                goBack();
              },
            },
          ]
        );
        return;
      }

      await authorizeQRLogin(token, userId);
    } catch (error: any) {
      console.error('Error scanning QR code:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to scan QR code',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setScanning(false);
            },
          },
        ]
      );
    }
  };

  const authorizeQRLogin = async (token: string, userId: string) => {
    try {
      const result = await scanQRCode(token, userId);

      if (result.success) {
        Alert.alert(
          'Success',
          'Desktop login authorized successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Authorization Failed',
          result.error || 'Failed to authorize desktop login',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setScanning(false);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Network error occurred',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setScanning(false);
            },
          },
        ]
      );
    } finally {
      setScanning(false);
    }
  };

  // Platform check - camera not available on web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#25D366" />
          <Text style={styles.permissionTitle}>QR Scanner Not Available</Text>
          <Text style={styles.permissionText}>
            QR Scanner is only available on mobile devices. Please use the mobile app to scan QR codes.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={goBack}>
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Checking camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#25D366" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan QR codes for desktop login.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              try {
                const result = await requestPermission();
                if (!result.granted) {
                  Alert.alert(
                    'Permission Denied',
                    'Camera permission is required to scan QR codes. Please enable it in your device settings.',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error: any) {
                console.error('Error requesting camera permission:', error);
                Alert.alert(
                  'Error',
                  'Failed to request camera permission. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera permission is granted and navigation is ready - render camera
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onMountError={(error) => {
          console.error('Camera mount error:', error);
          Alert.alert(
            'Camera Error',
            'Failed to initialize camera. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => goBack(),
              },
            ]
          );
        }}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={goBack}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.closeButton} />
          </View>

          {/* Scanning area overlay */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanInstructions}>
              Position the QR code within the frame
            </Text>
          </View>

          {/* Bottom info */}
          <View style={styles.footer}>
            {scanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#25D366" />
                <Text style={styles.scanningText}>Authorizing...</Text>
              </View>
            )}
            {!scanning && (
              <Text style={styles.footerText}>
                Scan the QR code displayed on your desktop
              </Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    marginBottom: 30,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#25D366',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanInstructions: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanningText: {
    fontSize: 14,
    color: '#25D366',
    marginLeft: 10,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});

// Error Boundary Component
class QRScannerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('QRScannerScreen Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="alert-circle-outline" size={80} color="#ff6b6b" />
            <Text style={styles.permissionTitle}>Error Loading Scanner</Text>
            <Text style={styles.permissionText}>
              {this.state.error?.message || 'An error occurred. Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.permissionButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to ensure navigation context is available
export default function QRScannerScreen(props: QRScannerScreenProps) {
  return (
    <QRScannerErrorBoundary>
      <QRScannerScreenContent {...props} />
    </QRScannerErrorBoundary>
  );
}
