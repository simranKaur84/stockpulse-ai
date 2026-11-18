import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
export default function Login(){return <main className="authShell"><Brand/><section className="card" style={{marginTop:26}}><div className="eyebrow">Welcome back</div><h1>Log in</h1><AuthForm mode="login"/></section></main>}
