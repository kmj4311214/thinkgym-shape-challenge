// Original Web Audio sounds: no downloaded music or external audio requests.
let context, master, enabled=true, musicTimer, musicStep=0, fanfareUntil=0;
const voices=new Set();
try{enabled=localStorage.getItem('thinkgym-sound')!=='off'}catch{}
function audio(){
 if(!enabled)return null;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
 if(!context){context=new Audio();master=context.createGain();master.gain.value=.22;master.connect(context.destination)}
 if(context.state==='suspended')context.resume().catch(()=>{});
 return context;
 }catch{return null}
}
function note(midi,offset,duration,volume=.3,type='triangle'){
 const ctx=audio();if(!ctx||ctx.state!=='running')return;
 const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+offset;
 oscillator.type=type;oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
 oscillator.connect(gain);gain.connect(master);voices.add(oscillator);
 oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect()};
 oscillator.start(start);oscillator.stop(start+duration+.03);
}
function stop(){for(const voice of voices){try{voice.stop()}catch{}}voices.clear()}
function clickSound(){note(79,0,.075,.18,'sine');note(86,.025,.08,.09,'sine')}
// Quiet original repeating melody. Resumed only after a real user gesture.
const musicMelody=[72,76,79,76,74,77,81,77,71,74,79,74,72,76,79,84];
try{musicStep=Number(sessionStorage.getItem('thinkgym-music-step')||0)%16}catch{}
function musicBeat(){
 if(!enabled||document.hidden||context?.state!=='running'||Date.now()<fanfareUntil)return;
 note(musicMelody[musicStep],0,.85,.065,'sine');
 if(musicStep%4===0){const bass=[48,53,55,48][Math.floor(musicStep/4)];note(bass,0,2.6,.045,'triangle');note(bass+7,0,2.1,.025,'sine')}
 musicStep=(musicStep+1)%16;try{sessionStorage.setItem('thinkgym-music-step',String(musicStep))}catch{}
}
function startMusic(){if(!musicTimer){musicBeat();musicTimer=setInterval(musicBeat,700)}}
function pauseMusic(){clearInterval(musicTimer);musicTimer=undefined;stop()}
function unlockMusic(event){if(event?.target?.closest?.('.sound-toggle')||!enabled)return;const ctx=audio();if(ctx)ctx.resume().then(()=>{startMusic();label()}).catch(()=>{})}
document.addEventListener('pointerdown',unlockMusic,{passive:true});
document.addEventListener('keydown',unlockMusic);
function fanfare(){
 stop();
 fanfareUntil=Date.now()+7000;
 // A short, original C-major award fanfare with melody, harmony and bass.
 const melody=[[67,0,.18],[67,.22,.18],[67,.44,.18],[72,.72,.55],[71,1.35,.18],[72,1.6,.18],[76,1.9,.55],[74,2.55,.2],[76,2.8,.2],[79,3.1,.8],[76,4,.25],[79,4.3,.25],[84,4.65,1.6]];
 for(const [pitch,time,length] of melody){note(pitch,time,length,.32);note(pitch-12,time,length,.10)}
 for(const [time,chord] of [[0,[48,60,64]],[.72,[48,60,67]],[1.9,[53,65,69]],[3.1,[55,62,67]],[4.65,[48,60,64,67,72]]]){
  for(const pitch of chord)note(pitch,time,time===4.65?2:.65,.12,'sine');
 }
}
const style=document.createElement('style');
style.textContent='.sound-toggle{position:fixed;right:14px;top:10px;z-index:50;border:1px solid #d9bd7970;border-radius:22px;background:#191b16;color:#edd49b;padding:8px 13px;font:600 12px sans-serif;cursor:pointer;box-shadow:0 4px 14px #0003}.sound-toggle:focus-visible,.celebrate-replay:focus-visible{outline:3px solid #ffd77b;outline-offset:3px}header.top,body>header{padding-top:52px}.celebrate-title{color:#e9cb82;font-size:clamp(26px,5vw,42px);margin:14px 0 8px;letter-spacing:-.04em}.celebrate-replay{border:1px solid #d9bd7970;border-radius:24px;padding:10px 18px;background:#262319;color:#f3d897;cursor:pointer;margin:12px 0 20px;font:600 14px sans-serif}.celebrate-confetti{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden}.celebrate-confetti i{position:absolute;top:-20px;width:9px;height:15px;animation:celebrate-fall 3.8s ease-in forwards}@keyframes celebrate-fall{to{transform:translate3d(35px,105vh,0) rotate(600deg);opacity:.2}}@media(prefers-reduced-motion:reduce){.celebrate-confetti{display:none}}';
document.head.append(style);
const toggle=document.createElement('button');toggle.type='button';toggle.className='sound-toggle';
function label(){toggle.textContent=enabled?(context?.state==='running'?'♫ 음악 켜짐':'♫ 눌러서 음악 시작'):'♫ 음악 꺼짐';toggle.setAttribute('aria-label',enabled&&context?.state==='running'?'음악과 효과음 끄기':'음악과 효과음 켜기');toggle.setAttribute('aria-pressed',String(enabled&&context?.state==='running'))}
label();document.body.append(toggle);
toggle.addEventListener('pointerdown',event=>event.stopPropagation());
toggle.onclick=()=>{enabled=!(enabled&&context?.state==='running');try{localStorage.setItem('thinkgym-sound',enabled?'on':'off')}catch{}if(enabled){unlockMusic()}else{pauseMusic();if(context)context.suspend().catch(()=>{})}label()};
document.addEventListener('click',event=>{
 if(!event.isTrusted||event.target.closest('.sound-toggle,.celebrate-replay'))return;
 const target=event.target.closest('button,a,input,select');if(!target||target.disabled)return;
 const ctx=audio();if(ctx)ctx.resume().then(clickSound).catch(()=>{});
},true);
function celebrate(section){
 if(section.dataset.celebration)return;
 section.dataset.celebration='true';
 const heading=document.createElement('h2');heading.className='celebrate-title';heading.textContent='축하합니다^^';
 const pass=section.querySelector('h1');if(pass)pass.after(heading);else section.prepend(heading);
 const replay=document.createElement('button');replay.type='button';replay.className='celebrate-replay';replay.textContent='♫ 축하 음악 다시 듣기';
 replay.onclick=()=>{if(!enabled){enabled=true;label();try{localStorage.setItem('thinkgym-sound','on')}catch{}}const ctx=audio();if(ctx)ctx.resume().then(fanfare).catch(()=>{})};
 heading.after(replay);
 const confetti=document.createElement('div');confetti.className='celebrate-confetti';confetti.setAttribute('aria-hidden','true');
 for(let i=0;i<36;i++){const piece=document.createElement('i');piece.style.cssText='left:'+Math.random()*100+'%;background:'+['#e8c46d','#fff0b7','#c38e42','#aab998'][i%4]+';animation-delay:'+Math.random()*.6+'s;transform:rotate('+Math.random()*180+'deg)';confetti.append(piece)}
 document.body.append(confetti);setTimeout(()=>confetti.remove(),4700);
 // Completion follows a player click; restored results may require the replay button.
 if(enabled&&context?.state==='running')fanfare();
}
const observer=new MutationObserver(()=>{const success=document.querySelector('.success');if(success)celebrate(success);else{stop();document.querySelectorAll('.celebrate-confetti').forEach(el=>el.remove())}});
observer.observe(document.querySelector('#app')||document.body,{childList:true});
const current=document.querySelector('.success');if(current)celebrate(current);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMusic();else if(enabled&&context?.state==='running')startMusic()});
window.addEventListener('pagehide',pauseMusic);
// Same-site visits may already have autoplay permission; otherwise resume waits for a click.
unlockMusic();

const parentPaths={'/preschool56.html':'/preschool.html','/preschool7.html':'/preschool.html','/elementary.html':'/elementary-programs.html','/upper.html':'/elementary-programs.html'};
const navigation=document.createElement('nav');navigation.className='page-navigation';navigation.setAttribute('aria-label','페이지 이동');
if(location.pathname!=='/'&&location.pathname!=='/index.html'){
 const back=document.createElement('a');back.href=parentPaths[location.pathname]||'/';back.textContent='← 뒤로 가기';navigation.append(back);
}
const home=document.createElement('a');home.href='/';home.textContent='⌂ 메인 화면';navigation.append(home);
document.querySelector('header')?.after(navigation);
const navStyle=document.createElement('style');navStyle.textContent='.page-navigation{max-width:1200px;margin:14px auto 0;padding:0 24px;display:flex;gap:10px}.page-navigation a{display:inline-flex;align-items:center;min-height:42px;padding:8px 16px;border:1px solid #dfc17b50;border-radius:22px;color:#ead39b;background:#1a1d17;text-decoration:none;font:600 13px sans-serif}.page-navigation a:focus-visible{outline:3px solid #dfc17b;outline-offset:3px}';document.head.append(navStyle);
