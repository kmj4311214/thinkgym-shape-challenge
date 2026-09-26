const base=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
async function db(path:string,options:RequestInit={}){const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation',...options.headers}});if(!r.ok){console.error('Database operation failed',r.status);throw new Error('기록 처리 중 문제가 생겼어요. 다시 시도해 주세요.')}return r.json();}
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>2048)return json({error:'요청이 너무 커요.'},413);
  const b=JSON.parse(raw);
  if(b.action==='leaderboard')return json(await db('rpc/shape7_leaderboard',{method:'POST',body:'{}'}));
  if(b.action==='start'){
   if(typeof b.name!=='string'||b.name.trim().length<1||b.name.trim().length>20||/[\x00-\x1f]/.test(b.name))return json({error:'이름은 1~20자로 입력해 주세요.'},400);
   const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
   const ip_hash=await hash(ip+key);
   const recent=await db('shape7_sessions?select=id&ip_hash=eq.'+ip_hash+'&started_at=gte.'+encodeURIComponent(new Date(Date.now()-3600000).toISOString())+'&limit=120');
   if(recent.length>=120)return json({error:'잠시 후 다시 도전해 주세요.'},429);
   const token=crypto.randomUUID()+crypto.randomUUID();
   const rows=await db('shape7_sessions',{method:'POST',body:JSON.stringify({name:b.name.trim(),token_hash:await hash(token),ip_hash})});
   return json({id:rows[0].id,token,card_order:rows[0].card_order});
  }
  if(!['answer','resume'].includes(b.action)||typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id)||typeof b.token!=='string'||b.token.length>100)return json({error:'올바르지 않은 요청이에요.'},400);
  const h=await hash(b.token);
  const rows=await db('shape7_sessions?select=*&id=eq.'+b.id+'&token_hash=eq.'+h);
  const s=rows[0];if(!s)return json({error:'도전 정보를 찾을 수 없어요. 다시 시작해 주세요.'},403);
  if(!s.completed_at&&Date.now()-new Date(s.started_at).getTime()>86400000)return json({error:'도전 시간이 만료되었어요. 다시 시작해 주세요.'},410);
  if(b.action==='resume'){
   let rank=null;if(s.completed_at){const r=await fetch(base+'/rest/v1/shape7_sessions?select=id&completed_at=not.is.null&elapsed_ms=lt.'+s.elapsed_ms,{headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact',Range:'0-0'}});if(!r.ok)throw Error('순위를 불러오지 못했어요.');rank=Number(r.headers.get('content-range')?.split('/')[1]||0)+1;}
   return json({name:s.name,card_order:s.card_order,stage:s.stage,solved:s.solved,complete:!!s.completed_at,elapsed_ms:s.elapsed_ms??Date.now()-new Date(s.started_at).getTime(),rank});
  }
  if(!Number.isInteger(b.stage)||b.stage<0||b.stage>3||!Number.isInteger(b.row)||b.row<0||b.row>4||!Number.isInteger(b.card)||b.card<1||b.card>20)return json({error:'잘못된 정답 요청이에요.'},400);
  return json(await db('rpc/shape7_answer',{method:'POST',body:JSON.stringify({p_id:b.id,p_hash:h,p_stage:b.stage,p_row:b.row,p_card:b.card})}));
 }catch(e){return json({error:e instanceof SyntaxError?'요청을 확인해 주세요.':e.message||'잠시 후 다시 시도해 주세요.'},400)}
});
