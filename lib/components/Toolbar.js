import React from 'react';
import { observer } from 'mobx-react';

export default observer(function Toolbar ({ room }) {
  return (
    <div className="toolbar">
      <a className={room.audioEnabled ? 'enabled' : 'disabled'}
        onClick={(e) => {
          room.setAudioEnabled(!room.audioEnabled);
        }}><img src='/assets/audioIcon.svg' alt='Audio' />
      </a>
      <a className={room.videoEnabled ? 'enabled' : 'disabled'}
        onClick={(e) => {
          room.setVideoEnabled(!room.videoEnabled);
        }}><img src='/assets/videoIcon.svg' alt='Video' />
      </a>
    </div>
  );
});
