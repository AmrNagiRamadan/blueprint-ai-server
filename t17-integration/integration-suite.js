(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TechnoIntegration=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const stamp='2026-10-28T12:00:00.000Z';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const assertion=(id,group,label,ok,detail,kind='deterministic')=>({id,group,label,ok:!!ok,detail:String(detail||''),kind});
  const client=(T,doc,id)=>T.normalizeDocument(doc).clients.find(x=>x.id===id);

  function sourceText(kind){
    if(kind==='facebook')return [
      'الاسم الرسمي: عيادة النور للنساء والتوليد',
      'التخصص: نساء وتوليد',
      '1200 متابع',
      'التقييم 4.8 من 5 بناء على 200 تقييم',
      'الحجز عن طريق واتساب أو التليفون',
      'الهاتف: 01000000000'
    ].join('\n');
    return [
      'الاسم الرسمي: عيادة النور للنساء والتوليد',
      'التخصص: نساء وتوليد',
      'الخدمات: متابعة حمل، ولادة، سونار',
      'الكشف 300 جنيه',
      'العنوان: 2 شارع بستان النور، العباسية، القاهرة',
      'تأسست منذ 2012',
      'الحجز عن طريق واتساب أو التليفون'
    ].join('\n');
  }

  function addReadAndExtract(T,doc,clientId,source,body){
    let next=T.applyTrackedSourceRead(doc,clientId,source.id,{status:'read',title:source.platform,text:body,method:'t17_fixture',coverage:'synthetic_acceptance'},{origin:'sample',requestId:'t17_read_'+source.id,provider:'fixture'});
    next=T.applyIncrementalFactExtraction(next,clientId,source.id,undefined,{origin:'sample',requestId:'t17_extract_'+source.id,provider:'deterministic'});
    return next;
  }

  function approveFacts(T,doc,clientId){
    let next=doc;
    for(const group of T.buildFactGroups(client(T,next,clientId)))next=T.setFactGroupDecision(next,clientId,group.memberIds,'approved');
    return next;
  }

  function addContent(T,doc,clientId,sourceId){
    const posts=[
      ['2026-10-20','أعراض تستدعي زيارة طبيبة النساء','https://facebook.com/noor/posts/1','image'],
      ['2026-10-17','نصائح مهمة لمتابعة الحمل بأمان','https://facebook.com/noor/posts/2','image'],
      ['2026-10-14','الفرق بين المتابعة الدورية والزيارة الطارئة','https://facebook.com/noor/posts/3','carousel'],
      ['2026-10-11','هل تعلمي متى تحتاجين إلى السونار؟','https://facebook.com/noor/posts/4','video'],
      ['2026-10-08','نصيحة للأم في أول شهور الحمل','https://facebook.com/noor/posts/5','image'],
      ['2026-10-05','تعرفي على أسباب المتابعة المنتظمة','https://facebook.com/noor/posts/6','video']
    ].map(([publishedAt,text,url,format])=>({publishedAt,text,url,format,origin:'t17_fixture'}));
    return T.setContentSample(doc,clientId,sourceId,posts,{origin:'sample',coverageLabel:'عينة صناعية لاختبار المسار'});
  }

  function addCompetitors(T,doc,clientId){
    let next=T.setCompetitorSearchContext(doc,clientId,{service:'نساء وتوليد',region:'العباسية'});
    const candidates=[1,2,3].map(n=>({
      name:'مركز منافس '+n,
      service:'نساء وتوليد',
      area:'العباسية',
      summary:'عيادة نساء وتوليد تخدم العباسية',
      sources:[{url:`https://competitor${n}.example/`,type:'official_site',title:'مركز منافس '+n,evidence:'نساء وتوليد في العباسية'}]
    }));
    next=T.applyCompetitorCandidates(next,clientId,candidates,{origin:'sample',status:'success'}).document;
    const selected=T.buildCompetitorSelection(client(T,next,clientId)).candidates;
    for(const c of selected)next=T.setCompetitorDecision(next,clientId,c.id,'approved','مرشح صناعي لاختبار الربط');
    for(const [i,c] of T.buildCompetitorSelection(client(T,next,clientId)).approved.entries()){
      const ad=[
        c.name,
        'مُموَّل',
        'معرف المكتبة: T17'+(i+1),
        'بدأ التشغيل في 01/09/2026',
        'قصة مريضة وتجربتها مع متابعة الحمل في العباسية',
        'إرسال رسالة',
        'https://facebook.com/ads/library/?id=T17'+(i+1)
      ].join('\n');
      next=T.applyCompetitorAdPaste(next,clientId,c.id,'Meta',ad,{asOf:'2026-10-28',libraryUrl:'https://facebook.com/ads/library/',observedAt:stamp}).document;
    }
    return next;
  }

  function approveDiagnosisAndPlan(T,doc,clientId){
    let next=T.refreshDiagnosis(doc,clientId);
    for(const item of T.buildDiagnosis(client(T,next,clientId)).items)next=T.setDiagnosisDecision(next,clientId,item.id,'approved');
    next=T.refreshInitialPlan(next,clientId);
    for(const item of T.buildInitialPlan(client(T,next,clientId)).items)next=T.setPlanDecision(next,clientId,item.id,'approved');
    next=T.refreshFinalReport(next,clientId);
    const report=T.buildFinalReport(client(T,next,clientId));
    if(report.blockers.length)throw Error('تقرير العينة المكتملة ما زال به حواجز: '+report.blockers.join(' | '));
    next=T.approveFinalReport(next,clientId);
    return next;
  }

  function buildFullFixture(T){
    let doc=T.emptyDocument();
    const made=T.createClientDraft(doc,{
      id:'t17_full_client',name:'عينة T17 — عيادة النور',specialty:'نساء وتوليد',
      links:['https://noor.example/','https://facebook.com/noor.clinic'],
      notes:'عينة صناعية لمسار القبول المتكامل.',goal:'الوصول إلى 60 حجزًا مؤكدًا شهريًا',budget:'30000 جنيه'
    });
    doc=made.document;const id=made.clientId,c=doc.clients.find(x=>x.id===id);
    c.inputs.answers={bestCustomer:'سيدات يحتجن متابعة حمل في القاهرة',usp:'خبرة وموعد واضح ودليل تقييم موثق',funnel:'إعلان ← واتساب ← تأهيل ← حجز مؤكد',currentResults:'35 حجزًا مؤكدًا شهريًا',capacity:'70 حجزًا شهريًا'};
    const website=c.sources.find(x=>x.platform==='موقع / مصدر خارجي'),facebook=c.sources.find(x=>x.platform==='Facebook');
    doc=addReadAndExtract(T,doc,id,website,sourceText('website'));
    doc=addReadAndExtract(T,doc,id,facebook,sourceText('facebook'));
    doc=approveFacts(T,doc,id);
    doc=addContent(T,doc,id,facebook.id);
    doc=addCompetitors(T,doc,id);
    doc=approveDiagnosisAndPlan(T,doc,id);
    doc=T.setReportSlideEdit(doc,id,T.buildFinalReport(client(T,doc,id)).slides[6].id,{headline:'تموضع راجعه الفريق في T17'});
    doc=T.refreshFinalReport(doc,id);
    doc=T.approveFinalReport(doc,id);
    doc=T.recordOperation(doc,id,{requestId:'t17_actual_fixture',kind:'other',status:'success',origin:'sample',provider:'fixture',usage:{inputTokens:100,outputTokens:50,source:'sample'},cost:{amount:0.01,currency:'USD',source:'sample'},startedAt:stamp,completedAt:stamp,note:'قيمة صناعية لاختبار الفصل فقط'});
    return{document:doc,clientId:id,websiteId:website.id,facebookId:facebook.id};
  }

  function buildPartialFixture(T,doc){
    const made=T.createClientDraft(doc,{id:'t17_partial_client',name:'عينة T17 — عميل ناقص',specialty:'جلدية',links:['https://partial.example/']});
    return{document:made.document,clientId:made.clientId};
  }

  function legacyFixture(){
    return{appVersion:'V3.40',clients:[{id:'legacy_t17',name:'عميل قديم T17',specialty:'عيون',sources:[{url:'https://legacy.example/',platform:'موقع / مصدر خارجي',identity:'confirmed',status:'read',title:'الموقع القديم',text:'الاسم الرسمي: مركز العيون القديم\nالتخصص: عيون\nالهاتف: 01012345678'}],facts:[{id:'legacy_fact',field:'specialty',scope:'client',value:'عيون',status:'approved',evidence:[{url:'https://legacy.example/',quote:'التخصص: عيون'}]}],answers:{budget:'15000'},created:'2025-01-01T00:00:00.000Z'}]};
  }

  function runDeterministic(T){
    const checks=[];let full;
    try{full=buildFullFixture(T);checks.push(assertion('full_path','المسار الكامل','إنشاء ← قراءة ← استخراج ← مراجعة ← تشخيص ← خطة ← تقرير',T.buildFinalReport(client(T,full.document,full.clientId)).complete,'تقرير معتمد من 12 سلايدًا'))}catch(e){checks.push(assertion('full_path','المسار الكامل','المسار الكامل',false,e.message));return{checks,document:T.emptyDocument(),ids:{}}}
    let doc=full.document;const partial=buildPartialFixture(T,doc);doc=partial.document;
    const fullClient=client(T,doc,full.clientId),partialClient=client(T,doc,partial.clientId);
    checks.push(assertion('multi_client','عزل العملاء','عميلان لا يلمسان بيانات بعضهما',doc.clients.length===2&&fullClient.report.status==='approved'&&partialClient.report.status==='not_started',`${doc.clients.length} عميل؛ التقرير المكتمل ظل مع عميله`));
    checks.push(assertion('partial_resume','استكمال العمل','العميل الناقص يبدأ من القراءة',T.buildWorkContinuation(partialClient).next?.stage==='قراءة المصادر',T.buildWorkContinuation(partialClient).next?.reason||'لا توجد خطوة'));
    const migrated=T.migrate(legacyFixture()),legacy=migrated.clients.find(x=>x.id==='legacy_t17');
    checks.push(assertion('legacy_migration','الترحيل','فتح نسخة قديمة من دون فقد العميل والمعلومة',!!legacy&&legacy.facts.some(x=>x.field==='specialty')&&legacy.inputs.answers.budget==='15000',legacy?`${legacy.identity.displayName} · ${legacy.facts.length} معلومة`:'العميل مفقود'));
    const before=client(T,doc,full.clientId).sources.find(x=>x.id===full.websiteId).content.text;
    doc=T.applyTrackedSourceRead(doc,full.clientId,full.websiteId,{status:'unavailable',reason:'T17 simulated timeout',method:'t17_failure'},{origin:'sample',requestId:'t17_failed_retry'});
    const afterSource=client(T,doc,full.clientId).sources.find(x=>x.id===full.websiteId);
    checks.push(assertion('failed_read_preserves','فشل الاتصال','فشل التحديث لا يمسح آخر قراءة ناجحة',afterSource.content.text===before&&afterSource.read.status==='read'&&afterSource.read.lastAttempt.status==='unavailable','آخر قراءة محفوظة، وآخر محاولة مسجلة كمتعذرة'));
    const update=T.planIncrementalUpdate(client(T,doc,full.clientId));
    checks.push(assertion('incremental','التحديث الجزئي','المصادر غير المتغيرة لا يعاد استخراجها',update.counts.skip>=1&&update.counts.extract===0,`${update.counts.skip} تخطي · ${update.counts.read} إعادة قراءة`));
    const report=T.buildFinalReport(client(T,doc,full.clientId));
    checks.push(assertion('team_edit','المراجعة','تعديل الفريق ظل محفوظًا بعد تحديث التقرير',report.slides[6].displayHeadline==='تموضع راجعه الفريق في T17',report.slides[6].displayHeadline));
    const ops=T.buildOperationSummary(client(T,doc,full.clientId));
    checks.push(assertion('sample_cost','التكلفة','بيانات القبول مستبعدة من الإجمالي الحي',ops.requests.live===0&&ops.requests.sample>0&&ops.costs.live.length===0,`${ops.requests.sample} عمليات عينة · 0 عمليات حية`));
    const valid=T.validateDocument(doc);
    checks.push(assertion('schema','سلامة البيانات','المستند النهائي يمر على التحقق',valid.ok,valid.ok?'Schema v1 صالح':valid.errors.join(' | ')));
    return{checks,document:doc,ids:{full:full.clientId,partial:partial.clientId,legacy:'legacy_t17'},migrated};
  }

  function memoryDriver(name='memory',failWrite=false){const map=new Map();return{name,async read(k){return map.get(k)||null},async write(k,v){if(failWrite)throw Error('T17 simulated storage failure');map.set(k,v)},async remove(k){map.delete(k)},map}}
  async function runPersistence(T,base){
    const checks=[];
    const primary=memoryDriver('primary'),broken=memoryDriver('broken',true),keys={current:'t17_current',previous:'t17_previous'};
    const store=new T.DataStore([primary,broken],keys);await store.load();const saved=await store.replace(base);
    const reopened=new T.DataStore([primary],keys),loaded=await reopened.load();
    checks.push(assertion('degraded_save','الحفظ','نجاح وسيلة واحدة يحفظ البيانات ويعلن الوضع المتدهور',saved.ok&&saved.save.degraded&&loaded.document.clients.length===base.clients.length,`${loaded.document.clients.length} عميل بعد إعادة الفتح`));
    const dead=new T.DataStore([memoryDriver('dead',true)],{current:'t17_dead',previous:'t17_dead_prev'});await dead.load();const failed=await dead.commit(()=>base);
    checks.push(assertion('all_save_fail','الحفظ','فشل كل وسائل التخزين لا يعرض نجاحًا ولا يستبدل المستند',!failed.ok&&failed.document.clients.length===0,failed.error?.message||'لم يرجع خطأ'));
    return checks;
  }

  async function run(T){
    const out=runDeterministic(T);const storage=await runPersistence(T,out.document);const checks=[...out.checks,...storage],passed=checks.filter(x=>x.ok).length;
    return{ranAt:new Date().toISOString(),synthetic:true,checks,passed,failed:checks.length-passed,total:checks.length,document:out.document,ids:out.ids,limits:[
      'كل بيانات العملاء والمصادر والإعلانات في T17 صناعية وموسومة للاختبار.',
      'T17 لم تنفذ بحث إنترنت أو قراءة مصدر حي أو طلب AI حقيقي.',
      'فشل الاتصال والحفظ تم بمحاكاة حتمية لاختبار حماية البيانات.',
      'اختبار الإنتاج يتحقق من الواجهة والحفظ والتنقل؛ لا يثبت جودة نتائج البحث الحقيقي.'
    ]};
  }

  return{run,runDeterministic,runPersistence,buildFullFixture,legacyFixture};
});
