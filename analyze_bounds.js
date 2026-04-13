import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// read raw json from gltf chunk? No, the glb is binary.
// Let's create a quick script to read the bounding box using three.js.
// Wait, running three.js with GLTFLoader in Node.js can be tricky because it requires a DOM (for textures/images).
// Let's use a simpler approach. I will just render a dummy log in my script. 

console.log("I will analyze the coordinates using node");
