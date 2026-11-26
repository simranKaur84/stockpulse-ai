export type PricePoint={date:string;close:number;volume:number};
export type DatedEvent={publishedAt:string;title:string};
export type FundamentalEvent={publishedAt:string;earningsSurprisePercent?:number};
export type ForecastContext={market?:PricePoint[];safeHaven?:PricePoint[];companyNews?:DatedEvent[];companyNewsCoverage?:{from:string;to:string};macroNews?:DatedEvent[];macroNewsCoverage?:{from:string;to:string};fundamentals?:FundamentalEvent[]};
export type Forecast={horizonDays:number;direction:"up"|"down"|"uncertain";probabilityUp:number|null;sampleSize:number;testSize:number;brierScore:number|null;baselineBrier:number|null;accuracy:number|null;signalInputs:string[];note:string};
type Sample={x:number[];y:number};
const sigmoid=(x:number)=>1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));
const clamp=(x:number)=>Math.max(-2,Math.min(2,x));
const day=(s:string)=>{const n=Date.parse(s);return Number.isFinite(n)?Math.floor(n/86400000):NaN};
const sorted=(rows:PricePoint[])=>[...rows].filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.close>0&&Number.isFinite(p.close)).sort((a,b)=>a.date.localeCompare(b.date));
export function headlineTone(title:string):number{
 const pos=/\b(beat|beats|growth|profit|profits|surge|rally|record|upgrade|expands|approval|wins|breakthrough|raises|gains)\b/gi;
 const neg=/\b(miss|misses|loss|losses|fall|falls|drop|drops|probe|lawsuit|downgrade|cuts|risk|warning|recall|layoffs|decline|sanction)\b/gi;
 return clamp(((title.match(pos)||[]).length-(title.match(neg)||[]).length)/2);
}
function marketFeatures(points:PricePoint[],date:string):[number,number]{
 const past=points.filter(p=>p.date<date);
 if(past.length<21)return [0,0];
 const last=past.at(-1)!.close;
 return [clamp((last/past.at(-6)!.close-1)*10),clamp((last/past.at(-21)!.close-1)*5)];
}
function eventFeatures(events:DatedEvent[],date:string):[number,number]{
 const now=day(date);
 const relevant=events.filter(e=>{const t=day(e.publishedAt);return Number.isFinite(t)&&t<now&&t>=now-7});
 return [relevant.length?clamp(relevant.reduce((a,b)=>a+headlineTone(b.title),0)/relevant.length):0,clamp(relevant.length/10)];
}
function earningsFeatures(events:FundamentalEvent[],date:string):[number,number]{
 const now=day(date);
 const known=events.filter(e=>{const t=day(e.publishedAt);return Number.isFinite(t)&&t<now&&t>=now-185}).sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt));
 const e=known.at(-1);
 return [e?.earningsSurprisePercent===undefined?0:clamp(e.earningsSurprisePercent/20),e?1:0];
}
export function features(points:PricePoint[],i:number,c?:ForecastContext):number[]|null{
 if(i<21)return null;
 const current=points[i].close,week=points[i-5].close,month=points[i-20].close;
 if(!(current>0&&week>0&&month>0))return null;
 const r=points.slice(i-9,i+1).map((v,j,a)=>j?Math.log(v.close/a[j-1].close):0).slice(1);
 const avg=r.reduce((a,b)=>a+b,0)/r.length;
 const v=Math.sqrt(r.reduce((a,b)=>a+(b-avg)**2,0)/r.length);
 const f=[1,clamp((current/week-1)*10),clamp((current/month-1)*5),clamp(v*25)];
 const date=points[i].date;
 if(c?.market?.length)f.push(...marketFeatures(c.market,date));
 if(c?.safeHaven?.length)f.push(...marketFeatures(c.safeHaven,date));
 if(c?.companyNewsCoverage&&c.companyNews)f.push(...eventFeatures(c.companyNews,date));
 if(c?.macroNewsCoverage&&c.macroNews)f.push(...eventFeatures(c.macroNews,date));
 if(c?.fundamentals?.length)f.push(...earningsFeatures(c.fundamentals,date));
 return f;
}
function train(samples:Sample[]):number[]{
 const w=Array(samples[0].x.length).fill(0) as number[];
 for(let epoch=0;epoch<250;epoch++){
  const g=w.map(()=>0);
  for(const s of samples){const delta=sigmoid(w.reduce((a,v,i)=>a+v*s.x[i],0))-s.y;for(let i=0;i<w.length;i++)g[i]+=delta*s.x[i]}
  for(let i=0;i<w.length;i++)w[i]-=0.25*(g[i]/samples.length+.01*w[i]);
 }
 return w;
}
function evaluate(rows:PricePoint[],horizonDays:number,c?:ForecastContext):Forecast{
 const signalInputs=["5- and 20-session price returns","recent volatility"];
 if(c?.market?.length)signalInputs.push("historical broad-market returns");
 if(c?.safeHaven?.length)signalInputs.push("historical safe-haven proxy returns");
 if(c?.companyNewsCoverage&&c.companyNews)signalInputs.push("dated company news sentiment");
 if(c?.macroNewsCoverage&&c.macroNews)signalInputs.push("dated macro/geopolitical news sentiment");
 if(c?.fundamentals?.length)signalInputs.push("dated earnings reports");
 const empty=(note:string):Forecast=>({horizonDays,direction:"uncertain",probabilityUp:null,sampleSize:0,testSize:0,brierScore:null,baselineBrier:null,accuracy:null,signalInputs,note});
 if(![5,20].includes(horizonDays))return empty("Unsupported forecast horizon.");
 const windows=[c?.companyNewsCoverage,c?.macroNewsCoverage].filter((v):v is {from:string;to:string}=>!!v);
 const from=windows.length?Math.max(...windows.map(x=>day(x.from))):-Infinity;
 const to=windows.length?Math.min(...windows.map(x=>day(x.to))):Infinity;
 const samples:Sample[]=[];
 for(let i=21;i+horizonDays<rows.length;i++){
  const when=day(rows[i].date);if(when<from+7||when>to)continue;
  const x=features(rows,i,c);if(x)samples.push({x,y:rows[i+horizonDays].close>rows[i].close?1:0});
 }
 if(samples.length<100)return empty("Insufficient dated training data for an out-of-sample evaluation.");
 const split=Math.floor(samples.length*.8),training=samples.slice(0,split-horizonDays),testing=samples.slice(split);
 if(training.length<70||testing.length<20)return empty("Not enough disjoint training and test examples.");
 const w=train(training);
 const probs=testing.map(s=>sigmoid(w.reduce((a,b,i)=>a+b*s.x[i],0)));
 const brier=probs.reduce((a,p,i)=>a+(p-testing[i].y)**2,0)/testing.length;
 const baseRate=training.reduce((a,s)=>a+s.y,0)/training.length;
 const baseline=testing.reduce((a,s)=>a+(baseRate-s.y)**2,0)/testing.length;
 const accuracy=probs.reduce((a,p,i)=>a+(Number(p>=.5)===testing[i].y?1:0),0)/testing.length;
 const last=rows.at(-1);
 if(!last||day(last.date)>to)return empty("No current observation within verified historical coverage.");
 const x=features(rows,rows.length-1,c);if(!x)return empty("Latest features unavailable.");
 const p=sigmoid(w.reduce((a,b,i)=>a+b*x[i],0));
 const passed=brier<baseline;
 return {horizonDays,direction:passed&&Math.abs(p-.5)>=.08?(p>.5?"up":"down"):"uncertain",probabilityUp:passed?Math.round(p*1000)/1000:null,sampleSize:training.length,testSize:testing.length,brierScore:+brier.toFixed(4),baselineBrier:+baseline.toFixed(4),accuracy:+accuracy.toFixed(3),signalInputs,note:passed?"Experimental dated-signal holdout estimate; not independently calibrated or validated for trading.":"Did not beat simple historical baseline; probability withheld."};
}
export function forecast(points:PricePoint[],horizonDays:number,context?:ForecastContext):Forecast{
 const rows=sorted(points);
 if(!context)return evaluate(rows,horizonDays);
 const ctx:ForecastContext={...context,market:context.market?.length?sorted(context.market):undefined,safeHaven:context.safeHaven?.length?sorted(context.safeHaven):undefined};
 const advanced=evaluate(rows,horizonDays,ctx);
 if(advanced.sampleSize)return advanced;
 const basic=evaluate(rows,horizonDays);
 return {...basic,note:"Advanced inputs lacked sufficient historical coverage. Prediction uses price history only; current news and fundamentals were not used as historical training data."};
}
