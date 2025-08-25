import { useEffect, useRef, useState } from 'react';

// Custom hook for Server-Sent Events
export const useSSE = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [readyState, setReadyState] = useState(0); // 0: CONNECTING, 1: OPEN, 2: CLOSED
  const eventSource = useRef(null);

  useEffect(() => {
    if (!url) return;

    console.log('[SSE] Connecting to:', url);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[SSE] No auth token found');
      setError('No authentication token');
      return;
    }

    // Create EventSource with auth header (if supported by browser)
    const urlWithAuth = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
    
    try {
      eventSource.current = new EventSource(urlWithAuth);
      
      eventSource.current.onopen = () => {
        console.log('[SSE] Connection opened');
        setReadyState(1);
        setError(null);
      };
      
      eventSource.current.onmessage = (event) => {
        console.log('[SSE] Message received:', event.data);
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          
          // Call custom message handler if provided
          if (options.onMessage) {
            options.onMessage(parsedData);
          }
        } catch (e) {
          console.error('[SSE] Error parsing message:', e);
        }
      };
      
      eventSource.current.onerror = (event) => {
        console.error('[SSE] Connection error:', event);
        setError('SSE connection error');
        setReadyState(2);
        
        // Retry connection after delay
        setTimeout(() => {
          if (eventSource.current?.readyState === EventSource.CLOSED) {
            console.log('[SSE] Attempting to reconnect...');
            setReadyState(0);
            // The useEffect will recreate the connection
          }
        }, 3000);
      };
      
    } catch (error) {
      console.error('[SSE] Error creating EventSource:', error);
      setError(error.message);
      setReadyState(2);
    }

    // Cleanup function
    return () => {
      console.log('[SSE] Cleaning up connection');
      if (eventSource.current) {
        eventSource.current.close();
        eventSource.current = null;
      }
      setReadyState(2);
    };
  }, [url]);

  return { data, error, readyState };
};

// SSE-based real-time communication hook for diagrams
export const useDiagramSSE = (diagramId, onMessage) => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? (process.env.REACT_APP_API_URL || 'http://localhost:8000')
    : ''; // Use relative URLs in development to utilize proxy

  const url = diagramId && diagramId !== 'new' 
    ? `${baseUrl}/sse/diagram/${diagramId}`
    : null;

  return useSSE(url, { onMessage });
};
