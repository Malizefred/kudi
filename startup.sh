#!/bin/sh
# Revive entrypoint: start the preview if it is not already healthy.
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
cd /workspace
npm run dev > /tmp/kudi-dev.log 2>&1 &
exit 0
