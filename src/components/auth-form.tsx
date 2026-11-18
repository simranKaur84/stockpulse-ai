"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function AuthForm({mode}:{mode:"login"|"register"}){
 const router=useRouter();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");const [error,setError]=useState("");const [success,setSuccess]=useState("");const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError("");setSuccess("");setLoading(true);try{const supabase=createClient();if(mode==="register"){
 const {data,error:err}=await supabase.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:`${window.location.origin}/auth/callback`}});if(err)throw err;
 if(data.session){router.push('/dashboard');router.refresh()}else setSuccess('Check your inbox for a verification link. Then log in.');
 }else{const {error:err}=await supabase.auth.signInWithPassword({email,password});if(err)throw err;router.push('/dashboard');router.refresh()}}
 catch(err){setError(err instanceof Error?err.message:'Something went wrong.')}finally{setLoading(false)}}
 return <form onSubmit={submit}>{mode==="register"&&<><label htmlFor="name">Name</label><input className="field" id="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></>}<label htmlFor="email">Email</label><input className="field" id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="password">Password</label><input className="field" id="password" type="password" autoComplete={mode==="register"?'new-password':'current-password'} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<div className="alert" role="alert">{error}</div>}{success&&<div className="success" role="status">{success}</div>}<button className="btn full" disabled={loading} type="submit">{loading?'Please wait…':mode==="register"?'Create account':'Log in'}</button><p className="muted" style={{fontSize:13,textAlign:'center'}}>{mode==="login"?<>New here? <Link href="/register" style={{color:'#6cb0ff'}}>Register</Link> · <Link href="/forgot-password" style={{color:'#6cb0ff'}}>Forgot password?</Link></>:<>Already have an account? <Link href="/login" style={{color:'#6cb0ff'}}>Log in</Link></>}</p></form>;
}
