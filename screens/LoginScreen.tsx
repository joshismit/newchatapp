import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { login, setAuthToken, setUserId } from '../utils/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(phoneNumber.trim(), password);

      if (result.success && result.token && result.user) {
        // Store token and user ID
        await setAuthToken(result.token);
        await setUserId(result.user.id);

        // Navigate directly to conversations screen (WhatsApp-like flow)
        navigation.replace('Conversations');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Network error. Please check your connection and ensure the backend server is running.';
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = () => {
    // Mobile: Navigate to QR scanner
    navigation.navigate('QRScanner');
  };

  const handleDesktopLogin = () => {
    // Desktop/Web: Navigate to desktop login (QR code display)
    navigation.navigate('DesktopLogin');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles" size={80} color="#25D366" />
        </View>

        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="call-outline"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Mobile: Scan QR Code button */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.qrButton} onPress={handleScanQR}>
            <Ionicons name="qr-code-outline" size={20} color="#25D366" />
            <Text style={styles.qrButtonText}>Scan QR Code for Desktop Login</Text>
          </TouchableOpacity>
        )}

        {/* Desktop/Web: Show QR Code button */}
        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.qrButton} onPress={handleDesktopLogin}>
            <Ionicons name="qr-code-outline" size={20} color="#25D366" />
            <Text style={styles.qrButtonText}>Login with QR Code</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 48,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#25D366',
    fontSize: 14,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#25D366',
  },
  qrButtonText: {
    color: '#25D366',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

