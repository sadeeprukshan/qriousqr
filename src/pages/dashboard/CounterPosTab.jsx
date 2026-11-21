import React, { useEffect, useState } from 'react';
import {
  createDisplay, newPairingCode, listDisplays, revokeDisplay, setDisplayReceiptLabel,
  createPosKey, listPosKeys, revokePosKey, POS_INTAKE_URL, COUNTER_APK_URL, COUNTER_APK_ARMV7_URL,
} from '../../services/counterService.js';
import { findOrderNumber } from '../../lib/receiptNumber.js';
import QSuccessToast from '../../components/QSuccessToast.jsx';

// Owner/manager screen: pair counter tablets and create POS integration keys.

const card = { backgroundColor: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' };
const btn = { backgroundColor: 'var(--primary-color, #FF5722)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
const ghostBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text)' };
const input = { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', backgroundColor: '#FAF8F5', outline: 'none' };
const mono = { fontFamily: 'monospace' };

function ago(iso) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(iso).toLocaleDateString();
}

function CopyField({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: '12px' }}>
      {label && <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', marginBottom: '4px' }}>{label}</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <code style={{ ...mono, flex: 1, fontSize: '12px', padding: '10px', background: '#F3F4F6', borderRadius: '8px', wordBreak: 'break-all' }}>{value}</code>
        <button
          type="button"
          style={ghostBtn}
          onClick={async () => {
            try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// Printer mode setup + diagnostics for one counter tablet
function PrinterModePanel({ display, onSaved }) {
  const [label, setLabel] = useState(display.receipt_label || '');
  const [saving, setSaving] = useState(false);
  const [sample, setSample] = useState(display.last_receipt_excerpt || '');
  const detected = sample.trim() ? findOrderNumber(sample, label) : null;

  const save = async () => {
    setSaving(true);
    try {
      await setDisplayReceiptLabel(display.id, label);
      onSaved('Receipt label saved');
    } catch {
      onSaved('Could not save the label');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flexBasis: '100%', marginTop: '8px', paddingTop: '14px', borderTop: '1px dashed var(--border)', fontSize: '13px', lineHeight: 1.55 }}>
      <div style={{ marginBottom: '12px' }}>
        <strong>Setup:</strong> install the <a href={COUNTER_APK_URL} download style={{ color: '#0E7C7B', fontWeight: 700 }}>QriousQR Counter app</a> on
        the tablet, pair it, then tap its 🖨 button to see the tablet's address. In the POS, add a <strong>network ESC/POS printer</strong> with
        that address and port <strong style={mono}>9100</strong>, as an extra printer so the paper receipt still prints.
      </div>

      <div style={{ background: '#FAF8F5', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
        {display.printer_ip && (
          <div>Tablet printer address: <strong style={mono}>{display.printer_ip}:9100</strong></div>
        )}
        {display.last_receipt_at ? (
          <div>
            Last receipt {ago(display.last_receipt_at)}:{' '}
            {display.last_receipt_number
              ? <strong style={{ color: '#15803D' }}>✅ found order #{display.last_receipt_number}</strong>
              : <strong style={{ color: '#B45309' }}>⚠️ no order number found. Set the label below.</strong>}
          </div>
        ) : (
          <div style={{ color: 'var(--text-soft)' }}>No receipt received yet. Print a test receipt from the POS.</div>
        )}
      </div>

      <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px' }}>
        Text printed right before the order number on your receipt
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <input
          style={{ ...input, flex: '1 1 220px' }}
          maxLength={40}
          placeholder='e.g. Order #, Ticket No, رقم الطلب'
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button type="button" style={btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div style={{ color: 'var(--text-soft)', fontSize: '12px', marginBottom: '12px' }}>
        Optional. Without it we look for common labels (Order No, Ticket, #…) and the number printed in the largest font.
      </div>

      <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px' }}>Test with receipt text</label>
      <textarea
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        placeholder="Paste the text of a receipt here (the last receipt the tablet received appears here automatically)"
        style={{ ...input, ...mono, width: '100%', boxSizing: 'border-box', minHeight: '110px', resize: 'vertical', fontSize: '12px' }}
      />
      {sample.trim() && (
        <div style={{ marginTop: '6px', fontWeight: 700, color: detected?.number ? '#15803D' : '#B45309' }}>
          {detected?.number
            ? `✅ Order number found: ${detected.number}`
            : '⚠️ No order number found in this text. Add the label printed before the number.'}
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

export default function CounterPosTab({ branches }) {
  const [displays, setDisplays] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [displayBranch, setDisplayBranch] = useState('');
  const [keyName, setKeyName] = useState('');
  const [keyBranch, setKeyBranch] = useState('');
  const [busy, setBusy] = useState(false);

  const [pairingModal, setPairingModal] = useState(null); // { name, pairing_code, pairing_expires_at }
  const [printerOpenId, setPrinterOpenId] = useState(null); // display whose printer-mode panel is open
  const [keyModal, setKeyModal] = useState(null); // { name, api_key }

  const multiBranch = branches && branches.length > 1;
  const branchName = (id) => branches?.find((b) => b.id === id)?.name_en || 'All branches';

  const load = async () => {
    try {
      const [d, k] = await Promise.all([listDisplays(), listPosKeys()]);
      setDisplays(d);
      setKeys(k);
      setError('');
    } catch (err) {
      setError((err.message || '').includes('not_authorized')
        ? 'Only owners and managers can manage counter displays and POS keys.'
        : 'Could not load. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // refresh "online" status and pairing state
    return () => clearInterval(t);
  }, []);

  const handleAddDisplay = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await createDisplay(displayName.trim() || 'Counter display', displayBranch || null);
      setPairingModal(d);
      setDisplayName('');
      load();
    } catch {
      setToast('Could not create the display.');
    } finally {
      setBusy(false);
    }
  };

  const handleNewCode = async (d) => {
    if (d.paired_at && !window.confirm(`Get a new code for "${d.name}"? The tablet currently paired will be disconnected.`)) return;
    try {
      setPairingModal(await newPairingCode(d.id));
      load();
    } catch {
      setToast('Could not create a new code.');
    }
  };

  const handleRemoveDisplay = async (d) => {
    if (!window.confirm(`Remove "${d.name}"? The tablet will stop showing orders, and its check-in QR will stop working.`)) return;
    await revokeDisplay(d.id).catch(() => {});
    setToast('Display removed');
    load();
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const k = await createPosKey(keyName.trim() || 'POS', keyBranch || null);
      setKeyModal(k);
      setKeyName('');
      load();
    } catch {
      setToast('Could not create the key.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeKey = async (k) => {
    if (!window.confirm(`Revoke "${k.name}"? Any POS using this key will stop sending orders.`)) return;
    await revokePosKey(k.id).catch(() => {});
    setToast('Key revoked');
    load();
  };

  const activeDisplays = displays.filter((d) => !d.revoked_at);
  const activeKeys = keys.filter((k) => !k.revoked_at);
  const exampleBody = '{\n  "order_number": "59",\n  "order_id": "your-pos-order-id"\n}';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font-en)' }}>
      <QSuccessToast message={toast} visible={!!toast} onDismiss={() => setToast('')} />

      {error && <div style={{ ...card, color: '#DC2626', fontWeight: 600 }}>{error}</div>}

      {/* ---------- Counter displays ---------- */}
      <div style={card}>
        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800 }}>📺 Counter displays</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
          A tablet facing the customer. It shows the QR for each new order the moment it arrives, a pickup board, and a
          check-in QR that works with <strong>any</strong> POS (customers type the number from their receipt).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.5 }}>
          <div style={{ background: '#FAF8F5', borderRadius: '12px', padding: '12px 14px' }}>
            <strong>Browser only</strong><br />
            Open <strong style={mono}>{window.location.host}/counter</strong> on any tablet and enter the pairing code.
            Orders arrive from the POS API, Quick Orders, or customer check-in.
          </div>
          <div style={{ background: '#FAF8F5', borderRadius: '12px', padding: '12px 14px' }}>
            <strong>Printer mode</strong> (POS prints to the tablet over Wi-Fi)<br />
            Install the <a href={COUNTER_APK_URL} download style={{ color: '#0E7C7B', fontWeight: 700 }}>QriousQR Counter app for Android</a>,
            pair it, then add it in your POS as a network printer. Android tablets only; on an iPad use Browser only with the POS API or customer check-in.
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Older tablet says &quot;App not installed&quot;? Use the <a href={COUNTER_APK_ARMV7_URL} download style={{ color: '#0E7C7B' }}>version for older tablets</a>.
              Android may ask to allow installing apps from your browser; allow it once.
            </div>
          </div>
        </div>

        <form onSubmit={handleAddDisplay} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <input style={{ ...input, flex: '1 1 200px' }} maxLength={60} placeholder="Name, e.g. Front counter" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          {multiBranch && (
            <select style={input} value={displayBranch} onChange={(e) => setDisplayBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name_en}</option>)}
            </select>
          )}
          <button type="submit" style={btn} disabled={busy}>+ Add display</button>
        </form>

        {loading ? (
          <div style={{ color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
        ) : activeDisplays.length === 0 ? (
          <div style={{ color: 'var(--text-soft)', fontSize: '13px', border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>No displays yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeDisplays.map((d) => {
              const online = d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 60000;
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{d.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                      {multiBranch && <>{branchName(d.branch_id)} · </>}
                      {d.paired_at ? (
                        <span style={{ color: online ? '#15803D' : '#B45309', fontWeight: 700 }}>
                          {online ? '● Online' : `● Offline — last seen ${ago(d.last_seen_at)}`}
                        </span>
                      ) : d.pairing_code ? (
                        <>Waiting for tablet · code <strong style={mono}>{d.pairing_code}</strong></>
                      ) : (
                        <>Not paired · code expired</>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ ...ghostBtn, background: printerOpenId === d.id ? '#F3F4F6' : 'none' }}
                    onClick={() => setPrinterOpenId(printerOpenId === d.id ? null : d.id)}
                  >
                    🖨 Printer mode
                  </button>
                  <button type="button" style={ghostBtn} onClick={() => handleNewCode(d)}>{d.paired_at ? 'Re-pair' : 'New code'}</button>
                  <button type="button" style={{ ...ghostBtn, color: '#DC2626' }} onClick={() => handleRemoveDisplay(d)}>Remove</button>
                  {printerOpenId === d.id && (
                    <PrinterModePanel key={d.id} display={d} onSaved={(msg) => { setToast(msg); load(); }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- POS integration ---------- */}
      <div style={card}>
        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800 }}>🔌 POS integration</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
          Let your POS create orders automatically. When it sends an order number here, the order appears on the counter display
          with its QR. It can also send <strong>ready</strong> to ring the customer. Works with any POS that supports webhooks,
          or through automation tools like Make or Zapier.
        </p>

        <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <input style={{ ...input, flex: '1 1 200px' }} maxLength={60} placeholder="Name, e.g. Foodics" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          {multiBranch && (
            <select style={input} value={keyBranch} onChange={(e) => setKeyBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name_en}</option>)}
            </select>
          )}
          <button type="submit" style={btn} disabled={busy}>+ Create key</button>
        </form>

        {!loading && activeKeys.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {activeKeys.map((k) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>{k.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                    <span style={mono}>{k.key_prefix}…</span>
                    {multiBranch && <> · {branchName(k.branch_id)}</>} · last order {ago(k.last_used_at)}
                  </div>
                </div>
                <button type="button" style={{ ...ghostBtn, color: '#DC2626' }} onClick={() => handleRevokeKey(k)}>Revoke</button>
              </div>
            ))}
          </div>
        )}

        <details style={{ fontSize: '13px', lineHeight: 1.6 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>How to connect a POS (for your POS provider / IT)</summary>
          <div style={{ marginTop: '12px' }}>
            <CopyField label="Endpoint (POST)" value={POS_INTAKE_URL} />
            <p style={{ margin: '0 0 6px' }}><strong>Authentication</strong>, any one of:</p>
            <ul style={{ margin: '0 0 10px', paddingInlineStart: '20px' }}>
              <li>Header <code style={mono}>Authorization: Bearer qpos_…</code></li>
              <li>Header <code style={mono}>x-api-key: qpos_…</code></li>
              <li>URL <code style={mono}>?key=qpos_…</code> (only if your POS can't set headers)</li>
            </ul>
            <p style={{ margin: '0 0 6px' }}><strong>New order</strong> (JSON or form data):</p>
            <pre style={{ ...mono, background: '#F3F4F6', padding: '10px', borderRadius: '8px', fontSize: '12px', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{exampleBody}</pre>
            <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
              <li>The order number can also be called <code style={mono}>number</code>, <code style={mono}>reference</code> or <code style={mono}>ticket</code>, or sit inside an <code style={mono}>order</code> object.</li>
              <li>Sending <code style={mono}>order_id</code> makes retries safe: the same order is never created twice.</li>
              <li>Add <code style={mono}>"action": "ready"</code> when the kitchen finishes, to ring the customer automatically. <code style={mono}>delivered</code> and <code style={mono}>cancelled</code> also work.</li>
            </ul>
          </div>
        </details>
      </div>

      {pairingModal && (
        <Modal onClose={() => setPairingModal(null)}>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 900 }}>Pair “{pairingModal.name}”</h3>
          <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
            On the tablet, open <strong style={mono}>{window.location.host}/counter</strong> and enter this code. It expires in 15 minutes.
          </p>
          <div style={{ ...mono, fontSize: '48px', fontWeight: 900, letterSpacing: '0.25em', textAlign: 'center', padding: '18px', background: '#FAF8F5', borderRadius: '14px', marginBottom: '18px' }}>
            {pairingModal.pairing_code}
          </div>
          <button type="button" style={{ ...btn, width: '100%' }} onClick={() => setPairingModal(null)}>Done</button>
        </Modal>
      )}

      {keyModal && (
        <Modal onClose={() => setKeyModal(null)}>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 900 }}>Key for “{keyModal.name}”</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#B45309', fontWeight: 700, lineHeight: 1.5 }}>
            Copy this key now. For security it is shown only once. If you lose it, revoke it and create a new one.
          </p>
          <CopyField label="API key" value={keyModal.api_key} />
          <CopyField label="Endpoint (POST)" value={POS_INTAKE_URL} />
          <button type="button" style={{ ...btn, width: '100%', marginTop: '6px' }} onClick={() => setKeyModal(null)}>I’ve copied it</button>
        </Modal>
      )}
    </div>
  );
}
