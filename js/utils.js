// Function to translate text to Persian using Google Translate (free API) with caching
const translateToPersian = async (text) => {
  if (!text || text.trim() === '') return text;
  const cacheKey = `translate_${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  const stored = localStorage.getItem(cacheKey);
  if (stored) {
    translationCache.set(cacheKey, stored);
    return stored;
  }
  try {
    const data = await fetchWithRetry(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(text)}`);
    const parsed = JSON.parse(data);
    const translated = parsed[0][0][0];
    translationCache.set(cacheKey, translated);
    localStorage.setItem(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error('Translation failed:', err);
    return text; // Fallback to original text
  }
};

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function fetchWithRetry(originalUrl, retries = 2) {
  // Cache with expiration (5 min)
  const cacheKey = originalUrl;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.data;
  }

  // For Google Translate, direct fetch without proxy
  if (originalUrl.includes('translate.googleapis.com')) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(originalUrl, {}, 8000);
        if (response.ok) {
          return await response.text();
        }
      } catch (err) {
        console.warn(`Direct attempt ${attempt + 1} failed for ${originalUrl}:`, err.message);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
        }
      }
    }
    throw new Error('Direct fetch failed after retries.');
  }

  let fetchOptions = {};
  if (originalUrl.includes('api.github.com')) {
    fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
  }

  // Try direct fetch first for JSON APIs that may not need proxy
  if (originalUrl.includes('distrowatch.ir') || originalUrl.includes('distrowatch.com') || originalUrl.includes('api.github.com')) {
    try {
      const response = await fetchWithTimeout(originalUrl, fetchOptions, 10000);
      if (response.ok) {
        const data = await response.text();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (err) {
      console.warn('Direct fetch failed for ' + originalUrl + ':', err.message);
    }
  }
  // Prioritize first proxy for faster fetches
  const primaryProxy = proxies[0];
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const proxyUrl = primaryProxy.base + primaryProxy.format(originalUrl);
      console.debug(`Trying primary proxy: ${proxyUrl.substring(0, 50)}...`);
      const response = await fetchWithTimeout(proxyUrl, fetchOptions, 10000);
      if (response.ok) {
        const data = await response.text();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        console.debug(`Success with primary proxy for ${originalUrl.substring(0, 50)}...`);
        return data;
      }
    } catch (err) {
      console.warn(`Attempt ${attempt + 1} with primary proxy failed for ${originalUrl}:`, err.message);
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
      }
    }
  }
  // Fallback to other proxies if primary fails
  for (let i = 1; i < proxies.length; i++) {
    const proxy = proxies[i];
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const proxyUrl = proxy.base + proxy.format(originalUrl);
        console.debug(`Trying fallback proxy ${i + 1}: ${proxyUrl.substring(0, 50)}...`);
        const response = await fetchWithTimeout(proxyUrl, fetchOptions, 10000);
        if (response.ok) {
          const data = await response.text();
          cache.set(cacheKey, { data, timestamp: Date.now() });
          console.debug(`Success with fallback proxy ${i + 1} for ${originalUrl.substring(0, 50)}...`);
          return data;
        }
      } catch (err) {
        console.warn(`Attempt ${attempt + 1} with fallback proxy ${i + 1} failed for ${originalUrl}:`, err.message);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
        }
      }
    }
  }
  throw new Error('All fetch attempts failed after retries. Check your internet connection or try again later.');
}

async function fetchData(originalUrl, containerId, loadingMessage, errorMessage, processData, parseType = "text/html") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id ${containerId} not found`);
    return;
  }
  container.innerHTML = `<p class="text-cyan-300">${loadingMessage}</p>`;

  if (cache.has(originalUrl)) {
    const data = cache.get(originalUrl);
    let parsedData;
    if (parseType === "application/json") {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("JSON parse error from cache:", e);
        cache.delete(originalUrl);
        return;
      }
    } else {
      const parser = new DOMParser();
      parsedData = parser.parseFromString(data, parseType);
    }
    processData(parsedData, container);
    return;
  }

  try {
    const data = await fetchWithRetry(originalUrl);
    cache.set(originalUrl, data);
    let parsedData;
    if (parseType === "application/json") {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("JSON parse error:", e);
        throw new Error("Invalid JSON response");
      }
    } else {
      const parser = new DOMParser();
      parsedData = parser.parseFromString(data, parseType);
    }
    processData(parsedData, container);
  } catch (err) {
    console.error("Fetch Error:", err);
    if (containerId === 'distros-container') {
      container.innerHTML = originalDistros;
    } else {
      container.innerHTML = `<p class="text-red-500">${errorMessage}: ${err.message}. لطفاً اتصال اینترنت خود را بررسی کنید یا صفحه را دوباره بارگذاری کنید.</p>`;
    }
  }
}
