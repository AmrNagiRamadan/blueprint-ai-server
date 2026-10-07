// Builds client/Techno_Team_OS_V3_33.html from the V3.32 file:
//   1) small direct fixes in existing code (each must match exactly once)
//   2) appends the V3.33 layer (client/src/v333-layer.js) as the last script.
// Run: node client/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
let html = readFileSync(new URL('src/Techno_Team_OS_V3_32.html', dir), 'utf8');
const layer = readFileSync(new URL('src/v333-layer.js', dir), 'utf8');

const fixes = [
  ['title',
    "<title>Techno Team V3.25 — Media Buyer</title>",
    "<title>Techno Team V3.33 — Media Buyer</title>"],
  // New client opened stage 2 (audit) which the V3.32 stage gate refuses before a link exists,
  // so the modal stayed open and a second click created a duplicate. Open stage 1 instead,
  // close the modal, and warn before creating a second client with the same name.
  ['createClient',
    "DB.clients.unshift(c);changed(c,'تم إنشاء ملف العميل');go('client',c.id,'intake');};",
    "DB.clients.unshift(c);changed(c,'تم إنشاء ملف العميل');closeModal();go('client',c.id,'overview');};"],
  ['createClient duplicate name',
    "createClient=function(){const name=document.getElementById('ncName').value.trim(),biz=document.getElementById('ncBiz').value.trim();if(!name)return modalError('اكتب اسم العميل.');",
    "createClient=function(force){const name=document.getElementById('ncName').value.trim(),biz=document.getElementById('ncBiz').value.trim();if(!name)return modalError('اكتب اسم العميل.');const same=force===true?null:DB.clients.find(x=>normalizeFact(x.name)===normalizeFact(name));if(same){const e=document.getElementById('vModalError');if(e){e.className='v-error';e.innerHTML=`فيه عميل بنفس الاسم «${E(same.name)}» اتعمل ${E(dateStr(same.createdAt))}.<div class=\"v-actions\">${btn('افتح العميل الموجود',`go('client','${same.id}','overview')`)}${btn('أنشئ عميل جديد بنفس الاسم','createClient(true)',true)}</div>`;}return;}"],
  // A blocked navigation used to do nothing; now it opens the stage that needs work.
  ['stage gate',
    "if(c&&stage!=null&&!bp332CanEnter(c,stage))return toast('كمّل '+TT_STAGES[bp332FirstIncomplete(c)]+' الأول.');",
    "if(c&&stage!=null&&!bp332CanEnter(c,stage)){toast('كمّل '+TT_STAGES[bp332FirstIncomplete(c)]+' الأول.');if(STATE.view!=='client'||STATE.clientId!==c.id)ttOpen(c.id,bp332FirstIncomplete(c));return;}"],
  // Stage 1 is complete with a link OR material from the team (text/images/files).
  ['stage 1 check',
    "return [!!String(s.sourceURL||d.website||'').trim(),",
    "return [!!String(s.sourceURL||d.website||'').trim()||(typeof tt333HasMaterial==='function'&&tt333HasMaterial(c)),"],
  ['stage 1 reason',
    "if(n===0)return 'ضيف رابط المصدر أو الموقع، ورسالة السيلز إن وجدت.';",
    "if(n===0)return 'ضيف رابط المصدر أو الموقع، أو نص/صور من العميل، ورسالة السيلز إن وجدت.';"],
  ['study needs link',
    "if(!String(s.sourceURL||auditState(c).website||'').trim())return toast('ضيف رابط المصدر الأول.');",
    "if(!String(s.sourceURL||auditState(c).website||'').trim()&&!(typeof tt333HasMaterial==='function'&&tt333HasMaterial(c)))return toast('ضيف رابط المصدر، أو أضف نص/صور من العميل.');"],
  // No readable source: continue as a preliminary study from the sales message + answers.
  ['study without sources',
    "if(!docs.length)throw Error('المصادر غير مقروءة؛ لا نصدر أحكامًا من روابط فقط.');",
    "if(!docs.length&&!s.message.trim())throw Error('مفيش ولا مصدر اتقرأ ومفيش رسالة سيلز. شوف «حالة المصادر»: أعد محاولة المصدر الفاشل أو أضف نص/صور من العميل.');"],
  // Importing the same backup twice silently duplicated clients.
  ['import duplicate warning',
    "if(!confirm('سيتم إضافة '+safe.length+' عميل كنسخ مستقلة بدون استبدال الموجود. متابعة؟'))return;",
    "const seenBefore=safe.filter(x=>DB.clients.some(y=>y.id===x.id||y.importedFrom&&y.importedFrom===(x.importedFrom||x.id)));if(!confirm((seenBefore.length?'تنبيه: '+seenBefore.length+' من العملاء دول موجودين أو اتستوردوا قبل كده ('+seenBefore.slice(0,3).map(x=>x.name).join('، ')+'). الاستيراد هيعمل نسخة مكررة.\\n':'')+'سيتم إضافة '+safe.length+' عميل كنسخ مستقلة بدون استبدال الموجود. متابعة؟'))return;"],
  // The study read "the client open on screen"; started from elsewhere (or after navigating away
  // mid-run) the diagnosis prompt went out with no evidence and no answers. Use the studied client.
  ['study client: webResearch=async function(pro',
    "webResearch=async function(prompt,signal){const c=getClient(STATE.clientId);if(c&&bp323Sta",
    "webResearch=async function(prompt,signal){const c=(typeof tt333StudyClient==='function'?tt333StudyClient():getClient(STATE.clientId));if(c&&bp323Sta"],
  ['study client: if(/الحسابات الرقمية الرسمية ل',
    "if(/الحسابات الرقمية الرسمية لهذا النشاط فقط/.test(prompt)){const c=getClient(STATE.clientId);if(c){",
    "if(/الحسابات الرقمية الرسمية لهذا النشاط فقط/.test(prompt)){const c=(typeof tt333StudyClient==='function'?tt333StudyClient():getClient(STATE.clientId));if(c){"],
  ['study client: const statement=String(x.state',
    "const statement=String(x.statement||''),n=bp329Norm(statement),c=getClient(STATE.clientId),",
    "const statement=String(x.statement||''),n=bp329Norm(statement),c=(typeof tt333StudyClient==='function'?tt333StudyClient():getClient(STATE.clientId)),"],
  ['study client: function bp329FirstParty(docs)',
    "function bp329FirstParty(docs){const c=getClient(STATE.clientId),",
    "function bp329FirstParty(docs){const c=(typeof tt333StudyClient==='function'?tt333StudyClient():getClient(STATE.clientId)),"],
  ['study client: function bp330SectionEvidence(',
    "function bp330SectionEvidence(key,docs){if(key==='competitors'){const c=getClient(STATE.clientId),",
    "function bp330SectionEvidence(key,docs){if(key==='competitors'){const c=(typeof tt333StudyClient==='function'?tt333StudyClient():getClient(STATE.clientId)),"],
  ['study client: async function bp329Evaluate(p',
    "async function bp329Evaluate(prompt,opts){const c=getClient(STATE.clientId),",
    "async function bp329Evaluate(prompt,opts){const c=(typeof tt333StudyClient==='function'?tt333StudyClient():getClient(STATE.clientId)),"],
  ['import origin',
    "for(const c of safe){rekeyClient(c);",
    "for(const c of safe){const oldId=rekeyClient(c);c.importedFrom=c.importedFrom||oldId;"]
];

for (const [name, from, to] of fixes) {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`fix "${name}": expected 1 match, found ${n}`);
  html = html.replace(from, () => to);
}

if (/<\/script/i.test(layer)) throw new Error('layer must not contain </script');
const end = html.lastIndexOf('</script></body>');
if (end < 0) throw new Error('closing script not found');
html = html.slice(0, end) + '</script>\n<script>\n' + layer + '\n</script></body>' + html.slice(end + '</script></body>'.length);

writeFileSync(new URL('Techno_Team_OS_V3_33.html', dir), html);
console.log('built client/Techno_Team_OS_V3_33.html', html.length, 'bytes');
