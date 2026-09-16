"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const supabase = createClient();
        const  { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            return;
        }

        router.push("/");
        router.refresh();

    }

    async function handleGoogleSignIn() {
        setError("");
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) {
            setError(error.message);
        }
    }

    return (
        <div className="login-wrap">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1 className="brand-mark">Tandem</h1>
                <p className="login-sub">Sign in to your workspace</p>

                <button type="button" className="btn-google" onClick={handleGoogleSignIn}>
                    Sign in with Google
                </button>

                <div className="login-divider"><span>or</span></div>

                <label className="field-label">Email</label>
                <input
                    className="field-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label className="field-label">Password</label>
                <input
                    className="field-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    />

                 {error && <p className="field-error">{error}</p>}

                 <button className="btn-submit" type="submit">Sign in</button>
            </form>
        </div>
    );
}
