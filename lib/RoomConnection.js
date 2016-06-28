import { observable } from 'mobx';
import MotionDetector from './MotionDetector';
import PeerConnection from './PeerConnection';
import PermanentWebSocket from './PermanentWebSocket';

export default class RoomConnection {

  @observable status = 'disconnected';
  @observable address; // my socket ID
  @observable peers = [];
  @observable audioEnabled = true;
  @observable videoEnabled = true;
  @observable isIdle = false;
  @observable detectedFace = null;
  @observable stream = null;
  @observable connectionError = null;

  constructor ({ localStream, outgoingStream, roomName, serverUrl }) {
    this.audioEnabled = PersistentSettings.get('audioEnabled', true);
    this.videoEnabled = PersistentSettings.get('videoEnabled', true);
    this.stream = outgoingStream;
    this.localStream = localStream;
    this.audioTrack = outgoingStream.getAudioTracks()[0];
    this.videoTrack = outgoingStream.getVideoTracks()[0];
    this.audioTrack.enabled = this.audioEnabled;
    this.videoTrack.enabled = this.videoEnabled;

    let socket = new PermanentWebSocket(serverUrl);
    this.socket = socket;
    socket.onconnecting = () => {
      this.status = 'connecting';
    };
    socket.onconnect = () => {
      socket.send({ type: 'join', roomId: roomName });
      this.connectionError = null;
    };
    socket.onerror = (error) => {
      this.status = 'disconnected';
      this.connectionError = error;
    };
    socket.onmessage = (message) => {
      switch (message.type) {
        case 'joinSuccessful':
          this.address = message.address;
          this.status = 'connected';

          message.clients
            .filter((a) => a !== this.address)
            .forEach((address) => {
              let peer = new PeerConnection(socket, outgoingStream, address);
              peer.connect();
              this.peers.push(peer);
            });
          break;
        case 'joined':
          // Someone else joined. Be ready to accept an offer from them!
          this.peers.push(new PeerConnection(socket, outgoingStream, message.address));
          break;
        case 'left':
          for (let i = 0; i < this.peers.length; i++) {
            if (this.peers[i].address === message.address) {
              console.log("Removing peer.");
              this.peers[i].close();
              this.peers.splice(i, 1);
              break;
            }
          }
          break;
        case 'signaling':
          this.peers.forEach((peer) => {
            if (peer.address === message.address) {
              peer.handleSignalingMessage(message.message);
            }
          });
          break;
      }
    };

    let motionDetector = new MotionDetector(localStream);
    motionDetector.subscribe(({ still, face }) => {
      //console.log('Idle state change:', still, 'face:', face);
      this.detectedFace = face;
      //this.setIdleState(still && !face);
      this.setIdleState(still);
    });
  }

  connect () {
    this.socket.connect();
  }

  setIdleState (idle) {
    if (this.isIdle === idle) {
      return;
    }
    this.isIdle = idle;

    if (idle) {
      grabStillFrameFromVideoStream(this.localStream).then((stillFrame) => {
        this.peers.forEach((peer) => {
          peer.sendDirectMessage(JSON.stringify({
            type: 'idle',
            frame: stillFrame
          }));
        });
      });
      // Delay a bit here so that the receiving end has a chance to load the
      // still frame before pausing the video. Same for resuming.
      setTimeout(() => {
        this.audioTrack.enabled = false;
        this.videoTrack.enabled = false;
      }, 500);
    } else {
      this.audioTrack.enabled = this.audioEnabled;
      this.videoTrack.enabled = this.videoEnabled;
      setTimeout(() => {
        this.peers.forEach((peer) => {
          peer.sendDirectMessage(JSON.stringify({
            type: 'notIdle'
          }));
        });
      }, 500);
    }
  }

  setAudioEnabled (enabled) {
    this.audioEnabled = enabled;
    this.audioTrack.enabled = enabled;
    PersistentSettings.set('audioEnabled', enabled);
  }

  setVideoEnabled (enabled) {
    this.videoEnabled = enabled;
    this.videoTrack.enabled = enabled;
    PersistentSettings.set('videoEnabled', enabled);
  }
}

let PersistentSettings = {
  get: (key, defaultValue) => {
    let value = localStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value);
    } else {
      return defaultValue;
    }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function grabStillFrameFromVideoStream (stream) {
  return new Promise((resolve, reject) => {
    let videoElement = document.createElement('video');
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.play();
    videoElement.onloadeddata = () => {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    setTimeout(reject, 2000);
  });
}
