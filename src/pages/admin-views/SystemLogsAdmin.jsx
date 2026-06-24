import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { usePopup } from '../../context/PopupContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Terminal, 
  Search, 
  Calendar, 
  Mail, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  Activity,
  Clock,
  Globe,
  User,
  X,
  Trash2,
  Archive,
  RefreshCw
} from 'lucide-react';

export const SystemLogsAdmin = () => {
  const { t, isRTL } = useLanguage();
  const { toast, confirm } = usePopup();
  const { isDark } = useTheme();

  // Log List State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;

  // Filter States (default empty to show all logs across time)
  const [logLevel, setLogLevel] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('overview');

  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setActiveModalTab('overview');
  };

  const handleCopyEntireLog = (log) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast(isRTL ? 'تم نسخ بيانات السجل بالكامل!' : 'Entire log JSON copied to clipboard!', 'success');
  };

  const formatDescriptionPayload = (desc) => {
    const index = desc?.indexOf('Payload: ');
    if (index === -1 || !desc) {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{desc}</div>;
    }
    const textPart = desc.substring(0, index);
    const jsonPart = desc.substring(index + 9);
    try {
      const parsed = JSON.parse(jsonPart);
      const formattedJson = JSON.stringify(parsed, null, 2);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: isDark ? '#e2e8f0' : '#334155' }}>{textPart}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>
              {isRTL ? 'معلمات الطلب المرسل (الحمولة)' : 'Action Payload (Parameters)'}
            </span>
            <pre style={{
              backgroundColor: isDark ? '#07070a' : '#f8fafc',
              padding: '16px',
              borderRadius: '10px',
              color: isDark ? '#34d399' : '#0f766e',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              overflowX: 'auto',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: isDark ? 'inset 0 2px 6px rgba(0,0,0,0.5)' : 'inset 0 2px 6px rgba(0,0,0,0.05)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0
            }}>
              {formattedJson}
            </pre>
          </div>
        </div>
      );
    } catch (e) {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{desc}</div>;
    }
  };

  // Fetch Logs from API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetSystemLogs({
        page,
        pageSize,
        logLevel: logLevel || undefined,
        source: source || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });

      if (res && res.isSuccess && res.data) {
        setLogs(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
        setTotalPages(res.data.totalPages || 1);
      } else {
        toast(res?.error || (isRTL ? 'فشل في تحميل سجلات النظام.' : 'Failed to load system logs.'), 'error');
      }
    } catch (err) {
      console.error(err);
      toast(isRTL ? 'فشل في الاتصال بالخادم لجلب السجلات.' : 'Failed to fetch system logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, logLevel, source, search, dateFrom, dateTo]);

  // Debounced search trigger (after 2 chars or when empty)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchInput.trim().length === 0 || searchInput.trim().length >= 2) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  const handleClearFilters = () => {
    setLogLevel('');
    setSource('');
    setSearch('');
    setSearchInput('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleArchiveLogs = async () => {
    try {
      const isConfirmed = await confirm(
        t('runServerArchiverConfirm'),
        t('runServerArchiverTitle')
      );
      if (!isConfirmed) return;

      setLoading(true);
      const res = await api.adminTriggerSystemLogsArchive();
      
      if (res && res.isSuccess) {
        toast(t('archiveSuccess', { count: res.data }), 'success');
        fetchLogs(); // Refresh the table
      } else {
        toast(res?.error || t('failedToArchive'), 'error');
      }
    } catch (err) {
      console.error(err);
      toast(t('failedToArchive'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeLogs = async () => {
    const title = t('purgeSystemLogsTitle');
    const warningMessage = t('purgeSystemLogsConfirm');

    const confirmed = await confirm(warningMessage, title);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await api.adminClearSystemLogs({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      if (res && res.isSuccess) {
        toast(t('logsCleared'), 'success');
        setPage(1);
        fetchLogs();
      } else {
        toast(res?.error || t('failedToClear'), 'error');
      }
    } catch (err) {
      console.error(err);
      toast(t('failedToClear'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderLevelBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return (
          <span className="log-badge badge-error">
            <AlertOctagon size={12} style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0' }} />
            {t('error')}
          </span>
        );
      case 'warning':
        return (
          <span className="log-badge badge-warning">
            <AlertTriangle size={12} style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0' }} />
            {t('warning')}
          </span>
        );
      default:
        return (
          <span className="log-badge badge-info">
            <Info size={12} style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0' }} />
            {t('info')}
          </span>
        );
    }
  };

  const renderSourceBadge = (src) => {
    let color = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    let textColor = isDark ? '#cbd5e1' : '#475569';

    if (src === 'API') {
      color = isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)';
      textColor = isDark ? '#818cf8' : '#4f46e5';
    } else if (src === 'Frontend') {
      color = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)';
      textColor = isDark ? '#34d399' : '#059669';
    } else if (src === 'Mobile') {
      color = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)';
      textColor = isDark ? '#fbbf24' : '#d97706';
    } else if (src === 'AdminAction') {
      color = isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)';
      textColor = isDark ? '#f472b6' : '#db2777';
    }

    return (
      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: color, color: textColor, border: `1px solid ${textColor}30` }}>
        {src}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: isDark ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Terminal size={24} color="var(--accent-primary)" />
            {t('systemLogs')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t('systemLogsDesc')}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleArchiveLogs}
            className="btn btn-secondary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Archive size={16} />
            {t('runServerArchiver')}
          </button>
          <button 
            onClick={handlePurgeLogs}
            disabled={logs.length === 0 || loading}
            className="btn btn-danger"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Trash2 size={16} /> {t('clearAllFilteredLogs')}
          </button>
        </div>
      </div>

      {/* Filter Options Grid */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          
          {/* Search Term */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{isRTL ? 'بحث في الوصف والهدف' : 'Search Target/Desc'}</span>
            <input
              type="text"
              className="input-field"
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%', height: '42px', paddingLeft: '12px', paddingRight: '12px' }}
            />
          </div>

          {/* Level Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('level')}</span>
            <select
              className="input-field"
              value={logLevel}
              onChange={(e) => { setLogLevel(e.target.value); setPage(1); }}
              style={{ width: '100%', height: '42px', cursor: 'pointer', appearance: 'auto', padding: '0 8px' }}
            >
              <option value="">{isRTL ? '-- الكل --' : '-- All Levels --'}</option>
              <option value="Info">{isRTL ? 'معلومات' : 'Info'}</option>
              <option value="Warning">{isRTL ? 'تحذير' : 'Warning'}</option>
              <option value="Error">{isRTL ? 'خطأ' : 'Error'}</option>
            </select>
          </div>

          {/* Source Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('source')}</span>
            <select
              className="input-field"
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
              style={{ width: '100%', height: '42px', cursor: 'pointer', appearance: 'auto', padding: '0 8px' }}
            >
              <option value="">{isRTL ? '-- الكل --' : '-- All Sources --'}</option>
              <option value="API">API</option>
              <option value="Frontend">Frontend</option>
              <option value="Mobile">Mobile</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {/* Date From */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('dateFrom')}</span>
            <input
              type="date"
              className="input-field"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              style={{ width: '100%', height: '42px', padding: '0 8px' }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('dateTo')}</span>
            <input
              type="date"
              className="input-field"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              style={{ width: '100%', height: '42px', padding: '0 8px' }}
            />
          </div>

          {/* Reset Action */}
          <div>
            <button 
              onClick={handleClearFilters} 
              className="btn btn-secondary" 
              style={{ height: '42px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {t('resetFilters')}
            </button>
          </div>

        </div>
      </div>

      {/* Logs Table Area */}
      <div className="glass-panel" style={{ borderRadius: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 24px' }}>{isRTL ? 'التاريخ والوقت' : 'Timestamp'}</th>
              <th style={{ padding: '16px 24px' }}>{t('level')}</th>
              <th style={{ padding: '16px 24px' }}>{t('source')}</th>
              <th style={{ padding: '16px 24px' }}>{t('user')}</th>
              <th style={{ padding: '16px 24px' }}>{t('target')}</th>
              <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw className="spin" size={24} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <div style={{ color: 'var(--text-secondary)' }}>{t('loadingLogs')}</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <Terminal size={48} style={{ opacity: 0.2, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
                  {t('noSystemLogsFound')}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 24px' }}>{renderLevelBadge(log.logLevel)}</td>
                  <td style={{ padding: '16px 24px' }}>{renderSourceBadge(log.source)}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{log.userEmail || (isRTL ? 'مجهول' : 'Anonymous')}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{log.target}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleOpenDetails(log)} 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', minWidth: 'auto', fontSize: '0.75rem' }}
                    >
                      <Eye size={12} style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0', verticalAlign: 'text-bottom' }} /> 
                      {t('details')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isRTL 
                ? `صفحة ${page} من ${totalPages} (إجمالي ${totalCount} سجل)`
                : `Page ${page} of ${totalPages} (Total ${totalCount} records)`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(prev => Math.max(1, prev - 1))} 
                disabled={page === 1} 
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0' }} /> {t('previous')}
              </button>
              <button 
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={page === totalPages} 
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {t('next')} <ChevronRight size={14} style={{ marginLeft: isRTL ? '0' : '4px', marginRight: isRTL ? '4px' : '0' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Inspector Detail view */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel modal-animation" style={{ width: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-2xl)' }}>
            
            {/* Modal Title */}
            <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t('systemLogInspector')}</span>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Navigation Tabs */}
            <div style={{ padding: '0 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px' }}>
              <button 
                onClick={() => setActiveModalTab('overview')}
                style={{ 
                  padding: '14px 4px', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: activeModalTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent', 
                  color: activeModalTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                  fontWeight: activeModalTab === 'overview' ? 700 : 500, 
                  cursor: 'pointer' 
                }}
              >
                {t('overview')}
              </button>
              {selectedLog.errorMessage && (
                <button 
                  onClick={() => setActiveModalTab('exception')}
                  style={{ 
                    padding: '14px 4px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeModalTab === 'exception' ? '2px solid var(--accent-primary)' : '2px solid transparent', 
                    color: activeModalTab === 'exception' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                    fontWeight: activeModalTab === 'exception' ? 700 : 500, 
                    cursor: 'pointer' 
                  }}
                >
                  {t('exceptionDetail')}
                </button>
              )}
              {selectedLog.stackTrace && (
                <button 
                  onClick={() => setActiveModalTab('stack')}
                  style={{ 
                    padding: '14px 4px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeModalTab === 'stack' ? '2px solid var(--accent-primary)' : '2px solid transparent', 
                    color: activeModalTab === 'stack' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                    fontWeight: activeModalTab === 'stack' ? 700 : 500, 
                    cursor: 'pointer' 
                  }}
                >
                  {t('stackTrace')}
                </button>
              )}
            </div>

            {/* Modal Body Scrollbox */}
            <div className="custom-scroll" style={{ padding: '28px', overflowY: 'auto', flexGrow: 1 }}>
              {activeModalTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Summary grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'المعرّف الفريد' : 'Log Reference ID'}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{selectedLog.id}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'وقت الإطلاق' : 'Timestamp'}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{new Date(selectedLog.timestamp).toString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('level')}</span>
                      <div>{renderLevelBadge(selectedLog.logLevel)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('source')}</span>
                      <div>{renderSourceBadge(selectedLog.source)}</div>
                    </div>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border-color)', margin: '8px 0' }} />

                  {/* Payload Details */}
                  {formatDescriptionPayload(selectedLog.description)}
                </div>
              )}
              
              {activeModalTab === 'exception' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'رسالة الخطأ' : 'Error Message'}</span>
                  <pre style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.03)',
                    padding: '16px',
                    borderRadius: '10px',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}
              
              {activeModalTab === 'stack' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('stackTrace')}</span>
                    <button 
                      onClick={() => handleCopyStackTrace(selectedLog.stackTrace)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Copy size={12} />
                      {copied ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ التتبع' : 'Copy Trace')}
                    </button>
                  </div>
                  <pre style={{
                    backgroundColor: isDark ? '#09090e' : '#f8fafc',
                    padding: '16px',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '40vh',
                    margin: 0
                  }}>
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ padding: '18px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => handleCopyEntireLog(selectedLog)} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Copy size={13} /> {t('copyLogJson')}
              </button>
              <button onClick={() => setSelectedLog(null)} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                {t('close')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STYLES OVERRIDES */}
      <style>{`
        .log-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          borderRadius: 6px;
          fontSize: 0.75rem;
          fontWeight: 600;
          line-height: 1;
        }
        .badge-error {
          background-color: ${isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'};
          color: ${isDark ? '#f87171' : '#dc2626'};
          border: 1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)'};
          box-shadow: 0 0 8px ${isDark ? 'rgba(239, 68, 68, 0.1)' : 'transparent'};
        }
        .badge-warning {
          background-color: ${isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'};
          color: ${isDark ? '#fbbf24' : '#d97706'};
          border: 1px solid ${isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.2)'};
        }
        .badge-info {
          background-color: ${isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'};
          color: ${isDark ? '#60a5fa' : '#2563eb'};
          border: 1px solid ${isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.2)'};
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-animation {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: ${isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)'};
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.25)'};
        }
      `}</style>
    </div>
  );
};

export default SystemLogsAdmin;
