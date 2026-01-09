/**
 * Improved 3D Avatar with Better Proportions
 * Uses React Three Fiber for realistic 3D rendering
 * Now supports precise body measurements for accurate clothing fit
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useState, useRef } from 'react';

/**
 * Parse measurement string to numeric value in meters
 * Supports formats like: "5'10\"", "178cm", "70in", "1.78m"
 */
function parseMeasurement(measurement, defaultValue = 0) {
  if (!measurement) return defaultValue;
  
  const str = String(measurement).trim().toLowerCase();
  
  // Handle feet and inches: 5'10" or 5'10
  const feetMatch = str.match(/(\d+)'(\d+)/);
  if (feetMatch) {
    const feet = parseInt(feetMatch[1]);
    const inches = parseInt(feetMatch[2]);
    return ((feet * 12) + inches) * 0.0254; // Convert to meters
  }
  
  // Handle inches: 70in or 70"
  const inchMatch = str.match(/(\d+\.?\d*)(?:in|")/);
  if (inchMatch) {
    return parseFloat(inchMatch[1]) * 0.0254; // Convert to meters
  }
  
  // Handle centimeters: 178cm
  const cmMatch = str.match(/(\d+\.?\d*)cm/);
  if (cmMatch) {
    return parseFloat(cmMatch[1]) * 0.01; // Convert to meters
  }
  
  // Handle meters: 1.78m or just 1.78
  const mMatch = str.match(/(\d+\.?\d*)m?/);
  if (mMatch) {
    const value = parseFloat(mMatch[1]);
    // If value is > 10, assume it's in cm
    return value > 10 ? value * 0.01 : value;
  }
  
  return defaultValue;
}

/**
 * Calculate body proportions from measurements
 */
function calculateProportions(userProfile) {
  // Default proportions for average adult (1.75m / 5'9")
  const defaults = {
    height: 1.75,
    shoulderWidth: 0.45,
    chestCircumference: 0.96,
    waistCircumference: 0.81,
    hipCircumference: 0.99,
    inseam: 0.81,
    armLength: 0.61,
    neckCircumference: 0.38,
    torsoLength: 0.66
  };
  
  if (!userProfile) return defaults;
  
  const height = parseMeasurement(userProfile.height, defaults.height);
  const shoulderWidth = parseMeasurement(userProfile.shoulder_width, defaults.shoulderWidth);
  const chestCirc = parseMeasurement(userProfile.chest_circumference, defaults.chestCircumference);
  const waistCirc = parseMeasurement(userProfile.waist_circumference, defaults.waistCircumference);
  const hipCirc = parseMeasurement(userProfile.hip_circumference, defaults.hipCircumference);
  const inseam = parseMeasurement(userProfile.inseam, defaults.inseam);
  const armLength = parseMeasurement(userProfile.arm_length, defaults.armLength);
  const neckCirc = parseMeasurement(userProfile.neck_circumference, defaults.neckCircumference);
  const torsoLength = parseMeasurement(userProfile.torso_length, defaults.torsoLength);
  
  // Calculate derived dimensions
  // Chest/waist/hip widths from circumference (approximate as ellipse)
  const chestWidth = chestCirc / Math.PI;
  const waistWidth = waistCirc / Math.PI;
  const hipWidth = hipCirc / Math.PI;
  const neckRadius = neckCirc / (2 * Math.PI);
  
  return {
    height,
    shoulderWidth,
    chestWidth,
    waistWidth,
    hipWidth,
    inseam,
    armLength,
    neckRadius,
    torsoLength
  };
}

function HumanoidAvatar({ rotation, zoom, clothing, userProfile }) {
  const groupRef = useRef();
  
  // Calculate proportions from user measurements
  const props = calculateProportions(userProfile);
  
  // Scale factor to normalize to viewport
  const scale = 1.0;
  
  // Calculate body part positions and sizes based on measurements
  const headRadius = 0.13;
  const headY = props.height - headRadius;
  
  const neckHeight = 0.1;
  const neckY = headY - headRadius - (neckHeight / 2);
  
  // Torso dimensions
  const torsoHeight = props.torsoLength;
  const torsoY = neckY - (neckHeight / 2) - (torsoHeight / 2);
  const torsoWidth = props.chestWidth * 0.5;
  const torsoDepth = props.chestWidth * 0.3;
  
  // Shoulders
  const shoulderRadius = 0.08;
  const shoulderY = torsoY + (torsoHeight / 2) - 0.05;
  const shoulderX = props.shoulderWidth / 2;
  
  // Arms
  const upperArmLength = props.armLength * 0.5;
  const lowerArmLength = props.armLength * 0.5;
  const armRadius = 0.05;
  const upperArmY = shoulderY - (upperArmLength / 2);
  const lowerArmY = upperArmY - (upperArmLength / 2) - (lowerArmLength / 2);
  
  // Hips
  const hipHeight = 0.15;
  const hipY = torsoY - (torsoHeight / 2) - (hipHeight / 2);
  const hipTopRadius = props.waistWidth * 0.5;
  const hipBottomRadius = props.hipWidth * 0.5;
  
  // Legs
  const upperLegLength = props.inseam * 0.55;
  const lowerLegLength = props.inseam * 0.45;
  const thighRadius = props.hipWidth * 0.13;
  const calfRadius = thighRadius * 0.85;
  const legSpacing = props.hipWidth * 0.25;
  
  const upperLegY = hipY - (hipHeight / 2) - (upperLegLength / 2);
  const kneeY = upperLegY - (upperLegLength / 2);
  const lowerLegY = kneeY - (lowerLegLength / 2);
  
  // Feet
  const footY = lowerLegY - (lowerLegLength / 2) - 0.02;

  return (
    <group ref={groupRef} rotation-y={rotation * (Math.PI / 180)} scale={scale}>
      {/* Head */}
      <mesh position={[0, headY, 0]}>
        <sphereGeometry args={[headRadius, 32, 32]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, neckY, 0]}>
        <cylinderGeometry args={[props.neckRadius, props.neckRadius, neckHeight, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Torso */}
      <mesh position={[0, torsoY, 0]}>
        <boxGeometry args={[torsoWidth, torsoHeight, torsoDepth]} />
        <meshStandardMaterial 
          color="#9b87f5" 
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Left Shoulder */}
      <mesh position={[-shoulderX, shoulderY, 0]}>
        <sphereGeometry args={[shoulderRadius, 16, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Right Shoulder */}
      <mesh position={[shoulderX, shoulderY, 0]}>
        <sphereGeometry args={[shoulderRadius, 16, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Left Arm Upper */}
      <mesh position={[-shoulderX, upperArmY, 0]} rotation-z={0.1}>
        <cylinderGeometry args={[armRadius, armRadius, upperArmLength, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Right Arm Upper */}
      <mesh position={[shoulderX, upperArmY, 0]} rotation-z={-0.1}>
        <cylinderGeometry args={[armRadius, armRadius, upperArmLength, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Left Arm Lower */}
      <mesh position={[-shoulderX - 0.03, lowerArmY, 0]}>
        <cylinderGeometry args={[armRadius * 0.8, armRadius * 0.8, lowerArmLength, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Right Arm Lower */}
      <mesh position={[shoulderX + 0.03, lowerArmY, 0]}>
        <cylinderGeometry args={[armRadius * 0.8, armRadius * 0.8, lowerArmLength, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Hips */}
      <mesh position={[0, hipY, 0]}>
        <cylinderGeometry args={[hipTopRadius, hipBottomRadius, hipHeight, 16]} />
        <meshStandardMaterial color="#9b87f5" transparent opacity={0.3} />
      </mesh>

      {/* Left Leg Upper */}
      <mesh position={[-legSpacing, upperLegY, 0]}>
        <cylinderGeometry args={[thighRadius, thighRadius * 0.9, upperLegLength, 16]} />
        <meshStandardMaterial color="#9b87f5" transparent opacity={0.3} />
      </mesh>

      {/* Right Leg Upper */}
      <mesh position={[legSpacing, upperLegY, 0]}>
        <cylinderGeometry args={[thighRadius, thighRadius * 0.9, upperLegLength, 16]} />
        <meshStandardMaterial color="#9b87f5" transparent opacity={0.3} />
      </mesh>

      {/* Left Knee */}
      <mesh position={[-legSpacing, kneeY, 0]}>
        <sphereGeometry args={[thighRadius * 0.9, 16, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Right Knee */}
      <mesh position={[legSpacing, kneeY, 0]}>
        <sphereGeometry args={[thighRadius * 0.9, 16, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Left Leg Lower */}
      <mesh position={[-legSpacing, lowerLegY, 0]}>
        <cylinderGeometry args={[calfRadius, calfRadius * 0.9, lowerLegLength, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Right Leg Lower */}
      <mesh position={[legSpacing, lowerLegY, 0]}>
        <cylinderGeometry args={[calfRadius, calfRadius * 0.9, lowerLegLength, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>

      {/* Left Foot */}
      <mesh position={[-legSpacing, footY, 0.03]}>
        <boxGeometry args={[0.08, 0.04, 0.12]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>

      {/* Right Foot */}
      <mesh position={[legSpacing, footY, 0.03]}>
        <boxGeometry args={[0.08, 0.04, 0.12]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>

      {/* Clothing Overlays (if provided) */}
      {clothing?.top && (
        <mesh position={[0, torsoY, torsoDepth / 2 + 0.01]}>
          <planeGeometry args={[torsoWidth + 0.05, torsoHeight + 0.1]} />
          <meshStandardMaterial 
            map={clothing.top}
            transparent
            alphaTest={0.1}
          />
        </mesh>
      )}

      {clothing?.bottom && (
        <mesh position={[0, upperLegY - 0.1, torsoDepth / 2 + 0.01]}>
          <planeGeometry args={[props.hipWidth * 0.6, upperLegLength + lowerLegLength]} />
          <meshStandardMaterial 
            map={clothing.bottom}
            transparent
            alphaTest={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

export default function Avatar3D({ rotation = 0, zoom = 1, clothing = {}, interactive = true, userProfile = null }) {
      </mesh>

export default function Avatar3D({ rotation = 0, zoom = 1, clothing = {}, interactive = true, userProfile = null }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      camera={{ position: [0, 1, 3], fov: 50 }}
    >
      <PerspectiveCamera makeDefault position={[0, 1, 3 / zoom]} />
      
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 3, 0]} intensity={0.3} />

      {/* Avatar with user measurements */}
      <HumanoidAvatar rotation={rotation} zoom={zoom} clothing={clothing} userProfile={userProfile} />

      {/* Controls */}
      {interactive && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={2 * Math.PI / 3}
        />
      )}
    </Canvas>
  );
}
