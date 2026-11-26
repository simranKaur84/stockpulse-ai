import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getIntelligence} from "@/lib/market/data";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:"Sign in to access stock research."},{status:401});
 const symbol=(request.nextUrl.searchParams.get("symbol")||"").trim().toUpperCase();
 const exchange=(request.nextUrl.searchParams.get("exchange")||"NASDAQ").trim().toUpperCase();
 if(!/^[A-Z0-9.\-]{1,20}$/.test(symbol)||!["NASDAQ","NYSE","NSE","BSE"].includes(exchange)){
  return NextResponse.json({error:"Choose a valid stock symbol and exchange."},{status:400});
 }
 // Research is limited to symbols saved in the authenticated user's watchlist.
 const {data:row,error:dbError}=await supabase.from("watchlists").select("id").eq("user_id",user.id).eq("symbol",symbol).eq("exchange",exchange).maybeSingle();
 if(dbError)return NextResponse.json({error:"Unable to verify your watchlist."},{status:503});
 if(!row)return NextResponse.json({error:"Add this symbol to your watchlist before requesting research."},{status:403});
 try{
  const data=await getIntelligence(symbol,exchange);
  return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{
  return NextResponse.json({error:"Unable to fetch research at this time."},{status:503});
 }
}
