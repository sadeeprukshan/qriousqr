import { supabase, isMockMode } from '../supabaseClient.js';

// Helper to get or set mock claims from localStorage
function getMockClaims() {
  try {
    return JSON.parse(localStorage.getItem('qriousqr:mock_claims') || '[]');
  } catch {
    return [];
  }
}

function saveMockClaims(claims) {
  localStorage.setItem('qriousqr:mock_claims', JSON.stringify(claims));
  // Dispatch a storage event manually to trigger listeners in the same window (as standard storage event only triggers in OTHER windows)
  window.dispatchEvent(new Event('storage'));
}

export async function claimStep1(couponId, merchantPin) {
  if (isMockMode) {
    // In mock mode, couponId is category + '-id' or similar, e.g. 'mc-1'
    const claims = getMockClaims();
    // Validate merchant pin
    if (merchantPin !== '512840') {
      throw new Error('wrong_merchant_pin');
    }

    const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
    const customerId = session?.user?.id || 'mock-customer-id';
    
    // Auto-derive category from couponId or mock default
    let category = 'main_course';
    if (couponId.includes('dessert') || couponId.includes('mc-2')) category = 'dessert';
    if (couponId.includes('beverage') || couponId.includes('mc-3')) category = 'beverage';

    const claimId = 'claim-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    const expiresAt = new Date(Date.now() + 180000).toISOString(); // 3 minutes

    const newClaim = {
      id: claimId,
      coupon_id: couponId,
      customer_id: customerId,
      customer_email: session?.user?.email || 'diner@qriousqr.local',
      customer_first_name: session?.user?.first_name || 'Demo',
      customer_last_name: session?.user?.last_name || 'Diner',
      company_slug: 'kantami',
      company_id: 'kantami-id',
      status: 'pending',
      category,
      attempts: 0,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    // Cancel any earlier pending claim for same coupon
    const filtered = claims.filter(c => !(c.coupon_id === couponId && c.status === 'pending'));
    filtered.push(newClaim);
    saveMockClaims(filtered);

    return { claim_id: claimId, category, expires_at: expiresAt };
  }

  const { data, error } = await supabase.rpc('claim_coupon_step1', {
    p_coupon_id: couponId, p_merchant_pin: merchantPin
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function claimStep2(claimId, customerPin) {
  if (isMockMode) {
    const claims = getMockClaims();
    const claim = claims.find(c => c.id === claimId);
    if (!claim) {
      throw new Error('claim_not_found');
    }

    if (claim.status !== 'pending') {
      throw new Error('claim_not_pending');
    }

    if (new Date() > new Date(claim.expires_at)) {
      claim.status = 'expired';
      saveMockClaims(claims);
      throw new Error('claim_expired');
    }

    // Verify customer pin
    // Seeded diner has pin 234567000
    const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
    const correctPin = session?.user?.user_pin || '234567000';
    const cleanCorrectPin = correctPin.replace(/\s/g, '');
    const cleanCustomerPin = customerPin.replace(/\s/g, '');

    if (cleanCustomerPin !== cleanCorrectPin) {
      claim.attempts = (claim.attempts || 0) + 1;
      if (claim.attempts >= 3) {
        claim.status = 'rejected';
        saveMockClaims(claims);
        throw new Error('too_many_attempts'); // Custom flag for attempt limit
      }
      saveMockClaims(claims);
      throw new Error('wrong_customer_pin');
    }

    // Success! Mark coupon as used in mock coupons list
    claim.status = 'authorized';
    claim.authorized_at = new Date().toISOString();
    saveMockClaims(claims);

    // Update the mock coupon status in localStorage
    const mockCoupons = JSON.parse(localStorage.getItem('qriousqr:mock_coupons') || '[]');
    const coupon = mockCoupons.find(c => c.id === claim.coupon_id);
    if (coupon) {
      coupon.status = 'used';
      coupon.used_at = new Date().toISOString();
      localStorage.setItem('qriousqr:mock_coupons', JSON.stringify(mockCoupons));
    }

    return {
      claim_id: claimId,
      coupon_id: claim.coupon_id,
      customer_first_name: claim.customer_first_name,
      category: claim.category
    };
  }

  const { data, error } = await supabase.rpc('claim_coupon_step2', {
    p_claim_id: claimId, p_customer_pin: customerPin
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelMyClaim(claimId) {
  if (isMockMode) {
    const claims = getMockClaims();
    const claim = claims.find(c => c.id === claimId);
    if (claim) {
      claim.status = 'cancelled';
      saveMockClaims(claims);
    }
    return;
  }
  const { error } = await supabase.rpc('cancel_my_claim', { p_claim_id: claimId });
  if (error) throw error;
}

export async function pendingClaimsForCompany(companyId) {
  if (isMockMode) {
    // Return all pending claims for Kantami
    const claims = getMockClaims();
    // Auto expire stale
    let changed = false;
    const now = new Date();
    claims.forEach(c => {
      if (c.status === 'pending' && now > new Date(c.expires_at)) {
        c.status = 'expired';
        changed = true;
      }
    });
    if (changed) {
      saveMockClaims(claims);
    }
    return claims.filter(c => c.status === 'pending');
  }
  const { data, error } = await supabase.rpc('pending_claims_for_company', { p_company_id: companyId });
  if (error) throw error;
  return data || [];
}
