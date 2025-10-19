 // Generic function to fetch and process data with caching, retries, timeout, and reliable proxies
const cache = new Map();
const proxies = [
  { base: 'https://api.allorigins.win/raw?url=', format: (u) => encodeURIComponent(u) },
  { base: 'https://corsproxy.io/?', format: (u) => encodeURIComponent(u) },
  { base: 'https://api.codetabs.com/v1/proxy?quest=', format: (u) => u },
  { base: 'https://thingproxy.freeboard.io/fetch/', format: (u) => u },
  { base: 'https://cors-anywhere.herokuapp.com/', format: (u) => u }
];

// Function to translate text to Persian using Google Translate (free API) via proxy
async function translateToPersian(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(text)}`;
    const data = await fetchWithRetry(url);
    const parsed = JSON.parse(data);
    return parsed[0][0][0];
  } catch (err) {
    console.error('Translation failed:', err);
    return text; // Fallback to original text
  }
}

async function fetchWithTimeout (url, options = {}, timeout = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function fetchWithRetry (originalUrl, retries = 3) {
  let fetchOptions = {};
  if (originalUrl.includes('api.github.com')) {
    fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4472.124 Safari/537.36'
      }
    };
  }
  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const proxyUrl = proxy.base + proxy.format(originalUrl);
        console.log(`Trying proxy ${i + 1}: ${proxyUrl.substring(0, 50)}...`);
        const response = await fetchWithTimeout(proxyUrl, fetchOptions, 20000);
        if (response.ok) {
          const data = await response.text();
          console.log(`Success with proxy ${i + 1} for ${originalUrl.substring(0, 50)}...`);
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
    } else if (containerId === 'weekly-container') {
      container.innerHTML = originalWeekly;
    } else {
      container.innerHTML = `<p class="text-red-500">${errorMessage}: ${err.message}. لطفاً اتصال اینترنت خود را بررسی کنید یا صفحه را دوباره بارگذاری کنید.</p>`;
    }
  }
}

// Function to render distro card with ranking and right hits column
renderCard = (container, rank, name, hits) => {
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
      <img class=" card card-link " src="Sea/mimetypes/scalable/application-x-trash.svg" alt="Distro Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <div class="flex justify-between items-center mb-4">
        <span class="text-cyan-400 font-bold text-lg">#${rank}</span>
        <h3 class="text-xl font-semibold text-cyan-300 flex-1 text-center mx-4">${name}</h3>
        <p class="text-sm text-cyan-200 font-mono">بازدید: ${hits}</p>
      </div>
    </div>
  `;
  container.appendChild(card);
}

// Process distros data
const processDistros = (doc, container) => {
  container.innerHTML = ''; // Clear container
  const rows = doc.querySelectorAll("tr");
  console.log('Distros rows found:', rows.length);
  let cardCount = 0;
  rows.forEach((row, index) => {
    if (index === 0) return; // Skip header row
    if (cardCount >= 20) return; // Limit to 200 for performance
    const cols = row.querySelectorAll("td, th"); // Include th for potential header-like rows
    if (cols.length >= 3) {
      const rankText = cols[0].textContent.trim();
      const rank = parseInt(rankText.replace(/[^\d]/g, '')) || (cardCount + 1);
      const nameElement = cols[1].querySelector('a');
      const name = nameElement ? nameElement.textContent.trim() : cols[1].textContent.trim();
      const hitsText = cols[2].textContent.trim();
      const hits = parseInt(hitsText.replace(/[^\d]/g, '')) || 0;
      console.log(`Processing row ${index} (rank ${rank}): name="${name}", hits="${hits}"`);
      // Skip invalid rows: empty name, hits=0, hits=Infinity, or non-distro names
      if (name && name.length > 0 && hits > 0 && isFinite(hits) && !name.includes('Search') && !name.includes('DistroWatch Page Hit Ranking') && !name.includes('Page Hit Ranking Trends') && !name.includes('Last 12 months') && !name.includes('Trends') && name.length > 3 && name.match(/^[A-Z]/)) {
        renderCard(container, cardCount + 1, name, hits); // Start rank from 1
        cardCount++;
      }
    }
  });
  console.log('Total distros rendered:', cardCount);
  if (cardCount === 0) {
    container.innerHTML = `<p class="text-red-500">هیچ داده‌ای یافت نشد. لطفاً صفحه را دوباره بارگذاری کنید.</p>`;
  }
}
// Translation function using LibreTranslate (free, async)
async function translateText( text, targetLang = 'fa') {
  if (!text || text.trim() === '') return text;
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: 'fa',
        target: targetLang,
        format: 'text'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      return data.translatedText;
    }
  } catch (err) {
    console.warn('Translation failed:', err);
  }
  return text; // Fallback to original
}

// Function to render news card
function renderNewsCard(container, title, date, summary, link) {
if (rank ===1) {
    rank = '?';
    text
}

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
      <img src="Sea/apps/scalable/" alt="News Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
      <p class="text-sm text-cyan-200 mb-2">${date}</p>
      <p class="text-sm text-blue-200 mb-4">${summary}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
    </div>
  `;
  container.appendChild(card);
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
        if (cardCount >= 10) break; // Limit to 10 news
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
      <img src="Sea/apps/scalable/gnome-subtitles.svg" alt="Review Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
      <p class="text-sm text-cyan-200 mb-1">نویسنده: ${author}</p>
      <p class="text-sm text-cyan-200 mb-2">${date}</p>
      <p class="text-sm text-blue-200 mb-4">${summary}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
    </div>
  `;
  container.appendChild(card);
}

function renderBsdCard(container, name, description, stars, forks, language, link) {
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
      <img src="img/bsd.png" alt="BSD Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${name}</h3>
      <p class="text-sm text-blue-200 mb-2">${description}</p>
      <p class="text-sm text-cyan-200 mb-1">ستاره‌ها: ${stars} | فورک‌ها: ${forks}</p>
      <p class="text-sm text-cyan-200 mb-2">زبان: ${language}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">مشاهده در گیت‌هاب</a>
    </div>
  `;
  container.appendChild(card);
}

// Function to render repos card
function renderReposCard(container, name, description, stars, forks, language, link) {
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
      <img src="Sea/apps/scalable/geany.svg" alt="Repository Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${name}</h3>
      <p class="text-sm text-blue-200 mb-2">${description}</p>
      <p class="text-sm text-cyan-200 mb-1">ستاره‌ها: ${stars} | فورک‌ها: ${forks}</p>
      <p class="text-sm text-cyan-200 mb-2">زبان: ${language}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">مشاهده در گیت‌هاب</a>
    </div>
  `;
  container.appendChild(card);
}

// Process reviews data with Persian translation
async function processReviews(doc, container) {
  const reviewItems = doc.querySelectorAll("tr");
  container.innerHTML = '';
  let reviewCount = 0;
  for (const item of reviewItems) {
    if (reviewCount >= 10) break; // Limit to 10 recent reviews
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
      // Translate to Persian
      const translatedTitle = await translateToPersian(title);
      const translatedSummary = await translateToPersian(summary);
      const issueDate = date.replace(/-/g, '');
      const link = "https://distrowatch.com/weekly.php?issue=" + issueDate;
      renderReviewsCard(container, translatedTitle, author, date, translatedSummary + " (Source: " + link + ")", link);
      reviewCount++;
    }
  }
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
  container.innerHTML = '';
  let repoCount = 0;
  for (const repo of repos.items) {
    if (repoCount >= 10) break; // Limit to 10 repos
    const name = repo.name;
    const description = repo.description || 'توضیحی در دسترس نیست.';
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;
    const language = repo.language || 'نامشخص';
    const link = repo.html_url;
    // Translate name and description to Persian
    const translatedName = await translateToPersian(name);
    const translatedDescription = await translateToPersian(description);
    renderBsdCard(container, translatedName, translatedDescription, stars, forks, language, link);
    repoCount++;
  }
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
  container.innerHTML = '';
  let repoCount = 0;
  for (const repo of repos.items) {
    if (repoCount >= 10) break; // Limit to 10 repos
    const name = repo.name;
    const description = repo.description || 'توضیحی در دسترس نیست.';
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;
    const language = repo.language || 'نامشخص';
    const link = repo.html_url;
    // Translate name and description to Persian
    const translatedName = await translateToPersian(name);
    const translatedDescription = await translateToPersian(description);
    renderReposCard(container, translatedName, translatedDescription, stars, forks, language, link);
    repoCount++;
  }
  if (repoCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ مخزنی یافت نشد.</p>';
  }
}

// Function for hash-based routing (SPA behavior)
const handleHashChange = () => {
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

// Function to render weekly rankings card
function renderWeeklyCard(container, rank, name, hits) {
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
      <img src="Sea/apps/scalable/gnome-system-monitor.svg" alt="Weekly Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <div class="flex justify-between items-center mb-4">
        <span class="text-cyan-400 font-bold text-lg">#${rank}</span>
        <h3 class="text-xl font-semibold text-cyan-300 flex-1 text-center mx-4">${name}</h3>
        <p class="text-sm text-cyan-200 font-mono">هفته: ${hits}</p>
      </div>
    </div>
  `;
  container.appendChild(card);
}

// Process weekly rankings data
function processWeekly(doc, container) {
  container.innerHTML = ''; // Clear container
  const rows = doc.querySelectorAll("tr");
  console.log('Weekly rows found:', rows.length);
  let cardCount = 0;
  rows.forEach((row, index) => {
    if (index === 0) return; // Skip header row
    if (cardCount >= 200) return; // Limit to 200 for performance
    const cols = row.querySelectorAll("td, th"); // Include th for potential header-like rows
    if (cols.length >= 3) {
      const rankText = cols[0].textContent.trim();
      const rank = parseInt(rankText.replace(/[^\d]/g, '')) || (cardCount + 1);
      const nameElement = cols[1].querySelector('a');
      const name = nameElement ? nameElement.textContent.trim() : cols[1].textContent.trim();
      const hitsText = cols[2].textContent.trim();
      const hits = parseInt(hitsText.replace(/[^\d]/g, '')) || 0;
      console.log(`Processing weekly row ${index} (rank ${rank}): name="${name}", hits="${hits}"`);
      // Skip invalid rows: empty name, hits=0, hits=Infinity, or non-distro names
      if (name && name.length > 0 && hits > 0 && isFinite(hits) && !name.includes('Search') && !name.includes('DistroWatch Page Hit Ranking') && !name.includes('Page Hit Ranking Trends') && !name.includes('Last 12 months') && !name.includes('Trends') && name.length > 3 && name.match(/^[A-Z]/)) {
        renderWeeklyCard(container, cardCount + 1, name, hits); // Start rank from 1
        cardCount++;
      }
    }
  });
  console.log('Total weekly rendered:', cardCount);
  if (cardCount === 0) {
    container.innerHTML = `<p class="text-red-500">هیچ داده‌ای یافت نشد. لطفاً صفحه را دوباره بارگذاری کنید.</p>`;
  }
}

// Function to render Phoronix news card
function renderPhoronixCard(container, title, date, summary, link) {
  const card = document.createElement("div");
  card.className = "card";
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
      <img src="Sea/apps/scalable/gnome-system-monitor.svg" alt="Phoronix Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
      <p class="text-sm text-cyan-200 mb-2">${date}</p>
      <p class="text-sm text-blue-200 mb-4">${summary}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
    </div>
  `;
  container.appendChild(card);
}

// Process Phoronix news RSS data
async function processPhoronix(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Phoronix items found:', items.length);
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
        renderPhoronixCard(container, title, date, summary, link);
        cardCount++;
        if (cardCount >= 10) break; // Limit to 10 news
      }
    } catch (err) {
      console.error('Error processing Phoronix item:', err);
    }
  }
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render Linux.com news card
function renderLinuxComCard(container, title, date, summary, link) {
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
      <img src="Sea/apps/scalable/gnome-weather.svg" alt="Linux.com Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
      <p class="text-sm text-cyan-200 mb-2">${date}</p>
      <p class="text-sm text-blue-200 mb-4">${summary}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
    </div>
  `;
  container.appendChild(card);
}

// Process Linux.com news RSS data
async function processLinuxCom(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Linux.com items found:', items.length);
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
        const translatedTitle = await translateToPersian(title);
        const translatedSummary = await translateToPersian(summary);
        renderLinuxComCard(container, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= 10) break; // Limit to 10 news
      }
    } catch (err) {
      console.error('Error processing Linux.com item:', err);
    }
  }
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render LWN news card
function renderLWNCard(container, title, date, summary, link) {
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
      <img src="Sea/apps/scalable/gnome-terminal.svg" alt="LWN Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
      <p class="text-sm text-cyan-200 mb-2">${date}</p>
      <p class="text-sm text-blue-200 mb-4">${summary}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
    </div>
  `;
  container.appendChild(card);
}

// Process LWN news RSS data
async function processLWN(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('LWN items found:', items.length);
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
        const translatedTitle = await translateToPersian(title);
        const translatedSummary = await translateToPersian(summary);
        renderLWNCard(container, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= 10) break; // Limit to 10 news
      }
    } catch (err) {
      console.error('Error processing LWN item:', err);
    }
  }
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

// Function to render Linux Journal news card
function renderLinuxJournalCard(container, title, date, summary, link) {
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

    <div class="content-container ">
      <img src="Sea/apps/scalable/alien-arena.svg" alt="Linux Journal Icon" class="w-8 h-8 mb-2 mx-auto opacity-80">
      <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
      <p class="text-sm text-cyan-200 mb-2">${date}</p>
      <p class="text-sm text-blue-200 mb-4">${summary}</p>
      <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
    </div>
  `;
  container.appendChild(card);
}

// Process Linux Journal news RSS data
async function processLinuxJournal(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Linux Journal items found:', items.length);
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
        const translatedTitle = await translateToPersian(title);
        const translatedSummary = await translateToPersian(summary);
        renderLinuxJournalCard(container, translatedTitle, date, translatedSummary, link);
        cardCount++;
        if (cardCount >= 10) break; // Limit to 10 news
      }
    } catch (err) {
      console.error('Error processing Linux Journal item:', err);
    }
  }
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}

let originalDistros = '';
let originalWeekly = '';

// Fetch data on page load
document.addEventListener('DOMContentLoaded', async () => {
  originalDistros = document.getElementById('distros-container').innerHTML;
  originalWeekly = document.getElementById('weekly-container').innerHTML;

  const fetches = [
    fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros),
    fetchData('https://distrowatch.com/dwres.php?resource=popularity&sort=week', 'weekly-container', 'در حال بارگذاری رتبه‌بندی هفتگی...', 'خطا در دریافت رتبه‌بندی هفتگی', processWeekly),
    fetchData('https://www.linux.com/feed', 'news-container', 'در حال بارگذاری اخبار...', 'خطا در دریافت اخبار', processNews, "text/xml"),
    fetchData('https://www.phoronix.com/rss.php', 'phoronix-container', 'در حال بارگذاری اخبار فنی...', 'خطا در دریافت اخبار فنی', processPhoronix, "text/xml"),
    fetchData('https://www.reddit.com/r/linux/.rss', 'linuxcom-container', 'در حال بارگذاری اخبار عمومی...', 'خطا در دریافت اخبار عمومی', processLinuxCom, "text/xml"),
    fetchData('https://lwn.net/headlines/rss', 'lwn-container', 'در حال بارگذاری اخبار LWN...', 'خطا در دریافت اخبار LWN', processLWN, "text/xml"),
    fetchData('https://www.linuxjournal.com/node/feed', 'linuxjournal-container', 'در حال بارگذاری اخبار لینوکس ژورنال...', 'خطا در دریافت اخبار لینوکس ژورنال', processLinuxJournal, "text/xml"),
    fetchData('https://distrowatch.com/reviews/', 'reviews-container', 'در حال بارگذاری نقد و بررسی...', 'خطا در دریافت نقد و بررسی', processReviews),
    fetchData('https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', 'bsd-container', 'در حال بارگذاری سیستم‌های BSD...', 'خطا در دریافت BSD', processBsd, "application/json"),
    fetchData('https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', 'repos-container', 'در حال بارگذاری مخازن...', 'خطا در دریافت مخازن', processRepos, "application/json")
  ];

  for (const fetchPromise of fetches) {
    await fetchPromise;
  }

  handleHashChange();

  // Real-time updates every 5 minutes
  setInterval(async () => {
    const updateFetches = [
      fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros),
      fetchData('https://distrowatch.com/dwres.php?resource=popularity&sort=week', 'weekly-container', 'در حال بارگذاری رتبه‌بندی هفتگی...', 'خطا در دریافت رتبه‌بندی هفتگی', processWeekly),
      fetchData('https://www.linux.com/feed', 'news-container', 'در حال بارگذاری اخبار...', 'خطا در دریافت اخبار', processNews, "text/xml"),
      fetchData('https://www.phoronix.com/rss.php', 'phoronix-container', 'در حال بارگذاری اخبار فنی...', 'خطا در دریافت اخبار فنی', processPhoronix, "text/xml"),
      fetchData('https://distrowatch.com/reviews/', 'reviews-container', 'در حال بارگذاری نقد و بررسی...', 'خطا در دریافت نقد و بررسی', processReviews),
      fetchData('https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', 'bsd-container', 'در حال بارگذاری سیستم‌های BSD...', 'خطا در دریافت BSD', processBsd, "application/json"),
      fetchData('https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', 'repos-container', 'در حال بارگذاری مخازن...', 'خطا در دریافت مخازن', processRepos, "application/json")
    ];

    for (const fetchPromise of updateFetches) {
      await fetchPromise;
    }
  }, 300000);
});

// Handle hash changes for SPA navigation
window.addEventListener('hashchange', handleHashChange);

// Refresh buttons
document.getElementById('refresh-distros').addEventListener('click', () => fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros));
document.getElementById('refresh-weekly').addEventListener('click', () => fetchData('https://distrowatch.com/dwres.php?resource=popularity&sort=week', 'weekly-container', 'در حال بارگذاری رتبه‌بندی هفتگی...', 'خطا در دریافت رتبه‌بندی هفتگی', processWeekly));
document.getElementById('refresh-news').addEventListener('click', () => fetchData('https://www.linux.com/feed', 'news-container', 'در حال بارگذاری اخبار...', 'خطا در دریافت اخبار', processNews, "text/xml"));
document.getElementById('refresh-phoronix').addEventListener('click', () => fetchData('https://www.phoronix.com/rss.php', 'phoronix-container', 'در حال بارگذاری اخبار فنی...', 'خطا در دریافت اخبار فنی', processPhoronix, "text/xml"));
document.getElementById('refresh-linuxcom').addEventListener('click', () => fetchData('https://www.reddit.com/r/linux/.rss', 'linuxcom-container', 'در حال بارگذاری اخبار عمومی...', 'خطا در دریافت اخبار عمومی', processLinuxCom, "text/xml"));
document.getElementById('refresh-lwn').addEventListener('click', () => fetchData('https://lwn.net/headlines/rss', 'lwn-container', 'در حال بارگذاری اخبار LWN...', 'خطا در دریافت اخبار LWN', processLWN, "text/xml"));
document.getElementById('refresh-linuxjournal').addEventListener('click', () => fetchData('https://www.linuxjournal.com/node/feed', 'linuxjournal-container', 'در حال بارگذاری اخبار لینوکس ژورنال...', 'خطا در دریافت اخبار لینوکس ژورنال', processLinuxJournal, "text/xml"));
document.getElementById('refresh-reviews').addEventListener('click', () => fetchData('https://distrowatch.com/reviews/', 'reviews-container', 'در حال بارگذاری نقد و بررسی...', 'خطا در دریافت نقد و بررسی', processReviews));
document.getElementById('refresh-bsd').addEventListener('click', () => fetchData('https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', 'bsd-container', 'در حال بارگذاری سیستم‌های BSD...', 'خطا در دریافت BSD', processBsd, "application/json"));
document.getElementById('refresh-repos').addEventListener('click', () => fetchData('https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', 'repos-container', 'در حال بارگذاری مخازن...', 'خطا در دریافت مخازن', processRepos, "application/json"));

// Dark mode toggle (removed as per user request)

