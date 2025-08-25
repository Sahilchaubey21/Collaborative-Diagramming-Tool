# Real-time Chat Testing Guide

## Current Status
The real-time chat system has been implemented with WebSocket support. Here's how to test if it's working properly:

## Testing Steps

### 1. Basic Setup
1. Open the application at `http://localhost:3000`
2. Register/Login as User 1
3. Create a new diagram or open an existing one
4. Open the chat panel (click the chat button)
5. Check the status indicator:
   - 🟢 **Green dot + "Live"** = Real-time WebSocket connected
   - 🔴 **Red dot + "Offline"** = Not connected, messages may be delayed

### 2. Real-time Test (Two Browser Windows)
1. **Window 1**: Login as User 1, open diagram, open chat
2. **Window 2**: 
   - Open incognito/private window
   - Login as User 2 (different account)
   - Open the SAME diagram as User 1
   - Open chat

### 3. Send Messages
1. **User 1**: Type a message and send it
2. **User 2**: Check if the message appears IMMEDIATELY without:
   - Refreshing the page
   - Closing and reopening the chat
   - Clicking the refresh button

### 4. Expected Behavior
✅ **Working correctly**: Message from User 1 appears instantly in User 2's chat
❌ **Not working**: User 2 needs to refresh to see User 1's message

## Troubleshooting

### If messages don't appear in real-time:

1. **Check connection status**:
   - Look for green dot and "Live" status
   - If red dot/offline, WebSocket isn't connecting

2. **Manual refresh**:
   - Click the 🔄 refresh button in chat header
   - This will fetch latest messages via HTTP API

3. **Check browser console**:
   - Open DevTools (F12)
   - Look for WebSocket connection logs:
     ```
     🔔 WebSocket message received: {...}
     💬 Processing chat message: {...}
     ✅ Adding new message to chat: {...}
     ```

4. **Backend logs**:
   - Check Docker logs: `docker-compose logs backend`
   - Look for WebSocket connection and broadcast messages

## Current Implementation Details

### Frontend (`DiagramChat.jsx`):
- Connects to WebSocket when chat opens
- Listens for `chat_message` type broadcasts
- Updates chat in real-time when messages received
- Falls back to HTTP API if WebSocket unavailable
- Shows connection status with visual indicator

### Backend (`websocket.py`):
- Handles WebSocket connections per diagram
- Broadcasts chat messages to all connected users
- Saves messages to database
- Sends real-time updates to all participants

### Debug Endpoints:
- `GET /debug/websockets` - Shows active WebSocket connections
- `GET /health/websocket` - WebSocket health check

## Quick Test Command
```bash
# Check active WebSocket connections
curl -s http://localhost:8000/debug/websockets | jq
```

## Manual WebSocket Test
Use the `websocket_test.html` file in the project root for direct WebSocket testing.

---

**Note**: The real-time functionality should work automatically. If it doesn't, the system falls back to manual refresh, which is why the refresh button has been added to the chat header.
