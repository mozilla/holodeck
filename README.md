# Project Holodeck

Connect two rooms with **always-on video**.
*A portal to another place.* This is a work in progress.

## Code Walkthrough

Holodeck provides one-on-one, always-on videoconferencing. This repository
contains (1) a web-based WebRTC client, and (2) a small node server that
allows clients to find each other.

(We currently use a publicly-provided STUN server, but we will need a separate
STUN/TURN server solution for broad deployment.)

### Architecture

The client uses React for view rendering, and mobx for connecting views with
application data. The build script transpiles code to ES6 (with some
experimental features like decorators). We assume clients are using a modern
browser that supports WebRTC.

#### Code Structure

- Start at `lib/index.js`, the entry point for the client.
  All client javascript lives in `lib/`, and gets compiled into
  one file, `holodeck.min.js`, by the build/watch script.
- Images and CSS files live in `assets/`.
- The signaling server lives in `server/`.

```
lib/components/ -- React components
lib/            -- Non-view JS modules
assets/         -- Images and CSS resources
server/         -- WebRTC signaling server
index.html      -- Client entry point (serve this directory)
holodeck.min.js -- The compiled client application
```

## Development Workflow

1. Run `npm install` the first time.
2. Run `npm run develop`.
3. Open your browser to <http://localhost:3000/>.

This launches three things at once:

- A Static HTTP server on port 3000
- The signaling server (a simple node server), i.e. the server that keeps
  track of rooms
- The build watching script, which rebuilds the project when files change

(You can run each of these independently; see `package.json`'s scripts.)

If you would like to serve Holodeck to someone else without using a cloud-based
server, you can use [SpaceKit](https://github.com/spacekit/spacekit) with a
configuration like the following:

```spacekit holodeck 3000 8001:8001```


---

License: [Mozilla Public License v2.0](LICENSE).
