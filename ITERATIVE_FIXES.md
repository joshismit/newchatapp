# Iterative Fixes & Improvements

When you need fixes or improvements, use these exact follow-ups:

## 1. QR Code Screen Blank Issue

**Prompt:**
```
The QR code screen shows blank — show smallest reproducible fix and explain why.
```

**Use this when:**
- QR code is not rendering on DesktopLoginScreen
- QR code appears as blank/white space
- QR code library is not working correctly

---

## 2. SSE Events Not Arriving

**Prompt:**
```
SSE events are not arriving on client — give diagnostics and fix, include server and client traces.
```

**Use this when:**
- Messages are not being received in real-time
- SSE connection appears to be established but no events arrive
- Server sends events but client doesn't receive them
- Need to debug SSE connection issues

---

## 3. FlatList Performance Optimization

**Prompt:**
```
Optimize message FlatList to handle 100k messages — refactor MessageBubble to avoid re-renders and implement getItemLayout; provide code only.
```

**Use this when:**
- Chat screen becomes slow with many messages
- Scrolling performance degrades
- Need to optimize FlatList for large datasets
- Message rendering causes performance issues

---

## 4. SQLite Migration

**Prompt:**
```
Refactor storage to use SQLite instead of AsyncStorage and provide migration steps.
```

**Use this when:**
- Need better query performance
- Want relational database features
- Need complex queries on local data
- Migrating from AsyncStorage to SQLite

---

## Usage Instructions

1. Copy the exact prompt from above
2. Paste it in a new conversation or message
3. The AI will provide the specific fix/improvement requested
4. Each prompt is designed to get a focused, actionable response

---

## Notes

- These prompts are optimized for this specific codebase
- Use them when encountering the described issues
- Each prompt targets a specific problem area
- Prompts are designed to get code-only or diagnostic responses as needed

