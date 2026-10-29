import { artists, works } from './data.js';
import { searchArtists, artistWorks, imageCredit, safeUrl } from './catalog-api.js';

// Restore remote favorite snapshots before validating saved favorite identifiers.
try {
  const saved = JSON.parse(localStorage.getItem('artquest.remote.v1'));
  for (const [key, target] of [['artists', artists], ['works', works]]) {
    for (const item of saved?.[key] || []) {
      if (item.remote && /^wd-Q\d+$/.test(item.id) && !target.some(existing => existing.id === item.id)) target.push(item);
    }
  }
} catch { /* An invalid cache must not prevent the local catalog from loading. */ }

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
  try {
    localStorage.setItem('artquest.remote.v1', JSON.stringify({artists:artists.filter(a => a.remote && (favorites.artists.includes(a.id) || works.some(w => favorites.works.includes(w.id) && w.artistId === a.id))),works:works.filter(w => w.remote && favorites.works.includes(w.id))}));
    localStorage.setItem('artquest.favorites.v1', JSON.stringify(favorites));
  }
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
  if (!work?.image || !safeUrl(work.image)) return `<span class="image-placeholder">${work?.remote ? 'Reproduction non disponible' : 'Galerie à découvrir'}</span>`;
  return `<img src="${escapeHtml(safeUrl(work.image))}" alt="${escapeHtml(work.title)} — ${escapeHtml(work.artist)}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`;
}
function artistCard(artist) {
  const paintings = works.filter((work) => work.artistId === artist.id);
  const cover = paintings.find((work) => work.id === artist.cover) || paintings[0] || {image:artist.image,title:artist.name,artist:artist.name,remote:true};
  return `<article class="card">${favoriteButton('artists', artist.id)}<button class="image-link" data-artist="${artist.id}" aria-label="Découvrir ${escapeHtml(artist.name)}">${image(cover)}<span class="number">${artist.remote ? 'CATALOGUE MONDIAL' : String(paintings.length).padStart(2, '0') + ' ŒUVRE' + (paintings.length > 1 ? 'S' : '')}</span></button><h3><button class="title-link" data-artist="${artist.id}">${escapeHtml(artist.name)}</button></h3><p>${escapeHtml(artist.country)} · ${escapeHtml(artist.dates)}</p><div class="card-meta"><span class="tag">${escapeHtml(artist.movement)}</span>${artist.remote && artist.imageSource ? `<a href="${escapeHtml(safeUrl(artist.imageSource))}" target="_blank" rel="noopener noreferrer" aria-label="Crédits de l’image de ${escapeHtml(artist.name)}">Image · Commons ↗</a>` : '<span>Découvrir ↗</span>'}</div></article>`;
}
function workCard(work) {
  const artist = artists.find((item) => item.id === work.artistId);
  return `<article class="card work-card">${favoriteButton('works', work.id)}<button class="image-link" data-work="${work.id}" aria-label="Voir ${escapeHtml(work.title)}">${image(work)}</button><h3><button class="title-link" data-work="${work.id}">${escapeHtml(work.title)}</button></h3><p>${escapeHtml(artist.name)} · ${escapeHtml(work.date)}</p><div class="card-meta"><span class="tag">${escapeHtml(artist.movement)}</span>${work.remote && work.imageSource ? `<a href="${escapeHtml(safeUrl(work.imageSource))}" target="_blank" rel="noopener noreferrer">Image · Commons ↗</a>` : '<span>Voir l’œuvre ↗</span>'}</div></article>`;
}
function render() {
  $('#count').textContent = favorites.artists.length + favorites.works.length;
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === state.page));
  document.querySelectorAll('[data-type]').forEach((button) => { button.classList.toggle('active', button.dataset.type === state.type); button.setAttribute('aria-pressed', String(button.dataset.type === state.type)); });
  const featured = works.find((work) => work.id === 436535) || works[0];
  $('#intro').innerHTML = state.page === 'explore' ? `<section class="hero"><div><div class="eyebrow">Votre prochaine découverte</div><h1>L’art se regarde.<br>Et se <em>rencontre.</em></h1><p>Des grands maîtres aux détails qui vous touchent. Explorez la peinture et composez une collection qui vous ressemble.</p><button class="primary" id="startExploring">Explorer les peintres <span>↗</span></button></div><div class="hero-art"><button class="image-link" data-work="${featured.id}" aria-label="Découvrir ${escapeHtml(featured.title)}">${image(featured, false)}</button><div class="caption"><b>Vincent van Gogh</b><span>${escapeHtml(featured.title)} · ${escapeHtml(featured.date)}</span></div><div class="hero-stamp">L’ART<br>À PORTÉE<br>DE REGARD</div></div></section>` : `<section class="collection-intro"><div class="eyebrow">Votre musée personnel</div><h1>Ce qui vous <em>touche.</em></h1><p>Vos peintres et vos œuvres préférés, réunis au même endroit.</p></section>`;
  const movements = ['Tous', ...new Set(artists.filter(a=>!a.remote || state.page==='favorites').map((artist) => artist.movement))];
  $('#filters').innerHTML = movements.map((movement) => `<button data-movement="${escapeHtml(movement)}" class="${state.movement === movement ? 'active' : ''}" aria-pressed="${state.movement === movement}">${escapeHtml(movement)}</button>`).join('');
  let items = (state.type === 'artists' ? artists : works).filter((item) => {
    const artist = state.type === 'artists' ? item : artists.find((value) => value.id === item.artistId);
    return (state.page !== 'explore' || !item.remote) && (state.page !== 'favorites' || favorites[state.type].includes(item.id)) && (state.movement === 'Tous' || artist.movement === state.movement) && normalize(`${artist.name} ${artist.country} ${artist.movement} ${item.title || ''}`).includes(normalize(state.query));
  });
  items.sort((a, b) => state.sort === 'date' ? Number(a.year) - Number(b.year) : (a.name || a.title).localeCompare(b.name || b.title, 'fr'));
  $('#sectionTitle').textContent = state.type === 'artists' ? (state.page === 'favorites' ? 'Mes peintres favoris' : 'Rencontrez les maîtres') : (state.page === 'favorites' ? 'Mes œuvres favorites' : 'Un monde de couleurs');
  $('#results').textContent = `${items.length} ${state.type === 'artists' ? 'peintre' : 'œuvre'}${items.length > 1 ? 's' : ''} · ${state.page === 'favorites' ? 'ma collection' : 'sélection & découvertes'}`;
  $('#grid').innerHTML = items.length ? items.map(state.type === 'artists' ? artistCard : workCard).join('') : `<div class="empty"><h3>${state.page === 'favorites' ? 'Votre collection attend ses premiers coups de cœur.' : 'Aucune correspondance dans la sélection du Met.'}</h3><p>${state.page === 'favorites' ? 'Cliquez sur le cœur d’un peintre ou d’une œuvre pour le retrouver ici.' : 'Les résultats du catalogue mondial apparaissent au-dessus.'}</p><button class="primary" id="resetFilters">Explorer la sélection ↗</button></div>`;
  attachImageFallbacks();
  renderWorldSearch();
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
  if (artist.remote) { openWorldArtist(artist); return; }
  const paintings = works.filter((work) => work.artistId === id);
  openDialog(`<div class="artist-intro"><div class="eyebrow">${escapeHtml(artist.movement)}</div><h2>${escapeHtml(artist.name)}</h2><p>${escapeHtml(artist.country)} · ${escapeHtml(artist.dates)}</p><p>${escapeHtml(artist.bio)}</p>${favoriteButton('artists', id, true)} <button class="world-link" data-world-query="${escapeHtml(artist.name)}">Explorer davantage d’œuvres ↗</button></div><div class="section-heading"><h2>Dans la galerie</h2><span>${paintings.length} œuvres du Met</span></div><div class="grid artist-grid">${paintings.map(workCard).join('')}</div>`);
}
function showWork(id) {
  const work = works.find((item) => item.id === id);
  if (!work) return;
  if (work.remote) { openWorldWork(work); return; }
  const artist = artists.find((item) => item.id === work.artistId);
  openDialog(`<div class="detail-layout"><img class="detail-image" src="${escapeHtml(work.fullImage)}" alt="${escapeHtml(work.title)}"><div class="detail-copy"><div class="eyebrow">${escapeHtml(artist.movement)}</div><h2>${escapeHtml(work.title)}</h2><button class="title-link" data-artist="${artist.id}">${escapeHtml(artist.name)} ↗</button><dl><dt>Date</dt><dd>${escapeHtml(work.date)}</dd><dt>Technique</dt><dd>${escapeHtml(work.medium)}</dd><dt>Dimensions</dt><dd>${escapeHtml(work.dimensions)}</dd><dt>Collection</dt><dd>The Metropolitan Museum of Art, New York</dd></dl><p>Reproduction du domaine public · Met Open Access.<br>${escapeHtml(work.credit)}<br>Les titres et notices techniques sont ceux du musée.</p>${favoriteButton('works', id, true)}<br><a class="source" href="${escapeHtml(work.source)}" target="_blank" rel="noopener noreferrer">Consulter la notice du musée ↗</a></div></div>`);
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.fav) { const [type, rawId] = target.dataset.fav.split(':'); toggleFavorite(type, type === 'works' && !rawId.startsWith('wd-') ? Number(rawId) : rawId); }
  else if (target.dataset.artist) showArtist(target.dataset.artist);
  else if (target.dataset.work) showWork(target.dataset.work.startsWith('wd-') ? target.dataset.work : Number(target.dataset.work));
  else if (target.dataset.type) { state.type = target.dataset.type; render(); }
  else if (target.dataset.movement) { state.movement = target.dataset.movement; render(); }
  else if (target.id === 'startExploring') $('#gallery').scrollIntoView({behavior: 'smooth'});
  else if (target.id === 'random') showWork(works[Math.floor(Math.random() * works.length)].id);
  else if (target.id === 'resetFilters') { state.query = ''; state.movement = 'Tous'; $('#search').value = ''; location.hash = 'explore'; state.page = 'explore'; render(); }
  else if (target.classList.contains('close')) $('#detail').close();
  else if (target.id === 'about') openDialog(`<div class="artist-intro"><div class="eyebrow">À propos d’ArtQuest</div><h2>Une galerie à explorer.</h2><p>La sélection initiale du Met est complétée par une recherche mondiale dans Wikidata. Les œuvres répertoriées se chargent progressivement, avec les reproductions disponibles sur Wikimedia Commons. Aucun catalogue ne couvre tous les peintres ni toutes leurs œuvres. Les œuvres sont conservées sous leurs titres d’origine ; les présentations des peintres sont rédigées pour ArtQuest.</p><p>Les reproductions du Met sont signalées comme appartenant au domaine public. Les images de Commons disposent de leurs propres crédits et licences, consultables sur la fiche et la page du fichier. Les descriptions des artistes proviennent de Wikidata (CC0).</p><p>Vos favoris sont enregistrés uniquement dans ce navigateur, sans compte ni synchronisation entre appareils. Effacer les données du site efface également les favoris.</p><a class="primary" href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" target="_blank" rel="noopener noreferrer">Met Open Access ↗</a></div>`);
});
$('#search').addEventListener('input', (event) => { state.query = event.target.value; scheduleWorldSearch(); render(); });
$('#sort').addEventListener('change', (event) => { state.sort = event.target.value; render(); });
$('#detail').addEventListener('click', (event) => { if (event.target === $('#detail')) { const rect = $('#detail').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#detail').close(); } });
window.addEventListener('hashchange', route);
function route() { state.page = location.hash === '#favorites' ? 'favorites' : 'explore'; render(); }

let worldSearch = {query:'',artists:[],next:null,loading:false,error:''};
let searchTimer;
let searchController;
let activeArtist = null;
let artistController;
const worldPages = new Map();
function register(items, target) {
  for (const item of items) { const existing = target.find(value => value.id === item.id); if (existing) Object.assign(existing,item); else target.push(item); }
}
function initWorldSearch() {
  const panel = document.createElement('section'); panel.id = 'worldSearch'; panel.setAttribute('aria-label','Recherche mondiale');
  $('.section-heading').before(panel);
  $('#search').placeholder = 'Dufy, de Chirico, Monet…';
  const help = document.createElement('p'); help.className = 'search-help'; help.textContent = 'Recherchez un artiste dans le catalogue mondial. Ouvrez sa fiche pour explorer les œuvres référencées.';
  $('.toolbar').after(help);
  $('#detail').addEventListener('close',()=>{activeArtist=null;artistController?.abort();});
}
function scheduleWorldSearch() {
  clearTimeout(searchTimer); searchController?.abort();
  const query = state.query.trim();
  worldSearch = {query,artists:[],next:null,loading:query.length>=2,error:''};
  if (query.length>=2) searchTimer=setTimeout(()=>runWorldSearch(false),400);
}
async function runWorldSearch(more = false) {
  searchController?.abort(); searchController=new AbortController();
  const controller=searchController; const query=state.query.trim();
  worldSearch.loading=true; worldSearch.error='';renderWorldSearch();
  try {
    const result=await searchArtists(query,more ? worldSearch.next : 0,controller.signal);
    if (controller.signal.aborted || query !== state.query.trim()) return;
    register(result.artists,artists);
    worldSearch.artists=more ? [...worldSearch.artists,...result.artists.filter(a=>!worldSearch.artists.some(old=>old.id===a.id))] : result.artists;
    worldSearch.next=result.next;
  } catch (error) {if (controller.signal.aborted) return;worldSearch.error=error.message;}
  finally {if (!controller.signal.aborted){worldSearch.loading=false;renderWorldSearch();}}
}
function renderWorldSearch() {
  const panel=$('#worldSearch'); if (!panel) return;
  const visible=state.page==='explore' && state.query.trim().length>=2;
  panel.hidden=!visible;
  if (!visible) return;
  panel.innerHTML=`<div class="section-heading"><h2>Dans le monde de l’art</h2><span>Wikidata · recherche en ligne</span></div><p class="catalog-note">Artistes référencés au-delà de notre sélection. Les filtres de mouvement concernent la galerie locale.</p><div class="grid world-grid">${worldSearch.artists.map(artistCard).join('')}</div><div class="network-status" role="status" aria-live="polite">${worldSearch.loading ? 'Recherche des artistes…' : worldSearch.error ? escapeHtml(worldSearch.error) : worldSearch.artists.length ? `${worldSearch.artists.length} artistes trouvés` : 'Aucun artiste identifié sur cette page de résultats. Essayez le nom complet ou les résultats suivants.'}</div>${worldSearch.error ? '<button class="primary" data-world-retry>Réessayer la recherche</button>' : ''}${worldSearch.next !== null && !worldSearch.loading ? '<button class="world-link" data-world-more>Voir davantage de résultats ↗</button>' : ''}`;
  attachImageFallbacks();
}
function worldArtistHtml(artist, page) {
  const paintings=(page.ids || []).map(id=>works.find(work=>work.id===id)).filter(Boolean);
  return `<div class="artist-intro"><div class="eyebrow">Catalogue mondial</div><h2>${escapeHtml(artist.name)}</h2><p>${escapeHtml(artist.dates)} · ${escapeHtml(artist.bio)}</p>${favoriteButton('artists',artist.id,true)}<div class="source-links"><a href="${escapeHtml(artist.source)}" target="_blank" rel="noopener noreferrer">Wikidata ↗</a>${artist.wikipedia ? `<a href="${escapeHtml(artist.wikipedia)}" target="_blank" rel="noopener noreferrer">Biographie Wikipédia ↗</a>` : ''}</div></div><div class="section-heading"><h2>Les œuvres répertoriées</h2><span>${paintings.length} chargées${page.total !== null ? ' / '+page.total+' référencées' : ''}</span></div><div class="tabs" role="group" aria-label="Reproductions"><button data-images-mode="all" data-images-artist="${artist.id}" class="${!page.imagesOnly ? 'active' : ''}" aria-pressed="${!page.imagesOnly}">Toutes les œuvres</button><button data-images-mode="images" data-images-artist="${artist.id}" class="${page.imagesOnly ? 'active' : ''}" aria-pressed="${!!page.imagesOnly}">Avec reproduction</button></div><p class="catalog-note">Catalogue contributif, non exhaustif. Certaines œuvres n’ont pas de reproduction disponible. Les images et leurs licences proviennent de Wikimedia Commons.</p><div class="grid artist-grid">${paintings.map(workCard).join('')}</div><div class="network-status" role="status">${page.loading ? 'Chargement des œuvres…' : page.error ? escapeHtml(page.error) : !paintings.length ? 'Aucune œuvre répertoriée trouvée pour cet artiste.' : page.imageWarning ? 'Les notices sont chargées, mais le service d’images est indisponible.' : ''}</div>${!page.loading && (page.next !== null || page.error) ? `<button class="primary" data-artist-more="${artist.id}">${page.error ? 'Réessayer' : 'Charger davantage d’œuvres'}</button>` : ''}`;
}
function openWorldArtist(artist) {
  artistController?.abort(); activeArtist=artist.id;
  let page=worldPages.get(artist.id);
  if (!page) {page={next:0,total:null,loading:false,error:'',ids:[],imagesOnly:false};worldPages.set(artist.id,page);}
  openDialog(worldArtistHtml(artist,page));
  if (page.total===null) loadWorldWorks(artist);
}
async function loadWorldWorks(artist) {
  artistController?.abort(); artistController=new AbortController();const controller=artistController;
  const page=worldPages.get(artist.id);page.loading=true;page.error='';
  const scrollTop=$('#detail').scrollTop;
  $('#dialogContent').innerHTML=worldArtistHtml(artist,page);attachImageFallbacks();$('#detail').scrollTop=scrollTop;
  try {
    const result=await artistWorks(artist,page.next || 0,controller.signal,page.imagesOnly);
    if (controller.signal.aborted) return;
    register(result.works,works);page.ids=[...new Set([...(page.ids || []),...result.works.map(w=>w.id)])];page.next=result.next;page.total=result.total;page.imageWarning=result.imageWarning;
  } catch(error) {if (!controller.signal.aborted)page.error=error.message;}
  finally {
    page.loading=false;
    if (!controller.signal.aborted && activeArtist===artist.id && $('#detail').open) {$('#dialogContent').innerHTML=worldArtistHtml(artist,page);attachImageFallbacks();$('#detail').scrollTop=scrollTop;}
  }
}
async function openWorldWork(work) {
  artistController?.abort();activeArtist=null;
  openDialog(`<div class="detail-layout"><div>${work.image ? `<img class="detail-image" src="${escapeHtml(safeUrl(work.fullImage || work.image))}" alt="${escapeHtml(work.title)}">` : '<div class="image-placeholder">Cette œuvre est référencée sans reproduction disponible.</div>'}</div><div class="detail-copy"><div class="eyebrow">Catalogue mondial</div><h2>${escapeHtml(work.title)}</h2><button class="title-link" data-artist="${work.artistId}">${escapeHtml(work.artist)} ↗</button><dl><dt>Date</dt><dd>${escapeHtml(work.date)}</dd><dt>Technique</dt><dd>${escapeHtml(work.medium)}</dd><dt>Collection</dt><dd>${escapeHtml(work.collection)}</dd></dl>${favoriteButton('works',work.id,true)}<p id="imageCredit">${work.file ? 'Chargement des crédits de la reproduction…' : 'Aucune reproduction disponible dans ce catalogue.'}</p><a class="source" href="${escapeHtml(work.source)}" target="_blank" rel="noopener noreferrer">Notice Wikidata ↗</a>${work.imageSource ? `<br><a class="source" href="${escapeHtml(work.imageSource)}" target="_blank" rel="noopener noreferrer">Reproduction, crédits et licence sur Commons ↗</a>` : ''}</div></div>`);
  if (work.file) {
    const credit=$('#imageCredit');
    try {const metadata=await imageCredit(work.file);const plain=html=>new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();if(credit.isConnected)credit.textContent=[plain(metadata.Artist?.value),plain(metadata.Credit?.value),plain(metadata.LicenseShortName?.value)].filter(Boolean).join(' · ') || 'Consultez la page Commons pour les crédits et conditions de réutilisation.';}
    catch {if(credit.isConnected)credit.textContent='Crédits non chargés. Consultez la page Commons pour la licence et les attributions.';}
  }
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-world-more'))runWorldSearch(true);
  if(button.hasAttribute('data-world-retry'))runWorldSearch(false);
  if(button.dataset.imagesArtist){
    const artist=artists.find(a=>a.id===button.dataset.imagesArtist);
    if(artist){artistController?.abort();const page={next:0,total:null,loading:false,error:'',ids:[],imagesOnly:button.dataset.imagesMode==='images'};worldPages.set(artist.id,page);loadWorldWorks(artist);}
  }
  if(button.dataset.artistMore){const artist=artists.find(a=>a.id===button.dataset.artistMore);if(artist)loadWorldWorks(artist);}
  if(button.dataset.worldQuery){$('#detail').close();state.page='explore';state.type='artists';state.query=button.dataset.worldQuery;$('#search').value=state.query;location.hash='explore';scheduleWorldSearch();render();$('#gallery').scrollIntoView({behavior:'smooth'});}
});

initWorldSearch();
route();
