import {forecast,headlineTone,type PricePoint} from "./model";
export type Article={title:string;url:string;domain:string;published:string;country:string;sentiment:number};
export type Quote={price:number;changePercent:number|null;currency:string;asOf:string;source:string;delayed:boolean};
export type Intelligence={symbol:string;exchange:string;quote:Quote|null;history:PricePoint[];articles:Article[];profile:{name:string;industry:string;website:string}|null;short:ReturnType<typeof forecast>;long:ReturnType<typeof forecast>;newsTone:number|null;warnings:string[];generatedAt:string;};
const TRUSTED=["reuters.com","apnews.com","bloomberg.com","ft.com","wsj.com","cnbc.com","marketwatch.com","finance.yahoo.com","economictimes.indiatimes.com","moneycontrol.com","livemint.com","business-standard.com","thehindu.com","bbc.com","sec.gov","nseindia.com","bseindia.com"];
const fetchText=async(url:string)=>{const r=await fetch(url,{signal:AbortSignal.timeout(9500),headers:{"User-Agent":"StockPulseResearch/1.0"},next:{revalidate:900}});if(!r.ok)throw new Error("Source returned HTTP "+r.status);return r.text()};
const fetchJson=async(url:string):Promise<unknown>=>JSON.parse(await fetchText(url));
function sourceDomain(value:string){try{return new URL(value).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}}
function trusted(host:string){return TRUSTED.some(d=>host===d||host.endsWith("."+d))}
function numeric(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null}
const safeSymbol=(value:string)=>/^[A-Z0-9.\-]{1,20}$/.test(value);
export async function getIntelligence(symbol:string,exchange:string):Promise<Intelligence>{
 if(!safeSymbol(symbol)||!["NASDAQ","NYSE","NSE","BSE"].includes(exchange))throw new Error("Invalid symbol or exchange.");
 const warnings:string[]=[];
 const indian=exchange==="NSE"||exchange==="BSE";
 const key=process.env.FINNHUB_API_KEY;
 const stockCode=indian?symbol+(exchange==="NSE"?".NS":".BO"):symbol;
 const dailySymbol=indian?null:symbol.toLowerCase()+".us";
 let quote:Quote|null=null,history:PricePoint[]=[],profile:Intelligence["profile"]=null,articles:Article[]=[];
 const promises:Promise<void>[]=[];
 if(dailySymbol){
  promises.push((async()=>{try{
   const now=new Date(),start=new Date(now.getTime()-1000*86400*900);
   const fmt=(v:Date)=>v.toISOString().slice(0,10).replace(/-/g,"");
   const params=new URLSearchParams({s:dailySymbol,d1:fmt(start),d2:fmt(now),i:"d"});
   const csv=await fetchText("https://stooq.com/q/d/l/?"+params);
   history=csv.trim().split(/\r?\n/).slice(1).map(row=>{const v=row.split(",");return{date:v[0],close:Number(v[4]),volume:Number(v[5])||0}}).filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.close>0);
   if(history.length){
    const cur=history.at(-1)!,prev=history.at(-2);
    quote={price:cur.close,changePercent:prev?+((cur.close/prev.close-1)*100).toFixed(2):null,currency:"USD",asOf:cur.date,source:"Stooq daily closing data",delayed:true};
   }else warnings.push("Historical data provider returned no usable prices.");
  }catch{warnings.push("Daily price history is temporarily unavailable; no prices were estimated.");}})());
 }else warnings.push("Indian exchange price history requires a licensed market-data provider; no prices were fabricated.");
 if(key){
  promises.push((async()=>{try{
   const raw=await fetchJson("https://finnhub.io/api/v1/quote?"+new URLSearchParams({symbol:stockCode,token:key})) as Record<string,unknown>;
   const price=numeric(raw.c);if(price&&price>0){quote={price,changePercent:numeric(raw.dp),currency:indian?"INR":"USD",asOf:new Date().toISOString(),source:"Finnhub quote",delayed:false}};
  }catch{warnings.push("Finnhub live quote unavailable.");}})());
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
 await Promise.all(promises);
 const newsTone=articles.length?+(articles.reduce((a,n)=>a+n.sentiment,0)/articles.length).toFixed(2):null;
 if(!key)warnings.push("Configure FINNHUB_API_KEY for live quotes and company profiles; daily US closing data is available when the public feed responds.");
 return{symbol,exchange,quote,history:history.slice(-120),articles,profile,short:forecast(history,5),long:forecast(history,20),newsTone,warnings,generatedAt:new Date().toISOString()};
}
