"use client";
import {useEffect,useState} from "react";
import {Activity,ExternalLink,RefreshCw,ShieldAlert,TrendingDown,TrendingUp} from "lucide-react";
import type {Intelligence} from "@/lib/market/data";
type Item={id:string;symbol:string;exchange:"NASDAQ"|"NYSE"|"NSE"|"BSE"};
const pct=(n:number)=>Math.round(n*100)+"%";
const date=(s:string)=>{const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleDateString()};
function HistoryChart({points}:{points:Intelligence["history"]}){
 if(points.length<3)return <p className="muted tiny">Historical chart unavailable.</p>;
 const values=points.map(p=>p.close),low=Math.min(...values),high=Math.max(...values),range=high-low||1;
 const line=values.map((v,i)=>[(i/(values.length-1))*720,150-((v-low)/range)*130].join(",")).join(" ");
 return <div className="historychart"><svg viewBox="0 0 720 168" role="img" aria-label="Historical closing prices; chart is not real-time" preserveAspectRatio="none"><polyline points={line} fill="none" stroke="#6cb0ff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/></svg><div className="muted tiny">{points[0].date} to {points.at(-1)?.date} · Daily closing prices · Not a real-time quote</div></div>;
}
function ForecastPanel({item,label}:{item:Intelligence["short"];label:string}){
 const signal=item.direction==="up"?"Leaning up":item.direction==="down"?"Leaning down":"No reliable signal";
 return <div className="marketforecast"><div className="muted">{label} · {item.horizonDays} trading days</div><h3>{item.direction==="up"?<TrendingUp size={21}/>:item.direction==="down"?<TrendingDown size={21}/>:<ShieldAlert size={21}/>} {signal}</h3><p>{item.probabilityUp===null?"Probability withheld":pct(item.probabilityUp)+" estimated upward probability"}</p><div className="muted tiny">Training observations: {item.sampleSize} · Holdout: {item.testSize}</div><div className="muted tiny">Brier: {item.brierScore??"—"} · Baseline: {item.baselineBrier??"—"} · Holdout accuracy: {item.accuracy===null?"—":pct(item.accuracy)}</div><p className="tiny muted">{item.note}</p></div>;
}
export function MarketIntelligence({items}:{items:Item[]}){
 const [selected,setSelected]=useState(items[0]?.id||""),[result,setResult]=useState<Intelligence|null>(null);
 const [error,setError]=useState(""),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
 const selectedItem=items.find(i=>i.id===selected)||items[0];
 const selectedSymbol=selectedItem?.symbol,selectedExchange=selectedItem?.exchange;
 useEffect(()=>{
  if(!selectedSymbol||!selectedExchange){return}
  const controller=new AbortController();
  // Synchronize results to the selected symbol, and discard stale responses.
  // This setState intentionally clears data while new research loads.
  fetch("/api/intelligence?"+new URLSearchParams({symbol:selectedSymbol,exchange:selectedExchange}),{signal:controller.signal})
   .then(async r=>{const payload=await r.json();if(!r.ok)throw new Error(payload.error||"Research unavailable");return payload as Intelligence})
   .then(data=>{if(!controller.signal.aborted){setResult(data);setError("");setLoading(false)}})
   .catch(e=>{if(!controller.signal.aborted){setResult(null);setError(e instanceof Error?e.message:"Request failed");setLoading(false)}});
  return()=>controller.abort();
 },[selectedSymbol,selectedExchange,refresh]);
 function choose(value:string){setSelected(value);setResult(null);setError("");setLoading(true)}
 function reload(){setResult(null);setError("");setLoading(true);setRefresh(n=>n+1)}
 return <section className="card marketresearch" style={{marginTop:22}}>
  <div className="marketheading"><div><div className="eyebrow">SOURCE-LINKED STOCK RESEARCH</div><h2>Market intelligence</h2><p className="muted">Daily price history, global publisher coverage, and experimental directional signals.</p></div><Activity color="#6cb0ff"/></div>
  {items.length===0?<p className="muted">Add a stock above to unlock its research panel.</p>:<>
   <div className="marketcontrols"><label htmlFor="research-stock">Research stock</label><select id="research-stock" className="field" value={selected} onChange={e=>choose(e.target.value)}>{items.map(i=><option key={i.id} value={i.id}>{i.symbol} · {i.exchange}</option>)}</select><button className="btn secondary" type="button" disabled={!selectedItem||loading} onClick={reload}><RefreshCw size={15}/> Refresh</button></div>
   {loading&&<p className="muted" role="status">Loading provider data and evaluating historical signals…</p>}
   {error&&<div className="alert" role="alert">{error}</div>}
   {result&&!loading&&<div>
    <div className="marketquote"><div><div className="muted tiny">{result.profile?.name||result.symbol} · {result.exchange}</div>{result.profile&&<div className="muted tiny">{result.profile.industry}{result.profile.website&&result.profile.website.startsWith("https://")&&<> · <a href={result.profile.website} target="_blank" rel="noopener noreferrer">Company website</a></>}</div>}<div className="quotevalue">{result.quote?result.quote.price.toLocaleString(undefined,{maximumFractionDigits:2}):"Price unavailable"} <span>{result.quote?.currency||""}</span></div><div className="muted tiny">{result.quote?result.quote.source+" · As of "+date(result.quote.asOf)+(result.quote.delayed?" · delayed closing price":""):"No validated market quote from configured sources."}</div></div><div className="muted">{result.quote?.changePercent===null||result.quote?.changePercent===undefined?"":(result.quote.changePercent>=0?"+":"")+result.quote.changePercent+"%"} </div></div>
    <HistoryChart points={result.history}/><div className="marketgrid"><ForecastPanel item={result.short} label="Short term"/><ForecastPanel item={result.long} label="Long term"/></div>
    <div className="marketsection"><h3>News context</h3><p className="muted tiny">Headline keyword score: {result.newsTone===null?"Unavailable":result.newsTone>0?"Positive":result.newsTone<0?"Negative":"Mixed"} · This is a transparent keyword heuristic, not AI fact verification. Review linked sources before making decisions.</p>
     {result.articles.length?<div className="newslist">{result.articles.map(a=><a className="newsitem" href={a.url} key={a.url} target="_blank" rel="noopener noreferrer"><strong>{a.title}</strong><div className="muted tiny">{a.domain} · {a.country||"Origin not available"} · {a.published||"Date not available"} <ExternalLink size={12}/></div></a>)}</div>:<p className="muted">No verified articles found for this query.</p>}
    </div>
    {result.warnings.length>0&&<div className="marketwarnings"><strong>Data limitations</strong>{result.warnings.map((w,i)=><p key={i}>{w}</p>)}</div>}
    <p className="muted tiny">Research generated {date(result.generatedAt)}. Not financial advice. Headlines and price movements do not establish causation. Estimates do not incorporate company fundamentals, news effects, or transaction costs and have not been externally validated.</p>
   </div>}
  </>}
 </section>;
}
