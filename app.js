import { artists, works } from './data.js';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const state = { page: 'explore', type: 'artists', movement: 'Tous', query: '', sort: 'name' };
let favorites = { artists: [], works: [] };
try {
  const saved = JSON.parse(localStorage.getItem('artquest.favorites.v1'));
  for (const type of ['artists', 'works']) {
    if (Array.isArray(saved?.[type])) favorites[type] = [...new Set(saved[type])].filter((id) => (type === 'artists' ? artists : works).some((item) => item.id === id));
  }
} catch { /* Ignore unavailable or malformed browser storage. */ }
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2400);
}
function toggleFavorite(type, id) {
  const added = !favorites[type].includes(id);
  favorites[type] = added ? [...favorites[type], id] : favorites[type].filter((value) => value !== id);
  try { localStorage.setItem('artquest.favorites.v1', JSON.stringify(favorites)); }
  catch { toast('Stockage indisponible : favoris conservés pour cette session.'); render(); return; }
  toast(added ? 'Ajouté à votre collection' : 'Retiré de votre collection');
  render();
  document.querySelectorAll(`[data-fav="${type}:${id}"]`).forEach((button) => updateFavoriteButton(button, type, id));
}
function updateFavoriteButton(button, type, id) {
  const selected = favorites[type].includes(id);
  button.classList.toggle('selected', selected);
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', selected ? 'Retirer des favoris' : 'Ajouter aux favoris');
  if (button.classList.contains('favorite')) button.textContent = selected ? '♥' : '♡';
  else button.textContent = selected ? '♥ Dans ma collection' : '♡ Ajouter à ma collection';
}
function favoriteButton(type, id, large = false) {
  const selected = favorites[type].includes(id);
  return `<button class="${large ? 'primary' : 'favorite'}${selected ? ' selected' : ''}" data-fav="${type}:${id}" aria-pressed="${selected}" aria-label="${selected ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${large ? (selected ? '♥ Dans ma collection' : '♡ Ajouter à ma collection') : (selected ? '♥' : '♡')}</button>`;
}
function image(work, lazy = true) {
  return `<img src="${escapeHtml(work.image)}" alt="${escapeHtml(work.title)} — ${escapeHtml(work.artist)}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`;
}
function artistCard(artist) {
  const paintings = works.filter((work) => work.artistId === artist.id);
  const cover = paintings.find((work) => work.id === artist.cover) || paintings[0];
  return `<article class="card">${favoriteButton('artists', artist.id)}<button class="image-link" data-artist="${artist.id}" aria-label="Découvrir ${escapeHtml(artist.name)}">${image(cover)}<span class="number">${String(paintings.length).padStart(2, '0')} ŒUVRES</span></button><h3><button class="title-link" data-artist="${artist.id}">${escapeHtml(artist.name)}</button></h3><p>${escapeHtml(artist.country)} · ${escapeHtml(artist.dates)}</p><div class="card-meta"><span class="tag">${escapeHtml(artist.movement)}</span><span>Découvrir ↗</span></div></article>`;
}
function workCard(work) {
  const artist = artists.find((item) => item.id === work.artistId);
  return `<article class="card work-card">${favoriteButton('works', work.id)}<button class="image-link" data-work="${work.id}" aria-label="Voir ${escapeHtml(work.title)}">${image(work)}</button><h3><button class="title-link" data-work="${work.id}">${escapeHtml(work.title)}</button></h3><p>${escapeHtml(artist.name)} · ${escapeHtml(work.date)}</p><div class="card-meta"><span class="tag">${escapeHtml(artist.movement)}</span><span>Voir l’œuvre ↗</span></div></article>`;
}
function render() {
  $('#count').textContent = favorites.artists.length + favorites.works.length;
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === state.page));
  document.querySelectorAll('[data-type]').forEach((button) => { button.classList.toggle('active', button.dataset.type === state.type); button.setAttribute('aria-pressed', String(button.dataset.type === state.type)); });
  const featured = works.find((work) => work.id === 436535) || works[0];
  $('#intro').innerHTML = state.page === 'explore' ? `<section class="hero"><div><div class="eyebrow">Votre prochaine découverte</div><h1>L’art se regarde.<br>Et se <em>rencontre.</em></h1><p>Des grands maîtres aux détails qui vous touchent. Explorez la peinture et composez une collection qui vous ressemble.</p><button class="primary" id="startExploring">Explorer les peintres <span>↗</span></button></div><div class="hero-art"><button class="image-link" data-work="${featured.id}" aria-label="Découvrir ${escapeHtml(featured.title)}">${image(featured, false)}</button><div class="caption"><b>Vincent van Gogh</b><span>${escapeHtml(featured.title)} · ${escapeHtml(featured.date)}</span></div><div class="hero-stamp">L’ART<br>À PORTÉE<br>DE REGARD</div></div></section>` : `<section class="collection-intro"><div class="eyebrow">Votre musée personnel</div><h1>Ce qui vous <em>touche.</em></h1><p>Vos peintres et vos œuvres préférés, réunis au même endroit.</p></section>`;
  const movements = ['Tous', ...new Set(artists.map((artist) => artist.movement))];
  $('#filters').innerHTML = movements.map((movement) => `<button data-movement="${escapeHtml(movement)}" class="${state.movement === movement ? 'active' : ''}" aria-pressed="${state.movement === movement}">${escapeHtml(movement)}</button>`).join('');
  let items = (state.type === 'artists' ? artists : works).filter((item) => {
    const artist = state.type === 'artists' ? item : artists.find((value) => value.id === item.artistId);
    return (state.page !== 'favorites' || favorites[state.type].includes(item.id)) && (state.movement === 'Tous' || artist.movement === state.movement) && normalize(`${artist.name} ${artist.country} ${artist.movement} ${item.title || ''}`).includes(normalize(state.query));
  });
  items.sort((a, b) => state.sort === 'date' ? Number(a.year) - Number(b.year) : (a.name || a.title).localeCompare(b.name || b.title, 'fr'));
  $('#sectionTitle').textContent = state.type === 'artists' ? (state.page === 'favorites' ? 'Mes peintres favoris' : 'Rencontrez les maîtres') : (state.page === 'favorites' ? 'Mes œuvres favorites' : 'Un monde de couleurs');
  $('#results').textContent = `${items.length} ${state.type === 'artists' ? 'peintre' : 'œuvre'}${items.length > 1 ? 's' : ''} · sélection du Met`;
  $('#grid').innerHTML = items.length ? items.map(state.type === 'artists' ? artistCard : workCard).join('') : `<div class="empty"><h3>${state.page === 'favorites' ? 'Votre collection attend ses premiers coups de cœur.' : 'Aucun résultat pour le moment.'}</h3><p>${state.page === 'favorites' ? 'Cliquez sur le cœur d’un peintre ou d’une œuvre pour le retrouver ici.' : 'Essayez un autre nom ou un autre mouvement.'}</p><button class="primary" id="resetFilters">Explorer la sélection ↗</button></div>`;
  attachImageFallbacks();
}
function attachImageFallbacks() {
  document.querySelectorAll('img').forEach((img) => { img.onerror = () => { const notice = document.createElement('span'); notice.className = 'image-unavailable'; notice.textContent = 'Reproduction indisponible'; notice.style.cssText = 'display:grid;place-items:center;min-height:200px;color:#73766f;font-size:12px'; img.replaceWith(notice); }; });
}
function openDialog(html) {
  $('#dialogContent').innerHTML = html;
  if (!$('#detail').open) $('#detail').showModal();
  $('#detail').scrollTop = 0;
  attachImageFallbacks();
}
function showArtist(id) {
  const artist = artists.find((item) => item.id === id);
  if (!artist) return;
  const paintings = works.filter((work) => work.artistId === id);
  openDialog(`<div class="artist-intro"><div class="eyebrow">${escapeHtml(artist.movement)}</div><h2>${escapeHtml(artist.name)}</h2><p>${escapeHtml(artist.country)} · ${escapeHtml(artist.dates)}</p><p>${escapeHtml(artist.bio)}</p>${favoriteButton('artists', id, true)}</div><div class="section-heading"><h2>Dans la galerie</h2><span>${paintings.length} œuvres du Met</span></div><div class="grid artist-grid">${paintings.map(workCard).join('')}</div>`);
}
function showWork(id) {
  const work = works.find((item) => item.id === id);
  if (!work) return;
  const artist = artists.find((item) => item.id === work.artistId);
  openDialog(`<div class="detail-layout"><img class="detail-image" src="${escapeHtml(work.fullImage)}" alt="${escapeHtml(work.title)}"><div class="detail-copy"><div class="eyebrow">${escapeHtml(artist.movement)}</div><h2>${escapeHtml(work.title)}</h2><button class="title-link" data-artist="${artist.id}">${escapeHtml(artist.name)} ↗</button><dl><dt>Date</dt><dd>${escapeHtml(work.date)}</dd><dt>Technique</dt><dd>${escapeHtml(work.medium)}</dd><dt>Dimensions</dt><dd>${escapeHtml(work.dimensions)}</dd><dt>Collection</dt><dd>The Metropolitan Museum of Art, New York</dd></dl><p>Reproduction du domaine public · Met Open Access.<br>${escapeHtml(work.credit)}<br>Les titres et notices techniques sont ceux du musée.</p>${favoriteButton('works', id, true)}<br><a class="source" href="${escapeHtml(work.source)}" target="_blank" rel="noopener noreferrer">Consulter la notice du musée ↗</a></div></div>`);
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.fav) { const [type, rawId] = target.dataset.fav.split(':'); toggleFavorite(type, type === 'works' ? Number(rawId) : rawId); }
  else if (target.dataset.artist) showArtist(target.dataset.artist);
  else if (target.dataset.work) showWork(Number(target.dataset.work));
  else if (target.dataset.type) { state.type = target.dataset.type; render(); }
  else if (target.dataset.movement) { state.movement = target.dataset.movement; render(); }
  else if (target.id === 'startExploring') $('#gallery').scrollIntoView({behavior: 'smooth'});
  else if (target.id === 'random') showWork(works[Math.floor(Math.random() * works.length)].id);
  else if (target.id === 'resetFilters') { state.query = ''; state.movement = 'Tous'; $('#search').value = ''; location.hash = 'explore'; state.page = 'explore'; render(); }
  else if (target.classList.contains('close')) $('#detail').close();
  else if (target.id === 'about') openDialog(`<div class="artist-intro"><div class="eyebrow">À propos d’ArtQuest</div><h2>Une galerie à explorer.</h2><p>Cette première sélection rassemble ${artists.length} peintres et ${works.length} tableaux des collections ouvertes du Metropolitan Museum of Art. Elle ne représente pas leur catalogue complet. Les œuvres sont conservées sous leurs titres d’origine ; les présentations des peintres sont rédigées pour ArtQuest.</p><p>Reproductions signalées comme appartenant au domaine public par le musée. Chaque œuvre comporte un lien vers sa notice et ses crédits.</p><p>Vos favoris sont enregistrés uniquement dans ce navigateur, sans compte ni synchronisation entre appareils. Effacer les données du site efface également les favoris.</p><a class="primary" href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" target="_blank" rel="noopener noreferrer">Met Open Access ↗</a></div>`);
});
$('#search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
$('#sort').addEventListener('change', (event) => { state.sort = event.target.value; render(); });
$('#detail').addEventListener('click', (event) => { if (event.target === $('#detail')) { const rect = $('#detail').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#detail').close(); } });
window.addEventListener('hashchange', route);
function route() { state.page = location.hash === '#favorites' ? 'favorites' : 'explore'; render(); }
route();
