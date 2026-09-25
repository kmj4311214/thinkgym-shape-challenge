export const ANSWERS = [[1,2,3,4,5],[11,12,13,14,15],[16,17,18,19,20],[6,7,8,9,10]];
export const formatTime = ms => { const s=Math.floor(ms/1000);return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };
export const validName = name => typeof name==='string' && name.trim().length>=1 && name.trim().length<=20;
export const isCorrect = (stage,row,card) => ANSWERS[stage]?.[row]===card;
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
