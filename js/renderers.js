// Base card renderer with Bootstrap 3D effect
function renderCard(container, innerContent) {
  const card = document.createElement("div");
  card.className = "col-md-6 col-lg-4 mb-4";
  card.innerHTML = `
    <div class="card h-100 bg-dark text-white border-secondary shadow-lg 3d-card" style="transition: transform 0.3s ease, box-shadow 0.3s ease;">
      <div class="card-body d-flex flex-column">
        ${innerContent}
      </div>
    </div>
  `;
  container.appendChild(card);
}

// Function to render news card
function renderNewsCard(container, title, date, summary, link) {
  const innerContent = `
    <img src="img/apps/scalable/gnome-weather.svg" alt="News Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
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

// Function to render Ubuntu News card
function renderUbuntuNewsCard(container, title, date, summary, link, author) {
  const innerContent = `
    <img src="img/ubuntu-logo.png" alt="Ubuntu News Icon" style="width: ${imgSize}px; height: ${imgSize}px;" class="mb-2 mx-auto opacity-80" loading="lazy">
    <h3 class="text-xl font-semibold text-cyan-300 mb-2">${title}</h3>
    <p class="text-sm text-cyan-200 mb-1">نویسنده: ${author}</p>
    <p class="text-sm text-cyan-200 mb-2">${date}</p>
    <p class="text-sm text-blue-200 mb-4">${summary}</p>
    <a href="${link}" target="_blank" class="text-cyan-400 hover:text-white transition">بیشتر بخوانید</a>
  `;
  renderCard(container, innerContent);
}
