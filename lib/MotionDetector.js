import { Observable, ReplaySubject } from 'rxjs';
import deepEqual from 'deep-equal';
// Alas, the jsfeat node module isn't entirely suited for ES6 imports yet.
import jsfeat from 'jsfeat/build/jsfeat';
window.jsfeat = jsfeat;
require('jsfeat/cascades/bbf_face');

// How often we should compare video frames:
const DETECTION_INTERVAL_MS = 1000;

// The size of the video frame to be analyzed for motion, relative to the full video size:
const FRAME_SCALE = 0.5;

// The amount of pixels needed to change to consider the frames "moving":
const FRAME_MOTION_THRESHOLD = 2.0;

// How long to wait before triggering an "idle" event after seeing no motion:
const IDLE_MS = 10000;

/**
 * Observe the given video stream, yielding objects that describe detected
 * features of the video at intervals, such as face and motion detection.
 *
 * Emits objects like the following:
 *
 *   {
 *     still: false,
 *     face: detectedFaceRect|null
 *   }
 */
export default class MotionDetector extends ReplaySubject {
  constructor (stream) {
    super(1);
    let faceDetector = new FaceDetector();

    videoStreamToFrames(stream, FRAME_SCALE, DETECTION_INTERVAL_MS)
      .pairwise()
      .map((frames) => {
        return {
          still: calculateFrameDelta(frames[0], frames[1]) < FRAME_MOTION_THRESHOLD,
          face: faceDetector.detectFace(frames[1])
        };
      })
      .distinctUntilChanged(deepEqual)
      .debounce(({ still }) => still ? Observable.timer(IDLE_MS) : Observable.empty())
      .distinctUntilChanged(deepEqual) // After the debounce, we might not be distinct any more
      .subscribe(this);
  }
}

class FaceDetector {
  constructor () {
    jsfeat.bbf.prepare_cascade(jsfeat.bbf.face_cascade);
    this.matrix = null;
  }

  detectFace (imageData) {
    if (!this.matrix) {
      this.matrix = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
    }
    jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, this.matrix);
    jsfeat.imgproc.equalize_histogram(this.matrix, this.matrix)
    let pyr = jsfeat.bbf.build_pyramid(this.matrix, 24 * 2, 24 * 2, 4);
    let rects = jsfeat.bbf.detect(pyr, jsfeat.bbf.face_cascade);
    rects = jsfeat.bbf.group_rectangles(rects, 1);
    let rect = rects[0];
    return rect ? {
      left: rect.x / imageData.width,
      top: rect.y / imageData.height,
      width: rect.width / imageData.width,
      height: rect.height / imageData.height,
      confidence: rect.confidence
    } : null;
  }
}

let videoStreamToFrames = (stream, scale, interval) => new Observable((subscriber) => {
  if (!interval) throw new Error('interval is required');

  let videoElement = document.createElement('video');
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  videoElement.srcObject = stream;
  videoElement.muted = true;
  videoElement.play();

  function tick () {
    if (videoElement.videoWidth) {
      let width = videoElement.videoWidth * scale;
      let height = videoElement.videoHeight * scale;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(videoElement, 0, 0, width, height);
      subscriber.next(ctx.getImageData(0, 0, width, height));
    }
    intervalId = setTimeout(tick, interval);
  }
  let intervalId = setTimeout(tick, interval);

  function cancel () {
    clearTimeout(intervalId);
    videoElement.srcObject = null;
  }

  stream.addEventListener('ended', () => {
    subscriber.complete();
    cancel();
  });

  return cancel;
});

function calculateFrameDelta (a, b) {
  let totalDiff = 0;
  for (let i = 0; i < a.data.length; i++) {
    let diff = Math.abs(a.data[i] - b.data[i]);
    totalDiff += diff;
  }
  return totalDiff / a.data.length;
}
