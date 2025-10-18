// Optimized constants and caches
const cache = new Map();
const translationCache = new Map();
const proxies = [
  { base: 'https://corsproxy.io/?', format: (u) => encodeURIComponent(u) },
  { base: 'https://api.allorigins.win/raw?url=', format: (u) => encodeURIComponent(u) },
  { base: 'https://api.codetabs.com/v1/proxy?quest=', format: (u) => u },
  { base: 'https://thingproxy.freeboard.io/fetch/', format: (u) => u },
  { base: 'https://cors-anywhere.herokuapp.com/', format: (u) => u }
];
const isMobile = window.innerWidth < 768;
const newsLimit = isMobile ? 10 : 20;
const distroLimit = isMobile ? 10 : 20;
const imgSize = isMobile ? 16 : 32;
