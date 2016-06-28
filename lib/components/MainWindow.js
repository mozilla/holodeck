import { observer } from 'mobx-react';
import React from 'react';
import RoomConnection from '../RoomConnection';
import Toolbar from './Toolbar';
import VideoWindow from './VideoWindow';
import LoadingPanel from './LoadingPanel';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

export default observer(function MainWindow ({ room }) {
  let classes = ['MainWindow', 'peer-count-' + room.peers.length];

  return (
    <div className={classes.join(' ')}>
      <LoadingPanel room={room} />
      <VideoWindow
        isIdle={room.isIdle}
        detectedFace={room.detectedFace}
        className="self-view"
        stream={room.stream}
        muted={true}>
        <Toolbar room={room} />
      </VideoWindow>
      <ReactCSSTransitionGroup transitionName="fade"
        transitionEnterTimeout={1000}
        transitionLeaveTimeout={1000}>
      {room.peers.map((peer, index) =>
        <VideoWindow
          isIdle={peer.isIdle}
          key={peer.address}
          className={['peer-view', 'index-' + index].join(' ')}
          stillFrame={peer.stillFrame}
          stream={peer.stream} />
      )}
      </ReactCSSTransitionGroup>
    </div>
  );
});
