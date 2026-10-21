"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/entrar?erro=credenciais");
  const supabase = await createClient();
  if (!supabase) redirect("/entrar?erro=configuracao");
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/entrar?erro=credenciais");
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (userId) {
    const { data: memberships } = await supabase.from("memberships").select("role").eq("user_id", userId).eq("active", true);
    if (memberships?.some((membership) => membership.role === "administrator")) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") redirect("/mfa");
    }
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/entrar");
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.email().max(254).safeParse(formData.get("email"));
  const supabase = await createClient();
  if (email.success && supabase) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${appUrl}/auth/callback?next=/redefinir-senha` });
  }
  // The same confirmation is shown for known and unknown addresses.
  redirect("/recuperar?enviado=1");
}

export async function updatePassword(formData: FormData) {
  const parsed = z.string().min(14).max(128).safeParse(formData.get("password"));
  if (!parsed.success) redirect("/redefinir-senha?erro=senha");
  const supabase = await createClient();
  if (!supabase) redirect("/entrar?erro=configuracao");
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/entrar");
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) redirect("/redefinir-senha?erro=senha");
  redirect("/entrar?senha=atualizada");
}

const draftSchema = z.object({
  companyId: z.uuid(),
  fileName: z.string().min(1).max(255),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  sheetName: z.string().min(1).max(255),
  mapping: z.record(z.string(), z.string()).default({}),
  rows: z.array(z.object({
    rowNumber: z.number().int().positive(),
    values: z.record(z.string(), z.unknown()),
    messages: z.array(z.string()).max(20),
    state: z.enum(["pending", "warning"]),
  })).max(5000),
});

export async function saveImportDraft(input: unknown) {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os dados da prévia e tente novamente." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Configure o projeto Supabase antes de salvar rascunhos." };
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { ok: false, message: "Entre novamente para continuar." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("company_id", parsed.data.companyId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!membership || !["administrator", "owner_manager", "finance"].includes(membership.role)) {
    return { ok: false, message: "Seu perfil não pode importar arquivos nesta empresa." };
  }
  if (membership.role === "administrator") {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2") return { ok: false, message: "Confirme o segundo fator antes de salvar como administrador." };
  }

  const rows = parsed.data.rows.map((row) => ({
    row_number: row.rowNumber,
    source_values: row.values,
    validation_state: row.state === "warning" ? "warning" : "pending",
    messages: row.messages,
  }));
  const { error } = await supabase.rpc("save_import_batch", {
    p_company_id: parsed.data.companyId,
    p_file_name: parsed.data.fileName,
    p_file_sha256: parsed.data.fileSha256,
    p_sheet_name: parsed.data.sheetName,
    p_mapping: parsed.data.mapping,
    p_rows: rows,
  });
  if (error) return { ok: false, message: "Não foi possível salvar o rascunho. Nenhuma linha foi confirmada." };
  return { ok: true, message: "Rascunho salvo para revisão." };
}
