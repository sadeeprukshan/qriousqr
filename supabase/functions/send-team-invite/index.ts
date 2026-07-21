import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { renderInviteEmail } from "./email-template.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: "method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Validate JWT and get calling user
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "unauthorized" }, 401);
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const caller = userData.user;

    // 2. Parse body
    const { invite_token } = await req.json().catch(() => ({}));
    if (typeof invite_token !== "string" || invite_token.length < 8) {
      return json({ error: "invite_token required" }, 400);
    }

    // 3. Look up invite + company + invited-by user in one shot
    const { data: invite, error: inviteErr } = await supabase
      .from("company_invites")
      .select("id, email, role, company_id, invited_by, expires_at, accepted_at, company:companies(name_en)")
      .eq("token", invite_token)
      .single();

    if (inviteErr || !invite) {
      return json({ error: "invite not found" }, 404);
    }
    if (invite.accepted_at) {
      return json({ error: "invite already accepted" }, 409);
    }
    if (new Date(invite.expires_at) < new Date()) {
      return json({ error: "invite expired" }, 410);
    }

    // 4. Verify caller is the inviter OR an owner/manager of the company
    const isCallerInviter = invite.invited_by === caller.id;
    const { data: membership } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", invite.company_id)
      .eq("user_id", caller.id)
      .maybeSingle();

    const isPrivileged = membership && (membership.role === "owner" || membership.role === "manager");
    if (!isCallerInviter && !isPrivileged) {
      return json({ error: "forbidden" }, 403);
    }

    // 5. Send the email via Resend
    const inviteUrl = `${Deno.env.get("APP_BASE_URL")}/invite/${invite_token}`;
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("FROM_EMAIL"),
        to: invite.email,
        subject: `You've been invited to join ${invite.company?.name_en ?? "a QriousQR restaurant"}`,
        html: renderInviteEmail({
          companyName: invite.company?.name_en ?? "QriousQR",
          role: invite.role,
          inviteUrl,
        }),
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("resend send failed", { status: resp.status, body: errBody });
      return json({ error: "email send failed", detail: errBody }, 502);
    }

    return json({ sent: true, to: invite.email });

  } catch (err: any) {
    console.error("Global send-team-invite error:", err);
    return json({ error: err.message || "Internal Server Error" }, 500);
  }
});
