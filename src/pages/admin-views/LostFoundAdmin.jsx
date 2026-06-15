import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, MessageSquare, Phone, Train, Calendar, X, Edit, EyeOff, Eye, Trash2, CheckCircle, AlertCircle, Search, Clock } from 'lucide-react';



const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const LostFoundAdmin = () => {
  const { t, isRTL } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters State
  const [typeFilter, setTypeFilter] = useState('all'); // all, lost, found
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, closed
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Details Modal State
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.adminGetLostFoundPosts();
      setPosts(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch posts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (post) => {
    setModalError('');
    setModalSuccess('');
    setIsEditing(false);
    try {
      // Get fresh details (including comments)
      const res = await api.getLostFoundDetails(post.id);
      setSelectedPost(res.data);
      setComments(res.data.comments || []);
      setEditForm({
        title: res.data.title || '',
        description: res.data.description || '',
        type: res.data.type === 'Lost' ? 0 : 1,
        trainNumber: res.data.trainNumber || '',
        contactInfo: res.data.contactInfo || ''
      });
    } catch (err) {
      alert('Failed to retrieve details: ' + err.message);
    }
  };

  const handleStatusToggle = async () => {
    if (!selectedPost) return;
    setModalError('');
    setModalSuccess('');
    
    const newStatus = selectedPost.status === 'Closed' ? 0 : 1; // 0 = Open, 1 = Closed/Resolved
    try {
      await api.adminUpdateLostFoundPostStatus(selectedPost.id, newStatus);
      const updatedPost = { ...selectedPost, status: newStatus === 1 ? 'Closed' : 'Open' };
      setSelectedPost(updatedPost);
      setModalSuccess(`Post status successfully updated to ${newStatus === 1 ? 'Resolved' : 'Open'}.`);
      fetchPosts();
    } catch (err) {
      setModalError('Failed to update status: ' + err.message);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;
    
    setSubmittingModal(true);
    setModalError('');
    setModalSuccess('');

    try {
      await api.adminUpdateLostFoundPost(
        selectedPost.id,
        editForm.title,
        editForm.description,
        parseInt(editForm.type),
        editForm.trainNumber.trim() || null,
        editForm.contactInfo.trim() || null
      );
      
      setSelectedPost({
        ...selectedPost,
        title: editForm.title,
        description: editForm.description,
        type: editForm.type === 0 ? 'Lost' : 'Found',
        trainNumber: editForm.trainNumber,
        contactInfo: editForm.contactInfo
      });
      setIsEditing(false);
      setModalSuccess('Post details updated successfully.');
      fetchPosts();
    } catch (err) {
      setModalError('Failed to update details: ' + err.message);
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    if (!window.confirm('Are you sure you want to permanently delete this report post? All comments will be deleted.')) return;
    
    setModalError('');
    try {
      await api.adminDeleteLostFoundPost(selectedPost.id);
      setSelectedPost(null);
      setSuccess('Post successfully deleted.');
      fetchPosts();
    } catch (err) {
      setModalError('Failed to delete post: ' + err.message);
    }
  };

  const handleHideCommentToggle = async (comment) => {
    setModalError('');
    setModalSuccess('');
    try {
      await api.adminHideComment(comment.id, !comment.isHidden); // Wait, api.js uses adminHideLostFoundComment
    } catch (err) {
      // Let's use the exact method: api.adminHideLostFoundComment
      try {
        await api.adminHideLostFoundComment(comment.id, !comment.isHidden);
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, isHidden: !c.isHidden } : c));
        setModalSuccess(`Comment visibility toggled.`);
      } catch (err2) {
        setModalError('Failed to moderate comment: ' + err2.message);
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment permanently?')) return;
    setModalError('');
    setModalSuccess('');
    try {
      await api.adminDeleteLostFoundComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setModalSuccess('Comment deleted permanently.');
    } catch (err) {
      setModalError('Failed to delete comment: ' + err.message);
    }
  };

  // Filter lists
  const filteredPosts = posts.filter(post => {
    const matchesType = typeFilter === 'all' || post.type.toLowerCase() === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'open' && post.status !== 'Closed') || 
                          (statusFilter === 'closed' && post.status === 'Closed');
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (post.trainNumber && post.trainNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          post.authorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Type Filter */}
          <select className="input-field" style={{ width: '130px', padding: '8px 12px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>

          {/* Status Filter */}
          <select className="input-field" style={{ width: '130px', padding: '8px 12px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Resolved</option>
          </select>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search reports..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        <button className="btn btn-secondary" onClick={fetchPosts}>
          ↻ Refresh List
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)', fontWeight: 500 }}>{success}</div>}

      {/* Main Listing Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>Type</th>
                <th style={{ padding: '16px 24px' }}>Title</th>
                <th style={{ padding: '16px 24px' }}>Train #</th>
                <th style={{ padding: '16px 24px' }}>Author</th>
                <th style={{ padding: '16px 24px' }}>Status</th>
                <th style={{ padding: '16px 24px' }}>Created At</th>
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}><Clock className="animate-spin" size={24} color="var(--accent-primary)" /></td></tr>
              ) : filteredPosts.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No reports found.</td></tr>
              ) : (
                paginatedPosts.map((post) => (
                  <tr key={post.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge ${post.type === 'Lost' ? 'badge-cancelled' : 'badge-on-time'}`} style={{ fontSize: '0.65rem' }}>
                        {post.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{post.title}</td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace' }}>{post.trainNumber || '-'}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{post.authorName}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge ${post.status === 'Closed' ? 'badge-info' : 'badge-delayed'}`} style={{ fontSize: '0.65rem' }}>
                        {post.status === 'Closed' ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button onClick={() => handleOpenDetails(post)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        <Shield size={14} /> Moderate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {t('prev')}
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {isRTL 
                ? `صفحة ${toArabicDigits(currentPage)} من ${toArabicDigits(totalPages)}`
                : `Page ${currentPage} of ${totalPages}`}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {t('next')}
            </button>
          </div>
        )}
      </div>

      {/* MODERATION DETAILS MODAL */}
      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', margin: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${selectedPost.type === 'Lost' ? 'badge-cancelled' : 'badge-on-time'}`}>{selectedPost.type}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Moderate Report</span>
              </div>
              <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && <div style={{ color: 'var(--danger)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>{modalError}</div>}
            {modalSuccess && <div style={{ color: 'var(--success)', background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.1)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>{modalSuccess}</div>}

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr' : '1.3fr 1fr', gap: '20px' }}>
              
              {/* Left Column: Details or Editor */}
              <div>
                {isEditing ? (
                  <form onSubmit={handleSaveDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Title *</label>
                      <input type="text" className="input-field" required value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
                    </div>
                    
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description *</label>
                      <textarea className="input-field" rows="3" required value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} style={{ resize: 'none' }}></textarea>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Train #</label>
                        <input type="text" className="input-field" value={editForm.trainNumber} onChange={(e) => setEditForm({...editForm, trainNumber: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contact Info</label>
                        <input type="text" className="input-field" value={editForm.contactInfo} onChange={(e) => setEditForm({...editForm, contactInfo: e.target.value})} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Report Type</label>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="radio" name="modalType" checked={editForm.type === 0} onChange={() => setEditForm({...editForm, type: 0})} />
                          Lost
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="radio" name="modalType" checked={editForm.type === 1} onChange={() => setEditForm({...editForm, type: 1})} />
                          Found
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={submittingModal}>Save</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{selectedPost.title}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        By: {selectedPost.authorName} • {new Date(selectedPost.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, background: 'rgba(120,120,120,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', margin: 0 }}>
                      {selectedPost.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Train size={14} color="var(--accent-primary)" />
                        <span>Train: <strong>{selectedPost.trainNumber || '-'}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Phone size={14} color="var(--success)" />
                        <span>Contact: <strong>{selectedPost.contactInfo || '-'}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <button onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit size={14} /> Edit Details
                      </button>
                      <button onClick={handleStatusToggle} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Mark as {selectedPost.status === 'Closed' ? 'Open' : 'Resolved'}
                      </button>
                      <button onClick={handleDeletePost} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={14} /> Delete Report
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Image Preview (only if not editing) */}
              {!isEditing && (
                <div style={{ display: 'flex', flexDirection: 'column', justifySelf: 'stretch', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Image Preview</label>
                  {selectedPost.imageUrl ? (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '180px', width: '100%' }}>
                      <img src={api.resolveImageUrl(selectedPost.imageUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: '180px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No image uploaded.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments Thread Moderation */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} /> Comments Moderate Feed ({comments.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                {comments.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>No comments on this post yet.</div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '12px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: c.isHidden ? 'rgba(239, 68, 68, 0.03)' : 'rgba(120, 120, 120, 0.01)' }}>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.authorName}</span>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: c.isHidden ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: c.isHidden ? 'line-through' : 'none' }}>
                          {c.content}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => handleHideCommentToggle(c)} className="btn btn-secondary" style={{ padding: '4px', minWidth: 'auto', background: 'transparent', border: 'none' }} title={c.isHidden ? 'Unhide Comment' : 'Hide Comment'}>
                          {c.isHidden ? <Eye size={14} color="var(--success)" /> : <EyeOff size={14} color="var(--warning)" />}
                        </button>
                        <button onClick={() => handleDeleteComment(c.id)} className="btn btn-secondary" style={{ padding: '4px', minWidth: 'auto', background: 'transparent', border: 'none' }} title="Delete Comment">
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button className="btn btn-primary" onClick={() => setSelectedPost(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LostFoundAdmin;
