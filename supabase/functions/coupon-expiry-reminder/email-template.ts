export interface Recipient {
  customer_id: string;
  email: string;
  first_name: string | null;
  unused_count: number;
  expiring_categories: string[];
  restaurants: Array<{
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
  }>;
}

const CATEGORY_MAP: Record<string, string> = {
  main_course: "Main Course",
  dessert: "Dessert",
  beverage: "Beverage",
  appetizer: "Appetizer",
  salad: "Salad",
  shisha: "Shisha"
};

function getCategoryLabel(cat: string): string {
  return CATEGORY_MAP[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

export function renderReminderEmail(r: Recipient, tier_days: number): string {
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://qriousqr.com";

  // Build category pills
  const pillsHtml = r.expiring_categories
    .map(cat => `
      <span style="
        display: inline-block;
        background-color: #FFF6F2;
        color: #FF5722;
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 4px;
        margin: 4px 4px 4px 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">${getCategoryLabel(cat)}</span>
    `)
    .join('');

  // Build restaurants list
  const restaurantsHtml = r.restaurants
    .map((rest, index) => {
      const isLast = index === r.restaurants.length - 1;
      const borderStyle = isLast ? "" : "border-bottom: 1px solid #EBEBEB;";
      return `
        <div style="padding: 10px 0; ${borderStyle} text-align: left;">
          <a href="${appBaseUrl}/customer/restaurant/${rest.slug}"
             target="_blank"
             style="
               font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               font-size: 14px;
               font-weight: 700;
               color: #FF5722;
               text-decoration: none;
             ">${rest.name}</a>
        </div>
      `;
    })
    .join('');

  // Conditional Copy
  const greeting = `Hi ${r.first_name ?? "there"},`;
  
  const bodyText = tier_days === 7
    ? `You have ${r.unused_count} unused BOGO ${plural(r.unused_count, 'coupon')} at ${r.restaurants.length} ${plural(r.restaurants.length, 'restaurant')} that expire on December 31.`
    : `Last chance — your ${r.unused_count} unused BOGO ${plural(r.unused_count, 'coupon')} expire tomorrow at midnight.`;

  const ctaLabel = tier_days === 7
    ? "View my coupons"
    : "Redeem before midnight";

  const postCtaText = tier_days === 7
    ? "Your unused coupons roll off on December 31 at midnight UTC. Redeem them in-restaurant with your PIN."
    : "After tomorrow midnight UTC, unused coupons expire and can't be redeemed. New ones come with the new year.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Your QriousQR coupon reminder</title>
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
              <p style="
                margin: 0 0 16px 0;
                font-size: 15px;
                color: #111111;
                line-height: 1.6;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">
                ${greeting}
              </p>

              <p style="
                margin: 0 0 20px 0;
                font-size: 16px;
                font-weight: 700;
                color: #111111;
                line-height: 1.5;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">
                ${bodyText}
              </p>

              <!-- Category pills -->
              <div style="margin: 16px 0;">
                ${pillsHtml}
              </div>

              <!-- Restaurants section header -->
              <div style="
                margin: 24px 0 8px 0;
                font-size: 11px;
                font-weight: 700;
                color: #666666;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                text-align: left;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">Restaurants</div>

              <!-- Restaurants list -->
              <div style="margin: 0 0 28px 0;">
                ${restaurantsHtml}
              </div>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 999px;" bgcolor="#FF5722">
                    <a href="${appBaseUrl}/customer/claims"
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
                       ">${ctaLabel}</a>
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
                ${postCtaText}
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
                <div style="margin-bottom: 8px;">
                  You're getting this because you have active QriousQR coupons. Reply to this email if you'd rather not get reminders.
                </div>
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
