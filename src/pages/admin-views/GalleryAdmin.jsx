import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { usePopup } from '../../context/PopupContext';
import { Plus, Edit2, Trash2, Eye, EyeOff, X, Image as ImageIcon, Check, Loader2, ExternalLink } from 'lucide-react';

export const GalleryAdmin = () => {
  const { t, isRTL } = useLanguage();
  const { toast, confirm } = usePopup();

  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  // Form inputs
  const [captionEn, setCaptionEn] = useState('');
  const [captionAr, setCaptionAr] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [link, setLink] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fetchGalleryItems = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetGalleryItems();
      // The backend returns { isSuccess: true, data: [...] }
      setGalleryItems(res.data || res || []);
    } catch (err) {
      console.error(err);
      toast(isRTL ? 'فشل تحميل عناصر معرض الصور' : 'Failed to fetch gallery items: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setCaptionEn('');
    setCaptionAr('');
    setIsVisible(true);
    setLink('');
    setImageFile(null);
    setImagePreview(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setCaptionEn(item.captionEn || '');
    setCaptionAr(item.captionAr || '');
    setIsVisible(item.isVisible ?? true);
    setLink(item.link || '');
    setImageFile(null);
    setImagePreview(api.resolveImageUrl(item.imagePath));
    setIsFormModalOpen(true);
  };

  const handleOpenDetails = (item) => {
    setViewingItem(item);
    setIsDetailsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem && !imageFile) {
      toast(isRTL ? 'يرجى تحديد ملف صورة للمعرض الجديد' : 'Please select an image file for the new slide.', 'error');
      return;
    }

    setIsSubmitLoading(true);
    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append('file', imageFile);
      }
      formData.append('captionEn', captionEn);
      formData.append('captionAr', captionAr);
      formData.append('isVisible', isVisible);
      formData.append('link', link);

      if (editingItem) {
        await api.adminUpdateGalleryItem(editingItem.id, formData);
        toast(isRTL ? 'تم تحديث عنصر المعرض بنجاح' : 'Gallery item updated successfully.', 'success');
      } else {
        await api.adminCreateGalleryItem(formData);
        toast(isRTL ? 'تم إضافة عنصر المعرض بنجاح' : 'Gallery item created successfully.', 'success');
      }
      setIsFormModalOpen(false);
      fetchGalleryItems();
    } catch (err) {
      console.error(err);
      toast(err.message || (isRTL ? 'فشلت العملية' : 'Operation failed.'), 'error');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleToggleVisibility = async (item) => {
    try {
      await api.adminToggleGalleryVisibility(item.id);
      setGalleryItems(prev => prev.map(g => g.id === item.id ? { ...g, isVisible: !g.isVisible } : g));
      toast(isRTL ? 'تم تعديل حالة الظهور بنجاح' : 'Visibility updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      toast(isRTL ? 'فشل تعديل حالة الظهور' : 'Failed to toggle visibility.', 'error');
    }
  };

  const handleDeleteItem = async (item) => {
    const isConfirmed = await confirm(
      isRTL 
        ? 'هل أنت متأكد من أنك تريد حذف هذا العنصر نهائيًا؟' 
        : 'Are you sure you want to permanently delete this gallery item?'
    );
    if (!isConfirmed) return;

    try {
      await api.adminDeleteGalleryItem(item.id);
      toast(isRTL ? 'تم حذف العنصر بنجاح' : 'Gallery item deleted successfully.', 'success');
      fetchGalleryItems();
    } catch (err) {
      console.error(err);
      toast(isRTL ? 'فشل حذف العنصر' : 'Failed to delete gallery item.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{t('photoGallery') || 'Photo Gallery'}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {isRTL ? 'إدارة صور الشرائح التوضيحية وتسمياتها التوضيحية ثنائية اللغة لصفحة لوحة القيادة.' : 'Manage slideshow banner images and their bilingual captions for the commuter dashboard.'}
          </p>
        </div>
        <button 
          onClick={handleOpenAddModal} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          {isRTL ? 'إضافة شريحة جديدة' : 'Add New Slide'}
        </button>
      </div>

      {/* Grid List Card */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <Loader2 className="spin" size={32} color="var(--accent-primary)" />
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ImageIcon size={48} style={{ opacity: 0.5, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{isRTL ? 'لا توجد شرائح حاليًا.' : 'No slides found in the gallery.'}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>{isRTL ? 'انقر على الزر أعلاه لإضافة أول شريحة.' : 'Click the button above to add your first slide.'}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {galleryItems.map((item) => (
            <div 
              key={item.id} 
              className="glass-panel animate-fade" 
              style={{ 
                padding: '0', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column', 
                position: 'relative',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                background: 'var(--panel-bg)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Image Preview Thumbnail */}
              <div style={{ width: '100%', height: '180px', position: 'relative', background: '#000', overflow: 'hidden' }}>
                <img 
                  src={api.resolveImageUrl(item.imagePath)} 
                  alt={item.captionEn || 'Gallery Item'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.isVisible ? 1 : 0.6 }} 
                />
                
                {/* Visibility Badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: isRTL ? 'auto' : '12px', 
                  left: isRTL ? '12px' : 'auto', 
                  background: item.isVisible ? 'rgba(16, 185, 129, 0.9)' : 'rgba(107, 114, 128, 0.9)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {item.isVisible ? (
                    <>
                      <Eye size={12} />
                      {isRTL ? 'مرئي' : 'Visible'}
                    </>
                  ) : (
                    <>
                      <EyeOff size={12} />
                      {isRTL ? 'مخفي' : 'Hidden'}
                    </>
                  )}
                </div>
              </div>

              {/* Info Details */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>EN: </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.captionEn || <em style={{ color: 'var(--text-muted)' }}>No caption</em>}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AR: </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.captionAr || <em style={{ color: 'var(--text-muted)' }}>لا يوجد تعليق</em>}
                  </span>
                </div>
                {item.link && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{isRTL ? 'الرابط: ' : 'Link: '}</span>
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.link}
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.01)'
              }}>
                <button
                  onClick={() => handleToggleVisibility(item)}
                  className="btn btn-secondary"
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    margin: 0,
                    minWidth: 'auto'
                  }}
                  title={item.isVisible ? (isRTL ? 'إخفاء من لوحة القيادة' : 'Hide from Dashboard') : (isRTL ? 'إظهار في لوحة القيادة' : 'Show on Dashboard')}
                >
                  {item.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{item.isVisible ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'إظهار' : 'Show')}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenDetails(item)}
                    className="btn btn-secondary"
                    style={{ padding: '6px', minWidth: 'auto', margin: 0 }}
                    title={isRTL ? 'عرض التفاصيل' : 'View Details'}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="btn btn-secondary"
                    style={{ padding: '6px', minWidth: 'auto', margin: 0, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                    title={isRTL ? 'تعديل' : 'Edit'}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="btn btn-secondary"
                    style={{ padding: '6px', minWidth: 'auto', margin: 0, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isFormModalOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0, bottom: 0, left: 0, right: 0, 
          background: 'rgba(0,0,0,0.8)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000, 
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade" style={{ width: '100%', maxWidth: '550px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {editingItem 
                  ? (isRTL ? 'تعديل الشريحة' : 'Edit Slide') 
                  : (isRTL ? 'إضافة شريحة جديدة' : 'Add New Slide')}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Image Input and Preview */}
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                  {isRTL ? 'صورة الشريحة' : 'Slide Image'} {!editingItem && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {imagePreview && (
                    <div style={{ width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', background: '#000', border: '1px solid var(--border-color)' }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="input-field"
                    style={{ padding: '8px' }}
                    required={!editingItem}
                  />
                  <small style={{ color: 'var(--text-secondary)' }}>
                    {isRTL ? 'الملفات المدعومة: PNG, JPG, JPEG.' : 'Supported formats: PNG, JPG, JPEG.'}
                  </small>
                </div>
              </div>

              {/* Caption English */}
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                  {isRTL ? 'التسمية التوضيحية (بالإنجليزية)' : 'Caption (English)'}
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={captionEn} 
                  onChange={(e) => setCaptionEn(e.target.value)} 
                  placeholder={isRTL ? 'مثال: رحلة ممتعة عبر المناظر الطبيعية' : 'e.g. Scenic views along the route'}
                />
              </div>

              {/* Caption Arabic */}
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                  {isRTL ? 'التسمية التوضيحية (بالعربية)' : 'Caption (Arabic)'}
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={captionAr} 
                  onChange={(e) => setCaptionAr(e.target.value)} 
                  placeholder={isRTL ? 'اكتب التعليق هنا...' : 'Type caption in Arabic here...'}
                  style={{ textAlign: 'right', direction: 'rtl' }}
                />
              </div>

              {/* Link Redirect */}
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                  {isRTL ? 'رابط إعادة التوجيه (اختياري)' : 'Redirect Link (Optional)'}
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={link} 
                  onChange={(e) => setLink(e.target.value)} 
                  placeholder={isRTL ? 'مثال: https://example.com/details' : 'e.g. https://example.com/details'}
                />
              </div>

              {/* Visibility Checkbox */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(120, 120, 120, 0.02)',
                marginTop: '4px'
              }}>
                <input 
                  type="checkbox" 
                  checked={isVisible} 
                  onChange={(e) => setIsVisible(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isRTL ? 'إظهار هذه الشريحة في معرض لوحة القيادة للمسافرين' : 'Show this slide in the passenger dashboard slideshow'}
                </span>
              </label>

              {/* Actions row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSubmitLoading}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSubmitLoading && <Loader2 className="spin" size={16} />}
                  {editingItem 
                    ? (isRTL ? 'حفظ التعديلات' : 'Save Changes') 
                    : (isRTL ? 'إضافة الشريحة' : 'Add Slide')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailsModalOpen && viewingItem && (
        <div style={{ 
          position: 'fixed', 
          top: 0, bottom: 0, left: 0, right: 0, 
          background: 'rgba(0,0,0,0.85)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000, 
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade" style={{ width: '100%', maxWidth: '650px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {isRTL ? 'تفاصيل شريحة المعرض' : 'Gallery Slide Details'}
              </h3>
              <button 
                onClick={() => setIsDetailsModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Image */}
              <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid var(--border-color)', maxHeight: '350px' }}>
                <img 
                  src={api.resolveImageUrl(viewingItem.imagePath)} 
                  alt={viewingItem.captionEn || 'Slide'} 
                  style={{ width: '100%', height: '100%', maxHeight: '350px', objectFit: 'contain' }} 
                />
              </div>

              {/* Status details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(120, 120, 120, 0.02)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isRTL ? 'حالة الظهور:' : 'Visibility Status:'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: viewingItem.isVisible ? 'var(--success)' : 'var(--text-muted)' }}>
                    {viewingItem.isVisible 
                      ? (isRTL ? '✨ مرئي للمسافرين' : '✨ Visible to Commuters') 
                      : (isRTL ? '🛑 مخفي من لوحة القيادة' : '🛑 Hidden from Dashboard')}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', borderTop: '1px solid rgba(120,120,120,0.1)', paddingTop: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isRTL ? 'التعليق (EN):' : 'Caption (EN):'}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{viewingItem.captionEn || <em style={{ color: 'var(--text-secondary)' }}>None</em>}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', borderTop: '1px solid rgba(120,120,120,0.1)', paddingTop: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isRTL ? 'التعليق (AR):' : 'Caption (AR):'}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', direction: 'rtl', textAlign: 'right' }}>{viewingItem.captionAr || <em style={{ color: 'var(--text-secondary)' }}>لا يوجد</em>}</span>
                </div>
                {viewingItem.link && (
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', borderTop: '1px solid rgba(120,120,120,0.1)', paddingTop: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isRTL ? 'الرابط التوجيهي:' : 'Redirect Link:'}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                      <a href={viewingItem.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
                        {viewingItem.link} <ExternalLink size={12} />
                      </a>
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', borderTop: '1px solid rgba(120,120,120,0.1)', paddingTop: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isRTL ? 'رابط ملف الصورة:' : 'Image Path:'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{viewingItem.imagePath}</span>
                </div>
              </div>

              {/* Close Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  {isRTL ? 'إغلاق نافذة العرض' : 'Close View'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryAdmin;
