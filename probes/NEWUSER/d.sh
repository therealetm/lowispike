#!/bin/bash
# usage: d.sh PORT  (JS from stdin)
curl -s --max-time 280 --data-binary @- http://127.0.0.1:${1:-9301}/
