import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629, // India center
};

// Convert lat/lng to 3D coordinates on sphere
// Three.js SphereGeometry maps textures with:
// - U (0-1): longitude from -180° (left) to +180° (right)
// - V (0-1): latitude from +90° (north, top) to -90° (south, bottom)
// - Y-axis is up (north pole at +Y, south pole at -Y)
// 
// Standard conversion using colatitude (phi) and adjusted longitude (theta):
// phi = (90 - lat) * π/180  (colatitude: 0 at north pole, π at south pole)
// theta = (lng + 180) * π/180  (longitude: 0 to 2π, starting at -180°)
//
// x = -radius * sin(phi) * cos(theta)
// y = radius * cos(phi)  (Y is up, matches north pole at +Y)
// z = radius * sin(phi) * sin(theta)
const latLngToVector3 = (lat, lng, radius = 2) => {
  // Convert to radians using colatitude
  const phi = (90 - lat) * (Math.PI / 180); // Colatitude: 0 at north pole, π at south pole
  const theta = (lng + 180) * (Math.PI / 180); // Longitude: -180° to +180° -> 0 to 2π
  
  // Spherical to Cartesian conversion matching Three.js texture mapping
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi); // Y-axis is up (north pole at +Y)
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

// Create great circle arc between two points using spherical interpolation
const createArc = (start, end, radius = 2.02, segments = 100) => {
  const points = [];
  // Normalize vectors to unit length
  const startNorm = start.clone().normalize();
  const endNorm = end.clone().normalize();
  
  // Calculate angle between vectors using dot product
  const dot = Math.max(-1, Math.min(1, startNorm.dot(endNorm)));
  const angle = Math.acos(dot);
  
  // Handle edge case: points are the same or very close
  if (angle < 0.0001) {
    for (let i = 0; i <= segments; i++) {
      points.push(startNorm.clone().multiplyScalar(radius));
    }
    return points;
  }
  
  // Spherical linear interpolation (slerp) for great circle
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const sinAngle = Math.sin(angle);
    const w1 = Math.sin((1 - t) * angle) / sinAngle;
    const w2 = Math.sin(t * angle) / sinAngle;
    
    // Interpolate on the sphere surface
    const interpolated = new THREE.Vector3(
      w1 * startNorm.x + w2 * endNorm.x,
      w1 * startNorm.y + w2 * endNorm.y,
      w1 * startNorm.z + w2 * endNorm.z
    ).normalize().multiplyScalar(radius);
    
    points.push(interpolated);
  }
  return points;
};

// Earth component - no rotation here, rotation is handled by parent group
function Earth({ textureUrl }) {

  // Create Earth texture - using a free Earth texture
  const earthTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    // Using a high-quality Earth texture
    // Earth textures are typically mapped with:
    // - U (horizontal): 0 = -180° (West), 1 = +180° (East)
    // - V (vertical): 0 = +90° (North), 1 = -90° (South)
    const texture = loader.load(
      textureUrl || "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
      undefined,
      (error) => {
        console.warn("Failed to load Earth texture:", error);
      }
    );
    return texture;
  }, [textureUrl]);

  return (
    <>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          emissive={new THREE.Color(0x000033)}
          emissiveIntensity={0.15}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      {/* Add atmospheric glow */}
      <mesh>
        <sphereGeometry args={[2.08, 32, 32]} />
        <meshBasicMaterial
          color={0x4488ff}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

// Route arc component - glowing curved line
function RouteArc({ start, end, color = 0x00ff88 }) {
  const points = useMemo(() => {
    const startVec = latLngToVector3(start.lat, start.lng, 2.02);
    const endVec = latLngToVector3(end.lat, end.lng, 2.02);
    return createArc(startVec, endVec, 2.02, 100);
  }, [start, end]);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(points);
    // Create a thicker, glowing tube for the route
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.03, 16, false);
    return tubeGeometry;
  }, [points]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={0.9}
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

// City marker component - glowing pulsing dots
function CityMarker({ position, label, color = 0xff4444, isOrigin = false }) {
  const markerRef = useRef();
  const glowRef = useRef();
  const groupRef = useRef();
  
  // Calculate 3D position from lat/lng - this must match Earth texture mapping
  const vec3 = useMemo(() => {
    const pos = latLngToVector3(position.lat, position.lng, 2.03);
    console.log(`📍 Marker ${label}: lat=${position.lat}, lng=${position.lng}, pos=(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`);
    return pos;
  }, [position.lat, position.lng, label]);
  
  useEffect(() => {
    let animationId;
    const animate = () => {
      if (markerRef.current && glowRef.current) {
        const time = Date.now() * 0.003;
        const scale = 1 + Math.sin(time) * 0.3;
        const glowScale = 0.1 + Math.sin(time) * 0.5;
        markerRef.current.scale.set(scale, scale, scale);
        glowRef.current.scale.set(glowScale, glowScale, glowScale);
        if (glowRef.current.material) {
          glowRef.current.material.opacity = 0.1 + Math.sin(time) * 0.3;
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <group position={vec3}>
      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Main glowing sphere */}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
        />
      </mesh>
      {/* Inner core for brightness */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Label with better styling */}
      <Html distanceFactor={8} position={[0, 0.2, 0]} center>
        <div className="bg-black bg-opacity-80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-400 shadow-lg">
          {label}
        </div>
      </Html>
    </group>
  );
}

// Earth group component - rotates all children with the Earth
function EarthGroup({ children, rotationY }) {
  return (
    <group rotation={[0, rotationY, 0]}>
      {children}
    </group>
  );
}

// Main globe scene
function GlobeScene({ origin, destination, originCoords, destCoords, orderCity, customerCity }) {
  const controlsRef = useRef();
  const [earthRotation, setEarthRotation] = useState(0);

  // Determine coordinates
  const startCoords = useMemo(() => {
    if (originCoords && originCoords.lat !== undefined && originCoords.lng !== undefined) {
      return { lat: originCoords.lat, lng: originCoords.lng };
    }
    // Default to Mumbai if not provided
    return { lat: 19.0760, lng: 72.8777 };
  }, [originCoords]);

  const endCoords = useMemo(() => {
    if (destCoords && destCoords.lat !== undefined && destCoords.lng !== undefined) {
      return { lat: destCoords.lat, lng: destCoords.lng };
    }
    // Default to Delhi if not provided
    return { lat: 28.6139, lng: 77.2090 };
  }, [destCoords]);

  // Earth rotation animation
  useEffect(() => {
    let animationId;
    const animate = () => {
      setEarthRotation(prev => prev + 0.0005);
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Debug: Log coordinates to verify they're correct
  useEffect(() => {
    const originVec = latLngToVector3(startCoords.lat, startCoords.lng);
    const destVec = latLngToVector3(endCoords.lat, endCoords.lng);
    console.log("🌍 Globe Coordinates:", {
      origin: startCoords,
      destination: endCoords,
      originVec: { x: originVec.x.toFixed(3), y: originVec.y.toFixed(3), z: originVec.z.toFixed(3) },
      destVec: { x: destVec.x.toFixed(3), y: destVec.y.toFixed(3), z: destVec.z.toFixed(3) }
    });
  }, [startCoords, endCoords]);

  return (
    <>
      {/* Ambient light for soft glow */}
      <ambientLight intensity={0.5} color={0x4488ff} />
      {/* Main directional light (sun) - simulating sunlight from space */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        color={0xffffff}
      />
      {/* Additional fill light for better Earth illumination */}
      <directionalLight
        position={[-5, -5, -5]}
        intensity={0.3}
        color={0x4488ff}
      />
      
      {/* Stars background - more stars for cinematic effect */}
      <Stars radius={300} depth={100} count={8000} factor={6} saturation={0} fade speed={0.5} />
      
      {/* Earth group - rotates Earth, route, markers, and lights together */}
      <EarthGroup rotationY={earthRotation}>
        {/* Earth */}
        <Earth />
        
        {/* Route arc */}
        <RouteArc start={startCoords} end={endCoords} color={0x00ff88} />
        
        {/* City markers - positioned on Earth surface, rotate with Earth */}
        <CityMarker
          position={startCoords}
          label={orderCity || "Origin"}
          color={0x00ff88}
          isOrigin={true}
        />
        <CityMarker
          position={endCoords}
          label={customerCity || "Destination"}
          color={0xff4444}
          isOrigin={false}
        />
        
        {/* Point lights for city markers - must be inside EarthGroup to rotate with markers */}
        <pointLight 
          position={latLngToVector3(startCoords.lat, startCoords.lng, 2.1).toArray()} 
          intensity={3} 
          color={0x00ff88}
          distance={5}
          decay={2}
        />
        <pointLight 
          position={latLngToVector3(endCoords.lat, endCoords.lng, 2.1).toArray()} 
          intensity={3} 
          color={0xff4444}
          distance={5}
          decay={2}
        />
      </EarthGroup>
      
      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export default function GlobeRouteMap({ origin, destination, orderCity, orderCountry, customerCity, customerCountry, originCoords, destCoords }) {
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState({ origin: originCoords, dest: destCoords });
  const [error, setError] = useState(null);

  const mapboxApiKey = import.meta.env.VITE_MAPBOX_API_KEY;

  // Free geocoding service (Nominatim - OpenStreetMap)
  const geocodeWithNominatim = useCallback(async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Logistics-Platform/1.0'
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (err) {
      console.error("Nominatim geocoding error:", err);
    }
    return null;
  }, []);

  // Mapbox geocoding (requires API key)
  const geocodeWithMapbox = useCallback(async (address) => {
    if (!mapboxApiKey) return null;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxApiKey}&limit=1`
      );
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        // Mapbox returns [lng, lat]
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (err) {
      console.error("Mapbox geocoding error:", err);
    }
    return null;
  }, [mapboxApiKey]);

  // Geocode addresses if coordinates are not provided
  useEffect(() => {
    const fetchCoords = async () => {
      setLoading(true);
      setError(null);
      
      // If coordinates are already provided, use them
      if (originCoords && destCoords && 
          originCoords.lat !== undefined && originCoords.lng !== undefined &&
          destCoords.lat !== undefined && destCoords.lng !== undefined) {
        console.log("📍 Using provided coordinates:", { originCoords, destCoords });
        setCoords({ origin: originCoords, dest: destCoords });
        setLoading(false);
        return;
      }

      // Build addresses
      const originAddress = orderCity && orderCountry 
        ? `${orderCity}, ${orderCountry}` 
        : origin || "Mumbai, India";
      const destAddress = customerCity && customerCountry
        ? `${customerCity}, ${customerCountry}`
        : destination || "Delhi, India";

      console.log("🔍 Geocoding addresses:", { originAddress, destAddress });

      try {
        let originCoord = null;
        let destCoord = null;

        // Try Mapbox geocoding first (if API key is available)
        if (mapboxApiKey) {
          try {
            [originCoord, destCoord] = await Promise.all([
              geocodeWithMapbox(originAddress),
              geocodeWithMapbox(destAddress),
            ]);
            console.log("✅ Mapbox geocoding result:", { originCoord, destCoord });
          } catch (mapboxError) {
            console.warn("⚠️ Mapbox geocoding failed, trying Nominatim:", mapboxError);
          }
        }

        // Fallback to Nominatim (free, no API key required)
        if (!originCoord || !destCoord) {
          console.log("🌐 Using Nominatim for geocoding:", originAddress, destAddress);
          [originCoord, destCoord] = await Promise.all([
            geocodeWithNominatim(originAddress),
            geocodeWithNominatim(destAddress),
          ]);
          console.log("✅ Nominatim geocoding result:", { originCoord, destCoord });
        }

        if (originCoord && destCoord) {
          setCoords({ origin: originCoord, dest: destCoord });
        } else {
          setError("Could not geocode addresses. Using default coordinates.");
          const defaultOrigin = { lat: 19.0760, lng: 72.8777 };
          const defaultDest = { lat: 28.6139, lng: 77.2090 };
          setCoords({ origin: defaultOrigin, dest: defaultDest });
        }
      } catch (err) {
        console.error("❌ Error fetching coordinates:", err);
        setError("Error geocoding addresses. Using default coordinates.");
        const defaultOrigin = { lat: 19.0760, lng: 72.8777 };
        const defaultDest = { lat: 28.6139, lng: 77.2090 };
        setCoords({ origin: defaultOrigin, dest: defaultDest });
      }
      setLoading(false);
    };

    fetchCoords();
  }, [originCoords, destCoords, orderCity, orderCountry, customerCity, customerCountry, origin, destination, mapboxApiKey, geocodeWithMapbox, geocodeWithNominatim]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center" style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading 3D globe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height: '600px', background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #000000 100%)' }}>
      {error && (
        <div className="absolute top-2 left-2 z-10 p-2 bg-yellow-900 bg-opacity-80 border border-yellow-400 rounded text-xs text-yellow-200 max-w-md">
          {error}
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <GlobeScene
          origin={origin}
          destination={destination}
          originCoords={coords.origin}
          destCoords={coords.dest}
          orderCity={orderCity}
          customerCity={customerCity}
        />
      </Canvas>
      <div className="absolute bottom-4 left-4 z-10 text-white text-xs bg-black bg-opacity-50 px-3 py-2 rounded">
        <p className="font-semibold mb-1">🌍 Global Route Visualization</p>
        <p className="text-gray-300">
          {orderCity || "Origin"} → {customerCity || "Destination"}
        </p>
        <p className="text-gray-400 text-xs mt-1">Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  );
}
