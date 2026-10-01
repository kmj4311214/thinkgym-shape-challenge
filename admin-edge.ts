const base=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origin='https://thinkgym-shape-challenge.vercel.app';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
const tables:Record<string,string>={pumpkin:'pumpkin_sessions',rings:'rings_sessions',shape7:'shape7_sessions',upper:'upper_v2_sessions',packing:'packing_sessions',layers:'layers_sessions',animals:'animals_sessions'};
const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),n=>n.toString(16).padStart(2,'0')).join('');
const hash=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
async function db(path:string,options:RequestInit={}){
 const res=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation',...options.headers}});
 if(!res.ok)throw Error('기록 서버 요청에 실패했습니다. 다시 시도해 주세요.');
 return res.json();
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(req.headers.get('origin') && req.headers.get('origin')!==origin)return json({error:'허용되지 않은 요청입니다.'},403);
 try{
  const raw=await req.text();if(raw.length>4096)return json({error:'요청이 너무 큽니다.'},413);
  const b=JSON.parse(raw);
  if(b.action==='login'){
   const ip=await hash((req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()+key);
   if(!await db('rpc/thinkgym_admin_attempt',{method:'POST',body:JSON.stringify({p_ip:ip})}))return json({error:'로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.'},429);
   if(typeof b.username!=='string'||typeof b.password!=='string'||b.password.length>128)return json({error:'아이디 또는 비밀번호를 확인해 주세요.'},401);
   const rows=await db('thinkgym_admin_credentials?username=eq.tpdhslaek&select=salt,password_hash');
   const credential=rows[0];if(!credential)throw Error('관리자 계정이 설정되지 않았습니다.');
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(b.password),'PBKDF2',false,['deriveBits']);
   const derived=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(credential.salt),iterations:210000,hash:'SHA-256'},material,256));
   let difference=0;for(let i=0;i<64;i++)difference|=derived.charCodeAt(i)^credential.password_hash.charCodeAt(i);
   if(difference!==0||b.username!=='tpdhslaek')return json({error:'아이디 또는 비밀번호를 확인해 주세요.'},401);
   const token=crypto.randomUUID()+crypto.randomUUID(),expires=new Date(Date.now()+3600000).toISOString();
   await db('thinkgym_admin_sessions',{method:'POST',body:JSON.stringify({token_hash:await hash(token),expires_at:expires})});
   return json({token,expires_at:expires});
  }
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'');
  if(!token||token.length!==72)return json({error:'관리자 로그인이 필요합니다.'},401);
  const tokenHash=await hash(token);
  const sessions=await db('thinkgym_admin_sessions?token_hash=eq.'+tokenHash+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=token_hash');
  if(!sessions.length)return json({error:'로그인이 만료되었습니다. 다시 로그인해 주세요.'},401);
  if(b.action==='logout'){await db('thinkgym_admin_sessions?token_hash=eq.'+tokenHash,{method:'DELETE'});return json({ok:true})}
  if(b.action==='list'){
   const boards=await Promise.all(Object.entries(tables).map(async([program,table])=>{
    const response=await fetch(base+'/rest/v1/'+table+'?select=id&completed_at=not.is.null&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact'}});
    if(!response.ok)throw Error('순위 조회에 실패했습니다.');
    return {program,total:Number(response.headers.get('content-range')?.split('/')[1]||0)};
   }));
   if(!Object.hasOwn(tables,b.program))return json({error:'프로그램을 선택해 주세요.'},400);
   const offset=Number.isInteger(b.offset)&&b.offset>=0&&b.offset<=100000?b.offset:0;
   const rows=await db('rpc/thinkgym_admin_list',{method:'POST',body:JSON.stringify({p_program:b.program,p_offset:offset})});
   return json({rows,boards,offset,snapshot:new Date().toISOString()});
  }
  if(b.action==='delete'){
   if(!Object.hasOwn(tables,b.program)||typeof b.id!=='string'||! /^[a-f0-9-]{36}$/.test(b.id))return json({error:'잘못된 기록입니다.'},400);
   const rows=await db(tables[b.program]+'?id=eq.'+b.id+'&completed_at=not.is.null',{method:'DELETE'});
   return json({deleted:rows.length});
  }
  if(b.action==='reset'){
   if(b.confirm!=='전체 초기화'||typeof b.before!=='string'||!Number.isFinite(Date.parse(b.before)))return json({error:'초기화 확인 문구를 입력해 주세요.'},400);
   const deleted=await db('rpc/thinkgym_admin_reset',{method:'POST',body:JSON.stringify({p_before:b.before})});
   return json({deleted});
  }
  return json({error:'올바르지 않은 요청입니다.'},400);
 }catch(e){return json({error:e instanceof SyntaxError?'요청 형식을 확인해 주세요.':'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},400)}
});
