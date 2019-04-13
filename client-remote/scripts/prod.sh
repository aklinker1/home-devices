#!/bin/bash

yarn build &&
cp index.html dist/ &&
node dist/index.js
