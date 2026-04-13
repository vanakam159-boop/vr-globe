# Problem Description
The goal is to create an engaging, visually appealing 3D "Seasons Wheel" game for mentally challenged children aiming to develop their cognitive skills (motor control, spatial awareness, and timing). 

## Technology Stack Validation
As specifically requested, this project will be built directly using **React** and **Three.js**. 
We will utilize Vite as the React bundler, and `@react-three/fiber` (the React renderer for Three.js) along with the core `three` library to handle all the 3D graphics, animations, and particle effects seamlessly within the React ecosystem.

## Game Design Concept: **"Seasons Wheel"**
1. **Controls (Keyboard to IOT Mapping):**
   - **Left Arrow:** Rotates the wheel left.
   - **Right Arrow:** Rotates the wheel right.
   - **Up Arrow:** Centers / Stops the wheel.
2. **Rewards & Character Animations:**
   When the board stops on a season, we trigger that season's built-in `Season Board.glb` character animations and spawn 3D particle effects (falling `snowflake.png` / floating `autumn.png`).

## Setup & Debug Mode (Free Look)
To easily handle the large ~270MB 3D model, we will add a **"Setup Mode UI"**:
1. **Free / Lock Toggle button:** Switches between the Default Game Camera (Locked) and a Free Look Camera (Orbit Controls).
2. **Transform Controls Info:** While in Free Look mode, an overlay will display the exact **Position (X/Y/Z)**, **Rotation Angles**, and **Scale** of the model. 
3. This setup mode will allow developers to pan around the Scene, establish the absolute perfect camera alignments, and easily fix any default positioning issues.

## User Review Required 
> [!IMPORTANT]
> The `Season Board.glb` file is very large (~270MB) so load times might be slightly higher on first boot. We will implement a React loading Suspense fallback to handle this smoothly.

## Proposed Changes

### Application Framework
- Initialize a React application: `npx -y create-vite@latest ./ --template react`.
- Install 3D dependencies: `npm install three @react-three/fiber @react-three/drei`.

### Core Components
#### [NEW] `src/App.jsx`
- Manages the Three.js Canvas and React state.
- Listens to global Keyboard events for the Arrow keys.

#### [NEW] `src/components/SetupOverlay.jsx`
- Displays the real-time Three.js vectors: `Position: [x,y,z]`, `Rotation: [x,y,z]`, `Scale`.
- Provides a button to toggle `Free Look` OrbitControls.

#### [NEW] `src/components/SeasonWheel.jsx`
- Loads `Season Board.glb` via Three.js GLTFLoader.
- Handles rotation logic controlled by the Arrow keys.
- Plays built-in 3D character animations on successful season match.

#### [NEW] `src/components/Effects.jsx`
- Renders Three.js particle materials using `snowflake.png` and `autumn.png`.

## Verification Plan
1. Initialize the project and install Three.js/React dependencies.
2. Render the Three.js Canvas and load the model.
3. Validate Setup UI successfully outputs the Three.js Transform vectors.
4. Verify the Arrow keys control the Spin/Halt logic properly.



