import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWeatherWithRetry, getCachedWeather, isCurrentlyRateLimited } from "../../utils/weatherCache";

// Default cities to track (can be customized)
const DEFAULT_CITIES = [
  { name: "Mumbai", lat: 19.0760, lng: 72.8777, country: "India" },
  { name: "Delhi", lat: 28.6139, lng: 77.2090, country: "India" },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946, country: "India" },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867, country: "India" },
  { name: "Chennai", lat: 13.0827, lng: 80.2707, country: "India" },
];

// Convert lat/lng to map coordinates (Mercator projection simplified for flat map)
const latLngToMapCoords = (lat, lng, mapWidth = 20, mapHeight = 12) => {
  // Simplified Mercator projection for flat map
  // For India region, we'll use a simpler linear mapping
  const x = ((lng - 68) / 20) * mapWidth - mapWidth / 2; // India longitude range approximately 68-88
  const y = ((lat - 20) / 15) * mapHeight - mapHeight / 2; // India latitude range approximately 8-35
  return { x, y };
};

// Weather effect components
function Cloud({ position, speed = 0.01, opacity = 0.6 }) {
  const cloudRef = useRef();
  
  useFrame((state) => {
    if (cloudRef.current) {
      cloudRef.current.position.x += speed;
      // Wrap around if cloud goes off screen
      if (cloudRef.current.position.x > 12) {
        cloudRef.current.position.x = -12;
      }
      // Slight floating animation
      cloudRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={cloudRef} position={position}>
      {/* Cloud shape made of multiple spheres */}
      <mesh position={[0, 0, 0.01]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[-0.2, 0, 0.01]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[0.2, 0, 0.01]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.15, 0.01]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

function Rain({ position, intensity = 1 }) {
  const rainRef = useRef();
  const particles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 50 * intensity; i++) {
      p.push({
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 2,
        z: Math.random() * 0.1,
        speed: 0.1 + Math.random() * 0.1,
      });
    }
    return p;
  }, [intensity]);

  useFrame(() => {
    if (rainRef.current) {
      particles.forEach((p, i) => {
        p.y -= p.speed;
        if (p.y < -1) {
          p.y = 1;
          p.x = (Math.random() - 0.5) * 2;
        }
      });
    }
  });

  return (
    <group ref={rainRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z + 0.02]}>
          <cylinderGeometry args={[0.005, 0.005, 0.1, 4]} />
          <meshStandardMaterial color="#4a90e2" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Fog({ position, intensity = 0.5 }) {
  const fogRef = useRef();
  
  useFrame((state) => {
    if (fogRef.current) {
      // Subtle movement
      fogRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
      fogRef.current.position.y = position[1] + Math.cos(state.clock.elapsedTime * 0.15) * 0.1;
      // Opacity variation
      if (fogRef.current.material) {
        fogRef.current.material.opacity = intensity * (0.7 + Math.sin(state.clock.elapsedTime * 0.3) * 0.3);
      }
    }
  });

  return (
    <mesh ref={fogRef} position={[position[0], position[1], 0.03]}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshStandardMaterial 
        color="#e0e0e0" 
        transparent 
        opacity={intensity * 0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Sun({ position, intensity = 1 }) {
  const sunRef = useRef();
  const glowRef = useRef();
  
  useFrame((state) => {
    if (sunRef.current && glowRef.current) {
      // Rotating sun
      sunRef.current.rotation.z += 0.01;
      // Pulsing glow
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      glowRef.current.scale.set(scale, scale, scale);
      glowRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={[position[0], position[1], 0.02]}>
      {/* Glow */}
      <mesh ref={glowRef}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.3} />
      </mesh>
      {/* Sun core */}
      <mesh ref={sunRef}>
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={2} />
      </mesh>
      {/* Rays */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
          <boxGeometry args={[0.05, 0.3, 0.01]} />
          <meshBasicMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
}

// City marker on map
function CityMarker({ city, weather, position, onHover, onLeave }) {
  const markerRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Get temperature color
  const getTempColor = (temp) => {
    if (temp >= 30) return "#ff4444"; // Hot - red
    if (temp >= 20) return "#ff8800"; // Warm - orange
    if (temp >= 10) return "#ffbb00"; // Mild - yellow
    return "#4488ff"; // Cold - blue
  };

  const temp = weather?.temperature_2m || 20;
  const color = getTempColor(temp);

  useFrame((state) => {
    if (markerRef.current) {
      // Pulsing animation
      const scale = hovered ? 1.5 : 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      markerRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group 
      ref={markerRef} 
      position={[position.x, position.y, 0.05]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover && onHover(city);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onLeave && onLeave();
      }}
    >
      {/* Marker glow */}
      <mesh>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      {/* Marker core */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={hovered ? 3 : 1.5}
        />
      </mesh>
      {/* Weather icon above marker */}
      {weather && (
        <Html position={[0, 0.3, 0]} center>
          <div className="text-2xl pointer-events-none">
            {getWeatherIcon(weather.weather_code)}
          </div>
        </Html>
      )}
    </group>
  );
}

// Temperature gradient plane - creates heat map effect
function TemperatureGradient({ cities, weatherData, positions }) {
  const gradientRef = useRef();
  
  // Create gradient texture based on temperature data
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw temperature gradients around each city
    cities.forEach((city, i) => {
      const weather = weatherData[city.name];
      if (weather && positions && positions[i]) {
        const temp = weather.temperature_2m || 20;
        const pos = positions[i];
        
        // Convert map coordinates to canvas coordinates
        // Map coordinates range from -10 to +10 (x) and -6 to +6 (y)
        const x = ((pos.x + 10) / 20) * canvas.width;
        const y = ((pos.y + 6) / 12) * canvas.height;
        
        // Color based on temperature
        let color;
        if (temp >= 30) color = `rgba(255, 68, 68, 0.5)`; // Hot - red
        else if (temp >= 20) color = `rgba(255, 136, 0, 0.5)`; // Warm - orange
        else if (temp >= 10) color = `rgba(255, 187, 0, 0.5)`; // Mild - yellow
        else color = `rgba(68, 136, 255, 0.5)`; // Cold - blue
        
        // Create radial gradient for each city
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 150);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color.replace('0.5', '0.3'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, [cities, weatherData, positions]);

  return (
    <mesh ref={gradientRef} position={[0, 0, -0.01]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 12]} />
      <meshStandardMaterial 
        map={gradientTexture} 
        transparent 
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Weather effects layer
function WeatherEffects({ cities, weatherData, positions }) {
  return (
    <>
      {cities.map((city, i) => {
        const weather = weatherData[city.name];
        if (!weather) return null;
        
        const pos = positions[i];
        const code = weather.weather_code || 0;
        
        // Render weather effects based on weather code
        if (code === 0) {
          // Clear - sun
          return <Sun key={`sun-${i}`} position={[pos.x, pos.y]} intensity={1} />;
        } else if (code >= 61 && code <= 67) {
          // Rain
          return <Rain key={`rain-${i}`} position={[pos.x, pos.y, 0.05]} intensity={1} />;
        } else if (code >= 45 && code <= 49) {
          // Fog
          return <Fog key={`fog-${i}`} position={[pos.x, pos.y]} intensity={0.6} />;
        } else if (code >= 1 && code <= 3) {
          // Clouds
          return (
            <Cloud 
              key={`cloud-${i}`} 
              position={[pos.x, pos.y, 0.02]} 
              speed={0.005} 
              opacity={0.5} 
            />
          );
        }
        return null;
      })}
    </>
  );
}

// Map scene
function MapScene({ cities, weatherData, hoveredCity, onCityHover, onCityLeave }) {
  const mapRef = useRef();
  
  // Calculate city positions on map
  const cityPositions = useMemo(() => {
    return cities.map(city => latLngToMapCoords(city.lat, city.lng));
  }, [cities]);

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.6} />
      {/* Main directional light */}
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      {/* Fill light */}
      <directionalLight position={[-5, -5, 3]} intensity={0.3} />
      
      {/* Map base (flat plane) */}
      <mesh ref={mapRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial 
          color="#2d5a3d" 
          roughness={0.8} 
          metalness={0.1}
        />
      </mesh>
      
      {/* Temperature gradient overlay */}
      <TemperatureGradient cities={cities} weatherData={weatherData} positions={cityPositions} />
      
      {/* Weather effects */}
      <WeatherEffects 
        cities={cities} 
        weatherData={weatherData} 
        positions={cityPositions} 
      />
      
      {/* City markers */}
      {cities.map((city, i) => (
        <CityMarker
          key={city.name}
          city={city}
          weather={weatherData[city.name]}
          position={cityPositions[i]}
          onHover={onCityHover}
          onLeave={onCityLeave}
        />
      ))}
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={false}
        minDistance={8}
        maxDistance={20}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

// Weather icon helper
function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 49) return "🌫️";
  if (code <= 59) return "🌦️";
  if (code <= 69) return "🌧️";
  if (code <= 79) return "🌨️";
  return "⛈️";
}

// City card component
function CityCard({ city, weather, isHovered, index, isLoading }) {
  // Show loading state if weather data is not available yet
  if (!weather && !isLoading) {
    return null; // Don't show card if data failed to load
  }

  if (!weather && isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.6, y: 0 }}
        className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white/50">{city.name}</h3>
          <div className="animate-pulse text-2xl">⏳</div>
        </div>
        <div className="text-sm text-white/40">Loading...</div>
      </motion.div>
    );
  }

  const temp = weather.temperature_2m || 0;
  const humidity = weather.relative_humidity_2m || weather.relativehumidity_2m || 0;
  const windSpeed = weather.windspeed_10m || weather.windspeed_10m || 0;
  const code = weather.weather_code || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isHovered ? 1 : 0.8, 
        y: 0,
        scale: isHovered ? 1.05 : 1
      }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">{city.name}</h3>
        <span className="text-3xl">{getWeatherIcon(code)}</span>
      </div>
      
      <div className="text-3xl font-bold text-white mb-2">
        {temp}°C
      </div>
      
      <div className="space-y-1 text-sm text-white/80">
        <div className="flex items-center gap-2">
          <span>💧</span>
          <span>Humidity: {humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>💨</span>
          <span>Wind: {windSpeed} km/h</span>
        </div>
      </div>
      
      {/* Temperature indicator bar */}
      <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: temp >= 30 
              ? "linear-gradient(90deg, #ff4444, #ff8800)"
              : temp >= 20
              ? "linear-gradient(90deg, #ff8800, #ffbb00)"
              : "linear-gradient(90deg, #4488ff, #66aaff)",
            width: `${Math.min((temp / 40) * 100, 100)}%`
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((temp / 40) * 100, 100)}%` }}
          transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
        />
      </div>
    </motion.div>
  );
}

// Main component
export default function WeatherDashboard3D({ cities = DEFAULT_CITIES, customCities = [] }) {
  const [weatherData, setWeatherData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false); // Prevent concurrent fetches

  // Merge default and custom cities, limit to 3 cities max to respect API rate limits
  const allCities = useMemo(() => {
    const merged = [...cities, ...customCities];
    // Limit to 3 cities to respect API rate limits (429 Too Many Requests)
    return merged.slice(0, 3);
  }, [cities, customCities]);

  // Fetch weather data sequentially to avoid browser resource exhaustion
  useEffect(() => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }
    
    let isCancelled = false;
    let abortControllers = [];
    
    const fetchWeatherData = async () => {
      // Skip if already fetching
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      
      setLoading(true);
      setError(null);
      
      try {
        const weatherMap = { ...weatherData }; // Start with existing data
        
        // First, check cache for all cities
        allCities.forEach(city => {
          const cached = getCachedWeather(city.lat, city.lng);
          if (cached) {
            weatherMap[city.name] = cached;
          } else if (weatherData[city.name]) {
            // Use existing component state if available
            weatherMap[city.name] = weatherData[city.name];
          }
        });
        
        // Update state with cached/existing data immediately
        if (Object.keys(weatherMap).length > 0) {
          setWeatherData(prev => ({ ...prev, ...weatherMap }));
        }
        
        // Only fetch cities we don't have cached data for
        const citiesToFetch = allCities.filter(city => !weatherMap[city.name]);
        
        if (citiesToFetch.length === 0) {
          // All data is cached, we're done
          setLoading(false);
          fetchingRef.current = false;
          return;
        }
        
        // Check if we're already rate limited - if so, don't make any requests
        if (isCurrentlyRateLimited()) {
          console.warn('⚠️ Currently rate limited. Using cached data only.');
          setError("⚠️ API rate limited. Showing cached weather data only. Please wait 15 minutes before refreshing.");
          setLoading(false);
          fetchingRef.current = false;
          return;
        }
        
        // Process cities sequentially with very long delays to respect rate limits
        // Open-Meteo free tier has strict rate limits (429 errors), so we use 10 second delays
        const delayBetweenRequests = 10000; // 10 seconds delay between requests (very conservative)
        
        // Only fetch ONE city maximum to minimize API calls and respect rate limits
        // Fetch only the first city that needs data
        const citiesToFetchLimited = citiesToFetch.slice(0, 1);
        
        for (let i = 0; i < citiesToFetchLimited.length; i++) {
          if (isCancelled) break;
          
          // Check rate limit status before each request
          if (isCurrentlyRateLimited()) {
            console.warn('⚠️ Rate limited detected. Stopping all requests.');
            setError("⚠️ API rate limit reached. Using cached weather data only.");
            break;
          }
          
          const city = citiesToFetchLimited[i];
          
          try {
            // Use shared cache - NO retries on 429, just use cache
            const weather = await fetchWeatherWithRetry(city.lat, city.lng);
            if (weather) {
              weatherMap[city.name] = weather;
              // Update state progressively so users see data as it loads
              setWeatherData(prev => ({ ...prev, [city.name]: weather }));
            }
          } catch (err) {
            // Log error
            if (!isCancelled) {
              const errorMsg = err.message || 'Network error';
              console.warn(`Weather data for ${city.name} unavailable:`, errorMsg);
              
              // If it's a rate limit error, stop ALL fetching immediately
              if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
                setError("⚠️ API rate limit reached. Using cached weather data only. Please wait 15 minutes before refreshing.");
                // Stop fetching immediately - don't try more cities
                break;
              }
            }
          }
          
        }
        
        // Final update with all collected data
        if (!isCancelled) {
          setWeatherData(weatherMap);
          
          // If we have some cached data but not all, that's okay - don't show error
          if (Object.keys(weatherMap).length > 0) {
            // We have some data, even if not all cities
            console.info(`Showing weather for ${Object.keys(weatherMap).length} of ${allCities.length} cities (some from cache)`);
          } else if (Object.keys(weatherMap).length === 0 && allCities.length > 0 && !error) {
            // Only show error if we have NO data at all and no error was set
            setError("Unable to fetch weather data. The API may be rate-limited. Please try again in 15 minutes.");
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error fetching weather data:", err);
          setError("Failed to load weather data. Please refresh the page.");
        }
      } finally {
        fetchingRef.current = false;
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    // Only fetch if we have cities
    if (allCities.length > 0) {
      // Add initial delay to prevent rapid-fire requests from multiple instances
      // Stagger requests from different dashboard instances
      const initialDelay = Math.random() * 2000; // Random 0-2s delay to spread out requests
      const timeoutId = setTimeout(() => {
        fetchWeatherData();
      }, initialDelay);
      
      // Cleanup function
      return () => {
        isCancelled = true;
        clearTimeout(timeoutId);
        // Abort all pending requests
        abortControllers.forEach(controller => controller.abort());
        abortControllers = [];
      };
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCities]); // Only depend on allCities to avoid infinite loops

  const handleCityHover = useCallback((city) => {
    setHoveredCity(city);
  }, []);

  const handleCityLeave = useCallback(() => {
    setHoveredCity(null);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <div className="text-white text-xl">Loading weather data...</div>
        <div className="text-white/70 text-sm mt-2">Fetching data for {allCities.length} cities</div>
      </div>
    );
  }

  // Show error only if we have no data at all
  if (error && Object.keys(weatherData).length === 0) {
    return (
      <div className="w-full h-[600px] bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl flex flex-col items-center justify-center p-8">
        <div className="text-yellow-300 text-xl mb-4 text-center">{error}</div>
        <div className="text-white/70 text-sm mb-4 text-center">
          The weather API has rate limits. Please wait 15 minutes before trying again.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
        >
          Refresh Page
        </button>
      </div>
    );
  }
  
  // Show warning if we have cached data but got rate limited
  const showRateLimitWarning = error && error.includes('rate limit') && Object.keys(weatherData).length > 0;

  return (
    <div className="w-full h-[600px] relative rounded-xl overflow-hidden shadow-2xl">
      {/* Glass panel overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-indigo-900/90 to-purple-900/90 backdrop-blur-sm z-10 pointer-events-none" />
      
      {/* 3D Map Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 8, 12], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          shadows
        >
          <MapScene
            cities={allCities}
            weatherData={weatherData}
            hoveredCity={hoveredCity}
            onCityHover={handleCityHover}
            onCityLeave={handleCityLeave}
          />
        </Canvas>
      </div>
      
      {/* City cards overlay - Show all cities, with loading states for those still fetching */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {allCities.map((city, index) => {
              const hasWeather = !!weatherData[city.name];
              const isLoadingCity = loading && !hasWeather;
              
              // Only show card if we have data or are still loading
              if (!hasWeather && !isLoadingCity) {
                return null;
              }
              
              return (
                <CityCard
                  key={city.name}
                  city={city}
                  weather={weatherData[city.name]}
                  isHovered={hoveredCity?.name === city.name}
                  index={index}
                  isLoading={isLoadingCity}
                />
              );
            })}
          </AnimatePresence>
        </div>
        {/* Show message if some cities failed to load and we're not loading anymore */}
        {!loading && error && Object.keys(weatherData).length > 0 && (
          <div className="mt-2 text-white/70 text-xs text-center">
            ⚠️ Some cities failed to load weather data
          </div>
        )}
        {/* Show message if we have some data but not all cities */}
        {!loading && Object.keys(weatherData).length > 0 && Object.keys(weatherData).length < allCities.length && (
          <div className="mt-2 text-white/70 text-xs text-center">
            Showing {Object.keys(weatherData).length} of {allCities.length} cities
          </div>
        )}
      </div>
      
      {/* Title */}
      <div className="absolute top-4 left-4 z-20">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">
          🌍 Live Weather Dashboard
        </h2>
        <p className="text-white/80 text-sm">Interactive 3D weather visualization</p>
      </div>
    </div>
  );
}

