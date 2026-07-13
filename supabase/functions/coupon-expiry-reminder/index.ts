import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { renderEmail } from "./email-template.ts";

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
    // 1. Verify Authorization: Bearer <service_role_key>
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== serviceRoleKey) {
      console.warn("Unauthorized attempt to invoke coupon-expiry-reminder");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const tier_days = body.tier_days;
    const dry_run = body.dry_run === true;

    // Validate tier_days
    if (tier_days !== 7 && tier_days !== 1) {
      return new Response(
        JSON.stringify({ error: "bad tier: tier_days must be 1 or 7" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const year = new Date().getUTCFullYear();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Fetch eligible recipients via the RPC
    const { data: recipients, error } = await supabaseClient.rpc(
      'customers_needing_reminder',
      { p_tier_days: tier_days, p_year: year }
    );

    if (error) {
      console.error("Error executing customers_needing_reminder:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dry Run Mode: Return preview without sending emails
    if (dry_run) {
      return new Response(
        JSON.stringify({ dry_run: true, count: recipients?.length || 0, recipients }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://qriousqr.app";

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error: Missing Resend API Key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;

    // Subject mapping
    const subject = tier_days === 7
      ? "Your BOGO coupons expire in a week 🎁"
      : "Last chance — your BOGO coupons expire tomorrow ⏰";

    // 4. Loop and send emails
    for (const r of (recipients || [])) {
      try {
        if (!r.email) {
          failed++;
          continue;
        }

        const htmlContent = renderEmail(r, tier_days, appBaseUrl);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromEmail,
            to: r.email,
            subject: subject,
            html: htmlContent
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Resend failure for customer ${r.customer_id}:`, errText);
          failed++;
          continue;
        }

        // Mark sent in database
        const { error: markError } = await supabaseClient.rpc('mark_reminder_sent', {
          p_customer_id: r.customer_id,
          p_year: year,
          p_tier_days: tier_days
        });

        if (markError) {
          console.error(`Failed to mark reminder sent for customer ${r.customer_id}:`, markError);
        }

        sent++;
      } catch (e) {
        console.error(`Exception while sending reminder to ${r.customer_id}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ tier_days, year, sent, failed, total: recipients?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Global edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
