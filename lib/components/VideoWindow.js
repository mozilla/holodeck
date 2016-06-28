import React from 'react';
import { observer } from 'mobx-react';

/**
 * A window representing a video stream.
 * The video may have
 */
@observer
export default class VideoWindow extends React.Component {
  static propTypes = {
    stream: React.PropTypes.instanceOf(MediaStream),
    muted: React.PropTypes.bool,
    isIdle: React.PropTypes.bool,
    stillFrame: React.PropTypes.string, // i.e. a data: URL
    detectedFace: React.PropTypes.object,
  };

  render () {
    let classes = ['VideoWindow'];
    classes.push(this.props.className);
    if (this.props.isIdle) {
      classes.push('idle');
    }

    let faceStyle = { display: 'none' };

    if (this.props.detectedFace) {
      let face = this.props.detectedFace;
      faceStyle = {
        left: face.left * 100 + '%',
        top: face.top * 100 + '%',
        width: face.width * 100 + '%',
        height: face.height * 125 + '%'
      };
    }

    let videoStyle = {};
    if (this.props.stillFrame) {
      videoStyle.background = 'url("' + this.props.stillFrame + '") center / cover no-repeat';
    }

    return (
      <div className={classes.join(' ')}>
        <div className="detectedFace" style={faceStyle}></div>
        <video
          autoPlay
          ref={(el) => this._element = el} />
        <div className="stillFrame" style={videoStyle}></div>
        {this.props.children || null}
        <div className="overlay"></div>
      </div>
    );
  }

  // We must update the <video> element with the proper source,
  // both on initial render and after the component is updated:

  componentDidMount() {
    this.update();
  }

  componentDidUpdate() {
    this.update();
  }

  update() {
    // Reassignment, even of the same object, causes a video glitch
    if (this._element.srcObject !== this.props.stream) {
      this._element.srcObject = this.props.stream;
    }
    this._element.muted = this.props.muted;
  }
}
