const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const cache = new Map();
export const value = (entity, property) => entity.claims?.[property]?.find(s => s.rank !== 'deprecated' && s.mainsnak?.datavalue)?.mainsnak.datavalue.value;
const label = entity => entity.labels?.fr?.value || entity.labels?.en?.value || entity.id;
const description = entity => entity.descriptions?.fr?.value || entity.descriptions?.en?.value || '';
const year = date => date?.time?.match(/^[+-](\d+)/)?.[1]?.replace(/^0+(?=\d)/, '') || '';
export const safeUrl = url => { try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : ''; } catch { return ''; } };
export async function request(endpoint, params, signal) {
  const url = endpoint + '?' + new URLSearchParams({format:'json',origin:'*',...params});
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url, {signal: signal || AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(response.status === 429 ? 'Le catalogue reçoit trop de demandes. Réessayez dans quelques instants.' : 'Le catalogue est temporairement indisponible.');
  const data = await response.json();
  if (data.error) throw new Error('Le catalogue n’a pas pu répondre à cette recherche.');
  cache.set(url, data);
  return data;
}
async function entities(ids, signal) {
  if (!ids.length) return {};
  const data = await request(WIKIDATA, {action:'wbgetentities',ids:ids.join('|'),props:'labels|descriptions|claims|sitelinks',languages:'fr|en'}, signal);
  return data.entities || {};
}
export function isVisualArtist(entity) {
  if (!(entity.claims?.P31 || []).some(s => s.mainsnak?.datavalue?.value?.id === 'Q5')) return false;
  const occupations = (entity.claims?.P106 || []).map(s => s.mainsnak?.datavalue?.value?.id);
  return occupations.some(id => ['Q1028181','Q483501','Q644687','Q128161','Q33231','Q329439','Q49757'].includes(id)) || /peintre|painter|paintress|artiste|artist|sculpteur|sculptor|dessinateur|engraver|graveur/i.test(description(entity));
}
export function toArtist(entity) {
  const born = year(value(entity,'P569')); const died = year(value(entity,'P570'));
  return {id:'wd-'+entity.id,qid:entity.id,remote:true,name:label(entity),country:description(entity),dates:born ? `${born}–${died || '…'}` : '',year:Number(born)||0,movement:'Catalogue mondial',bio:description(entity),file:value(entity,'P18') || '',image:'',source:`https://www.wikidata.org/wiki/${entity.id}`,wikipedia:entity.sitelinks?.frwiki?.title ? `https://fr.wikipedia.org/wiki/${encodeURIComponent(entity.sitelinks.frwiki.title)}` : ''};
}
async function thumbnails(files, signal) {
  if (!files.length) return {};
  const data = await request(COMMONS,{action:'query',prop:'imageinfo',titles:[...new Set(files)].map(f=>'File:'+f.replaceAll('_',' ')).join('|'),iiprop:'url',iiurlwidth:'700'}, signal);
  const result = {};
  for (const page of Object.values(data.query?.pages || {})) {
    const image = page.imageinfo?.[0];
    if (image) result[page.title.slice(5).replaceAll('_',' ')] = {image:safeUrl(image.thumburl || image.url),fullImage:safeUrl(image.url),imageSource:safeUrl(image.descriptionurl)};
  }
  return result;
}
export async function searchArtists(query, offset = 0, signal) {
  const data = await request(WIKIDATA,{action:'wbsearchentities',search:query,language:'fr',uselang:'fr',type:'item',limit:'20',continue:String(offset)},signal);
  const details = await entities((data.search || []).map(item => item.id),signal);
  const artists = (data.search || []).map(item => details[item.id]).filter(entity => entity && isVisualArtist(entity)).map(toArtist);
  // Portrait availability must not prevent an artist from appearing in search.
  try {
    const images = await thumbnails(artists.map(a=>a.file).filter(Boolean),signal);
    for (const artist of artists) Object.assign(artist,images[artist.file.replaceAll('_',' ')] || {});
  } catch (error) { if (signal?.aborted) throw error; }
  return {artists,next:data['search-continue'] ?? null};
}
export function toWork(entity, artist, images, labels) {
  const file = value(entity,'P18') || '';
  const collectionId = value(entity,'P195')?.id;
  const mediumId = value(entity,'P186')?.id;
  return {id:'wd-'+entity.id,qid:entity.id,remote:true,artistId:artist.id,artist:artist.name,title:label(entity),date:year(value(entity,'P571')) || 'Date non renseignée',year:Number(year(value(entity,'P571')))||0,medium:labels[mediumId] ? label(labels[mediumId]) : 'Non renseignée',dimensions:'Non renseignées',collection:labels[collectionId] ? label(labels[collectionId]) : 'Collection non renseignée',image:'',fullImage:'',...images[file.replaceAll('_',' ')],file,source:`https://www.wikidata.org/wiki/${entity.id}`,credit:'Wikidata · Wikimedia Commons'};
}
export async function artistWorks(artist, offset = 0, signal, imagesOnly = false) {
  if (!/^Q\d+$/.test(artist.qid)) throw new Error('Identifiant d’artiste invalide.');
  const data = await request(WIKIDATA,{action:'query',list:'search',srsearch:`haswbstatement:P170=${artist.qid}${imagesOnly ? ' haswbstatement:P18' : ''}`,srnamespace:'0',srlimit:'24',sroffset:String(offset),srprop:''},signal);
  const details = await entities((data.query?.search || []).map(item => item.title),signal);
  const entries = (data.query?.search || []).map(item => details[item.title]).filter(Boolean);
  const labelIds = [...new Set(entries.flatMap(e=>[value(e,'P195')?.id,value(e,'P186')?.id]).filter(Boolean))];
  let labels = {}; let images = {}; let imageWarning = false;
  const results = await Promise.allSettled([entities(labelIds,signal),thumbnails(entries.map(e=>value(e,'P18')).filter(Boolean),signal)]);
  if (signal?.aborted) throw new DOMException('Aborted','AbortError');
  if (results[0].status === 'fulfilled') labels = results[0].value;
  if (results[1].status === 'fulfilled') images = results[1].value; else imageWarning = true;
  return {works:entries.map(e=>toWork(e,artist,images,labels)),total:data.query?.searchinfo?.totalhits || 0,next:data.continue?.sroffset ?? null,imageWarning};
}
export async function imageCredit(file) {
  const data = await request(COMMONS,{action:'query',prop:'imageinfo',titles:'File:'+file,iiprop:'extmetadata',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|AttributionRequired'});
  return Object.values(data.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {};
}
