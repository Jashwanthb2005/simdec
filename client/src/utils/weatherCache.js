// Shared weather data cache to prevent duplicate API calls
// and respect rate limits across all component instances

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache (much longer to reduce API calls)
const MAX_RETRY_ATTEMPTS = 0; // No retries on 429 - just use cache
const RETRY_DELAY_BASE = 10000; // 10 seconds base delay (if we ever retry)

const weatherCache = new Map();
const pendingRequests = new Map(); // Track pending requests to prevent duplicates
let isRateLimited = false; // Global rate limit flag
let rateLimitUntil = 0; // Timestamp when rate limit expires

// Generate cache key from city coordinates
const getCacheKey = (lat, lng) => `${lat.toFixed(4)}_${lng.toFixed(4)}`;

// Check if cache entry is still valid
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

// Get cached weather data
export const getCachedWeather = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  const cached = weatherCache.get(key);
  if (isCacheValid(cached)) {
    return cached.data;
  }
  return null;
};

// Set cached weather data
export const setCachedWeather = (lat, lng, data) => {
  const key = getCacheKey(lat, lng);
  const cacheEntry = {
    data,
    timestamp: Date.now(),
  };
  weatherCache.set(key, cacheEntry);
  // Also save to localStorage for persistence
  try {
    const stored = localStorage.getItem('weatherCache');
    const cacheObj = stored ? JSON.parse(stored) : {};
    cacheObj[key] = cacheEntry;
    localStorage.setItem('weatherCache', JSON.stringify(cacheObj));
  } catch (err) {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
};

// Check if a request is already pending for these coordinates
export const isRequestPending = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  return pendingRequests.has(key);
};

// Mark request as pending
export const markRequestPending = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  pendingRequests.set(key, Date.now());
};

// Remove pending request marker
export const clearPendingRequest = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  pendingRequests.delete(key);
};

// Clear old pending requests (cleanup)
export const cleanupPendingRequests = () => {
  const now = Date.now();
  const timeout = 30000; // 30 seconds timeout for pending requests
  for (const [key, timestamp] of pendingRequests.entries()) {
    if (now - timestamp > timeout) {
      pendingRequests.delete(key);
    }
  }
};

// Check if we're currently rate limited
export const isCurrentlyRateLimited = () => {
  if (isRateLimited && Date.now() < rateLimitUntil) {
    return true;
  }
  // Reset flag if time has passed
  if (isRateLimited && Date.now() >= rateLimitUntil) {
    isRateLimited = false;
    rateLimitUntil = 0;
  }
  return false;
};

// Set rate limit flag (don't make requests for 10 minutes)
export const setRateLimited = () => {
  isRateLimited = true;
  rateLimitUntil = Date.now() + (10 * 60 * 1000); // 10 minutes
  console.warn('⚠️ Rate limited by Open-Meteo API. All requests paused for 10 minutes. Using cached data only.');
};

// Load cache from localStorage on init
const loadCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem('weatherCache');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      for (const [key, value] of Object.entries(parsed)) {
        // Only load cache entries that are still valid
        if (now - value.timestamp < CACHE_DURATION) {
          weatherCache.set(key, value);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load weather cache from localStorage:', err);
  }
};

// Save cache to localStorage
const saveCacheToStorage = () => {
  try {
    const cacheObj = {};
    for (const [key, value] of weatherCache.entries()) {
      cacheObj[key] = value;
    }
    localStorage.setItem('weatherCache', JSON.stringify(cacheObj));
  } catch (err) {
    console.warn('Failed to save weather cache to localStorage:', err);
  }
};

// Initialize: Load cache from localStorage
loadCacheFromStorage();

// Load rate limit status from localStorage on init
try {
  const storedRateLimit = localStorage.getItem('weatherRateLimitUntil');
  if (storedRateLimit) {
    const rateLimitTime = parseInt(storedRateLimit, 10);
    if (Date.now() < rateLimitTime) {
      isRateLimited = true;
      rateLimitUntil = rateLimitTime;
      console.info('⚠️ Rate limit status restored from storage. Requests paused until:', new Date(rateLimitUntil).toLocaleTimeString());
    } else {
      // Rate limit expired, clear it
      localStorage.removeItem('weatherRateLimitUntil');
    }
  }
} catch (err) {
  // Ignore localStorage errors
}

// Fetch weather with NO retries on 429 - just use cache
export const fetchWeatherWithRetry = async (lat, lng, retryCount = 0) => {
  const key = getCacheKey(lat, lng);
  
  // Check cache first - ALWAYS use cache if available
  const cached = getCachedWeather(lat, lng);
  if (cached) {
    return cached;
  }
  
  // Check if we're rate limited - if so, don't make request
  if (isCurrentlyRateLimited()) {
    console.warn('⚠️ Currently rate limited. Using cached data only.');
    throw new Error('Rate limited. Please use cached data or try again later.');
  }
  
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    // Wait for pending request to complete (but not too long)
    let attempts = 0;
    while (pendingRequests.has(key) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 300));
      attempts++;
      // Check cache again in case pending request completed
      const cachedAfterWait = getCachedWeather(lat, lng);
      if (cachedAfterWait) {
        return cachedAfterWait;
      }
      // Check if we became rate limited while waiting
      if (isCurrentlyRateLimited()) {
        throw new Error('Rate limited. Please use cached data or try again later.');
      }
    }
  }
  
  // Mark as pending
  markRequestPending(lat, lng);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,relativehumidity_2m,windspeed_10m,weather_code&timezone=auto`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        cache: 'default'
      }
    );
    
    clearTimeout(timeoutId);
    
    // Handle rate limiting (429) - DO NOT RETRY, just set flag and use cache
    if (response.status === 429) {
      clearPendingRequest(lat, lng);
      setRateLimited(); // Set global rate limit flag
      // Don't retry - just throw error and use cache
      throw new Error('Rate limit exceeded. Using cached data only.');
    }
    
    if (!response.ok) {
      clearPendingRequest(lat, lng);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.current) {
      // Cache the result
      setCachedWeather(lat, lng, data.current);
      // Save to localStorage for persistence
      saveCacheToStorage();
      clearPendingRequest(lat, lng);
      return data.current;
    }
    
    clearPendingRequest(lat, lng);
    throw new Error('Invalid response data');
  } catch (err) {
    clearPendingRequest(lat, lng);
    
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('Request timeout');
    }
    
    throw err;
  }
};

// Cleanup function to run periodically
setInterval(cleanupPendingRequests, 60000); // Cleanup every minute

