import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
export default function Register(){return <main className="authShell"><Brand/><section className="card" style={{marginTop:26}}><div className="eyebrow">Start monitoring</div><h1>Create your account</h1><AuthForm mode="register"/></section></main>}
