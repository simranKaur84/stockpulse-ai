import {forecast,headlineTone,type PricePoint} from "./model";
export type Article={title:string;url:string;domain:string;published:string;country:string;sentiment:number};
export type Quote={price:number;changePercent:number|null;currency:string;asOf:string;source:string;delayed:boolean};
export type Fundamentals={marketCapMillions:number|null;peTTM:number|null;epsTTM:number|null;high52Week:number|null;low52Week:number|null};
export type Intelligence={fundamentals:Fundamentals|null;symbol:string;exchange:string;quote:Quote|null;history:PricePoint[];articles:Article[];macroArticles:Article[];profile:{name:string;industry:string;website:string}|null;short:ReturnType<typeof forecast>;long:ReturnType<typeof forecast>;newsTone:number|null;warnings:string[];generatedAt:string;};
const TRUSTED=["reuters.com","apnews.com","bloomberg.com","ft.com","wsj.com","cnbc.com","marketwatch.com","finance.yahoo.com","economictimes.indiatimes.com","moneycontrol.com","livemint.com","business-standard.com","thehindu.com","bbc.com","sec.gov","nseindia.com","bseindia.com"];
const fetchText=async(url:string)=>{const r=await fetch(url,{signal:AbortSignal.timeout(9500),headers:{"User-Agent":"StockPulseResearch/1.0"},next:{revalidate:900}});if(!r.ok)throw new Error("Source returned HTTP "+r.status);return r.text()};
const fetchJson=async(url:string):Promise<unknown>=>JSON.parse(await fetchText(url));
function sourceDomain(value:string){try{return new URL(value).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}}
function trusted(host:string){return TRUSTED.some(d=>host===d||host.endsWith("."+d))}
function numeric(value:unknown){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)?n:null}
const safeSymbol=(value:string)=>/^[A-Z0-9.\-]{1,20}$/.test(value);
export async function getIntelligence(symbol:string,exchange:string):Promise<Intelligence>{
 if(!safeSymbol(symbol)||!["NASDAQ","NYSE","NSE","BSE"].includes(exchange))throw new Error("Invalid symbol or exchange.");
 const warnings:string[]=[];
 const indian=exchange==="NSE"||exchange==="BSE";
 const key=process.env.FINNHUB_API_KEY;
 const twelve=process.env.TWELVE_DATA_API_KEY;
 const stockCode=indian?symbol+(exchange==="NSE"?".NS":".BO"):symbol;
 const dailySymbol=indian?null:symbol.toLowerCase()+".us";
 let quote:Quote|null=null,liveQuote:Quote|null=null,history:PricePoint[]=[],profile:Intelligence["profile"]=null,fundamentals:Fundamentals|null=null,articles:Article[]=[],macroArticles:Article[]=[];
 const promises:Promise<void>[]=[];
 promises.push((async()=>{
  // Prefer a licensed global provider when configured, with a free US historical fallback.
  if(twelve){
   try{
    const params=new URLSearchParams({symbol,exchange,interval:"1day",outputsize:"500",apikey:twelve});
    const raw=await fetchJson("https://api.twelvedata.com/time_series?"+params) as {status?:string;message?:string;meta?:{currency?:string};values?:Array<{datetime:string;close:string;volume?:string}>};
    if(raw.status==="error")throw new Error("Twelve Data returned an error.");
    history=(raw.values||[]).map(p=>({date:p.datetime,close:Number(p.close),volume:Number(p.volume)||0})).filter(p=>/^\\d{4}-\\d{2}-\\d{2}$/.test(p.date)&&p.close>0).sort((a,b)=>a.date.localeCompare(b.date));
    if(history.length){
      const cur=history.at(-1)!,prev=history.at(-2);
      quote={price:cur.close,changePercent:prev?+((cur.close/prev.close-1)*100).toFixed(2):null,currency:raw.meta?.currency||(indian?"INR":"USD"),asOf:cur.date,source:"Twelve Data daily closing prices",delayed:true};
    }
   }catch{warnings.push("Twelve Data historical prices unavailable; check API entitlement and symbol coverage.");}
  }
  if(!history.length&&dailySymbol){
   try{
    const now=new Date(),start=new Date(now.getTime()-1000*86400*900);
    const fmt=(v:Date)=>v.toISOString().slice(0,10).replace(/-/g,"");
    const params=new URLSearchParams({s:dailySymbol,d1:fmt(start),d2:fmt(now),i:"d"});
    const csv=await fetchText("https://stooq.com/q/d/l/?"+params);
    history=csv.trim().split(/\\r?\\n/).slice(1).map(row=>{const v=row.split(",");return{date:v[0],close:Number(v[4]),volume:Number(v[5])||0}}).filter(p=>/^\\d{4}-\\d{2}-\\d{2}$/.test(p.date)&&p.close>0);
    if(history.length){
     const cur=history.at(-1)!,prev=history.at(-2);
     quote={price:cur.close,changePercent:prev?+((cur.close/prev.close-1)*100).toFixed(2):null,currency:"USD",asOf:cur.date,source:"Stooq daily closing data",delayed:true};
    }
   }catch{warnings.push("Daily US price history is temporarily unavailable; prices were not estimated.");}
  }
  if(!history.length)warnings.push("Historical prices unavailable for this exchange and symbol; no prices were invented.");
 })());
 if(key){
  promises.push((async()=>{try{
   const raw=await fetchJson("https://finnhub.io/api/v1/quote?"+new URLSearchParams({symbol:stockCode,token:key})) as Record<string,unknown>;
   const price=numeric(raw.c);if(price&&price>0){liveQuote={price,changePercent:numeric(raw.dp),currency:indian?"INR":"USD",asOf:new Date().toISOString(),source:"Finnhub quote",delayed:false}};
  }catch{warnings.push("Finnhub live quote unavailable.");}})());
  promises.push((async()=>{try{
   const raw=await fetchJson("https://finnhub.io/api/v1/stock/metric?"+new URLSearchParams({symbol:stockCode,metric:"all",token:key})) as {metric?:Record<string,unknown>};
   if(raw.metric){
    const m=raw.metric;
    fundamentals={marketCapMillions:numeric(m.marketCapitalization),peTTM:numeric(m.peTTM),epsTTM:numeric(m.epsTTM),high52Week:numeric(m["52WeekHigh"]),low52Week:numeric(m["52WeekLow"])};
   }
  }catch{warnings.push("Company fundamentals unavailable.");}})());
  promises.push((async()=>{try{
   const raw=await fetchJson("https://finnhub.io/api/v1/stock/profile2?"+new URLSearchParams({symbol:stockCode,token:key})) as Record<string,unknown>;
   if(raw.name)profile={name:String(raw.name),industry:String(raw.finnhubIndustry||"Unknown"),website:String(raw.weburl||"")};
  }catch{warnings.push("Company profile unavailable.");}})());
 }
 // Use the exchange alongside the ticker to reduce false matches with common words.
 promises.push((async()=>{try{
  const term=indian?"\""+symbol+"\" India stock":("\""+symbol+"\" (stock OR shares OR earnings OR market)");
  const params=new URLSearchParams({query:term,mode:"artlist",format:"json",maxrecords:"75",timespan:"7d",sort:"datedesc"});
  const raw=await fetchJson("https://api.gdeltproject.org/api/v2/doc/doc?"+params) as {articles?:Array<{title?:string;url?:string;domain?:string;seendate?:string;sourcecountry?:string}>};
  const seen=new Set<string>();
  articles=(raw.articles||[]).filter(a=>!!a.url&&!!a.title).map(a=>{const domain=sourceDomain(a.url!);return{title:a.title!,url:a.url!,domain,published:a.seendate||"",country:a.sourcecountry||"",sentiment:headlineTone(a.title!)}}).filter(a=>{if(!trusted(a.domain)||seen.has(a.url))return false;seen.add(a.url);return true}).slice(0,18);
  if(!articles.length)warnings.push("No articles from the configured trusted publisher list matched the search.");
 }catch{warnings.push("News service unavailable; no headlines were invented.");}})());
 promises.push((async()=>{try{
  const params=new URLSearchParams({query:"(tariffs OR sanctions OR geopolitics OR inflation OR central bank OR oil prices OR supply chain OR conflict) (markets OR stocks OR economy)",mode:"artlist",format:"json",maxrecords:"75",timespan:"3d",sort:"datedesc"});
  const raw=await fetchJson("https://api.gdeltproject.org/api/v2/doc/doc?"+params) as {articles?:Array<{title?:string;url?:string;seendate?:string;sourcecountry?:string}>};
  const seen=new Set<string>();
  macroArticles=(raw.articles||[]).filter(a=>!!a.url&&!!a.title).map(a=>({title:a.title!,url:a.url!,domain:sourceDomain(a.url!),published:a.seendate||"",country:a.sourcecountry||"",sentiment:headlineTone(a.title!)})).filter(a=>{if(!trusted(a.domain)||seen.has(a.url))return false;seen.add(a.url);return true}).slice(0,10);
 }catch{warnings.push("Macro news feed temporarily unavailable.");}})());
 await Promise.all(promises);
 if(liveQuote)quote=liveQuote;
 const newsTone=articles.length?+(articles.reduce((a,n)=>a+n.sentiment,0)/articles.length).toFixed(2):null;
 if(!key)warnings.push("Configure FINNHUB_API_KEY for live quotes and company profiles; daily US closing data is available when the public feed responds.");
 return{symbol,exchange,quote,history:history.slice(-120),articles,macroArticles,profile,fundamentals,short:forecast(history,5),long:forecast(history,20),newsTone,warnings,generatedAt:new Date().toISOString()};
}
