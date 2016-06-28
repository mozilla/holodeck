let WebSocketServer = require('ws').Server;
let uuid = require('node-uuid');

// This server needs to accept connections, place them in the "room" the client
// chooses, and allow them to relay messages back and forth to others in that
// room. This is what's known as a "signaling server" in WebRTC land.

let server = new WebSocketServer({ port: 8001 });
let rooms = new Map();
let sockets = new Map();

class Connection {
  constructor (socket) {
    this.socket = socket;
    this.address = uuid.v4();
    this.rooms = [];
    this.socket.on('message', this.onmessage.bind(this));
    this.socket.on('close', this.onclose.bind(this));
    console.log(`Client.onopen(${this.address})`);
  }

  send (message) {
    this.socket.send(JSON.stringify(message));
  }

  onclose () {
    sockets.delete(this.address);
    this.rooms.forEach((room) => {
      room.removeConnection(this);
    });
    console.log(`Client.onclose(${this.address})`);
  }

  onmessage (message) {
    message = JSON.parse(message);
    switch (message.type) {
      case 'join':
        let room = rooms.get(message.roomId);
        if (!room) {
          room = new Room(message.roomId);
          rooms.set(message.roomId, room);
        }
        room.addConnection(this);
        this.rooms.push(room);
        break;
      case 'send':
        let recipient = sockets.get(message.address);
        if (recipient) {
          recipient.send({
            type: 'signaling',
            address: this.address,
            message: message.message
          });
        }
        break;
    }
  }
}

class Room {
  constructor (id) {
    this.id = id;
    this.connections = new Map(); // address -> connection
  }

  addConnection (conn) {
    this.broadcast({ type: 'joined', address: conn.address });
    this.connections.set(conn.address, conn);
    conn.send({
      type: 'joinSuccessful',
      address: conn.address,
      roomId: this.id,
      clients: [...this.connections.keys()]
    });
    console.log(`Room.addConnection(${conn.address})`);
  }

  removeConnection (conn) {
    this.connections.delete(conn.address);
    this.broadcast({ type: 'left', address: conn.address });
    console.log(`Room.removeConnection(${conn.address})`);
  }

  broadcast (message) {
    this.connections.forEach((conn) => {
      conn.send(message);
    });
  }
}

server.on('connection', (socket) => {
  let conn = new Connection(socket);
  sockets.set(conn.address, conn);
});
