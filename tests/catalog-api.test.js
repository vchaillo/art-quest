import test from 'node:test';
import assert from 'node:assert/strict';
import { isVisualArtist, toArtist, toWork, safeUrl, artistWorks, searchArtists } from '../catalog-api.js';
const claim = value => [{mainsnak:{datavalue:{value}}}];
const entity = {id:'Q45205',labels:{fr:{value:'Raoul Dufy'}},descriptions:{fr:{value:'peintre français'}},claims:{P31:claim({id:'Q5'}),P106:claim({id:'Q1028181'}),P569:claim({time:'+1877-06-03T00:00:00Z'}),P570:claim({time:'+1953-03-23T00:00:00Z'})}};
test('search excludes namesakes and non-human entities',()=>{assert.equal(isVisualArtist(entity),true);assert.equal(isVisualArtist({...entity,claims:{P31:claim({id:'Q4167836'})}}),false);assert.equal(isVisualArtist({...entity,descriptions:{en:{value:'family name'}},claims:{}}),false);});
test('artist and work identifiers remain stable without images or dates',()=>{const artist=toArtist(entity);assert.equal(artist.id,'wd-Q45205');assert.equal(artist.dates,'1877–1953');const work=toWork({id:'Q3209311',labels:{fr:{value:'La Fée Électricité'}}},artist,{},{});assert.equal(work.id,'wd-Q3209311');assert.equal(work.image,'');assert.equal(work.artistId,artist.id);assert.equal(work.date,'Date non renseignée');assert.equal(safeUrl('javascript:alert(1)'), '');});
test('artist works uses creator identity and preserves pagination without images',async()=>{
 const original=globalThis.fetch;const urls=[];
 globalThis.fetch=async url=>{urls.push(new URL(url));const action=new URL(url).searchParams.get('action');return {ok:true,json:async()=> action==='query' ? {query:{search:[{title:'Q3209311'}],searchinfo:{totalhits:436}},continue:{sroffset:24}} : {entities:{Q3209311:{id:'Q3209311',labels:{fr:{value:'La Fée Électricité'}}}}}};};
 try {const page=await artistWorks(toArtist(entity));assert.equal(page.total,436);assert.equal(page.next,24);assert.equal(page.works[0].title,'La Fée Électricité');assert.equal(urls[0].searchParams.get('srsearch'),'haswbstatement:P170=Q45205');}finally{globalThis.fetch=original;}
});
test('upstream failure is surfaced rather than presented as no results',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>({ok:false,status:429});try{await assert.rejects(searchArtists('unique-error-query'),/trop de demandes/);}finally{globalThis.fetch=original;}});
