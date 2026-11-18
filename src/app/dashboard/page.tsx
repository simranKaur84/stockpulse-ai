import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "@/components/dashboard";
export default async function DashboardPage(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:watchlist,error}=await supabase.from('watchlists').select('id,symbol,exchange,investment_horizon,created_at').eq('user_id',user.id).order('created_at',{ascending:false});
 return <Dashboard email={user.email??''} rows={watchlist??[]} error={error?.message??null}/>;
}
