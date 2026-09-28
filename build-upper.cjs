const fs=require('fs'),assert=require('assert/strict');
// IDs follow 222.jpg reading order; edges are top, right, bottom, left.
// 333.jpg fixes the solution without rotating any piece.
const tiles=[
['gS','rT','mS','yT'],['yT','rT','gT','gT'],['bT','rS','gT','pT'],['mT','vT','bT','rT'],
['gT','pT','vT','rT'],['pT','rT','bT','vS'],['bT','gT','pT','mT'],['rT','gT','bT','yS'],
['mS','pT','yT','rT'],['bS','gT','pS','rT'],['vT','rT','bS','gT'],['bT','yT','vT','gT']];
const answer=[8,12,1,4,7,11,9,3,6,10,2,5];
const borders={top:['rT','bT','gS','mT'],right:['vT','rS','pT'],bottom:['bT','pS','gT','vT'],left:['yS','mT','vS']};
for(let i=0;i<12;i++){let r=Math.floor(i/4),c=i%4,s=tiles[answer[i]-1];
assert.equal(s[0],r?tiles[answer[i-4]-1][2]:borders.top[c]);
assert.equal(s[3],c?tiles[answer[i-1]-1][1]:borders.left[r]);
if(r===2)assert.equal(s[2],borders.bottom[c]);if(c===3)assert.equal(s[1],borders.right[r]);}
// Sampled from browser-rendered upper-question.jpg (embedded Japan Color 2001 Coated profile).
const colors={g:'#52a055',r:'#e07251',b:'#4b88bf',m:'#da79a6',p:'#cc424f',v:'#9d5c9c',y:'#e6bd41'};
tiles.forEach((parts,index)=>{
 const groups=parts.map((s,i)=>'<g transform="rotate('+i*90+' 160 160)" fill="'+colors[s[0]]+'" stroke="#252525" stroke-width="2.5">'+(s[1]==='T'?'<path d="M42 2H278L160 136Z"/>':'<path d="M44 2H276A116 104 0 0 1 44 2Z"/>')+'</g>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" preserveAspectRatio="none"><defs><clipPath id="c"><rect x="2" y="2" width="316" height="316" rx="32"/></clipPath></defs><rect width="320" height="320" rx="34" fill="white"/><g clip-path="url(#c)">'+groups+'</g><circle cx="160" cy="160" r="12" fill="#5aa05f"/><rect x="2" y="2" width="316" height="316" rx="32" fill="none" stroke="#252525" stroke-width="2.5"/></svg>';
 fs.writeFileSync('public/assets/upper-piece-'+(index+1)+'.svg',svg);
});
fs.writeFileSync('upper-card-map.json',JSON.stringify({source:'222.jpg',solutionSource:'333.jpg',edgeOrder:['top','right','bottom','left'],tiles,answer,borders},null,2)+'\n');
console.log('PASS: all 12 pieces, 17 shared edges and 14 perimeter edges match 333.');
