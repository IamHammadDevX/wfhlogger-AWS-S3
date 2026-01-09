// API configuration utility for dynamic environment detection
export function getApiBase() {
  // In production, use the current origin
  if (typeof window !== 'undefined') {
    const { hostname, protocol, origin } = window.location;
    
    // Check if we're in production (not localhost/127.0.0.1)
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      if (hostname === 'tracker.vughy.com') {
        return 'https://backend-tracker.vughy.com';
      }
      return origin;
    }
  }
  
  // In development, use environment variable or fallback
  return import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';
}

export function getWebSocketBase() {
  const apiBase = getApiBase();
  
  // Convert HTTP to WS protocol for WebSocket connections
  if (apiBase.startsWith('https://')) {
    return apiBase.replace('https://', 'wss://');
  } else if (apiBase.startsWith('http://')) {
    return apiBase.replace('http://', 'ws://');
  }
  
  return apiBase;
}