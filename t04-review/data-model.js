(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TechnoData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const FORMAT='techno-team-audit';
  const SCHEMA_VERSION=1;
  const CURRENT_KEY='tt_rebuild_v1_current';
  const PREVIOUS_KEY='tt_rebuild_v1_previous';

  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const arr=value=>Array.isArray(value)?value:(value==null?[]:[value]);
  const text=value=>String(value==null?'':value).trim();
  const nowISO=()=>new Date().toISOString();
  const norm=value=>text(value).toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ');
  function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function id(prefix,seed){return `${prefix}_${hash(seed||`${Date.now()}_${Math.random()}`)}`}
  function canonicalURL(value){
    const raw=text(value);if(!raw)return'';
    try{const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);u.hash='';['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(k=>u.searchParams.delete(k));u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.toString()}catch{return raw}
  }
  function parseInputLinks(value){
    const raw=arr(value).flatMap(v=>text(v).split(/[\s,،]+/)).map(v=>v.replace(/[)\]}>.،]+$/,'')).filter(Boolean),valid=[],invalid=[];
    for(const item of raw){try{const url=canonicalURL(item),u=new URL(url);if(!/^https?:$/.test(u.protocol)||!u.hostname.includes('.'))throw Error('invalid');valid.push(url)}catch{invalid.push(item)}}
    return{links:Array.from(new Set(valid)),invalid};
  }
  function platformForURL(value){
    let host='',path='';try{const u=new URL(canonicalURL(value));host=u.hostname.replace(/^www\./,'');path=u.pathname.toLowerCase()}catch{return'مصدر خارجي'}
    if(host.includes('facebook.com'))return'Facebook';if(host.includes('instagram.com'))return'Instagram';if(host.includes('tiktok.com'))return'TikTok';if(host.includes('youtube.com')||host==='youtu.be')return'YouTube';if(host.includes('linkedin.com'))return'LinkedIn';if(host==='x.com'||host.includes('twitter.com'))return'X';if(host.includes('google.')&&path.includes('/maps')||host==='maps.app.goo.gl')return'Google Maps';if(/vezeeta|dacttra|clinido|ekshef|doctorak/.test(host))return'منصة حجز';return'موقع / مصدر خارجي';
  }
  function createClientDraft(doc,input){
    const name=text(input&&input.name),parsed=parseInputLinks(input&&input.links);if(!name)throw Error('اكتب اسم العميل');if(parsed.invalid.length)throw Error(`راجع الرابط: ${parsed.invalid[0]}`);if(!parsed.links.length)throw Error('أضف رابطًا واحدًا صحيحًا على الأقل');
    const next=normalizeDocument(doc),fingerprint=`${norm(name)}|${parsed.links.slice().sort().join('|')}`,clientId=text(input&&input.id)||id('client',fingerprint),at=nowISO();let client=next.clients.find(c=>c.id===clientId);
    if(!client){client={id:clientId,identity:{displayName:name,officialName:'',specialty:text(input&&input.specialty),status:'draft'},inputs:{links:parsed.links,notes:text(input&&input.notes),goal:text(input&&input.goal),budget:text(input&&input.budget),answers:{}},sources:[],evidence:[],facts:[],findings:[],questions:[],decisions:[],report:{status:'not_started',slides:[],generatedFromRevision:null,updatedAt:null},revisions:{data:1,review:0,report:0},createdAt:at,updatedAt:at,legacy:{sourceVersion:'rebuild-t05',unmapped:{}}};next.clients.push(client)}else{const has=key=>Object.prototype.hasOwnProperty.call(input||{},key);client.identity.displayName=name;if(has('specialty'))client.identity.specialty=text(input.specialty);client.inputs={...client.inputs,links:Array.from(new Set([...arr(client.inputs.links),...parsed.links])),notes:has('notes')?text(input.notes):client.inputs.notes||'',goal:has('goal')?text(input.goal):client.inputs.goal||'',budget:has('budget')?text(input.budget):client.inputs.budget||''};client.revisions.data=(Number(client.revisions.data)||0)+1;client.updatedAt=at}
    for(const url of parsed.links){if(client.sources.some(s=>s.canonicalUrl===url||canonicalURL(s.url)===url))continue;client.sources.push({id:id('src',`${client.id}|${url}`),url,canonicalUrl:url,platform:platformForURL(url),identity:{status:'confirmed',reason:'رابط أضافه المستخدم',proof:{type:'user_input'}},read:{status:'new',title:'',lastAttempt:null,observedAt:null},content:{text:'',rawText:'',hash:hash('')},links:[],legacy:{}})}
    next.extensions={...next.extensions,activeClientId:client.id,ui:{...next.extensions.ui,stage:'study'}};return{document:next,clientId:client.id,created:client.createdAt===at};
  }
  function knownInputs(client){
    if(!client)return[];const items=[['name','اسم العميل',client.identity&&client.identity.displayName],['specialty','التخصص / النشاط',client.identity&&client.identity.specialty],['notes','الرسالة أو المعلومات',client.inputs&&client.inputs.notes],['goal','الهدف',client.inputs&&client.inputs.goal],['budget','الميزانية',client.inputs&&client.inputs.budget]];for(const [i,url] of arr(client.inputs&&client.inputs.links).entries())items.push([`link_${i+1}`,`رابط ${i+1}`,url]);return items.filter(x=>text(x[2])).map(([key,label,value])=>({key,label,value:text(value)}));
  }
  const DISCOVERY_PLATFORMS=['Facebook','Instagram','TikTok','YouTube','LinkedIn','X','Google Maps','موقع / مصدر خارجي','منصة حجز'];
  function accountKey(value){
    try{const u=new URL(canonicalURL(value)),host=u.hostname.replace(/^(www|m|web)\./,''),parts=u.pathname.split('/').filter(Boolean);if(/vezeeta|dacttra|clinido|ekshef|doctorak/.test(host)&&/^(ar|en)$/.test(parts[0]||''))parts.shift();return `${host}/${parts.join('/')}`.replace(/\/$/,'').toLowerCase()}catch{return norm(value)}
  }
  function isAccountCandidate(value){
    try{const u=new URL(canonicalURL(value)),host=u.hostname.replace(/^(www|m|web)\./,''),p=u.pathname.toLowerCase(),parts=p.split('/').filter(Boolean);if(!u.hostname.includes('.'))return false;if(/\/(?:login|accounts|privacy|policies|help|search|find|list)(?:\/|$)/.test(p))return false;if(host==='linkedin.com')return /^(in|company|school)$/.test(parts[0])&&!!parts[1];if(['facebook.com','instagram.com','tiktok.com','x.com','twitter.com'].includes(host))return !!parts.length&&!/^(home|explore|share|sharer|reel|reels|posts|watch|groups|events|ads|plugins)$/i.test(parts[0]);if(host==='youtube.com')return /^@/.test(parts[0]||'')||/^(channel|c|user)$/.test(parts[0])&&!!parts[1];if(/vezeeta|dacttra|clinido|ekshef|doctorak/.test(host))return parts.length>=2&&!/^(search|find|list|specialties|cities|countries|online-consultation|doctors)$/.test(parts.at(-1));if(platformForURL(value)==='Google Maps')return /\/maps\/place\//.test(p)||['maps.app.goo.gl','g.page'].includes(host)||!!u.searchParams.get('cid');return !/(^|\.)(google|bing|yahoo)\./.test(host)}catch{return false}
  }
  function identitySignalsForCandidate(client,item){
    const signals=[],title=norm(item&&item.title),url=norm(decodeURIComponent(canonicalURL(item&&item.url))),name=norm(client&&client.identity&&client.identity.displayName),specialty=norm(client&&client.identity&&client.identity.specialty);const nameWords=name.split(/\s+/).filter(w=>w.length>2&&!/^(دكتور|دكتوره|مركز|عياده|clinic|center|dr)$/.test(w));if(nameWords.length&&nameWords.filter(w=>title.includes(w)||url.includes(w)).length>=Math.min(2,nameWords.length))signals.push('الاسم ظاهر في نتيجة البحث أو الرابط');const specWords=specialty.split(/\s+/).filter(w=>w.length>2);if(specWords.some(w=>title.includes(w)))signals.push('التخصص ظاهر في عنوان النتيجة');for(const source of arr(client&&client.sources).filter(s=>s.identity&&s.identity.status==='confirmed'))if(accountKey(source.url)===accountKey(item&&item.url)){signals.push('نفس الحساب المؤكد');break}return Array.from(new Set(signals));
  }
  function updatePlatformChecks(client,status,error){
    client.discovery=client.discovery||{checks:{},runs:[]};client.discovery.checks=client.discovery.checks||{};const at=nowISO();for(const platform of DISCOVERY_PLATFORMS){const sources=client.sources.filter(s=>s.platform===platform),confirmed=sources.some(s=>s.identity&&s.identity.status==='confirmed'),pending=sources.some(s=>s.identity&&s.identity.status==='pending'),previous=client.discovery.checks[platform]||{};let state,reason;if(confirmed){state='found';reason='حساب متحقق منه محفوظ'}else if(pending){state='candidate';reason='لقينا رابطًا محتملًا ويحتاج تأكيد الهوية'}else if(status==='success'){state='not_found';reason='لم يظهر حساب مطابق في البحث الحالي؛ الوجود غير محسوم'}else if(status==='error'){state=previous.state==='found'?'found':'unverified';reason=previous.state==='found'?'النتيجة المؤكدة السابقة محفوظة؛ التحديث الأخير تعذر':`تعذر البحث؛ الوجود غير محسوم${error?`: ${error}`:''}`}else{state=previous.state||'not_searched';reason=previous.reason||'لم يُبحث بعد'}client.discovery.checks[platform]={...previous,state,reason,updatedAt:at,lastAttempt:status==='error'?{state:'unverified',reason:error||'تعذر البحث',at}:status==='success'?{state:'completed',at}:previous.lastAttempt||null}}
  }
  function applyDiscoveryResults(doc,clientId,payload={}){
    const next=normalizeDocument(doc),client=next.clients.find(c=>c.id===clientId);if(!client)throw Error('العميل غير موجود');const status=payload.status==='error'?'error':'success',items=arr(payload.items),added=[],ignored=[];
    for(const item of items){const url=canonicalURL(item&&item.url);if(!url||!isAccountCandidate(url)){ignored.push({url,reason:'الرابط صفحة عامة أو غير صالح كحساب'});continue}const key=accountKey(url),existing=client.sources.find(s=>accountKey(s.url)===key);if(existing){existing.discovery={...existing.discovery,lastSeenAt:nowISO(),searchTitle:text(item.title),query:text(item.query),sample:!!payload.sample};if(existing.identity&&existing.identity.status==='rejected'&&existing.identity.rejectionKind==='user')ignored.push({url,reason:'مستبعد سابقًا بقرار المستخدم'});continue}const signals=identitySignalsForCandidate(client,item),source={id:id('src',`${client.id}|${key}`),url,canonicalUrl:url,platform:platformForURL(url),identity:{status:'pending',reason:'مرشح من البحث؛ يحتاج تأكيد الهوية',proof:{type:'search_candidate'},signals,rejectionKind:null},read:{status:'new',title:'',lastAttempt:null,observedAt:null},content:{text:'',rawText:'',hash:hash('')},links:[],discovery:{searchTitle:text(item.title),query:text(item.query),firstSeenAt:nowISO(),lastSeenAt:nowISO(),sample:!!payload.sample},legacy:{}};client.sources.push(source);added.push(source.id)}
    client.discovery=client.discovery||{checks:{},runs:[]};client.discovery.runs=arr(client.discovery.runs);client.discovery.runs.push({id:id('run',`${client.id}|${Date.now()}`),status,at:nowISO(),items:items.length,added:added.length,ignored:ignored.length,error:text(payload.error),sample:!!payload.sample});client.discovery.runs=client.discovery.runs.slice(-10);updatePlatformChecks(client,status,text(payload.error));client.updatedAt=nowISO();client.revisions.data=(Number(client.revisions.data)||0)+1;return{document:next,added,ignored};
  }
  function setSourceIdentity(doc,clientId,sourceId,status){
    if(!['confirmed','rejected'].includes(status))throw Error('قرار الهوية غير صالح');const next=normalizeDocument(doc),client=next.clients.find(c=>c.id===clientId);if(!client)throw Error('العميل غير موجود');const source=client.sources.find(s=>s.id===sourceId);if(!source)throw Error('المصدر غير موجود');const at=nowISO();source.identity={...source.identity,status,reason:status==='confirmed'?'أكد الفريق أن الرابط يخص العميل':'استبعده الفريق لأنه لا يخص العميل',proof:status==='confirmed'?{type:'user_confirmation'}:source.identity.proof,rejectionKind:status==='rejected'?'user':null,updatedAt:at};const did=`decision_source_${sourceId}`,decision={id:did,targetType:'source_identity',targetId:sourceId,status,at,by:'team'},i=client.decisions.findIndex(d=>d.id===did);if(i>=0)client.decisions[i]=decision;else client.decisions.push(decision);updatePlatformChecks(client,'manual','');client.revisions.review=(Number(client.revisions.review)||0)+1;client.updatedAt=at;return next;
  }
  function reviewStatus(value){return ['approved','rejected','pending'].includes(value)?value:'pending'}
  function unknownKeys(obj,known){const out={};Object.keys(obj||{}).forEach(k=>{if(!known.includes(k))out[k]=clone(obj[k])});return out}
  function cleanEvidence(e,sourceId){
    const quote=text(e&&e.quote);const url=canonicalURL(e&&e.url);const sid=text(e&&e.sourceId)||sourceId||'';
    return {id:text(e&&e.id)||id('ev',`${sid}|${url}|${norm(quote)}`),sourceId:sid,url,quote,kind:text(e&&e.kind)||'web',observedAt:e&&e.observedAt||e&&e.at||null};
  }
  function emptyDocument(){return{format:FORMAT,schemaVersion:SCHEMA_VERSION,appVersion:'rebuild-t04',revision:0,createdAt:nowISO(),updatedAt:nowISO(),clients:[],extensions:{}}}
  function normalizeSource(s,clientId){
    const url=canonicalURL(s&&s.url);return{
      id:text(s&&s.id)||id('src',`${clientId}|${url}`),url,canonicalUrl:url,platform:text(s&&s.platform)||'مصدر خارجي',
      identity:{status:text(s&&s.identity)||'pending',reason:text(s&&s.reason),proof:clone(s&&s.identityProof)||null},
      read:{status:text(s&&s.status)||'new',title:text(s&&s.title),lastAttempt:clone(s&&s.lastAttempt)||null,observedAt:s&&s.at||null},
      content:{text:text(s&&s.text),rawText:text(s&&s.rawText),hash:hash(text(s&&s.text)||text(s&&s.rawText))},
      links:arr(s&&s.links).map(x=>typeof x==='string'?{url:canonicalURL(x)}:{...clone(x),url:canonicalURL(x&&x.url)}).filter(x=>x.url),
      legacy:unknownKeys(s||{},['id','url','platform','identity','reason','identityProof','status','title','lastAttempt','at','text','rawText','links'])
    }
  }
  function migrateClient(old,sourceVersion){
    const clientId=text(old&&old.id)||id('client',`${text(old&&old.name)}|${old&&old.created||''}`);
    const sources=arr(old&&old.sources).map(s=>normalizeSource(s,clientId));
    const evidence=[],evidenceByKey=new Map();
    function addEvidence(raw,sourceId){const e=cleanEvidence(raw,sourceId);const key=`${e.sourceId}|${e.url}|${norm(e.quote)}`;if(!evidenceByKey.has(key)){evidenceByKey.set(key,e.id);evidence.push(e)}return evidenceByKey.get(key)}
    const facts=arr(old&&old.facts).map((f,index)=>{
      const fid=text(f&&f.id)||id('fact',`${clientId}|${text(f&&f.field)}|${index}|${norm(f&&f.value)}`);
      const evidenceIds=arr(f&&f.evidence).map(e=>addEvidence(e,text(f&&f.sourceId))).filter(Boolean);
      const corrected=text(f&&f.teamValue||f&&f.teamCorrection);
      return{id:fid,semanticKey:text(f&&f.mergeKey)||`${text(f&&f.field)||'fact'}|${text(f&&f.scope)||'client'}|${hash(norm(f&&f.value))}`,field:text(f&&f.field)||'fact',scope:text(f&&f.scope)||'client',observedValue:text(f&&f.value),displayValue:text(f&&f.displayValue)||text(f&&f.value),origin:text(f&&f.origin)||'source',sourceIds:Array.from(new Set([text(f&&f.sourceId),...evidenceIds.map(eid=>evidence.find(e=>e.id===eid)?.sourceId)].filter(Boolean))),evidenceIds,review:{status:reviewStatus(f&&f.status),teamCorrection:corrected?{value:corrected,at:f&&f.updated||null,by:'team'}:null,updatedAt:f&&f.updated||null},legacy:unknownKeys(f||{},['id','mergeKey','field','scope','value','displayValue','origin','sourceId','evidence','status','teamValue','teamCorrection','updated'])};
    });
    const findings=arr(old&&old.findings).map((f,index)=>{
      const fid=text(f&&f.id)||id('finding',`${clientId}|${text(f&&f.title)}|${index}`);
      const evidenceIds=arr(f&&f.evidence).map(e=>addEvidence(e,text(f&&f.sourceId))).filter(Boolean);
      return{id:fid,type:text(f&&f.type)||'observation',title:text(f&&f.title),observation:text(f&&f.observation),impact:text(f&&f.impact),proposal:text(f&&f.proposal),sourceIds:Array.from(new Set([text(f&&f.sourceId),...evidenceIds.map(eid=>evidence.find(e=>e.id===eid)?.sourceId)].filter(Boolean))),evidenceIds,review:{status:reviewStatus(f&&f.status),teamCorrection:null,updatedAt:f&&f.updated||null},legacy:unknownKeys(f||{},['id','type','title','observation','impact','proposal','sourceId','evidence','status','updated'])};
    });
    const decisions=arr(old&&old.decisions).map((d,index)=>({...clone(d),id:text(d&&d.id)||id('decision',`${clientId}|${index}|${JSON.stringify(d)}`)}));
    const known=['id','name','specialty','links','notes','created','sources','facts','posts','findings','conflicts','answers','discussions','completed','limits','decisions','revision','identityPolicy','dataPolicy','priorities','updated','platformChecks','presenceAt','examinedAt','archivedFacts','archivedFindings','contentReview','presentationChecks','report'];
    return{
      id:clientId,
      identity:{displayName:text(old&&old.name)||'عميل بدون اسم',officialName:text(old&&old.officialName)||'',specialty:text(old&&old.specialty),status:'draft'},
      inputs:{links:arr(old&&old.links).flatMap(v=>text(v).split(/\s+/)).filter(Boolean),notes:text(old&&old.notes),answers:clone(old&&old.answers)||{}},
      sources,evidence,facts,findings,
      questions:[],decisions,
      report:clone(old&&old.report)||{status:'not_started',slides:[],generatedFromRevision:null,updatedAt:null},
      revisions:{data:Number(old&&old.revision)||0,review:decisions.length,report:0},
      createdAt:old&&old.created||nowISO(),updatedAt:old&&old.updated||nowISO(),
      legacy:{sourceVersion:sourceVersion||'unknown',posts:clone(old&&old.posts)||[],conflicts:clone(old&&old.conflicts)||[],completed:clone(old&&old.completed)||[],limits:clone(old&&old.limits)||[],priorities:clone(old&&old.priorities)||[],unmapped:unknownKeys(old||{},known)}
    }
  }
  function normalizeCanonicalClient(c){
    const base=migrateClient({id:c.id,name:c.identity&&c.identity.displayName,specialty:c.identity&&c.identity.specialty,links:c.inputs&&c.inputs.links,notes:c.inputs&&c.inputs.notes,created:c.createdAt,updated:c.updatedAt},'canonical');
    return{...base,...clone(c),identity:{...base.identity,...clone(c.identity)},inputs:{...base.inputs,...clone(c.inputs)},sources:arr(c.sources).map(s=>s&&s.read?clone(s):normalizeSource(s,c.id)),evidence:arr(c.evidence).map(e=>cleanEvidence(e,e&&e.sourceId)),facts:arr(c.facts).map(f=>({...clone(f),review:{status:'pending',teamCorrection:null,updatedAt:null,...clone(f.review)},evidenceIds:arr(f.evidenceIds),sourceIds:arr(f.sourceIds)})),findings:arr(c.findings).map(f=>({...clone(f),review:{status:'pending',teamCorrection:null,updatedAt:null,...clone(f.review)},evidenceIds:arr(f.evidenceIds),sourceIds:arr(f.sourceIds)})),questions:arr(c.questions),decisions:arr(c.decisions),report:{status:'not_started',slides:[],generatedFromRevision:null,updatedAt:null,...clone(c.report)},revisions:{data:0,review:0,report:0,...clone(c.revisions)},legacy:clone(c.legacy)||{sourceVersion:'canonical',unmapped:{}}};
  }
  function normalizeDocument(input){
    if(input&&input.format===FORMAT&&Number(input.schemaVersion)===SCHEMA_VERSION){const d=clone(input);d.clients=arr(d.clients).map(normalizeCanonicalClient);d.revision=Number(d.revision)||0;d.extensions=clone(d.extensions)||{};return d}
    return migrate(input);
  }
  function migrate(input){
    const payload=clone(input)||{};const wrapper=payload&&payload.db&&Array.isArray(payload.db.clients);const clients=wrapper?payload.db.clients:Array.isArray(payload.clients)?payload.clients:(payload.id?[payload]:[]);const sourceVersion=text(payload.version||payload.db&&payload.db.version)||'legacy';
    const doc=emptyDocument();doc.clients=clients.map(c=>migrateClient(c,sourceVersion));doc.extensions.legacyEnvelope={format:text(payload.format),version:sourceVersion,at:payload.at||null,unmapped:unknownKeys(payload,wrapper?['format','version','at','db']:['clients','version'])};return doc;
  }
  function validateDocument(input){
    const errors=[];if(!input||input.format!==FORMAT)errors.push('صيغة الملف غير مدعومة');if(Number(input&&input.schemaVersion)!==SCHEMA_VERSION)errors.push('إصدار نموذج البيانات غير مدعوم');if(!Array.isArray(input&&input.clients))errors.push('قائمة العملاء غير موجودة');
    arr(input&&input.clients).forEach((c,i)=>{if(!text(c&&c.id))errors.push(`العميل ${i+1}: المعرّف ناقص`);if(!c||!Array.isArray(c.sources)||!Array.isArray(c.facts)||!Array.isArray(c.evidence)||!Array.isArray(c.decisions))errors.push(`العميل ${i+1}: سجل البيانات غير مكتمل`)});return{ok:errors.length===0,errors};
  }
  function setFactDecision(doc,clientId,factId,status,teamValue){
    const next=normalizeDocument(doc),c=next.clients.find(x=>x.id===clientId);if(!c)throw Error('العميل غير موجود');const f=c.facts.find(x=>x.id===factId);if(!f)throw Error('المعلومة غير موجودة');if(!['approved','rejected'].includes(status))throw Error('القرار غير صالح');
    const correction=text(teamValue);if(teamValue!==undefined&&status==='approved'&&!correction)throw Error('اكتب تصحيح الفريق قبل الحفظ');
    const at=nowISO();f.review={status,teamCorrection:correction?{value:correction,at,by:'team'}:(teamValue===undefined?f.review.teamCorrection:null),updatedAt:at};
    const did=`decision_fact_${factId}`;const decision={id:did,targetType:'fact',targetId:factId,status,value:correction||null,at,by:'team'};const n=c.decisions.findIndex(x=>x.id===did);if(n>=0)c.decisions[n]=decision;else c.decisions.push(decision);c.revisions.review=(Number(c.revisions.review)||0)+1;c.updatedAt=at;return next;
  }
  function effectiveFact(fact){return fact&&fact.review&&fact.review.teamCorrection?fact.review.teamCorrection.value:fact&&fact.displayValue||fact&&fact.observedValue||''}
  function upsertFact(doc,clientId,candidate){
    const next=normalizeDocument(doc),c=next.clients.find(x=>x.id===clientId);if(!c)throw Error('العميل غير موجود');const semanticKey=text(candidate.semanticKey)||`${text(candidate.field)}|${text(candidate.scope)||'client'}|${hash(norm(candidate.observedValue||candidate.value))}`;let f=c.facts.find(x=>x.semanticKey===semanticKey||candidate.id&&x.id===candidate.id);const evidenceIds=[];
    arr(candidate.evidence).forEach(raw=>{const e=cleanEvidence(raw,text(candidate.sourceId));const existing=c.evidence.find(x=>x.id===e.id||`${x.sourceId}|${x.url}|${norm(x.quote)}`===`${e.sourceId}|${e.url}|${norm(e.quote)}`);if(existing)evidenceIds.push(existing.id);else{c.evidence.push(e);evidenceIds.push(e.id)}});
    if(f){f.observedValue=text(candidate.observedValue||candidate.value);f.displayValue=text(candidate.displayValue)||f.observedValue;f.evidenceIds=Array.from(new Set([...arr(f.evidenceIds),...evidenceIds]));f.sourceIds=Array.from(new Set([...arr(f.sourceIds),text(candidate.sourceId)].filter(Boolean)))}else{f={id:text(candidate.id)||id('fact',`${c.id}|${semanticKey}`),semanticKey,field:text(candidate.field)||'fact',scope:text(candidate.scope)||'client',observedValue:text(candidate.observedValue||candidate.value),displayValue:text(candidate.displayValue)||text(candidate.observedValue||candidate.value),origin:text(candidate.origin)||'source',sourceIds:[text(candidate.sourceId)].filter(Boolean),evidenceIds,review:{status:'pending',teamCorrection:null,updatedAt:null},legacy:{}};c.facts.push(f)}c.revisions.data=(Number(c.revisions.data)||0)+1;return next;
  }
  function createLocalStorageDriver(storage){return{name:'localStorage',async read(k){return storage.getItem(k)},async write(k,v){storage.setItem(k,v)},async remove(k){storage.removeItem(k)}}}
  function createIndexedDBDriver(indexedDB,name='TechnoTeamRebuildT04'){
    function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('IndexedDB failed'))})}
    return{name:'IndexedDB',async read(k){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('snapshots','readonly'),r=tx.objectStore('snapshots').get(k);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>d.close()})},async write(k,v){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(v,k);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();reject(tx.error)}})},async remove(k){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete(k);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();reject(tx.error)}})}}
  }
  class DataStore{
    constructor(drivers,keys={}){this.drivers=arr(drivers);this.currentKey=keys.current||CURRENT_KEY;this.previousKey=keys.previous||PREVIOUS_KEY;this.document=null;this.lastSave=null;this.queue=Promise.resolve()}
    async load(){const found=[];for(const driver of this.drivers){for(const key of [this.currentKey,this.previousKey]){try{const raw=await driver.read(key);if(raw){const doc=normalizeDocument(JSON.parse(raw)),valid=validateDocument(doc);if(valid.ok)found.push({doc,driver:driver.name,key})}}catch{}}}found.sort((a,b)=>(Number(b.doc.revision)||0)-(Number(a.doc.revision)||0));this.document=found[0]?.doc||emptyDocument();return{document:clone(this.document),recoveredFrom:found[0]?.key===this.previousKey?found[0].driver:null,empty:!found.length}}
    async _save(doc){const valid=validateDocument(doc);if(!valid.ok)throw Error(valid.errors.join('، '));const raw=JSON.stringify(doc),results=[];for(const driver of this.drivers){try{const old=await driver.read(this.currentKey);if(old)await driver.write(this.previousKey,old);await driver.write(this.currentKey,raw);const check=await driver.read(this.currentKey);if(check!==raw)throw Error('فشل التحقق بعد الكتابة');results.push({driver:driver.name,ok:true})}catch(error){results.push({driver:driver.name,ok:false,error:text(error&&error.message)||'فشل غير معروف'})}}const good=results.filter(x=>x.ok);if(!good.length){const e=Error('تعذر الحفظ على كل وسائل التخزين');e.results=results;throw e}this.lastSave={at:nowISO(),degraded:good.length<results.length,results};return this.lastSave}
    async commit(mutator){const task=async()=>{const before=clone(this.document||emptyDocument());let next=clone(before);const changed=await mutator(next);if(changed)next=changed;next=normalizeDocument(next);next.revision=(Number(before.revision)||0)+1;next.updatedAt=nowISO();try{const save=await this._save(next);this.document=next;return{ok:true,document:clone(next),save}}catch(error){this.document=before;return{ok:false,document:clone(before),error,save:{results:error.results||[]}}}};const run=this.queue.then(task,task);this.queue=run.then(()=>{},()=>{});return run}
    async replace(input){const migrated=normalizeDocument(input);return this.commit(()=>migrated)}
    export(){const doc=normalizeDocument(this.document||emptyDocument());return JSON.stringify({...doc,exportedAt:nowISO()},null,2)}
  }
  return{FORMAT,SCHEMA_VERSION,CURRENT_KEY,PREVIOUS_KEY,DISCOVERY_PLATFORMS,emptyDocument,normalizeDocument,migrate,validateDocument,setFactDecision,effectiveFact,upsertFact,createClientDraft,knownInputs,parseInputLinks,platformForURL,accountKey,isAccountCandidate,identitySignalsForCandidate,applyDiscoveryResults,setSourceIdentity,createLocalStorageDriver,createIndexedDBDriver,DataStore,canonicalURL,hash,clone};
});
