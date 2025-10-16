// Generic function to fetch and process data with caching, retries, timeout, and reliable proxies
const cache = new Map();
const translationCache = new Map(); // In-memory for session, localStorage for persistence
const proxies = [
  { base: 'https://api.allorigins.win/raw?url=', format: (u) => encodeURIComponent(u) },
  { base: 'https://corsproxy.io/?', format: (u) => encodeURIComponent(u) },
  { base: 'https://api.codetabs.com/v1/proxy?quest=', format: (u) => u },
  { base: 'https://thingproxy.freeboard.io/fetch/', format: (u) => u },
  { base: 'https://cors-anywhere.herokuapp.com/', format: (u) => u }
];

// Mobile detection and limits
const isMobile = window.innerWidth < 768;
const distroLimit = isMobile ? 20 : 200;
const newsLimit = isMobile ? 5 : 10;
const imgSize = isMobile ? 16 : 32;

// Base card renderer
function renderCard(container, innerContent) {
  const card = document.createElement("div");
  card.className = "card-container";
  card.innerHTML = `
    <div class="inner-container">
      <div class="border-outer">
        <div class="main-card"></div>
      </div>
      <div class="glow-layer-1"></div>
      <div class="glow-layer-2"></div>
    </div>
    <div class="overlay-1"></div>
    <div class="overlay-2"></div>
    <div class="background-glow"></div>
    <div class="content-container">
      ${innerContent}
    </div>
  `;
  container.appendChild(card);
}

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

async function fetchWithRetry(originalUrl, retries = 3) {
  // For Google Translate, direct fetch without proxy
  if (originalUrl.includes('translate.googleapis.com')) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(originalUrl, {}, 10000);
        if (response.ok) {
          return await response.text();
        }
      } catch (err) {
        console.warn(`Direct attempt ${attempt + 1} failed for ${originalUrl}:`, err.message);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
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
  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const proxyUrl = proxy.base + proxy.format(originalUrl);
        console.debug(`Trying proxy ${i + 1}: ${proxyUrl.substring(0, 50)}...`);
        const response = await fetchWithTimeout(proxyUrl, fetchOptions, 20000);
        if (response.ok) {
          const data = await response.text();
          console.debug(`Success with proxy ${i + 1} for ${originalUrl.substring(0, 50)}...`);
          return data;
        }
      } catch (err) {
        console.warn(`Attempt ${attempt + 1} with proxy ${i + 1} failed for ${originalUrl}:`, err.message);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000 * (attempt + 1)));
        }
      }
    }
  }
  throw new Error('All fetch attempts failed after retries. Check your internet connection or try again later.');
}

async function fetchData(originalUrl, containerId, loadingMessage, errorMessage, processData, parseType = "text/html") {
  const container = document.getElementById(containerId);
  container.innerHTML = `<p class="text-cyan-300">${loadingMessage}</p>`;

  if (cache.has(originalUrl)) {
    const data = cache.get(originalUrl);
    let parsedData;
    if (parseType === "application/json") {
      parsedData = JSON.parse(data);
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
      parsedData = JSON.parse(data);
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



// Process news RSS data (XML parsing)
async function processNews(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('RSS items found:', items.length);
  container.innerHTML = '';
  let cardCount = 0;
  for (const item of items) {
    try {
      const titleEl = item.querySelector('title');
      const dateEl = item.querySelector('pubDate');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 150) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        renderNewsCard(container, title, date, summary, link);
        cardCount++;
        if (cardCount >= newsLimit) break; // Limit based on device
      }
    } catch (err) {
      console.error('Error processing news item:', err);
    }
  }
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render reviews card
function renderReviewsCard(container, title, author, date, summary, link) {
  const innerContent = `
    <img src="img/apps/scalable/gnome-subtitles.svg" alt="Review Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-1">نویسنده: ${author}</p>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
}

// Function to render BSD card
function renderBsdCard(container, name, description, stars, forks, language, link) {
  const innerContent = `
    <img src="img/apps/scalable/gnome-system-monitor.svg" alt="BSD Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${name}</h3>
    <p class="text-sm text-blue-200 mb-2">${description}</p>
    <p class="text-sm text-cyan-200 mb-1">ستاره‌ها: ${stars} | فورک‌ها: ${forks}</p>
    <p class="text-sm text-cyan-200 mb-2">زبان: ${language}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">مشاهده در گیت‌هاب</a>
  `;
  renderCard(container, innerContent);
}

// Function to render repos card
function renderReposCard(container, name, description, stars, forks, language, link) {
  const innerContent = `
    <img src="img/apps/scalable/geany.svg" alt="Repository Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${name}</h3>
    <p class="text-sm text-blue-200 mb-2">${description}</p>
    <p class="text-sm text-cyan-200 mb-1">ستاره‌ها: ${stars} | فورک‌ها: ${forks}</p>
    <p class="text-sm text-cyan-200 mb-2">زبان: ${language}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">مشاهده در گیت‌هاب</a>
  `;
  renderCard(container, innerContent);
}

// Function to render distro card
function renderDistroCard(container, name, rank) {
  const innerContent = `
    <img src="img/apps/scalable/gparted.svg" alt="${name}" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${name}</h3>
    <p class="text-sm text-cyan-200">رتبه: ${rank}</p>
  `;
  renderCard(container, innerContent);
}

// Process reviews data with Persian translation
async function processReviews(doc, container) {
  const reviewItems = doc.querySelectorAll("tr");
  const fragment = document.createDocumentFragment();
  let reviewCount = 0;
  for (const item of reviewItems) {
    if (reviewCount >= newsLimit) break; // Limit based on device
    const cols = item.querySelectorAll("td");
    if (cols.length >= 4) {
      const titleElement = cols[1].querySelector("a");
      const title = titleElement ? titleElement.textContent.trim() : cols[1].textContent.trim();
      if (!title || title.includes('Select Distribution') || title.length < 5) continue; // Skip header/form rows
      const author = cols[2].textContent.trim();
      const date = cols[0].textContent.trim();
      let summary = cols[3].textContent.trim();
      // Clean summary: remove extra text after "Read more..." or long lists
      if (summary.includes('Read more...')) {
        summary = summary.split('Read more...')[0].trim();
      }
      if (summary.length > 200) summary = summary.substring(0, 200) + '...';
      // Translate to Persian with idle callback
      const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
      const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
      const issueDate = date.replace(/-/g, '');
      const link = "https://distrowatch.com/weekly.php?issue=" + issueDate;
      renderReviewsCard(fragment, translatedTitle, author, date, translatedSummary + " (Source: " + link + ")", link);
      reviewCount++;
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (reviewCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ نقد و بررسی یافت نشد.</p>';
  }
}

// Process BSD data with Persian translation
async function processBsd(repos, container) {
  if (!repos || !repos.items) {
    container.innerHTML = '<p class="text-red-500">خطا در دریافت داده‌ها از GitHub.</p>';
    return;
  }
  console.log('BSD repos fetched:', repos.items.length);
  const fragment = document.createDocumentFragment();
  let repoCount = 0;
  for (const repo of repos.items) {
    if (repoCount >= newsLimit) break; // Limit based on device
    const name = repo.name;
    const description = repo.description || 'توضیحی در دسترس نیست.';
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;
    const language = repo.language || 'نامشخص';
    const link = repo.html_url;
    // Translate name and description to Persian with idle callback
    const translatedName = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(name))));
    const translatedDescription = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(description))));
    renderBsdCard(fragment, translatedName, translatedDescription, stars, forks, language, link);
    repoCount++;
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (repoCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ مخزنی یافت نشد.</p>';
  }
}

// Process repos data with Persian translation
async function processRepos(repos, container) {
  if (!repos || !repos.items) {
    container.innerHTML = '<p class="text-red-500">خطا در دریافت داده‌ها از GitHub.</p>';
    return;
  }
  console.log('Repos fetched:', repos.items.length);
  const fragment = document.createDocumentFragment();
  let repoCount = 0;
  for (const repo of repos.items) {
    if (repoCount >= newsLimit) break; // Limit based on device
    const name = repo.name;
    const description = repo.description || 'توضیحی در دسترس نیست.';
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;
    const language = repo.language || 'نامشخص';
    const link = repo.html_url;
    // Translate name and description to Persian with idle callback
    const translatedName = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(name))));
    const translatedDescription = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(description))));
    renderReposCard(fragment, translatedName, translatedDescription, stars, forks, language, link);
    repoCount++;
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (repoCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ مخزنی یافت نشد.</p>';
  }
}

// Process distros data from DistroWatch
async function processDistros(doc, container) {
  const distroRows = doc.querySelectorAll('table tr');
  console.log('Distro rows found:', distroRows.length);
  const fragment = document.createDocumentFragment();
  let distroCount = 0;
  for (const row of distroRows) {
    if (distroCount >= distroLimit) break; // Limit based on device
    const cols = row.querySelectorAll('td');
    if (cols.length >= 2) {
      const rank = cols[0].textContent.trim();
      const name = cols[1].textContent.trim();
      if (name && rank && !isNaN(rank)) {
        // Translate name to Persian with idle callback
        const translatedName = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(name))));
        renderDistroCard(fragment, translatedName, rank);
        distroCount++;
      }
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (distroCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ توزیعی یافت نشد.</p>';
  }
}

// Function for hash-based routing (SPA behavior)
function handleHashChange() {
  const hash = window.location.hash || '#distros';
  const sections = document.querySelectorAll('main > section');
  sections.forEach(section => {
    section.style.display = section.id === hash.substring(1) ? 'block' : 'none';
  });

  // Update navigation active state
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === hash) {
      link.classList.add('text-white');
    } else {
      link.classList.remove('text-white');
    }
  });
}

// Function to render Phoronix news card
function renderPhoronixCard(container, title, date, summary, link) {
  const innerContent = `
    <img src="img/apps/scalable/gnome-system-monitor.svg" alt="Phoronix Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
}

// Process Phoronix news RSS data
async function processPhoronix(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Phoronix items found:', items.length);
  const fragment = document.createDocumentFragment();
  let cardCount = 0;
  for (const item of items) {
    try {
      const titleEl = item.querySelector('title');
      const dateEl = item.querySelector('pubDate');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 150) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
        const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
        renderPhoronixCard(fragment, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= newsLimit) break; // Limit based on device
      }
    } catch (err) {
      console.error('Error processing Phoronix item:', err);
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render Linux.com news card
function renderLinuxComCard(container, title, date, summary, link) {
  const innerContent = `
    <img src="img/apps/scalable/gnome-weather.svg" alt="Linux.com Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
}

// Process Linux.com news RSS data
async function processLinuxCom(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Linux.com items found:', items.length);
  const fragment = document.createDocumentFragment();
  let cardCount = 0;
  for (const item of items) {
    try {
      const titleEl = item.querySelector('title');
      const dateEl = item.querySelector('pubDate');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 150) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
        const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
        renderLinuxComCard(fragment, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= newsLimit) break; // Limit based on device
      }
    } catch (err) {
      console.error('Error processing Linux.com item:', err);
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render LWN news card
function renderLWNCard(container, title, date, summary, link) {
  const innerContent = `
    <img src="img/apps/scalable/gnome-terminal.svg" alt="LWN Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
}

// Process LWN news RSS data
async function processLWN(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('LWN items found:', items.length);
  const fragment = document.createDocumentFragment();
  let cardCount = 0;
  for (const item of items) {
    try {
      const titleEl = item.querySelector('title');
      const dateEl = item.querySelector('pubDate');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 150) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
        const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
        renderLWNCard(fragment, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= newsLimit) break; // Limit based on device
      }
    } catch (err) {
      console.error('Error processing LWN item:', err);
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render Linux Journal news card
function renderLinuxJournalCard(container, title, date, summary, link) {
  const innerContent = `
    <img src="img/apps/scalable/alien-arena.svg" alt="Linux Journal Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
}

// Process Linux Journal news RSS data
async function processLinuxJournal(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Linux Journal items found:', items.length);
  const fragment = document.createDocumentFragment();
  let cardCount = 0;
  for (const item of items) {
    try {
      const titleEl = item.querySelector('title');
      const dateEl = item.querySelector('pubDate');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 150) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
        const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
        renderLinuxJournalCard(fragment, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= newsLimit) break; // Limit based on device
      }
    } catch (err) {
      console.error('Error processing Linux Journal item:', err);
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

let originalDistros = '';

// Lazy load sections with IntersectionObserver
const lazyLoadSections = [
  { id: 'news-container', url: 'https://www.linux.com/feed', msg: 'در حال بارگذاری اخبار...', err: 'خطا در دریافت اخبار', proc: processNews, type: "text/xml" },
  { id: 'phoronix-container', url: 'https://www.phoronix.com/rss.php', msg: 'در حال بارگذاری اخبار فنی...', err: 'خطا در دریافت اخبار فنی', proc: processPhoronix, type: "text/xml" },
  { id: 'linuxcom-container', url: 'https://www.reddit.com/r/linux/.rss', msg: 'در حال بارگذاری اخبار عمومی...', err: 'خطا در دریافت اخبار عمومی', proc: processLinuxCom, type: "text/xml" },
  { id: 'lwn-container', url: 'https://lwn.net/headlines/rss', msg: 'در حال بارگذاری اخبار LWN...', err: 'خطا در دریافت اخبار LWN', proc: processLWN, type: "text/xml" },
  { id: 'linuxjournal-container', url: 'https://www.linuxjournal.com/node/feed', msg: 'در حال بارگذاری اخبار لینوکس ژورنال...', err: 'خطا در دریافت اخبار لینوکس ژورنال', proc: processLinuxJournal, type: "text/xml" },
  { id: 'reviews-container', url: 'https://distrowatch.com/reviews/', msg: 'در حال بارگذاری نقد و بررسی...', err: 'خطا در دریافت نقد و بررسی', proc: processReviews },
  { id: 'bsd-container', url: 'https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', msg: 'در حال بارگذاری سیستم‌های BSD...', err: 'خطا در دریافت BSD', proc: processBsd, type: "application/json" },
  { id: 'repos-container', url: 'https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', msg: 'در حال بارگذاری مخازن...', err: 'خطا در دریافت مخازن', proc: processRepos, type: "application/json" }
];

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const section = lazyLoadSections.find(s => s.id === entry.target.id);
      if (section && !entry.target.hasAttribute('data-loaded')) {
        entry.target.setAttribute('data-loaded', 'true');
        fetchData(section.url, section.id, section.msg, section.err, section.proc, section.type);
        observer.unobserve(entry.target);
      }
    }
  });
}, { rootMargin: '50px' });

// Fetch data on page load
document.addEventListener('DOMContentLoaded', async () => {
  originalDistros = document.getElementById('distros-container').innerHTML;

  // Load distros immediately
  await fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros);

  handleHashChange();

  // Observe other sections for lazy loading
  lazyLoadSections.forEach(section => {
    const el = document.getElementById(section.id);
    if (el) observer.observe(el);
  });

  // Real-time updates every 1 minute (only for visible sections)
  setInterval(async () => {
    await fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros);
    // Update only loaded sections
    lazyLoadSections.forEach(section => {
      const el = document.getElementById(section.id);
      if (el && el.hasAttribute('data-loaded')) {
        fetchData(section.url, section.id, section.msg, section.err, section.proc, section.type);
      }
    });
  }, 60000);
});

// Handle hash changes for SPA navigation
window.addEventListener('hashchange', handleHashChange);

// Refresh buttons with null checks
const refreshDistros = document.getElementById('refresh-distros');
if (refreshDistros) refreshDistros.addEventListener('click', () => fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros));

const refreshNews = document.getElementById('refresh-news');
if (refreshNews) refreshNews.addEventListener('click', () => fetchData('https://www.linux.com/feed', 'news-container', 'در حال بارگذاری اخبار...', 'خطا در دریافت اخبار', processNews, "text/xml"));

const refreshPhoronix = document.getElementById('refresh-phoronix');
if (refreshPhoronix) refreshPhoronix.addEventListener('click', () => fetchData('https://www.phoronix.com/rss.php', 'phoronix-container', 'در حال بارگذاری اخبار فنی...', 'خطا در دریافت اخبار فنی', processPhoronix, "text/xml"));

const refreshLinuxcom = document.getElementById('refresh-linuxcom');
if (refreshLinuxcom) refreshLinuxcom.addEventListener('click', () => fetchData('https://www.reddit.com/r/linux/.rss', 'linuxcom-container', 'در حال بارگذاری اخبار عمومی...', 'خطا در دریافت اخبار عمومی', processLinuxCom, "text/xml"));

const refreshLwn = document.getElementById('refresh-lwn');
if (refreshLwn) refreshLwn.addEventListener('click', () => fetchData('https://lwn.net/headlines/rss', 'lwn-container', 'در حال بارگذاری اخبار LWN...', 'خطا در دریافت اخبار LWN', processLWN, "text/xml"));

const refreshLinuxjournal = document.getElementById('refresh-linuxjournal');
if (refreshLinuxjournal) refreshLinuxjournal.addEventListener('click', () => fetchData('https://www.linuxjournal.com/node/feed', 'linuxjournal-container', 'در حال بارگذاری اخبار لینوکس ژورنال...', 'خطا در دریافت اخبار لینوکس ژورنال', processLinuxJournal, "text/xml"));

const refreshReviews = document.getElementById('refresh-reviews');
if (refreshReviews) refreshReviews.addEventListener('click', () => fetchData('https://distrowatch.com/reviews/', 'reviews-container', 'در حال بارگذاری نقد و بررسی...', 'خطا در دریافت نقد و بررسی', processReviews));

const refreshBsd = document.getElementById('refresh-bsd');
if (refreshBsd) refreshBsd.addEventListener('click', () => fetchData('https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', 'bsd-container', 'در حال بارگذاری سیستم‌های BSD...', 'خطا در دریافت BSD', processBsd, "application/json"));

const refreshRepos = document.getElementById('refresh-repos');
if (refreshRepos) refreshRepos.addEventListener('click', () => fetchData('https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', 'repos-container', 'در حال بارگذاری مخازن...', 'خطا در دریافت مخازن', processRepos, "application/json"));
