export const PIECES = [
 {id:1,name:'진빨강',color:'#cd1e2e',cells:[[1,0],[0,1],[1,1],[2,1],[3,1]]},
 {id:2,name:'보라',color:'#843de0',cells:[[0,0]]},
 {id:3,name:'노랑',color:'#dce21c',cells:[[0,0],[1,0],[2,0],[0,1],[2,1]]},
 {id:4,name:'주황',color:'#fa581b',cells:[[2,0],[0,1],[1,1],[2,1],[0,2]]},
 {id:5,name:'남색',color:'#373181',cells:[[0,0],[0,1]]},
 {id:6,name:'빨강',color:'#f10b2b',cells:[[0,0],[1,0],[2,0],[2,1]]},
 {id:7,name:'귤색',color:'#fc9412',cells:[[1,0],[0,1],[1,1]]}
];
export function fits(placements,id,x,y){
 const piece=PIECES.find(p=>p.id===id);
 if(!piece||!Number.isInteger(x)||!Number.isInteger(y))return false;
 const occupied=new Set();
 for(const p of PIECES){if(p.id===id||!placements[p.id])continue;const pos=placements[p.id];for(const [dx,dy] of p.cells)occupied.add((pos.y+dy)*5+pos.x+dx)}
 return piece.cells.every(([dx,dy])=>x+dx>=0&&x+dx<5&&y+dy>=0&&y+dy<5&&!occupied.has((y+dy)*5+x+dx));
}
export function complete(placements){return PIECES.every(p=>placements[p.id]&&fits(placements,p.id,placements[p.id].x,placements[p.id].y))}
export function pieceSvg(id){const p=PIECES.find(p=>p.id===id),w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1;return `<svg viewBox="0 0 ${w*40} ${h*40}" aria-hidden="true">${p.cells.map(([x,y])=>`<rect x="${x*40+1}" y="${y*40+1}" width="38" height="38" rx="3" fill="${p.color}" stroke="#ffffff40"/>`).join('')}</svg>`}
