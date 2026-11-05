import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
  const ctx={window:{},console,URL,AbortController,setTimeout,clearTimeout,fetch:null};
  ctx.window.window=ctx.window;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('r02-integrated-app/pipeline.js','utf8'),ctx);
  return ctx.window.TechnoPipeline;
}

const source={
  id:'client_site',
  url:'https://clinic.example.com/about',
  title:'الموقع الرسمي',
  platform:'موقع / مصدر خارجي',
  observedAt:'2026-11-05T00:00:00.000Z',
  text:[
    'يعمل المركز منذ عام 2002.',
    'الفريق يضم استشاريين في زراعة وتقويم الأسنان.',
    'التقييم 4.8 من 200 رأي على منصة الحجز.',
    'الحجز متاح مباشرة عبر الهاتف وواتساب.',
    'الفرع بجوار محطة المترو مع مواعيد مسائية.',
    'صفحة الزراعة تشرح الخطوات والمدة المتوقعة.',
    'صفحة الأسعار لا توضح ما يشمله سعر الكشف.'
  ].join(' ')
};

function strength(title,fact,quote,category){
  return {title,fact,category,patientBenefit:'تقلل التردد قبل الحجز',buildOn:'نبرزها في الرسالة وصفحة الخدمة',evidence:[{sourceId:source.id,quote}]};
}

test('Q13 keeps up to six distinct evidenced strengths and links positioning to strengths and weaknesses',()=>{
  const P=load();
  const raw={
    executive:{headline:'فرصة واضحة مبنية على الثقة والوضوح'},
    strengths:[
      strength('خبرة ممتدة','يعمل المركز منذ عام 2002.','يعمل المركز منذ عام 2002.','خبرة'),
      strength('فريق متخصص','الفريق يضم استشاريين في زراعة وتقويم الأسنان.','الفريق يضم استشاريين في زراعة وتقويم الأسنان.','تخصص'),
      strength('دليل اجتماعي قوي','التقييم 4.8 من 200 رأي على منصة الحجز.','التقييم 4.8 من 200 رأي على منصة الحجز.','دليل اجتماعي'),
      strength('حجز مباشر','الحجز متاح مباشرة عبر الهاتف وواتساب.','الحجز متاح مباشرة عبر الهاتف وواتساب.','حجز'),
      strength('وصول أسهل','الفرع بجوار محطة المترو مع مواعيد مسائية.','الفرع بجوار محطة المترو مع مواعيد مسائية.','وصول'),
      strength('شرح واضح للعلاج','صفحة الزراعة تشرح الخطوات والمدة المتوقعة.','صفحة الزراعة تشرح الخطوات والمدة المتوقعة.','شرح')
    ],
    weaknesses:[{title:'غموض سعر الكشف',observation:'صفحة الأسعار لا توضح ما يشمله سعر الكشف.',impact:'قد يؤخر قرار التواصل',action:'وضح ما يشمله الكشف',evidence:[{sourceId:source.id,quote:'صفحة الأسعار لا توضح ما يشمله سعر الكشف.'}]}],
    priorities:[],competitorInsights:[],
    positioning:{audience:'باحث عن علاج واضح',need:'تقليل الغموض قبل الحجز',promise:'خطة واضحة قبل بدء العلاج',reasonToBelieve:'الخبرة والفريق وشرح الخدمة',idea:'اعرف خطتك بثقة',condition:'اعتماد الطبيب'},
    journey:[],channels:[],roadmap:[],metrics:[],requirements:[],limits:[]
  };
  const study=P.validateStudy(raw,[source],[],{sampleCount:0});
  assert.equal(study.strengths.length,6);
  assert.equal(study.weaknesses.length,1);
  assert.deepEqual(Array.from(study.positioning.basis.strengths),raw.strengths.map(x=>x.title));
  assert.deepEqual(Array.from(study.positioning.basis.weaknesses),['غموض سعر الكشف']);
  const client={identity:{displayName:'عيادة الاختبار',specialty:'أسنان'},inputs:{goal:'حجوزات'}};
  const slides=P.slidesFromStudy(client,study);
  const strengths=slides.find(x=>x.key==='strengths');
  const weaknesses=slides.find(x=>x.key==='weaknesses');
  const positioning=slides.find(x=>x.key==='positioning');
  assert.equal(strengths.blocks.length,6);
  assert.equal(weaknesses.blocks.length,1);
  assert.ok(positioning.blocks.some(x=>x.title==='نبني على'&&x.value.includes('خبرة ممتدة')));
  assert.ok(positioning.blocks.some(x=>x.title==='نعالج'&&x.value.includes('غموض سعر الكشف')));
  assert.ok(positioning.blocks.some(x=>x.title==='سياق السوق'&&x.value.includes('غير مكتملة')));
});

test('Q13 does not invent strengths when evidence is missing and rejects generic platform presence',()=>{
  const P=load();
  const raw={
    strengths:[
      strength('خبرة ممتدة','يعمل المركز منذ عام 2002.','يعمل المركز منذ عام 2002.','خبرة'),
      strength('شرح واضح للعلاج','صفحة الزراعة تشرح الخطوات والمدة المتوقعة.','صفحة الزراعة تشرح الخطوات والمدة المتوقعة.','شرح'),
      strength('وجود موقع إلكتروني','وجود موقع إلكتروني','صفحة الزراعة تشرح الخطوات والمدة المتوقعة.','منصة'),
      strength('نتائج مضمونة','نتائج مضمونة لكل المرضى','هذا النص غير موجود','نتائج')
    ],
    weaknesses:[{title:'معلومة ناقصة',observation:'تعذرت القراءة',impact:'غير معروف',action:'تحقق',evidence:[]}],
    priorities:[],competitorInsights:[],positioning:{},journey:[],channels:[],roadmap:[],metrics:[],requirements:[],limits:[]
  };
  const study=P.validateStudy(raw,[source],[],{sampleCount:0});
  assert.equal(study.strengths.length,2);
  assert.equal(study.weaknesses.length,0);
  assert.equal(study.quality.status,'limited');
  assert.ok(study.quality.warnings.some(x=>x.includes('4–6')));
  assert.ok(study.limits.some(x=>x.includes('لا يمثل ميزة تنافسية')));
});
