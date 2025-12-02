# End-to-End Test Plan

This document outlines manual E2E test scenarios for the chat application.

## Prerequisites

1. Backend server running on `http://localhost:3000`
2. MongoDB connection configured
3. Expo app running (iOS/Android/Web)
4. Two test user accounts created
5. Postman or similar tool for API testing

## Test Environment Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run start:dev
```

### 2. Frontend Setup
```bash
npm install
npm start
```

### 3. Test Users
Create two test users via API or database:
- User A: `{ name: "Alice", phone: "+1234567890" }`
- User B: `{ name: "Bob", phone: "+0987654321" }`

## Test Scenarios

### Test 1: QR Login Flow

**Objective**: Verify desktop login via QR code scanning

**Steps**:
1. **Desktop Client (DesktopLoginScreen)**:
   - Open app on desktop/web
   - Navigate to DesktopLoginScreen
   - Verify QR code is displayed
   - Note the `challengeId` and `qrPayload` from console logs

2. **Mobile Client (QRScannerScreen)**:
   - Open app on mobile device
   - Ensure mobile user is logged in (has JWT token)
   - Navigate to QRScannerScreen
   - Scan QR code from desktop
   - Verify success message appears

3. **Desktop Client**:
   - Verify polling detects `status: 'authorized'`
   - Verify JWT token is received and stored
   - Verify navigation to Home screen
   - Verify "You are logged in" toast appears

**Expected Results**:
- ✅ QR code generated on desktop
- ✅ Mobile app successfully scans QR code
- ✅ Desktop receives JWT token
- ✅ Desktop navigates to Home screen

**Test Data**:
- Desktop user: Not logged in initially
- Mobile user: Already logged in with valid JWT

---

### Test 2: Send/Receive Messages via SSE

**Objective**: Verify real-time message delivery via Server-Sent Events

**Prerequisites**:
- Both users logged in
- SSE connection established
- Conversation exists between users

**Steps**:

1. **Setup**:
   - User A logs in (mobile or desktop)
   - User B logs in (mobile or desktop)
   - Create conversation between User A and User B
   - Open ChatScreen for both users

2. **Send Message (User A)**:
   - Type message: "Hello, this is a test message"
   - Tap send button
   - Verify message appears in User A's chat immediately
   - Verify message status shows "sending" then "sent"

3. **Receive Message (User B)**:
   - Verify message appears in User B's chat via SSE
   - Verify message shows correct sender name
   - Verify message timestamp is correct

4. **Send Reply (User B)**:
   - Type reply: "Hi! Message received"
   - Tap send button
   - Verify User A receives message via SSE

5. **Verify SSE Connection**:
   - Check console logs for SSE events
   - Verify `message:new` events are received
   - Verify messages are stored locally

**Expected Results**:
- ✅ Messages sent appear immediately in sender's UI
- ✅ Messages received via SSE appear in recipient's UI
- ✅ No page refresh needed
- ✅ Messages persist after app restart
- ✅ SSE connection remains stable

**Test Data**:
- Conversation ID: `conv_test_123`
- Messages: Multiple messages with different lengths
- Timing: Send messages rapidly to test queue

---

### Test 3: Archive Conversation

**Objective**: Verify conversation archiving and unarchiving functionality

**Prerequisites**:
- User logged in
- At least one conversation exists

**Steps**:

1. **Archive Conversation**:
   - Open ConversationsListScreen
   - Verify conversation is visible
   - Long-press on conversation item
   - Verify "Archive this conversation?" alert appears
   - Tap "Archive"
   - Verify conversation disappears from list

2. **View Archived Conversations**:
   - Tap archive icon in header
   - Navigate to ArchivedScreen
   - Verify archived conversation appears in list

3. **Unarchive Conversation**:
   - Long-press on archived conversation
   - Verify "Unarchive this conversation?" alert appears
   - Tap "Unarchive"
   - Verify conversation disappears from archived list
   - Navigate back to ConversationsListScreen
   - Verify conversation reappears in main list

4. **Verify API Calls**:
   - Check network tab for `PATCH /conversations/:id/archive`
   - Verify request body: `{ archive: true }` or `{ archive: false }`
   - Verify response: `{ success: true, archived: true/false }`

**Expected Results**:
- ✅ Conversation can be archived via long-press
- ✅ Archived conversation appears in ArchivedScreen
- ✅ Conversation can be unarchived
- ✅ Unarchived conversation returns to main list
- ✅ API calls are correct

**Test Data**:
- Conversation ID: `conv_test_456`
- User ID: Current logged-in user

---

### Test 4: Offline Queue and Sync

**Objective**: Verify messages are queued when offline and synced when online

**Prerequisites**:
- User logged in
- Conversation exists

**Steps**:

1. **Go Offline**:
   - Enable airplane mode or disable network
   - Verify app detects offline status

2. **Send Messages While Offline**:
   - Open ChatScreen
   - Send message: "This is an offline message"
   - Verify message shows "queued" status (cloud icon)
   - Send multiple messages
   - Verify all messages show "queued" status

3. **Go Online**:
   - Disable airplane mode or enable network
   - Verify app detects online status
   - Wait for queue flush (check console logs)

4. **Verify Sync**:
   - Verify queued messages change status: queued → sending → sent
   - Verify messages are sent to server
   - Verify server responses reconcile with local messages
   - Verify message IDs are updated (temp_* → server ID)

5. **Verify Persistence**:
   - Restart app
   - Verify messages are still present
   - Verify correct statuses are shown

**Expected Results**:
- ✅ Messages queued when offline
- ✅ Queue flushed automatically on reconnect
- ✅ Messages sent successfully after reconnect
- ✅ Status updates correctly
- ✅ Messages persist after restart

**Test Data**:
- Messages: 3-5 messages sent while offline
- Network: Toggle airplane mode

---

### Test 5: Message Status Updates

**Objective**: Verify message status updates (delivered/read) via SSE

**Prerequisites**:
- Two users logged in
- Conversation exists
- SSE connections established

**Steps**:

1. **Send Message (User A)**:
   - Send message: "Status test message"
   - Verify status shows "sent"

2. **Receive Message (User B)**:
   - Verify message received
   - Open ChatScreen (triggers delivered status)
   - Verify User A sees "delivered" status

3. **Read Message (User B)**:
   - Mark message as read (or auto-read when viewed)
   - Verify User A sees "read" status (green checkmark)

4. **Verify SSE Events**:
   - Check console for `message:status` events
   - Verify events contain: `messageId`, `status`, `userId`

**Expected Results**:
- ✅ Status updates from "sent" → "delivered" → "read"
- ✅ Status updates received via SSE
- ✅ UI reflects correct status icons
- ✅ Status persists after app restart

---

## Test Checklist

### QR Login Flow
- [ ] QR code generated on desktop
- [ ] QR code scannable by mobile
- [ ] Mobile successfully authorizes
- [ ] Desktop receives JWT token
- [ ] Desktop navigates to Home

### Send/Receive Messages
- [ ] Messages sent appear immediately
- [ ] Messages received via SSE
- [ ] Messages persist locally
- [ ] SSE connection stable
- [ ] Multiple messages handled correctly

### Archive Conversation
- [ ] Conversation can be archived
- [ ] Archived conversation appears in ArchivedScreen
- [ ] Conversation can be unarchived
- [ ] API calls correct

### Offline Queue
- [ ] Messages queued when offline
- [ ] Queue flushed on reconnect
- [ ] Messages sent after reconnect
- [ ] Status updates correctly
- [ ] Messages persist

### Message Status
- [ ] Status updates via SSE
- [ ] Delivered status works
- [ ] Read status works
- [ ] UI reflects correct status

## Test Execution Log

| Test # | Test Name | Status | Notes | Date |
|--------|-----------|--------|-------|------|
| 1 | QR Login Flow | ⬜ | | |
| 2 | Send/Receive Messages | ⬜ | | |
| 3 | Archive Conversation | ⬜ | | |
| 4 | Offline Queue | ⬜ | | |
| 5 | Message Status | ⬜ | | |

## Known Issues

- List any known issues or limitations here

## Test Environment

- **Backend**: `http://localhost:3000`
- **Frontend**: Expo app
- **Platform**: iOS/Android/Web
- **Database**: MongoDB
- **Date**: [Date of testing]

## Notes

- All tests should be performed on both iOS and Android if possible
- Test with different network conditions (WiFi, cellular, slow connection)
- Test with multiple concurrent users
- Verify error handling for edge cases

