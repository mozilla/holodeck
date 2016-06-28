import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import MainWindow from './components/MainWindow';
import RoomConnection from './RoomConnection';

// To make the initial loading experience seem more fluid.
let SPLASH_SCREEN_MS = 1000;

// This is the main entry point. See comments below on the nested
// calls to `approveMedia()`.
approveMedia().then((localStream) => {
  approveMedia().then((outgoingStream) => {
    let room = new RoomConnection({
      roomName: location.hash || '#room',
      serverUrl: 'ws://' + location.hostname + ':8001',
      localStream: localStream,
      outgoingStream: outgoingStream
    });

    window.room = room; // for debugging

    ReactDOM.render(
      <MainWindow room={room} />,
      document.body.querySelector('#holodeck-container'));

    setTimeout(() => {
      room.connect();
    }, SPLASH_SCREEN_MS);
  });
});


// NOTES ON THE TWO CALLS TO approveMedia():
//
// Firefox doesn't support certain parts of the WebRTC Media Stream API,
// namely the ability to call "addTrack" and "removeTrack" on an
// RTCPeerConnection. If we had support for that, we'd be able to attach and
// detach the stream from the RTCPeerConnection when we go idle. Instead,
// we have to `disable` each track, which still sends black video frames
// across the connection (leading to some ~18KBps bandwidth, but much less
// than a real video stream).
//
// However, if we `disable` the tracks, we can't use the camera to detect
// motion (for coming back from 'idle') -- so we call approveMedia() twice,
// to get two independent streams. We use localStream as an always-on feed
// for motion detection, and we use outgoingStream when we need to pause/resume
// the outgoing video feed.

// For now, we require camera and microphone access. We might want to allow them
// to use Holodeck without approving access later. However, it seems that you
// can't connect to RTCPeerConnection peers without having a stream available.
function approveMedia() {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  }).then((stream) => {
    if (stream.getVideoTracks().length === 0 || stream.getAudioTracks().length === 0) {
      alert('Holodeck requires *both* camera and microphone access.');
      return approveMedia(); // Prompt them again.
    }
    return stream;
  }, (error) => {
    alert('You must have a camera and microphone to use Holodeck.');
  });
}
