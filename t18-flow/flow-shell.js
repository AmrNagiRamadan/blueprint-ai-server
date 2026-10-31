(function(){
  'use strict';
  const T=window.TechnoData;
  if(!T)return;
  const KEYS={current:'tt_rebuild_t05_current',previous:'tt_rebuild_t05_previous'};
  const steps=[
    {id:6,label:'اكتشاف الحسابات',path:'../t06-review/'},
    {id:7,label:'قراءة المصادر',path:'../t07-review/'},
    {id:8,label:'استخراج المعلومات',path:'../t08-review/'},
    {id:9,label:'مراجعة المعلومات',path:'../t09-review/'},
    {id:10,label:'تحليل المحتوى',path:'../t10-review/'},
    {id:11,label:'اختيار المنافسين',path:'../t11-review/'},
    {id:12,label:'دراسة المنافسين',path:'../t12-review/'},
    {id:13,label:'التشخيص والأسئلة',path:'../t13-review/'},
    {id:14,label:'الخطة الأولية',path:'../t14-review/'},
    {id:15,label:'التقرير النهائي',path:'../t15-report/'}
  ];
  const currentId=Number((location.pathname.match(/\/t(\d+)-(?:review|report)\//)||[])[1]);
  const index=steps.findIndex(x=>x.id===currentId);
  if(index<0)return;

  const style=document.createElement('style');
  style.textContent=`
    html,body{max-width:100%;overflow-x:hidden}
    body{padding-bottom:148px!important}
    .tt-flow{position:fixed;z-index:1000;right:16px;left:16px;bottom:14px;max-width:1110px;margin:auto;background:rgba(255,255,255,.97);border:1px solid #d7e1f1;border-radius:18px;box-shadow:0 16px 45px rgba(20,44,86,.18);padding:12px 14px;backdrop-filter:blur(10px);font-family:Cairo,"Segoe UI",Tahoma,sans-serif;color:#14213d}
    .tt-flow-top,.tt-flow-nav,.tt-flow-stages{display:flex;align-items:center;gap:10px}.tt-flow-top{justify-content:space-between}.tt-flow-title{min-width:0}.tt-flow-title b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tt-flow-title small,.tt-flow-state{color:#65728b;font-size:10px}.tt-flow-state{margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tt-flow-stages{flex:1;justify-content:center}.tt-stage{border:1px solid #dce5f2;background:#f5f8fc;color:#65728b;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;white-space:nowrap}.tt-stage.active{background:#eaf1ff;border-color:#8eafff;color:#165dff}.tt-stage.done{background:#e9f8f2;border-color:#a9dec9;color:#087a55}.tt-flow-btn{border:0;border-radius:10px;padding:9px 13px;font:inherit;font-size:11px;font-weight:900;text-decoration:none;cursor:pointer;white-space:nowrap}.tt-flow-prev{background:#edf2fb;color:#254166}.tt-flow-next{background:#165dff;color:white}.tt-flow-btn[aria-disabled="true"]{opacity:.45;cursor:not-allowed}.tt-flow-complete{color:#087a55;font-weight:900}.tt-flow-step{font-size:10px;color:#165dff;font-weight:900;margin-bottom:2px}.tt-flow-home{color:#165dff;text-decoration:none;font-size:10px;font-weight:900}
    @media(max-width:760px){body{padding-bottom:190px!important}.tt-flow{right:8px;left:8px;bottom:8px;padding:10px}.tt-flow-top{display:grid;grid-template-columns:1fr}.tt-flow-stages{justify-content:flex-start;overflow:auto;max-width:100%;padding-bottom:2px}.tt-flow-nav{justify-content:space-between}.tt-flow-btn{flex:1;text-align:center}.tt-flow-state{white-space:normal;line-height:1.45}.tt-stage{font-size:9px;padding:5px 8px}}
  `;
  document.head.appendChild(style);

  const shell=document.createElement('aside');
  shell.className='tt-flow';
  shell.setAttribute('aria-label','مسار إعداد الأوديت والخطة');
  document.body.appendChild(shell);

  function readDoc(){
    try{return T.normalizeDocument(JSON.parse(localStorage.getItem(KEYS.current)||'{}'))}catch{return T.emptyDocument()}
  }
  function clientFrom(doc){const id=doc.extensions&&doc.extensions.activeClientId;return doc.clients.find(c=>c.id===id)||doc.clients[0]||null}
  function stageFor(stepId){return stepId<=9?0:stepId<=14?1:2}
  function settledRead(s){return ['read','blocked','unavailable'].includes(s&&s.read&&s.read.status)}
  function gate(stepId,c){
    if(!c)return{ok:false,reason:'أنشئ العميل الأول قبل استكمال المسار.'};
    if(stepId===6){const pending=c.sources.filter(s=>s.identity?.status==='pending').length,confirmed=c.sources.filter(s=>s.identity?.status==='confirmed'&&!s.discovery?.sample).length;if(pending)return{ok:false,reason:`احسم ${pending} حسابًا محتملًا قبل قراءة المصادر.`};if(!confirmed)return{ok:false,reason:'ثبّت مصدرًا واحدًا على الأقل يخص العميل.'};return{ok:true,reason:'مراجعة الحسابات مكتملة ✓'};}
    if(stepId===7){const eligible=c.sources.filter(T.sourceReadEligible),pending=eligible.filter(s=>!settledRead(s)).length;if(!eligible.length)return{ok:false,reason:'مفيش مصدر مؤكد للقراءة؛ ارجع وثبّت حسابًا أو موقعًا.'};if(pending)return{ok:false,reason:`نفّذ محاولة قراءة لـ ${pending} مصدر. التعذر المسجل لا يوقف المسار.`};return{ok:true,reason:'كل المصادر المؤكدة اتقرت أو اتسجل حد القراءة بوضوح ✓'};}
    if(stepId===8){const read=c.sources.filter(s=>T.sourceReadEligible(s)&&s.read?.status==='read'),pending=read.filter(s=>s.extraction?.status!=='extracted').length;if(!read.length)return{ok:false,reason:'مفيش مصدر مقروء لاستخراج المعلومات.'};if(pending)return{ok:false,reason:`استخرج المعلومات من ${pending} مصدر مقروء.`};return{ok:true,reason:'استخراج المعلومات مكتمل للمصادر المقروءة ✓'};}
    if(stepId===9){const pending=T.buildFactGroups(c).filter(x=>x.status==='pending').length,conflicts=T.buildFactComparisons(c).conflicts.length;if(pending)return{ok:false,reason:`راجع ${pending} معلومة قبل تحليل المحتوى.`};if(conflicts)return{ok:false,reason:`احسم ${conflicts} تعارضًا حقيقيًا قبل المتابعة.`};return{ok:true,reason:'مراجعة المعلومات والتعارضات مكتملة ✓'};}
    if(stepId===10)return{ok:true,reason:T.buildContentAnalysis(c).totalPosts?'تحليل عينة المحتوى متاح ✓':'لا توجد عينة مؤرخة؛ سيُسجل ده كحد بدل اختراع نسب.'};
    if(stepId===11){const s=T.buildCompetitorSelection(c);if(!s.complete)return{ok:false,reason:`اعتمد من 3 إلى 5 منافسين مناسبين. المعتمد الآن: ${s.approved.length}.`};return{ok:true,reason:'القائمة القصيرة للمنافسين مكتملة ✓'};}
    if(stepId===12){const s=T.buildCompetitorStudy(c),studied=s.rows.filter(x=>x.ads.length||Object.values(x.sections).some(a=>a.length)||Object.values(x.libraryChecks).some(v=>v.status!=='not_checked')).length;if(!s.approvedCount)return{ok:false,reason:'ارجع واعتمد المنافسين الأول.'};if(studied<s.approvedCount)return{ok:false,reason:`استكمل دراسة ${s.approvedCount-studied} منافس أو سجّل تعذر المكتبات بوضوح.`};return{ok:true,reason:'دراسة المنافسين وحدود البيانات مسجلة ✓'};}
    if(stepId===13){const d=T.buildDiagnosis(c),pending=d.items.filter(x=>x.review.status==='pending').length;if(!d.updatedAt)return{ok:false,reason:'حدّث التشخيص من المعلومات المعتمدة.'};if(pending)return{ok:false,reason:`راجع ${pending} بندًا في التشخيص.`};if(d.openQuestions.length)return{ok:false,reason:`جاوب ${d.openQuestions.length} سؤالًا حاسمًا قبل الخطة.`};return{ok:true,reason:'التشخيص والأسئلة مكتملة ✓'};}
    if(stepId===14){const p=T.buildInitialPlan(c);if(!p.updatedAt)return{ok:false,reason:'ابنِ الخطة الأولية الأول.'};if(p.needsRefresh)return{ok:false,reason:'بيانات العميل اتغيرت؛ حدّث الخطة قبل التقرير.'};if(!p.complete)return{ok:false,reason:`راجع ${p.pending.length} جزءًا متبقيًا في الخطة.`};return{ok:true,reason:'الخطة الأولية مكتملة وجاهزة للتقرير ✓'};}
    return{ok:true,reason:T.buildFinalReport(c).complete?'التقرير معتمد والمسار مكتمل ✓':'راجع التقرير واعتمده عند الجاهزية.'};
  }
  function render(){
    const doc=readDoc(),c=clientFrom(doc),g=gate(currentId,c),stage=stageFor(currentId),prev=steps[index-1],next=steps[index+1];
    const stages=['بيانات ودراسة العميل','التحليل والخطة','التقرير النهائي'];
    shell.innerHTML=`<div class="tt-flow-top"><div class="tt-flow-title"><div class="tt-flow-step">الخطوة ${index+1} من ${steps.length} · ${steps[index].label}</div><b>${c?escapeHTML(c.identity?.displayName||'العميل'):'مفيش عميل نشط'}</b><a class="tt-flow-home" href="../techno-team-os/">لوحة العملاء</a></div><div class="tt-flow-stages">${stages.map((x,i)=>`<span class="tt-stage ${i<stage?'done':i===stage?'active':''}">${i+1} · ${x}</span>`).join('')}</div><div class="tt-flow-nav">${prev?`<a class="tt-flow-btn tt-flow-prev" href="${prev.path}">السابق</a>`:'<span></span>'}${next?`<a class="tt-flow-btn tt-flow-next" href="${g.ok?next.path:'#'}" aria-disabled="${g.ok?'false':'true'}">التالي: ${next.label}</a>`:`<a class="tt-flow-btn tt-flow-next" href="../techno-team-os/">إنهاء والعودة للوحة</a>`}</div></div><div class="tt-flow-state ${g.ok?'tt-flow-complete':''}">${escapeHTML(g.reason)}</div>`;
    const nextButton=shell.querySelector('.tt-flow-next[aria-disabled="true"]');
    if(nextButton)nextButton.addEventListener('click',e=>{e.preventDefault();shell.querySelector('.tt-flow-state')?.scrollIntoView({behavior:'smooth',block:'nearest'});});
  }
  function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
  async function persistActive(id){
    if(!id)return;
    const drivers=[T.createLocalStorageDriver(localStorage)];
    try{drivers.push(T.createIndexedDBDriver(indexedDB,'TechnoTeamRebuildT05'))}catch{}
    const store=new T.DataStore(drivers,KEYS);await store.load();await store.commit(d=>{d.extensions={...d.extensions,activeClientId:id};return d});render();
  }
  document.addEventListener('change',e=>{if(e.target&&e.target.id==='clientSelect')setTimeout(()=>persistActive(e.target.value),0)},true);
  document.addEventListener('click',()=>setTimeout(render,120),true);
  window.addEventListener('storage',render);
  render();
  setInterval(render,1000);
  window.TechnoFlow={steps,gate,render};
})();
