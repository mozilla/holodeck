import { observer } from 'mobx-react';
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

export default observer(function LoadingPanel ({ room }) {
  let status = room.status;
  let peers = room.peers;

  let statusText = '';
  if (status === 'disconnected') {
    if (room.connectionError) {
      statusText = 'I’m having trouble connecting to the server.';
    } else {
      statusText = 'Disconnected.';
    }
  } else if (status === 'connecting') {
    // This usually only shows for a moment. Leaving it blank here makes the
    // UI loading screen seem a bit smoother.
    statusText = '';
  } else if (!peers.length) {
    statusText = 'Waiting for your friend...';
  } else {
    statusText = ''; // Connected! We'll see peers, so don't display a status.
  }

  return (
    <ReactCSSTransitionGroup component="div" className="LoadingPanel"
        transitionName="fade" transitionAppear={true} transitionAppearTimeout={1000}
        transitionEnter={false} transitionLeave={false}>

      <img src="/assets/logo-light.svg" className="holodeck-logo" />

      <ReactCSSTransitionGroup component="div" className="statusTextContainer"
          transitionName="fade"
          transitionAppear={true} transitionAppearTimeout={1000}
          transitionEnterTimeout={1000} transitionLeaveTimeout={1000}>
        <div key={statusText} className="statusText">{statusText}</div>
      </ReactCSSTransitionGroup>

    </ReactCSSTransitionGroup>
  );
});
