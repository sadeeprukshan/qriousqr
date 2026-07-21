export interface InviteData {
  companyName: string;
  role: string;
  inviteUrl: string;
}

function formatRole(role: string): string {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function renderInviteEmail(data: InviteData): string {
  const formattedRole = formatRole(data.role);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>You've been invited to join ${data.companyName}</title>
</head>
<body style="
  margin: 0;
  padding: 40px 16px;
  background: #FAF8F5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111;
">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px;">
          <tr>
            <td style="
              background: #FFFFFF;
              border-radius: 12px;
              padding: 40px 32px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            ">
              <!-- WORDMARK -->
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  font-size: 24px;
                  font-weight: 800;
                  color: #FF5722;
                  letter-spacing: -0.02em;
                ">QriousQR</span>
              </div>

              <!-- BODY -->
              <h1 style="
                margin: 0 0 16px 0;
                font-size: 22px;
                font-weight: 800;
                color: #111111;
                line-height: 1.3;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">You've been invited</h1>
              
              <p style="
                margin: 0 0 16px 0;
                font-size: 15px;
                color: #111111;
                line-height: 1.6;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">
                ${data.companyName} has invited you to join their team on QriousQR as a <strong>${formattedRole}</strong>.
              </p>

              <p style="
                margin: 0 0 24px 0;
                font-size: 15px;
                color: #111111;
                line-height: 1.6;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">
                QriousQR is the bilingual QR-menu and diner-loyalty platform they use to run their restaurant.
              </p>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
                <tr>
                  <td align="center" style="border-radius: 999px;" bgcolor="#FF5722">
                    <a href="${data.inviteUrl}"
                       target="_blank"
                       style="
                         display: inline-block;
                         background: #FF5722;
                         color: #FFFFFF;
                         text-decoration: none;
                         padding: 14px 32px;
                         border-radius: 999px;
                         font-weight: 700;
                         font-size: 15px;
                         font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                       ">Accept invitation</a>
                  </td>
                </tr>
              </table>

              <p style="
                margin: 24px 0 0 0;
                font-size: 13px;
                color: #666666;
                line-height: 1.6;
                text-align: center;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">
                This invitation link is valid for 7 days. If you weren't expecting this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <!-- FOOTER -->
              <div style="
                margin-top: 40px;
                padding-top: 24px;
                border-top: 1px solid #EBEBEB;
                text-align: center;
                font-size: 12px;
                color: #999;
                line-height: 1.6;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">
                <div>© 2026 QriousQR. Beirut · Riyadh · Dubai.</div>
                <div style="margin-top: 8px;">
                  Questions? <a href="mailto:hello@qriousqr.com" style="color: #FF5722; text-decoration: none;">hello@qriousqr.com</a>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
