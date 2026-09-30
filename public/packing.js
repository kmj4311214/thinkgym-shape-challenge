import './sound.js';
import {formatTime,validName,escapeHtml as esc} from './game.js';
const API='https://derupekdpfitfcmutcxq.supabase.co/functions/v1/packing-game';
const KEY='thinkgym-packing-session-v1';
const app=document.querySelector('#app');
let state=null,selected=null,busy=false,boardVersion=0;
import {PIECES,fits,complete,pieceSvg} from './packing-model.js';
function trophy(rank,cls='rank-trophy'){return rank>=1&&rank<=3?'<img class="'+cls+'" src="/assets/trophy-'+['gold','silver','bronze'][rank-1]+'.svg" alt="'+['금','은','동'][rank-1]+' 트로피">':''}
async function api(action,data={}){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);try{const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data}),signal:controller.signal});const result=await res.json();if(!res.ok)throw Error(result.error||'기록을 저장하지 못했어요.');return result}catch(e){if(e.name==='AbortError')throw Error('연결이 늦어지고 있어요. 다시 시도해 주세요.');throw e}finally{clearTimeout(timeout)}}
function persist(){try{sessionStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function reset(){state=null;selected=null;try{sessionStorage.removeItem(KEY)}catch{}}
function elapsed(){return state?.complete?state.elapsed_ms:(state?state.elapsedBefore+Date.now()-state.startedLocal:0)}
function board(){return '<section class="leader"><div class="section-head"><div><div class="eyebrow">초등 고학년 · 25칸 조각 채우기</div><h2>우리들의 도전 기록</h2><p>빠른 시간 순 · 같은 초는 공동 순위</p></div><button class="secondary" id="refresh">새로고침 ↻</button></div><div id="rankings" aria-live="polite">기록을 불러오고 있어요.</div></section>'}
async function loadBoard(){const version=++boardVersion;const el=document.querySelector('#rankings');try{const data=await api('leaderboard');if(version!==boardVersion||!el?.isConnected)return;el.innerHTML=data.rows.length?'<table class="ranking"><thead><tr><th>순위</th><th>이름</th><th>완료 시간</th><th class="date">날짜</th></tr></thead><tbody>'+data.rows.map(r=>'<tr class="'+(r.id===state?.id?'mine':'')+'"><td><span class="rank-place">'+trophy(r.rank)+r.rank+'등</span></td><td>'+esc(r.name)+(r.id===state?.id?' <small>나의 기록</small>':'')+'</td><td>'+formatTime(r.elapsed_ms)+'</td><td class="date">'+new Date(r.completed_at).toLocaleDateString('ko-KR')+'</td></tr>').join('')+'</tbody></table><p class="hint">전체 '+data.total+'회 완료 · 상위 100개 기록</p>':'<p class="empty">첫 번째 도전의 주인공이 되어 보세요!</p>'}catch(e){if(el?.isConnected)el.textContent=e.message+' 새로고침을 눌러 주세요.'}}
function wireBoard(){document.querySelector('#refresh').onclick=loadBoard;loadBoard()}

function home(){
 app.innerHTML='<section class="packing-intro"><div class="eyebrow">초등 고학년 · 유동추론 & 작업기억</div><h1>일곱 조각으로<br><em>25칸을 채워요</em></h1><p class="lead">조각의 모양을 살펴보고 빈틈없이 맞춰 보세요.<br>조각을 고른 후 칸을 누르거나, 판으로 끌어 놓아요.</p><div class="packing-demo">'+[4,3,6].map(pieceSvg).join('')+'</div><form class="entry" id="entry"><label for="name">도전하는 친구의 이름</label><input id="name" maxlength="20" required autocomplete="off" placeholder="이름 또는 별명을 입력해 주세요"><button class="primary" type="submit">조각 채우기 시작하기 →</button><p class="hint">시작하면 시간이 측정돼요. 완료한 이름과 기록이 순위에 표시돼요.</p><p id="start-error" class="error" role="alert"></p></form></section>'+board();
 document.querySelector('#entry').onsubmit=start;wireBoard();
}
async function start(event){
 event.preventDefault();if(busy)return;
 const name=document.querySelector('#name').value.trim();if(!validName(name))return;
 busy=true;const button=event.submitter;button.disabled=true;
 try{const data=await api('start',{name});state={...data,name,placements:{},complete:false,elapsedBefore:0,startedLocal:Date.now()};selected=null;persist();game();window.scrollTo(0,0)}
 catch(e){document.querySelector('#start-error').textContent=e.message;button.disabled=false}
 finally{busy=false}
}
function feedback(message){const el=document.querySelector('#feedback');if(el)el.textContent=message}
function game(message='조각을 고른 다음 놓을 칸을 눌러 주세요.'){
 app.innerHTML='<section><div class="gamebar"><div><div class="eyebrow">'+esc(state.name)+'의 조각 채우기</div><h1>빈틈없이 25칸 채우기</h1></div><div class="clock"><small>도전 시간</small><b id="timer">'+formatTime(elapsed())+'</b></div></div><p class="packing-status" id="feedback" role="status" aria-live="polite">'+esc(message)+'</p><div class="packing-board" aria-label="5행 5열 조각 맞추기 판">'+Array.from({length:25},(_,i)=>'<button class="packing-cell" data-cell="'+i+'" aria-label="'+(Math.floor(i/5)+1)+'행 '+(i%5+1)+'열"><span>·</span></button>').join('')+'</div><p class="packing-progress" id="progress"></p><section class="packing-bank"><h2>맞추는 조각</h2><p>조각의 가장 위쪽 줄에서 왼쪽 첫 칸을 기준으로 놓아요.<br>놓은 조각을 누르면 다시 옮길 수 있어요. 조각의 방향은 그림 그대로예요.</p><div class="packing-pieces">'+state.card_order.map(id=>'<button class="packing-piece" data-piece="'+id+'" aria-label="'+PIECES[id-1].name+' 조각 '+id+'번" aria-pressed="false">'+pieceSvg(id)+'<span>'+id+' · '+PIECES[id-1].name+'</span></button>').join('')+'</div></section><div class="packing-actions"><button class="secondary" id="remove">선택한 조각 꺼내기</button><button class="secondary" id="clear">모두 다시 놓기</button><button class="primary" id="check">완성 확인하기 →</button></div></section>';
 document.querySelectorAll('[data-piece]').forEach(b=>{
  b.onclick=()=>{if(!busy&&Date.now()>suppressClick)select(Number(b.dataset.piece))};
  b.onpointerdown=e=>beginDrag(e,Number(b.dataset.piece),...PIECES[Number(b.dataset.piece)-1].cells[0]);
 });
 document.querySelectorAll('[data-cell]').forEach(b=>{
  b.onclick=()=>{if(Date.now()<=suppressClick||busy)return;const i=Number(b.dataset.cell),id=owner(i);
   if(selected){const [dx,dy]=PIECES[selected-1].cells[0];place(selected,i%5-dx,Math.floor(i/5)-dy)}
   else if(id)select(id);else feedback('하단에서 조각을 먼저 골라 주세요.');
  };
  b.onpointerdown=e=>{const i=Number(b.dataset.cell),id=owner(i);if(id){const p=state.placements[id];beginDrag(e,id,i%5-p.x,Math.floor(i/5)-p.y)}};
  b.onpointerenter=()=>{if(selected&&!drag){const i=Number(b.dataset.cell),[dx,dy]=PIECES[selected-1].cells[0];preview(selected,i%5-dx,Math.floor(i/5)-dy)}};
  b.onpointerleave=clearPreview;
 });
 document.querySelector('#remove').onclick=()=>{if(!busy&&selected){delete state.placements[selected];persist();paint();feedback('조각을 꺼냈어요. 새 위치에 놓아 보세요.')}};
 document.querySelector('#clear').onclick=()=>{if(busy)return;const d=document.createElement('dialog');d.innerHTML='<h2>조각을 모두 꺼낼까요?</h2><p>도전 시간은 계속 측정돼요.</p><button class="secondary" id="cancel">계속 풀기</button> <button class="primary" id="yes">모두 꺼내기</button>';document.body.append(d);d.showModal();d.querySelector('#cancel').onclick=()=>d.close();d.querySelector('#yes').onclick=()=>{state.placements={};selected=null;persist();paint();d.close()};d.onclose=()=>d.remove()};
 document.querySelector('#check').onclick=finish;paint();
}
function owner(i){return PIECES.find(p=>state.placements[p.id]&&p.cells.some(([dx,dy])=>(state.placements[p.id].y+dy)*5+state.placements[p.id].x+dx===i))?.id}
function paint(){
 document.querySelectorAll('[data-cell]').forEach(b=>{const id=owner(Number(b.dataset.cell));b.classList.toggle('occupied',!!id);b.classList.toggle('selected',id===selected);b.style.setProperty('--piece',id?PIECES[id-1].color:'transparent');b.querySelector('span').textContent=id||'·';const i=Number(b.dataset.cell);b.setAttribute('aria-label',(Math.floor(i/5)+1)+'행 '+(i%5+1)+'열'+(id?' · '+PIECES[id-1].name+' 조각':' · 빈칸'))});
 document.querySelectorAll('[data-piece]').forEach(b=>{const id=Number(b.dataset.piece);b.classList.toggle('placed',!!state.placements[id]);b.classList.toggle('selected',id===selected);b.setAttribute('aria-pressed',String(id===selected))});
 const count=PIECES.filter(p=>state.placements[p.id]).reduce((n,p)=>n+p.cells.length,0);
 document.querySelector('#progress').textContent=count+' / 25칸 · '+Object.keys(state.placements).length+' / 7조각';
 document.querySelector('#remove').disabled=busy||!selected||!state.placements[selected];
 document.querySelector('#check').disabled=busy||!complete(state.placements);
}
function select(id){selected=id;paint();feedback(PIECES[id-1].name+' 조각을 골랐어요. 놓을 칸을 눌러 주세요.')}
function clearPreview(){document.querySelectorAll('.packing-cell.preview,.packing-cell.invalid').forEach(b=>b.classList.remove('preview','invalid'))}
function preview(id,x,y){clearPreview();const yes=fits(state.placements,id,x,y);for(const [dx,dy] of PIECES[id-1].cells){if(x+dx<0||x+dx>4||y+dy<0||y+dy>4)continue;document.querySelector('[data-cell="'+((y+dy)*5+x+dx)+'"]')?.classList.add(yes?'preview':'invalid')}}
function place(id,x,y){
 if(busy)return;clearPreview();
 if(!fits(state.placements,id,x,y)){feedback('조각이 겹치거나 판 밖으로 나가요. 다른 칸에 놓아 보세요.');return}
 state.placements[id]={x,y};selected=null;persist();paint();
 feedback(complete(state.placements)?'25칸을 모두 채웠어요! 완성을 확인하고 있어요…':'잘 놓았어요! 다음 조각도 맞춰 보세요.');
 if(complete(state.placements))finish();
}
let drag=null,suppressClick=0;
function beginDrag(event,id,dx,dy){
 if(busy||event.button!==0)return;
 drag={id,dx,dy,startX:event.clientX,startY:event.clientY,moved:false};
 event.currentTarget.setPointerCapture(event.pointerId);
}
document.addEventListener('pointermove',event=>{
 if(!drag)return;
 if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<7)return;
 if(!drag.moved){drag.moved=true;select(drag.id);const g=document.createElement('div');g.className='packing-ghost';g.innerHTML=pieceSvg(drag.id);document.body.append(g)}
 event.preventDefault();
 const rect=document.querySelector('.packing-board').getBoundingClientRect(),unit=rect.width/5,p=PIECES[drag.id-1],g=document.querySelector('.packing-ghost');
 g.style.width=(Math.max(...p.cells.map(c=>c[0]))+1)*unit+'px';g.style.height=(Math.max(...p.cells.map(c=>c[1]))+1)*unit+'px';
 g.style.left=event.clientX-(drag.dx+.5)*unit+'px';g.style.top=event.clientY-(drag.dy+.5)*unit+'px';
 preview(drag.id,Math.floor((event.clientX-rect.left)/unit)-drag.dx,Math.floor((event.clientY-rect.top)/unit)-drag.dy);
},{passive:false});
document.addEventListener('pointerup',event=>{
 if(!drag)return;const d=drag;drag=null;
 if(d.moved){suppressClick=Date.now()+400;document.querySelector('.packing-ghost')?.remove();clearPreview();const rect=document.querySelector('.packing-board').getBoundingClientRect(),unit=rect.width/5;
 if(event.clientX>=rect.left&&event.clientX<rect.right&&event.clientY>=rect.top&&event.clientY<rect.bottom)place(d.id,Math.floor((event.clientX-rect.left)/unit)-d.dx,Math.floor((event.clientY-rect.top)/unit)-d.dy);
 else feedback('판 안의 칸으로 조각을 옮겨 주세요.');
 }
});
document.addEventListener('pointercancel',()=>{drag=null;document.querySelector('.packing-ghost')?.remove();clearPreview()});
async function finish(){
 if(busy||!complete(state.placements))return;busy=true;paint();
 try{const data=await api('finish',{id:state.id,token:state.token,placements:state.placements});state={...state,...data};persist();result()}
 catch(e){feedback(e.message+' 아래의 완성 확인하기를 눌러 다시 저장해 주세요.')}
 finally{busy=false;if(!state.complete)paint()}
}
function result(){
 app.innerHTML='<section class="success"><div class="eyebrow">초등 고학년 · 25칸 조각 채우기</div><div class="packing-result-icon">✦</div><h1>합격!</h1><p class="lead">'+esc(state.name)+', 정말 잘했어요!<br>일곱 조각으로 25칸을 모두 채웠어요.</p><div class="result-stats"><div><b>'+formatTime(state.elapsed_ms)+'</b><small>완료 시간 · 분:초</small></div><div class="result-rank">'+trophy(state.rank,'result-trophy')+'<b>'+state.rank+'등</b><small>조각 채우기 순위</small></div><div><b>25 / 25</b><small>완성한 칸</small></div></div><p class="hint">기록이 저장됐어요. 같은 초에 완료하면 공동 순위예요.</p><div class="packing-actions"><button class="primary" id="again">다시 도전하기 →</button><a class="secondary" href="/upper-programs.html">고학년 검사 선택</a></div></section>'+board();
 document.querySelector('#again').onclick=()=>{reset();home();window.scrollTo(0,0)};wireBoard();window.scrollTo(0,0);
}
setInterval(()=>{const el=document.querySelector('#timer');if(el)el.textContent=formatTime(elapsed())},250);
async function init(){
 let saved;try{saved=JSON.parse(sessionStorage.getItem(KEY))}catch{}
 if(saved?.id&&saved?.token){
  app.innerHTML='<p class="empty">이전 도전을 불러오고 있어요…</p>';
  try{const data=await api('resume',{id:saved.id,token:saved.token});state={...saved,...data,placements:data.placements||saved.placements||{},startedLocal:Date.now(),elapsedBefore:data.elapsed_ms};if(data.complete)result();else game();return}
  catch(e){app.innerHTML='<p class="empty">'+esc(e.message)+'</p><div class="packing-actions"><button class="primary" id="retry">다시 연결하기</button><button class="secondary" id="restart">새로 시작하기</button></div>';document.querySelector('#retry').onclick=init;document.querySelector('#restart').onclick=()=>{reset();home()};return}
 }
 home();
}
init();

