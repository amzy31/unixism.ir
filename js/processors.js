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
      const authorEl = item.querySelector('author') || item.querySelector('dc\\:creator');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      const author = authorEl ? authorEl.textContent.trim() : 'نامشخص';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 300) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
        const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
        renderNewsCard(container, translatedTitle, date, translatedSummary, link);
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
      if (summary.length > 300) summary = summary.substring(0, 300) + '...';
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
  const distroItems = doc.querySelectorAll("tr");
  const fragment = document.createDocumentFragment();
  let distroCount = 0;
  for (const item of distroItems) {
    if (distroCount >= distroLimit) break; // Limit based on device
    const cols = item.querySelectorAll("td");
    if (cols.length >= 2) {
      const rank = cols[0].textContent.trim();
      const nameElement = cols[1].querySelector("a");
      const name = nameElement ? nameElement.textContent.trim() : cols[1].textContent.trim();
      if (!name || name.includes('Select Distribution') || name.length < 3) continue; // Skip header/form rows
      // Translate name to Persian with idle callback
      const translatedName = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(name))));
      renderDistroCard(fragment, translatedName, rank);
      distroCount++;
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (distroCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ توزیعی یافت نشد.</p>';
  }
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

// Process Ubuntu News data with Persian translation
async function processUbuntuNews(doc, container) {
  const items = doc.querySelectorAll('item');
  console.log('Ubuntu News items found:', items.length);
  const fragment = document.createDocumentFragment();
  let cardCount = 0;
  for (const item of items) {
    try {
      const titleEl = item.querySelector('title');
      const dateEl = item.querySelector('pubDate');
      const descEl = item.querySelector('description');
      const authorEl = item.querySelector('author') || item.querySelector('dc\\:creator');
      const linkEl = item.querySelector('link');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : new Date().toLocaleDateString('fa-IR');
      let description = descEl ? descEl.textContent.trim() : '';
      const author = authorEl ? authorEl.textContent.trim() : 'نامشخص';
      if (description) {
        description = description.replace(/<[^>]*>/g, ''); // Strip HTML
      }
      const summary = description ? description.substring(0, 300) + '...' : 'خلاصه‌ای در دسترس نیست.';
      const link = linkEl ? linkEl.textContent.trim() : '#';
      if (title && link !== '#') {
        const translatedTitle = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(title))));
        const translatedSummary = await new Promise(resolve => requestIdleCallback(() => resolve(translateToPersian(summary))));
        renderUbuntuNewsCard(fragment, translatedTitle, date, translatedSummary, link, author);
        cardCount++;
        if (cardCount >= newsLimit) break; // Limit based on device
      }
    } catch (err) {
      console.error('Error processing Ubuntu News item:', err);
    }
  }
  container.innerHTML = '';
  container.appendChild(fragment);
  if (cardCount === 0) {
    container.innerHTML = '<p class="text-red-500">هیچ خبری یافت نشد.</p>';
  }
}
