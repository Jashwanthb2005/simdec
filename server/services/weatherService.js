// Weather service to fetch and store weather data
// This avoids rate limiting on the frontend by handling API calls on the backend

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/**
 * Geocode a city name to get coordinates using OpenStreetMap Nominatim
 * @param {string} city - City name
 * @param {string} country - Country name
 * @returns {Promise<{lat: number, lng: number}|null>} Coordinates or null
 */
async function geocodeCity(city, country) {
  try {
    const query = `${city}, ${country}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    console.log(`🔍 Geocoding request: ${query}`);
    console.log(`🔍 Geocoding URL: ${url}`);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "LogisticsPlatform/1.0", // Required by Nominatim
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`❌ Geocoding failed for ${query}: HTTP ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => '');
      console.warn(`   Error response: ${errorText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    console.log(`📍 Geocoding response for ${query}:`, data.length > 0 ? `${data.length} result(s)` : "No results");
    
    if (data && data.length > 0) {
      const result = data[0];
      const coords = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
      
      // Validate coordinates
      if (isNaN(coords.lat) || isNaN(coords.lng)) {
        console.warn(`❌ Invalid coordinates for ${query}: lat=${result.lat}, lng=${result.lon}`);
        return null;
      }
      
      console.log(`✅ Geocoded ${query} to: ${coords.lat}, ${coords.lng}`);
      return coords;
    }

    console.warn(`❌ No geocoding results for ${query}`);
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`⏱️ Geocoding timeout for ${city}, ${country}`);
    } else {
      console.error(`❌ Error geocoding ${city}, ${country}:`, error.message);
      console.error(error.stack);
    }
    return null;
  }
}

/**
 * Fetch weather data from Open-Meteo API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Weather data object
 */
async function fetchWeatherData(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,windspeed_10m,weather_code&timezone=auto`;
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      // If rate limited, return null - don't throw error
      if (response.status === 429) {
        console.warn(`Weather API rate limited for coordinates ${lat}, ${lng}`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.current) {
      const weatherData = {
        temperature: data.current.temperature_2m || 0,
        humidity: data.current.relative_humidity_2m || data.current.relativehumidity_2m || 0,
        windspeed: data.current.windspeed_10m || 0,
        weatherCode: data.current.weather_code || 0,
        fetchedAt: new Date(), // Store when weather was fetched
      };
      console.log(`✅ Weather fetched successfully for ${lat}, ${lng}:`, {
        temp: weatherData.temperature,
        humidity: weatherData.humidity,
        windspeed: weatherData.windspeed,
        code: weatherData.weatherCode,
      });
      return weatherData;
    }

    console.warn(`⚠️ No weather data in response for ${lat}, ${lng}`);
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`Weather fetch timeout for ${lat}, ${lng}`);
    } else {
      console.error(`Error fetching weather for ${lat}, ${lng}:`, error.message);
    }
    return null; // Return null instead of throwing to avoid breaking shipment creation
  }
}

/**
 * Fetch weather data for multiple cities
 * @param {Array<{name: string, lat: number, lng: number}>} cities - Array of city objects
 * @returns {Promise<Object>} Object with city names as keys and weather data as values
 */
async function fetchWeatherForCities(cities) {
  const weatherData = {};
  
  // Fetch weather sequentially with delays to respect rate limits
  for (const city of cities) {
    if (city.lat && city.lng) {
      const weather = await fetchWeatherData(city.lat, city.lng);
      if (weather) {
        weatherData[city.name] = weather;
      }
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
  }
  
  return weatherData;
}

/**
 * Fetch weather data for a city by name (geocodes first, then fetches weather)
 * @param {string} city - City name
 * @param {string} country - Country name
 * @returns {Promise<Object|null>} Weather data with coordinates or null
 */
async function fetchWeatherForCity(city, country) {
  try {
    console.log(`📍 Geocoding ${city}, ${country}...`);
    // First, geocode the city to get coordinates
    const coords = await geocodeCity(city, country);
    
    if (!coords) {
      console.warn(`❌ Could not geocode ${city}, ${country}`);
      return null;
    }

    console.log(`✅ Geocoded ${city}, ${country} to ${coords.lat}, ${coords.lng}`);

    // Add delay to respect Nominatim rate limits (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Then fetch weather data using coordinates
    console.log(`🌤️ Fetching weather for ${city} at ${coords.lat}, ${coords.lng}...`);
    const weather = await fetchWeatherData(coords.lat, coords.lng);
    
    if (!weather) {
      console.warn(`❌ Could not fetch weather for ${city}, ${country}`);
      return null;
    }

    // Return weather data with coordinates
    const result = {
      ...weather,
      city,
      country,
      coordinates: coords,
    };
    console.log(`✅ Successfully fetched weather for ${city}, ${country}`);
    return result;
  } catch (error) {
    console.error(`❌ Error fetching weather for ${city}, ${country}:`, error.message);
    console.error(error.stack);
    return null;
  }
}

module.exports = {
  fetchWeatherData,
  fetchWeatherForCities,
  geocodeCity,
  fetchWeatherForCity,
};

