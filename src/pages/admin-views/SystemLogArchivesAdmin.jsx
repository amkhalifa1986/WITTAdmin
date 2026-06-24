import React, { useState, useEffect } from 'react';
import { Download, Trash2, Archive, RefreshCw, FileText } from 'lucide-react';
import api from '../../services/api';
import { usePopup } from '../../context/PopupContext';
import { useLanguage } from '../../context/LanguageContext';

export const SystemLogArchivesAdmin = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast, confirm } = usePopup();
  const { t, isRTL } = useLanguage();

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetSystemLogArchives();
      setArchives(res || []);
    } catch (err) {
      console.error(err);
      toast('Failed to load archives.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const handleDownload = async (fileName) => {
    if (!fileName) return;
    setIsProcessing(true);
    try {
      const blob = await api.adminDownloadSystemLogArchives([fileName]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast(isRTL ? 'تم تنزيل الملف بنجاح.' : 'Downloaded file successfully.', 'success');
    } catch (err) {
      console.error(err);
      toast(isRTL ? 'فشل في تنزيل الملف.' : 'Failed to download file.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (fileName) => {
    if (!fileName) return;
    const isConfirmed = await confirm(
      isRTL 
        ? `هل أنت متأكد من أنك تريد حذف ملف الأرشيف ${fileName} نهائيًا من الخادم؟ لا يمكن التراجع عن هذا الإجراء.` 
        : `Are you sure you want to permanently delete the archive file ${fileName} from the server? This cannot be undone.`,
      t('deleteArchivesTitle')
    );

    if (!isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await api.adminDeleteSystemLogArchives([fileName]);
      toast(res.message || (isRTL ? 'تم حذف الملف بنجاح.' : 'File deleted successfully.'), 'success');
      fetchArchives();
    } catch (err) {
      console.error(err);
      toast(isRTL ? 'فشل في حذف الملف.' : 'Failed to delete file.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{t('systemLogArchives')}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t('systemLogArchivesDesc')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchArchives} 
            className="btn btn-secondary"
            disabled={loading || isProcessing}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            {t('refresh') || 'Refresh'}
          </button>
        </div>
      </div>

      {/* Data Table Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>{t('fileName')}</th>
                <th style={{ padding: '16px 24px' }}>{t('size')}</th>
                <th style={{ padding: '16px 24px' }}>{t('createdAtUtc')}</th>
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('loadingArchives')}
                  </td>
                </tr>
              ) : archives.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Archive size={40} style={{ opacity: 0.5, marginBottom: '10px', display: 'block', margin: '0 auto' }} />
                    {t('noArchivesFound')}
                  </td>
                </tr>
              ) : (
                archives.map((file) => (
                  <tr key={file.fileName} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="var(--accent-primary)" />
                        {file.fileName}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {formatBytes(file.sizeInBytes)}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      {new Date(file.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleDownload(file.fileName)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                        title={t('downloadSelected')}
                        disabled={isProcessing}
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(file.fileName)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        title={t('deleteSelected')}
                        disabled={isProcessing}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLogArchivesAdmin;
