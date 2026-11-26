export type PricePoint = {date:string;close:number;volume:number};
export type Forecast = {horizonDays:number;direction:"up"|"down"|"uncertain";probabilityUp:number|null;sampleSize:number;testSize:number;brierScore:number|null;baselineBrier:number|null;accuracy:number|null;note:string};
type Sample={x:number[];y:number};
const sigmoid=(x:number)=>1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));
export function features(points:PricePoint[],i:number):number[]|null{
 if(i<21)return null;
 const p=points[i].close,prev=points[i-5].close,month=points[i-20].close;
 if(!(p>0&&prev>0&&month>0))return null;
 const rets=points.slice(i-9,i+1).map((v,j,a)=>j?Math.log(v.close/a[j-1].close):0).slice(1);
 const mean=rets.reduce((a,b)=>a+b,0)/rets.length;
 const vol=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)**2,0)/rets.length);
 return [1,Math.max(-2,Math.min(2,(p/prev-1)*10)),Math.max(-2,Math.min(2,(p/month-1)*5)),Math.min(2,vol*25)];
}
function train(samples:Sample[]):number[]{
 const w=[0,0,0,0];
 for(let epoch=0;epoch<250;epoch++){
  const g=[0,0,0,0];
  for(const s of samples){const d=sigmoid(w.reduce((a,b,j)=>a+b*s.x[j],0))-s.y;for(let k=0;k<4;k++)g[k]+=d*s.x[k];}
  for(let k=0;k<4;k++)w[k]-=0.25*(g[k]/samples.length+0.01*w[k]);
 }
 return w;
}
export function forecast(points:PricePoint[],horizonDays:number):Forecast{
 const insufficient=(note:string):Forecast=>({horizonDays,direction:"uncertain",probabilityUp:null,sampleSize:0,testSize:0,brierScore:null,baselineBrier:null,accuracy:null,note});
 if(![5,20].includes(horizonDays))return insufficient("Unsupported forecasting horizon.");
 const ordered=[...points].filter(p=>Number.isFinite(p.close)&&p.close>0).sort((a,b)=>a.date.localeCompare(b.date));
 const samples:Sample[]=[];
 for(let i=21;i+horizonDays<ordered.length;i++){
  const x=features(ordered,i);if(x)samples.push({x,y:ordered[i+horizonDays].close>ordered[i].close?1:0});
 }
 if(samples.length<100)return insufficient("Insufficient historical data to train and evaluate an out-of-sample model.");
 const cut=Math.floor(samples.length*.8),trainSet=samples.slice(0,cut),testSet=samples.slice(cut);
 // Purge overlapping labels around split to avoid train/test target leakage.
 const safeTrain=trainSet.slice(0,-horizonDays);
 if(safeTrain.length<70)return insufficient("Insufficient non-overlapping training observations.");
 const w=train(safeTrain);
 const probs=testSet.map(s=>sigmoid(w.reduce((a,b,j)=>a+b*s.x[j],0)));
 const brier=probs.reduce((a,p,j)=>a+(p-testSet[j].y)**2,0)/testSet.length;
 const prevalence=safeTrain.reduce((a,s)=>a+s.y,0)/safeTrain.length;
 const base=testSet.reduce((a,s)=>a+(prevalence-s.y)**2,0)/testSet.length;
 const acc=probs.reduce((a,p,j)=>a+(Number(p>=.5)===testSet[j].y?1:0),0)/testSet.length;
 const latest=features(ordered,ordered.length-1);
 if(!latest)return insufficient("Insufficient price history.");
 const p=sigmoid(w.reduce((a,b,j)=>a+b*latest[j],0));
 // Never publish numeric probabilities when the holdout doesn't beat the naive historical-rate baseline.
 const calibrated=brier<base;
 return {horizonDays,direction:!calibrated||Math.abs(p-.5)<.08?"uncertain":p>.5?"up":"down",probabilityUp:calibrated?Math.round(p*1000)/1000:null,sampleSize:safeTrain.length,testSize:testSet.length,brierScore:+brier.toFixed(4),baselineBrier:+base.toFixed(4),accuracy:+acc.toFixed(3),note:calibrated?"Experimental price-only logistic model; historical walk-forward holdout, not a guaranteed or calibrated trading forecast.":"Model did not beat a naive baseline on historical holdout; directional prediction withheld."};
}
export function headlineTone(title:string):number{
 const positives=/\b(beat|beats|growth|profit|surge|rally|record|upgrade|expands|approval|wins|breakthrough|strong|raises|gain|gains)\b/gi;
 const negatives=/\b(miss|misses|loss|losses|fall|falls|drop|drops|probe|lawsuit|downgrade|cuts|cut|risk|warning|recall|layoffs|decline|sanction)\b/gi;
 return Math.max(-2,Math.min(2,((title.match(positives)||[]).length-(title.match(negatives)||[]).length)))/2;
}
