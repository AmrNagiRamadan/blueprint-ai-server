const assert=require('node:assert/strict');
const fs=require('fs');
const T=require('./t04-data-model.js');

class MemoryDriver{
  constructor(name){this.name=name;this.map=new Map();this.fail=false}
  async read(k){return this.map.get(k)||null}
  async write(k,v){if(this.fail)throw Error('forced failure');this.map.set(k,v)}
  async remove(k){this.map.delete(k)}
}

(async()=>{
  const old=JSON.parse(fs.readFileSync('../focus_v339/evidence/test339_backup.json','utf8'));
  const migrated=T.migrate(old),valid=T.validateDocument(migrated);
  assert.equal(valid.ok,true,valid.errors.join(','));
  assert.equal(migrated.clients.length,old.db.clients.length);
  assert.equal(migrated.clients[0].facts.length,old.db.clients[0].facts.length);
  assert.equal(migrated.clients[0].sources.length,old.db.clients[0].sources.length);
  const old341=JSON.parse(fs.readFileSync('../focus_v341/evidence/live341-client.json','utf8'));
  const migrated341=T.migrate(old341),valid341=T.validateDocument(migrated341);
  assert.equal(valid341.ok,true,valid341.errors.join(','));
  assert.equal(migrated341.clients[0].facts.length,old341.facts.length);
  assert.equal(migrated341.clients[0].findings.length,old341.findings.length);

  let doc=T.emptyDocument();doc.clients=[T.migrate({id:'c1',name:'Test',sources:[{id:'s1',url:'https://example.com',status:'read',identity:'confirmed'}],facts:[{id:'f1',sourceId:'s1',field:'price',value:'300 جنيه',status:'pending',evidence:[{sourceId:'s1',url:'https://example.com',quote:'سعر الكشف 300 جنيه'}]}]}).clients[0]];
  doc=T.setFactDecision(doc,'c1','f1','approved','350 جنيه');
  const fact=doc.clients[0].facts[0],evidence=doc.clients[0].evidence[0];
  assert.equal(fact.observedValue,'300 جنيه');assert.equal(T.effectiveFact(fact),'350 جنيه');assert.equal(evidence.quote,'سعر الكشف 300 جنيه');assert.equal(fact.review.status,'approved');

  doc=T.upsertFact(doc,'c1',{semanticKey:fact.semanticKey,id:'new-ai-id',field:'price',value:'325 جنيه',sourceId:'s1',evidence:[{sourceId:'s1',url:'https://example.com',quote:'تم تحديث السعر إلى 325 جنيه'}]});
  const refreshed=doc.clients[0].facts[0];assert.equal(refreshed.observedValue,'325 جنيه');assert.equal(T.effectiveFact(refreshed),'350 جنيه');assert.equal(refreshed.review.status,'approved');assert.equal(refreshed.evidenceIds.length,2);

  const a=new MemoryDriver('A'),b=new MemoryDriver('B'),store=new T.DataStore([a,b],{current:'cur',previous:'prev'});await store.load();let result=await store.replace(doc);assert.equal(result.ok,true);assert.equal(JSON.parse(await a.read('cur')).clients[0].facts[0].review.teamCorrection.value,'350 جنيه');
  const exported=store.export();const store2=new T.DataStore([new MemoryDriver('C')],{current:'cur2',previous:'prev2'});await store2.load();result=await store2.replace(JSON.parse(exported));assert.equal(result.ok,true);assert.equal(result.document.clients[0].evidence.length,2);assert.equal(T.effectiveFact(result.document.clients[0].facts[0]),'350 جنيه');

  const before=JSON.stringify(store.document);a.fail=true;b.fail=true;result=await store.commit(d=>T.setFactDecision(d,'c1','f1','rejected'));assert.equal(result.ok,false);assert.equal(JSON.stringify(store.document),before);assert.equal(store.document.clients[0].facts[0].review.status,'approved');
  a.fail=false;b.fail=false;result=await store.commit(d=>T.setFactDecision(d,'c1','f1','rejected'));assert.equal(result.ok,true);assert.ok(await a.read('prev'));assert.equal(store.document.clients[0].facts[0].review.status,'rejected');
  const recoveredStore=new T.DataStore([a],{current:'cur','previous':'prev'});a.map.set('cur','{broken');const recovered=await recoveredStore.load();assert.equal(recovered.recoveredFrom,'A');assert.equal(recovered.document.clients[0].facts[0].review.status,'approved');

  console.log(JSON.stringify({passed:true,legacyV339Clients:migrated.clients.length,legacyV339Facts:migrated.clients[0].facts.length,legacyV341Facts:migrated341.clients[0].facts.length,legacyV341Findings:migrated341.clients[0].findings.length,correctionPreserved:true,evidencePreserved:true,roundtrip:true,totalFailureRollback:true,previousSnapshotRecovery:true}));
})().catch(e=>{console.error(e);process.exit(1)});
