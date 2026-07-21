import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_BASE_URL = 'https://qriousqr.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    // 1. Validate the caller's JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'unauthorized' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    const caller = userData.user;

    // 2. Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid json' }, 400);
    }
    const invite_token = body?.invite_token;
    if (typeof invite_token !== 'string' || invite_token.length < 8) {
      return json({ error: 'invite_token required' }, 400);
    }

    // 3. Look up the invite row
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('company_invites')
      .select('id, email, role, company_id, invited_by, expires_at, accepted_at, company:companies(name_en)')
      .eq('token', invite_token)
      .single();

    if (inviteErr || !invite) return json({ error: 'invite not found' }, 404);
    if (invite.accepted_at) return json({ error: 'invite already accepted' }, 409);
    if (new Date(invite.expires_at) < new Date()) return json({ error: 'invite expired' }, 410);

    // 4. Verify caller is inviter OR owner/manager of the company
    const isCallerInviter = invite.invited_by === caller.id;
    const { data: membership } = await supabaseAdmin
      .from('company_members')
      .select('role')
      .eq('company_id', invite.company_id)
      .eq('user_id', caller.id)
      .maybeSingle();
    const isPrivileged = membership && (membership.role === 'owner' || membership.role === 'manager');

    if (!isCallerInviter && !isPrivileged) {
      return json({ error: 'forbidden' }, 403);
    }

    // 5. Send invite via Supabase Auth admin — creates auth.users row + sends branded email via SMTP → Resend
    const redirectTo = `${APP_BASE_URL}/invite/${invite_token}`;
    const { data: inviteResp, error: sendErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invite.email,
      {
        redirectTo,
        data: {
          invite_token,
          company_id: invite.company_id,
          role: invite.role,
        },
      },
    );

    if (sendErr) {
      // Common failure: user already exists → tell client to share manually
      const msg = (sendErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return json(
          {
            outcome: 'manual_share_required',
            reason: 'existing_account',
            invite_url: redirectTo,
          },
          200,
        );
      }
      console.error('inviteUserByEmail failed', sendErr);
      return json({ error: 'send failed', detail: sendErr.message }, 502);
    }

    return json({ outcome: 'sent', to: invite.email, user_id: inviteResp?.user?.id ?? null });

  } catch (err: any) {
    console.error('Global send-team-invite error:', err);
    return json({ error: err.message || 'Internal Server Error' }, 500);
  }
});
