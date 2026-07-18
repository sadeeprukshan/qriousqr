import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { renderReminderEmail } from "./email-template.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: require the service-role bearer. Endpoint must NEVER be publicly callable.
    const authHeader = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
    if (authHeader !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { tier_days, dry_run = false } = await req.json().catch(() => ({}));
    if (![1, 7].includes(tier_days)) {
      return new Response(JSON.stringify({ error: "tier_days must be 1 or 7" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Year is server-computed; do NOT accept from request — that would let someone re-fire last year's tier.
    const year = new Date().getUTCFullYear();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recipients, error } = await supabase.rpc(
      "customers_needing_reminder",
      { p_tier_days: tier_days, p_year: year }
    );
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({ dry_run: true, year, tier_days, count: recipients.length, recipients }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    let sent = 0, failed = 0;
    for (const r of recipients) {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: Deno.env.get("FROM_EMAIL"),
            to: r.email,
            subject: subjectFor(tier_days),
            html: renderReminderEmail(r, tier_days),
          }),
        });
        if (!resp.ok) {
          console.error("resend send failed", r.customer_id, resp.status, await resp.text());
          failed++;
          continue;
        }
        await supabase.rpc("mark_reminder_sent", {
          p_customer_id: r.customer_id, p_year: year, p_tier_days: tier_days,
        });
        sent++;
      } catch (e) {
        console.error("send crashed", r.customer_id, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ tier_days, year, sent, failed, total: recipients.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (err: any) {
    console.error("Global edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

function subjectFor(tier: number): string {
  return tier === 7
    ? "Your BOGO coupons expire in a week"
    : "Last chance — your BOGO coupons expire tomorrow";
}
