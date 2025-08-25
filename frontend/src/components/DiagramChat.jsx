import React, { useState, useEffect, useRef } from 'react';
import { chat, auth } from '../api';
import { useAuth } from '../contexts/AuthContext';

const DiagramChat = ({ diagramId, isOpen, onToggle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [websocket, setWebsocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Load initial messages when chat opens
  useEffect(() => {
    if (isOpen && diagramId && diagramId !== 'new') {
      loadMessages();
      connectWebSocket();
    }

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [isOpen, diagramId]);

  // Manual refresh function for when WebSocket fails
  const manualRefresh = async () => {
    if (diagramId && diagramId !== 'new') {
      console.log('🔄 Manually refreshing messages...');
      await loadMessages();
    }
  };

  const loadMessages = async () => {
    if (!diagramId || diagramId === 'new') {
      setMessages([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await chat.getMessages(diagramId);
      setMessages(response);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (error.response?.status === 403) {
        // Access denied - might be a new diagram or no access
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = async () => {
    if (!user || !diagramId || diagramId === 'new') {
      console.log('Skipping WebSocket connection for new diagram');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // For WebSocket connections, determine the correct backend URL
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // In development, try to connect to backend through the same host as the frontend
      let wsUrl;
      if (process.env.NODE_ENV === 'development') {
        // Use the same host as the current page but port 8000
        const backendHost = window.location.hostname;
        wsUrl = `${wsProtocol}//${backendHost}:8000/ws/diagram/${diagramId}?token=${token}`;
      } else {
        // In production, use configured backend URL
        const backendUrl = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.host}`;
        const backendHost = backendUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
        wsUrl = `${wsProtocol}//${backendHost}:8000/ws/diagram/${diagramId}?token=${token}`;
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('🔔 WebSocket message received:', data);
        
        if (data.type === 'chat_message') {
          console.log('💬 Processing chat message:', data.data);
          const newMsg = {
            id: data.data.id,
            message: data.data.message,
            username: data.data.user.username,
            user_id: data.data.user.id,
            created_at: data.data.created_at,
            is_edited: data.data.is_edited || false,
            reactions: data.data.reactions || {},
            reply_to: data.data.reply_to || null
          };
          
          // Add message to state - this will update the chat for all connected users
          setMessages(prev => {
            // Check if this is the sender's own message (replace temporary message)
            const tempIndex = prev.findIndex(msg => msg.is_sending && msg.user_id === data.data.user.id && msg.message === data.data.message);
            if (tempIndex !== -1) {
              // Replace temporary message with real message from server
              const updatedMessages = [...prev];
              updatedMessages[tempIndex] = newMsg;
              console.log('✅ Replaced temporary message with server message:', newMsg.id);
              return updatedMessages;
            }
            
            // Prevent duplicate messages by checking if message already exists
            const exists = prev.some(msg => msg.id === newMsg.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping duplicate:', newMsg.id);
              return prev;
            }
            
            console.log('✅ Adding new message to chat from other user:', newMsg);
            console.log('📊 Current messages count:', prev.length, '-> New count:', prev.length + 1);
            return [...prev, newMsg];
          });
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !diagramId || diagramId === 'new') return;

    try {
      setSending(true);
      
      if (editingMessage) {
        // Edit existing message
        const response = await chat.editMessage(diagramId, editingMessage.id, newMessage.trim());
        setMessages(prev => prev.map(msg => 
          msg.id === editingMessage.id ? {
            ...msg,
            message: response.message,
            is_edited: response.is_edited,
            updated_at: response.updated_at
          } : msg
        ));
        cancelEditing();
      } else {
        // Send new message
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          // Send via WebSocket
          console.log('🚀 Sending message via WebSocket:', newMessage.trim());
          
          // Add message to sender's chat immediately (optimistic update)
          const tempMessage = {
            id: 'temp_' + Date.now(), // Temporary ID until we get real ID from broadcast
            message: newMessage.trim(),
            username: user?.username || 'You',
            user_id: user?._id || 'current_user',
            created_at: new Date().toISOString(),
            is_edited: false,
            reactions: {},
            reply_to: replyingTo?.id || null,
            is_sending: true // Flag to indicate this is being sent
          };
          
          setMessages(prev => [...prev, tempMessage]);
          
          websocket.send(JSON.stringify({
            type: 'chat_message',
            data: {
              message: newMessage.trim(),
              message_type: 'text',
              reply_to: replyingTo?.id || null
            }
          }));
          
          console.log('⏳ Message sent via WebSocket, others will receive broadcast...');
        } else {
          // Fallback to HTTP API if WebSocket not available
          console.warn('WebSocket not connected, falling back to HTTP API');
          const response = await chat.sendMessage(
            diagramId, 
            newMessage.trim(), 
            'text', 
            replyingTo?.id || null
          );
          
          // Add message to sender's chat immediately (User1 sees their own message)
          setMessages(prev => [...prev, {
            id: response.id,
            message: response.message,
            username: response.username,
            user_id: response.user_id,
            created_at: response.created_at,
            is_edited: response.is_edited,
            reactions: response.reactions || {},
            reply_to: response.reply_to
          }]);
          
          // Note: Other users (User2, User3, etc.) will need to manually refresh or 
          // have their own refresh mechanism to see this message since WebSocket is not available
          console.log('💬 Message sent via HTTP API - other users may need to refresh to see it');
        }
        cancelReply();
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await chat.deleteMessage(diagramId, messageId);
      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const startEditing = (message) => {
    setEditingMessage(message);
    setNewMessage(message.message);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const startReply = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await chat.addReaction(diagramId, messageId, emoji);
      // Update local state - this will be replaced by WebSocket update
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...msg.reactions };
          if (!reactions[emoji]) reactions[emoji] = [];
          
          const userIndex = reactions[emoji].indexOf(user?.id);
          if (userIndex > -1) {
            reactions[emoji].splice(userIndex, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji].push(user?.id);
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return date.toLocaleDateString();
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'now';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-colors"
        title="Open Chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white border border-gray-300 rounded-lg shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium text-gray-800">Chat</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Real-time connected' : 'Offline - messages may be delayed'}></div>
          <span className="text-xs text-gray-500">{isConnected ? 'Live' : 'Offline'}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={manualRefresh}
            className="text-gray-400 hover:text-blue-500 transition-colors p-1"
            title="Refresh messages"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet</p>
            <p className="text-xs">Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.user_id === user?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                } ${message.is_sending ? 'opacity-60' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${
                    message.user_id === user?.id ? 'text-blue-100' : 'text-gray-600'
                  }`}>
                    {message.user_id === user?.id ? 'You' : message.username}
                  </span>
                  <div className="flex items-center space-x-1">
                    {message.is_sending ? (
                      <span className="text-xs text-gray-400">
                        Sending...
                      </span>
                    ) : (
                      <span className={`text-xs ${
                        message.user_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </span>
                    )}
                    {message.user_id === user?.id && !message.is_sending && (
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="text-xs opacity-70 hover:opacity-100"
                        title="Delete message"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <p>{message.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || diagramId === 'new'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || diagramId === 'new'}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DiagramChat;
