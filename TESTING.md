# Testing Guide

This document provides instructions for running tests in the chat application.

## Test Setup

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test Suites

```bash
# Storage tests only
npm run test:storage

# API tests only
npm run test:api
```

## Test Structure

### Unit Tests

- **Location**: `services/__tests__/`, `utils/__tests__/`
- **Focus**: Individual functions and services
- **Mocks**: AsyncStorage, axios, NetInfo

### Integration Tests

- **Location**: `utils/__tests__/api.test.ts`
- **Focus**: API calls and message flow
- **Mocks**: axios, AsyncStorage

### E2E Tests

- **Location**: `E2E_TEST_PLAN.md`
- **Focus**: Manual testing scenarios
- **Tools**: Manual testing, Postman

## Test Files

### Storage Tests (`services/__tests__/storage.test.ts`)

Tests for:
- `saveConversation()` - Save messages
- `loadConversation()` - Load messages
- `appendMessage()` - Add single message
- `updateMessage()` - Update message status
- `getConversationsList()` - Get conversation list
- Token management
- User ID management
- `clearAll()` - Clear storage

**Run**: `npm run test:storage`

### API Tests (`utils/__tests__/api.test.ts`)

Tests for:
- `sendMessage()` - Send message API
- `getMessages()` - Fetch messages API
- Error handling
- Integration flow (optimistic → server response)

**Run**: `npm run test:api`

## E2E Test Plan

See `E2E_TEST_PLAN.md` for detailed manual testing scenarios:

1. **QR Login Flow** - Desktop login via QR code
2. **Send/Receive Messages** - Real-time messaging via SSE
3. **Archive Conversation** - Archive/unarchive functionality
4. **Offline Queue** - Queue and sync when offline
5. **Message Status** - Delivered/read status updates

## Writing New Tests

### Example: Storage Test

```typescript
describe('StorageService', () => {
  it('should save conversation', async () => {
    const messages = [/* ... */];
    await storageService.saveConversation('conv123', messages);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
```

### Example: API Test

```typescript
describe('sendMessage', () => {
  it('should send message successfully', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    const result = await sendMessage({ /* ... */ });
    expect(result.success).toBe(true);
  });
});
```

## Mocking

### AsyncStorage

Already mocked in `jest.setup.js`:
- `setItem`, `getItem`, `removeItem`
- `getAllKeys`, `multiGet`, `multiRemove`

### Axios

Mocked in test files:
- `mockPost` - POST requests
- `mockGet` - GET requests
- `mockCreate` - Axios instance creation

### NetInfo

Mocked in `jest.setup.js`:
- `fetch()` - Returns connectivity status
- `addEventListener()` - Network change listener

## Coverage Goals

- **Unit Tests**: > 80% coverage
- **Integration Tests**: Critical flows covered
- **E2E Tests**: All user journeys tested

## Continuous Integration

Tests should run on:
- Pull requests
- Before merging to main
- On deployment

## Troubleshooting

### Tests Failing

1. Clear Jest cache: `npm test -- --clearCache`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check mock setup in `jest.setup.js`

### AsyncStorage Mock Issues

If AsyncStorage mocks aren't working:
- Ensure `jest.setup.js` is loaded
- Check `setupFilesAfterEnv` in `package.json`

### Axios Mock Issues

If axios mocks aren't working:
- Verify mock setup in test file
- Check that `axios.create` is mocked correctly

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clear Mocks**: Use `beforeEach` to clear mocks
3. **Test Edge Cases**: Empty arrays, null values, errors
4. **Use Descriptive Names**: Test names should describe what they test
5. **Mock External Dependencies**: Don't make real API calls in tests

