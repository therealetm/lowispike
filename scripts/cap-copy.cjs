#!/usr/bin/env node
'use strict';
// Nov 3, 2026 (App Store prep): copies exactly the files the website publishes (scripts/site-files.cjs, the same list the
// GitHub Pages deploy uses) into www/, which Capacitor bundles into the iPhone app. Run through `npm run ios:sync`.
// No build step and no changes to the files: the app runs the same index.html as the website.
const fs = require('fs');
const path = require('path');
const { copy } = require('./site-files.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
const files = copy(root, out);
if (!files.includes('index.html')) { console.error('cap-copy: index.html missing from the site list'); process.exit(1); }
console.log('cap-copy: ' + files.length + ' site files -> www/');
