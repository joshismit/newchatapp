// Jest setup file
import '@testing-library/jest-native/extend-expect';

// Polyfill for expo-modules-core registerWebModule
if (typeof global !== 'undefined') {
  if (!global.expo) {
    global.expo = {};
  }
  if (!global.expo.modules) {
    global.expo.modules = {};
  }
  if (!global.expo.modules.core) {
    global.expo.modules.core = {
      registerWebModule: function() {
        return;
      }
    };
  }
}

// Mock axios - must be done before any imports
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockInterceptorsUse = jest.fn();

const mockAxiosInstance = {
  post: mockPost,
  get: mockGet,
  interceptors: {
    request: {
      use: mockInterceptorsUse,
    },
  },
};

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    __esModule: true,
    default: {
      ...actualAxios.default,
      create: jest.fn(() => mockAxiosInstance),
    },
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Export mocks for use in tests
global.mockAxiosPost = mockPost;
global.mockAxiosGet = mockGet;

// Note: AsyncStorage is mocked in individual test files to allow test-specific storage state

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => {
  return {
    __esModule: true,
    default: {
      fetch: jest.fn(() =>
        Promise.resolve({
          isConnected: true,
          isInternetReachable: true,
        })
      ),
      addEventListener: jest.fn(() => jest.fn()),
    },
  };
});

// Mock expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [null, jest.fn()]),
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

