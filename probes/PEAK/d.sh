#!/bin/bash
curl -s -m ${T:-180} -X POST --data-binary @"$1" http://127.0.0.1:9333/
