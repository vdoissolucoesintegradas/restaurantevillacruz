"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function MfaChallenge() {
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"loading" | "enroll" | "challenge">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      try {
        const supabase = createClient();
        const { data: factors, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const verified = factors.totp.find((factor) => factor.status === "verified");
        if (verified) {
          if (!cancelled) { setFactorId(verified.id); setStage("challenge"); }
          return;
        }
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Villa Cruz" });
        if (enrollError) throw enrollError;
        if (!cancelled) { setFactorId(data.id); setQrCode(data.totp.qr_code); setSecret(data.totp.secret); setStage("enroll"); }
      } catch {
        if (!cancelled) { setStage("enroll"); setMessage("Não foi possível iniciar a configuração. Entre novamente ou contate o administrador do sistema."); }
      }
    }
    void setup();
    return () => { cancelled = true; };
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6,8}$/.test(code)) { setMessage("Digite o código numérico do aplicativo autenticador."); return; }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (error) throw error;
      router.replace("/"); router.refresh();
    } catch {
      setMessage("Código não confirmado. Confira o horário do dispositivo e tente novamente.");
    } finally { setBusy(false); }
  }

  return <div className="mfa-box">
    {stage === "loading" && <p className="form-message">Verificando o segundo fator…</p>}
    {stage === "enroll" && <>
      <p className="mfa-instructions">Escaneie o QR code com seu aplicativo autenticador e digite o código gerado.</p>
      {qrCode && <Image className="mfa-qr" src={qrCode} alt="QR code para cadastrar no aplicativo autenticador" width={190} height={190} unoptimized/>}
      {secret && <details><summary>Não consegue escanear?</summary><code className="mfa-secret">{secret}</code></details>}
    </>}
    {stage === "challenge" && <p className="mfa-instructions">Digite o código atual do aplicativo autenticador.</p>}
    {stage !== "loading" && <form onSubmit={verify} className="login-form">
      <label className="field"><span>Código de verificação</span><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} required minLength={6} maxLength={8}/></label>
      {message && <p role="alert" className="error-message">{message}</p>}
      <button className="button button-primary" disabled={busy || !factorId}>{busy ? "Confirmando…" : stage === "enroll" ? "Ativar segundo fator" : "Confirmar código"}</button>
    </form>}
  </div>;
}
