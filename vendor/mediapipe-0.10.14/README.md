# MediaPipe Tasks Vision 0.10.14 (vendored, unmodified)

- Source: npm `@mediapipe/tasks-vision@0.10.14` (vision_bundle.mjs and wasm/), Apache-2.0, (c) Google LLC.
- Model: `pose_landmarker_lite.task` from https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task (Apache-2.0).
- Used only by mirror-move.js (Move > Mirror mode), loaded after the user taps "Turn on camera". Everything runs on the device; no frame leaves the phone.
- Not in sw.js STATIC on purpose (about 24 MB); the browser HTTP cache keeps it after the first use.
- Do not hand-edit. To upgrade, replace the whole folder and update MP_BASE in mirror-move.js.
