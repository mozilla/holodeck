#!/usr/bin/env bash

if [ "$1" == "watch" ]; then
  EXEC=watchify
else
  EXEC=browserify
fi
node_modules/.bin/$EXEC \
  -t [ \
    babelify \
      --presets [ es2015 react ] \
      --plugins [ \
        transform-decorators-legacy \
        transform-class-properties \
        transform-object-rest-spread \
        transform-async-to-generator ] \
      --sourceMaps true \
  ] \
  lib/index.js \
  -o holodeck.min.js

# XXX: use NODE_ENV=production to make non-debug react
