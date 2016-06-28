/**
 * A simple WebSocket wrapper that always reconnects upon disconnection.
 */
export default class PermanentWebSocket {
  RECONNECT_TIMEOUT = 5000;

  constructor (serverUrl) {
    this.serverUrl = serverUrl;
    // All of these are required callbacks. (You'll know; we'll throw.)
    this.onconnecting = null;
    this.onconnect = null;
    this.onerror = null;
    this.onmessage = null;
  }

  /**
   * Send a JSON message. No attempt is made to enqueue messages if the socket
   * is not currently connected. We could change that if we need it.
   */
  send (message) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    } else {
      console.warn('Dropping message due to lost connection:', message);
    }
  }

  connect () {
    this.onconnecting();
    this.webSocket = new WebSocket(this.serverUrl);
    this.webSocket.onopen = (event) => {
      this.onconnect();
    };
    this.webSocket.onclose = (event) => {
      setTimeout(() => {
        this.connect(); // Super-trivial reconnect logic here.
      }, this.RECONNECT_TIMEOUT);
    };
    this.webSocket.onerror = (event) => {
      this.onerror(event.error);
    };
    this.webSocket.onmessage = (event) => {
      let message = JSON.parse(event.data);
      this.onmessage(message);
    };
  }
}
