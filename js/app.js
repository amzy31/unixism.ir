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

let originalDistros = '';

// Eager load all sections
const allSections = [
  { id: 'distros-container', url: 'https://distrowatch.com/dwres.php?resource=popularity', msg: 'در حال بارگذاری توزیع‌ها...', err: 'خطا در دریافت داده‌ها', proc: processDistros },
  { id: 'news-container', url: 'https://www.linux.com/feed', msg: 'در حال بارگذاری اخبار...', err: 'خطا در دریافت اخبار', proc: processNews, type: "text/xml" },
  { id: 'phoronix-container', url: 'https://www.phoronix.com/rss.php', msg: 'در حال بارگذاری اخبار فنی...', err: 'خطا در دریافت اخبار فنی', proc: processPhoronix, type: "text/xml" },
  { id: 'linuxcom-container', url: 'https://www.reddit.com/r/linux/.rss', msg: 'در حال بارگذاری اخبار عمومی...', err: 'خطا در دریافت اخبار عمومی', proc: processLinuxCom, type: "text/xml" },
  { id: 'linuxjournal-container', url: 'https://www.linuxjournal.com/node/feed', msg: 'در حال بارگذاری اخبار لینوکس ژورنال...', err: 'خطا در دریافت اخبار لینوکس ژورنال', proc: processLinuxJournal, type: "text/xml" },
  { id: 'reviews-container', url: 'https://distrowatch.com/reviews/', msg: 'در حال بارگذاری نقد و بررسی...', err: 'خطا در دریافت نقد و بررسی', proc: processReviews },
  { id: 'bsd-container', url: 'https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', msg: 'در حال بارگذاری سیستم‌های BSD...', err: 'خطا در دریافت BSD', proc: processBsd, type: "application/json" },
  { id: 'repos-container', url: 'https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', msg: 'در حال بارگذاری مخازن...', err: 'خطا در دریافت مخازن', proc: processRepos, type: "application/json" },
  { id: 'ubuntu-news-container', url: 'https://ubuntu.com/blog/feed', msg: 'در حال بارگذاری اخبار اوبونتو...', err: 'خطا در دریافت اخبار اوبونتو', proc: processUbuntuNews, type: "text/xml" }
];

// Fetch data on page load
document.addEventListener('DOMContentLoaded', async () => {
  originalDistros = document.getElementById('distros-container').innerHTML;

  handleHashChange();

  // Load all sections immediately
  for (const section of allSections) {
    const type = section.type || "text/html";
    fetchData(section.url, section.id, section.msg, section.err, section.proc, type);
  }
});

// Handle hash changes for SPA navigation
window.addEventListener('hashchange', handleHashChange);

// Refresh buttons with null checks
const refreshDistros = document.getElementById('refresh-distros');
if (refreshDistros) refreshDistros.addEventListener('click', () => {
  cache.delete('https://distrowatch.com/dwres.php?resource=popularity');
  fetchData('https://distrowatch.com/dwres.php?resource=popularity', 'distros-container', 'در حال بارگذاری توزیع‌ها...', 'خطا در دریافت داده‌ها', processDistros);
});

const refreshNews = document.getElementById('refresh-news');
if (refreshNews) refreshNews.addEventListener('click', () => {
  cache.delete('https://www.linux.com/feed');
  fetchData('https://www.linux.com/feed', 'news-container', 'در حال بارگذاری اخبار...', 'خطا در دریافت اخبار', processNews, "text/xml");
});

const refreshPhoronix = document.getElementById('refresh-phoronix');
if (refreshPhoronix) refreshPhoronix.addEventListener('click', () => {
  cache.delete('https://www.phoronix.com/rss.php');
  fetchData('https://www.phoronix.com/rss.php', 'phoronix-container', 'در حال بارگذاری اخبار فنی...', 'خطا در دریافت اخبار فنی', processPhoronix, "text/xml");
});

const refreshLinuxcom = document.getElementById('refresh-linuxcom');
if (refreshLinuxcom) refreshLinuxcom.addEventListener('click', () => {
  cache.delete('https://www.reddit.com/r/linux/.rss');
  fetchData('https://www.reddit.com/r/linux/.rss', 'linuxcom-container', 'در حال بارگذاری اخبار عمومی...', 'خطا در دریافت اخبار عمومی', processLinuxCom, "text/xml");
});

const refreshLwn = document.getElementById('refresh-lwn');
if (refreshLwn) refreshLwn.addEventListener('click', () => {
  cache.delete('https://lwn.net/headlines/rss');
  fetchData('https://lwn.net/headlines/rss', 'lwn-container', 'در حال بارگذاری اخبار LWN...', 'خطا در دریافت اخبار LWN', processLWN, "text/xml");
});

const refreshLinuxjournal = document.getElementById('refresh-linuxjournal');
if (refreshLinuxjournal) refreshLinuxjournal.addEventListener('click', () => {
  cache.delete('https://www.linuxjournal.com/node/feed');
  fetchData('https://www.linuxjournal.com/node/feed', 'linuxjournal-container', 'در حال بارگذاری اخبار لینوکس ژورنال...', 'خطا در دریافت اخبار لینوکس ژورنال', processLinuxJournal, "text/xml");
});

const refreshReviews = document.getElementById('refresh-reviews');
if (refreshReviews) refreshReviews.addEventListener('click', () => {
  cache.delete('https://distrowatch.com/reviews/');
  fetchData('https://distrowatch.com/reviews/', 'reviews-container', 'در حال بارگذاری نقد و بررسی...', 'خطا در دریافت نقد و بررسی', processReviews);
});

const refreshBsd = document.getElementById('refresh-bsd');
if (refreshBsd) refreshBsd.addEventListener('click', () => {
  cache.delete('https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc');
  fetchData('https://api.github.com/search/repositories?q=bsd&sort=stars&order=desc', 'bsd-container', 'در حال بارگذاری سیستم‌های BSD...', 'خطا در دریافت BSD', processBsd, "application/json");
});

const refreshRepos = document.getElementById('refresh-repos');
if (refreshRepos) refreshRepos.addEventListener('click', () => {
  cache.delete('https://api.github.com/search/repositories?q=linux&sort=stars&order=desc');
  fetchData('https://api.github.com/search/repositories?q=linux&sort=stars&order=desc', 'repos-container', 'در حال بارگذاری مخازن...', 'خطا در دریافت مخازن', processRepos, "application/json");
});

const refreshUbuntuNews = document.getElementById('refresh-ubuntu-news');
if (refreshUbuntuNews) refreshUbuntuNews.addEventListener('click', () => {
  cache.delete('https://ubuntu.com/blog/feed');
  fetchData('https://ubuntu.com/blog/feed', 'ubuntu-news-container', 'در حال بارگذاری اخبار اوبونتو...', 'خطا در دریافت اخبار اوبونتو', processUbuntuNews, "text/xml");
});
