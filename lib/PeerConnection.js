import { observable } from 'mobx';

function playSound (src) {
  let audio = new Audio();
  audio.src = src;
  audio.play();
}

export default class PeerConnection {
  @observable status = 'waitingForOffer';
  @observable stream = null;
  @observable isIdle = false;
  @observable stillFrame = null;

  sendSignalingMessage (message) {
    this.socket.send({ type: 'send', address: this.address, message: message });
  }

  sendDirectMessage (message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
    }
  }

  handleSignalingMessage (message) {
    switch (message.type) {
      case 'ice':
        this.rtc.addIceCandidate(new RTCIceCandidate(message.candidate));
        break;
      case 'answer':
        this.rtc.setRemoteDescription(message.answer);
        break;
      case 'offer':
        this.rtc.setRemoteDescription(message.offer);
        this.rtc.createAnswer().then((answer) => {
          this.rtc.setLocalDescription(answer);
          this.sendSignalingMessage({ type: 'answer', answer: answer });
        });
        break;
    }
  }

  constructor (socket, localStream, address) {
    this.socket = socket;
    this.address = address;

    this.rtc = new RTCPeerConnection({
      'iceServers': [
        { 'urls': ['stun:stun.l.google.com:19302'] }
      ]
    });

    this.rtc.addStream(localStream);

    this.rtc.oniceconnectionstatechange = (event) => {
      switch (this.rtc.iceConnectionState) {
        case 'connected':
          this.status = 'connected';
          playSound('/assets/enter.mp3');
          break;
        case 'disconnected':
          this.status = 'disconnected';
          // it may reconnect!
          break;
        case 'failed':
        case 'closed':
          this.status = 'disconnected';
          playSound('/assets/exit.mp3');
          break;
      }
    };

    this.rtc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({ type: 'ice', candidate: event.candidate });
      }
    };

    this.rtc.ontrack = (event) => {
      if (event.track.kind === 'video') {
        this.stream = event.streams[0];
      }
    };

    this.rtc.ondatachannel = (event) => {
      this.setDataChannel(event.channel);
    };
  }

  close () {
    this.rtc.close();
  }

  setDataChannel (dataChannel) {
    // I wanted to only store the channel in onopen, but Chrome GC's it if we wait:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=405545
    this.dataChannel = dataChannel;
    dataChannel.onopen = () => {
      console.log('Data channel opened or reestablished.', dataChannel);
    };
    dataChannel.onmessage = (e) => {
      let message = JSON.parse(e.data);
      if (message.type === 'idle') {
        this.stillFrame = message.frame;
        this.isIdle = true;
      } else if (message.type === 'notIdle') {
        this.stillFrame = null;
        this.isIdle = false;
      }
    };
  }

  connect () {
    this.status = 'connecting';
    this.setDataChannel(this.rtc.createDataChannel('idledata'));
    this.rtc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    }).then((offer) => {
      this.rtc.setLocalDescription(offer);
      this.sendSignalingMessage({ type: 'offer', offer: offer });
    });

  }
}
