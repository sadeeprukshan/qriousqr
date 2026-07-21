import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient.js';
import QSuccessToast from '../../components/QSuccessToast.jsx';
import './AdminMessages.css';

function formatRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'read' | 'archived'
  
  // Drawer states
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Toast confirmation
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
  };

  // Fetch messages from DB
  const loadMessages = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to retrieve messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // Realtime subscription for live updates on this page
  useEffect(() => {
    const channel = supabase
      .channel('admin_messages_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
            // Update selected message if it is currently open
            setSelectedMessage(current => {
              if (current && current.id === payload.new.id) {
                return payload.new;
              }
              return current;
            });
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id === payload.old.id));
            setSelectedMessage(current => {
              if (current && current.id === payload.old.id) {
                return null;
              }
              return current;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter messages client-side based on activeTab
  const filteredMessages = useMemo(() => {
    if (activeTab === 'all') return messages;
    return messages.filter(m => m.status === activeTab);
  }, [messages, activeTab]);

  // Handle opening drawer & auto-mark-read
  const handleOpenDrawer = async (msg) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.admin_notes || '');

    if (msg.status === 'new') {
      try {
        const { error } = await supabase
          .from('contact_messages')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('id', msg.id);

        if (error) throw error;
        
        triggerToast('Marked as read');
      } catch (err) {
        console.error('Failed to auto-mark read:', err);
      }
    }
  };

  const handleStatusChange = async (msgId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'read') {
        updates.read_at = new Date().toISOString();
      } else if (newStatus === 'new') {
        updates.read_at = null;
      }

      const { error } = await supabase
        .from('contact_messages')
        .update(updates)
        .eq('id', msgId);

      if (error) throw error;

      if (newStatus === 'read') triggerToast('Marked as read');
      if (newStatus === 'archived') triggerToast('Archived');
      if (newStatus === 'new') triggerToast('Restored to New');
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message permanently? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;

      setSelectedMessage(null);
      triggerToast('Deleted message');
    } catch (err) {
      console.error(err);
      alert('Failed to delete message.');
    }
  };

  const handleNotesBlur = async () => {
    if (!selectedMessage) return;
    
    // Only save if notes actually changed
    if ((selectedMessage.admin_notes || '') === adminNotes) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ admin_notes: adminNotes })
        .eq('id', selectedMessage.id);

      if (error) throw error;
      triggerToast('Notes saved');
    } catch (err) {
      console.error(err);
      alert('Failed to save notes.');
    }
  };

  return (
    <div className="admin-messages-container">
      {/* Toast popup */}
      <QSuccessToast
        message={toastMessage}
        visible={toastMessage !== ''}
        onDismiss={() => setToastMessage('')}
      />

      <div className="admin-messages-header">
        <h2>Quote Requests & Messages</h2>
        <p className="subtext">View and manage incoming inquiries from the public contact form.</p>
      </div>

      {errorMsg && (
        <div className="admin-alert error" style={{ marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="admin-messages-tabs">
        {['all', 'new', 'read', 'archived'].map(tab => {
          const count = messages.filter(m => tab === 'all' || m.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`messages-tab-btn ${activeTab === tab ? 'active' : ''}`}
            >
              <span className="tab-label">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              <span className="tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="messages-loading">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="messages-empty-state">
          <span>📬</span>
          <h3>No messages found</h3>
          <p>There are no messages in this category.</p>
        </div>
      ) : (
        <div className="messages-table-wrapper">
          <table className="messages-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Message Preview</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map(msg => {
                const preview = msg.message.length > 80 ? msg.message.slice(0, 80) + '...' : msg.message;
                return (
                  <tr
                    key={msg.id}
                    onClick={() => handleOpenDrawer(msg)}
                    className={`message-row ${msg.status === 'new' ? 'unread-row' : ''}`}
                  >
                    <td className="col-received">{formatRelativeTime(msg.created_at)}</td>
                    <td className="col-name">{msg.name}</td>
                    <td className="col-email">{msg.email}</td>
                    <td className="col-company">{msg.company_name || <span className="empty-val">-</span>}</td>
                    <td className="col-preview">{preview}</td>
                    <td className="col-status">
                      <span className={`status-pill status-${msg.status}`}>
                        {msg.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Side Drawer */}
      {selectedMessage && (
        <div className="drawer-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="drawer-card" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Message Details</h3>
              <button className="btn-close-drawer" onClick={() => setSelectedMessage(null)}>×</button>
            </div>

            <div className="drawer-body">
              <div className="detail-section">
                <div className="detail-meta-grid">
                  <div>
                    <span className="detail-label">FROM</span>
                    <h4 className="detail-name">{selectedMessage.name}</h4>
                  </div>
                  <div>
                    <span className="detail-label">STATUS</span>
                    <div>
                      <span className={`status-pill status-${selectedMessage.status}`} style={{ display: 'inline-block', marginTop: '4px' }}>
                        {selectedMessage.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-section bg-light">
                <div className="info-grid">
                  <div>
                    <span className="info-lbl">Email</span>
                    <a href={`mailto:${selectedMessage.email}`} className="info-val-link">{selectedMessage.email}</a>
                  </div>
                  <div>
                    <span className="info-lbl">Phone</span>
                    {selectedMessage.phone ? (
                      <a href={`tel:${selectedMessage.phone}`} className="info-val-link">{selectedMessage.phone}</a>
                    ) : (
                      <span className="info-val-empty">Not provided</span>
                    )}
                  </div>
                  <div className="span-2">
                    <span className="info-lbl">Restaurant / Company</span>
                    <span className="info-val">{selectedMessage.company_name || 'Not provided'}</span>
                  </div>
                  <div className="span-2">
                    <span className="info-lbl">Sent Date</span>
                    <span className="info-val">{new Date(selectedMessage.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <span className="detail-label">MESSAGE</span>
                <div className="detail-message-body">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="detail-section">
                <label htmlFor="admin-notes" className="detail-label">ADMIN NOTES</label>
                <textarea
                  id="admin-notes"
                  rows={4}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add private staff notes here (auto-saves on blur)..."
                  className="admin-notes-textarea"
                />
              </div>
            </div>

            <div className="drawer-footer">
              <div className="actions-left">
                {selectedMessage.status === 'new' && (
                  <button
                    className="btn-action primary"
                    onClick={() => handleStatusChange(selectedMessage.id, 'read')}
                  >
                    Mark as Read
                  </button>
                )}
                {selectedMessage.status !== 'archived' ? (
                  <button
                    className="btn-action secondary"
                    onClick={() => handleStatusChange(selectedMessage.id, 'archived')}
                  >
                    Archive
                  </button>
                ) : (
                  <button
                    className="btn-action secondary"
                    onClick={() => handleStatusChange(selectedMessage.id, 'new')}
                  >
                    Restore to New
                  </button>
                )}
                <a
                  href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent("Re: Your QriousQR quote request")}`}
                  className="btn-action link-btn"
                >
                  Reply via Email
                </a>
              </div>
              <button
                className="btn-action danger"
                onClick={() => handleDeleteMessage(selectedMessage.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
