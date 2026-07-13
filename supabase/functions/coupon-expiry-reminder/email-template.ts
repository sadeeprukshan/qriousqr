// Custom Base64 helper since btoa is global in Deno but typescript requires safe typing
const getLogoDataUrl = (): string => {
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 120 32" fill="none">
  <g transform="translate(0, 4)">
    <rect width="24" height="24" rx="4" fill="#FF5722" />
    <rect x="5" y="5" width="5" height="5" rx="1" fill="#FFFFFF" />
    <rect x="5" y="14" width="5" height="5" rx="1" fill="#FFFFFF" />
    <rect x="14" y="5" width="5" height="5" rx="1" fill="#FFFFFF" />
    <rect x="14" y="14" width="5" height="5" rx="1" fill="#FFFFFF" />
  </g>
  <text x="32" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="800" fill="#111111">QRious</text>
</svg>`;
  return 'data:image/svg+xml;base64,' + btoa(logoSvg);
};

const getPlaceholderLogoDataUrl = (): string => {
  const placeholderLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="16" fill="#FAF8F5" />
  <path d="M12 9v7h2V9h-2zm3 0v7h2V9h-2zm3 0v14h2V9h-2z" fill="#FF5722" />
</svg>`;
  return 'data:image/svg+xml;base64,' + btoa(placeholderLogoSvg);
};

interface Restaurant {
  name: string;
  slug: string;
  logo_url?: string | null;
}

interface Recipient {
  customer_id: string;
  email: string;
  first_name: string | null;
  unused_count: number;
  expiring_categories: string[];
  restaurants: Restaurant[];
}

function formatCategory(cat: string): string {
  return cat.split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function renderEmail(recipient: Recipient, tier_days: number, appBaseUrl: string): string {
  const name = recipient.first_name || 'there';
  const count = recipient.unused_count;
  const logoDataUrl = getLogoDataUrl();
  const placeholderLogo = getPlaceholderLogoDataUrl();

  const couponText = count === 1 ? 'coupon' : 'coupons';
  const verbText = count === 1 ? 'is' : 'are';
  
  // Expiry time text based on tier
  const expiryTimeText = tier_days === 7 ? 'in a week' : 'tomorrow';

  // Format category pills HTML
  const categoriesHtml = (recipient.expiring_categories || [])
    .map(cat => `
      <span style="display: inline-block; background-color: #FAF8F5; border: 1px solid #EAEAEA; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: #555555; margin-right: 8px; margin-bottom: 8px;">
        ${formatCategory(cat)}
      </span>
    `).join('');

  // Format restaurant rows HTML
  const restaurantsHtml = (recipient.restaurants || [])
    .map(r => `
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 12px; border: 1px solid #F3F4F6; padding: 12px; border-radius: 8px; background-color: #FFFFFF;">
        <tr>
          <td style="width: 32px; vertical-align: middle;">
            <img src="${r.logo_url || placeholderLogo}" width="32" height="32" style="border-radius: 16px; object-fit: cover; display: block;" />
          </td>
          <td style="padding-left: 12px; vertical-align: middle;">
            <a href="${appBaseUrl}/customer/restaurant/${r.slug}" target="_blank" style="font-size: 14px; font-weight: 700; color: #FF5722; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              ${r.name} &rarr;
            </a>
          </td>
        </tr>
      </table>
    `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your BOGO Coupons Expiry Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #F9FAFB; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Mail Container -->
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 560px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #F3F4F6;">
              <img src="${logoDataUrl}" height="32" alt="QRious" style="display: block;" />
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #111111; line-height: 1.3;">
                Hi ${name},
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #4B5563; line-height: 1.6;">
                Don't let your rewards go to waste! You have <strong style="color: #111111;">${count}</strong> unused BOGO ${couponText} expiring on <strong style="color: #111111;">December 31</strong>.
              </p>

              <!-- Category Pills Section -->
              ${categoriesHtml ? `
                <div style="margin-bottom: 24px;">
                  <div style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                    Expiring Categories
                  </div>
                  <div>
                    ${categoriesHtml}
                  </div>
                </div>
              ` : ''}

              <!-- Restaurants List Section -->
              ${restaurantsHtml ? `
                <div style="margin-bottom: 32px;">
                  <div style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                    Available At
                  </div>
                  <div>
                    ${restaurantsHtml}
                  </div>
                </div>
              ` : ''}

              <!-- CTA Button Section -->
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 8px 0 16px 0;">
                    <a href="${appBaseUrl}/customer" target="_blank" style="display: inline-block; background-color: #FF5722; color: #FFFFFF; font-weight: 800; font-size: 15px; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      Redeem before Dec 31
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF8F5; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0; font-size: 11px; color: #9CA3AF; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                You're getting this because you have active coupons at restaurants you visited on QriousQR. If you no longer want reminders, reply to this email and we'll take you off.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
