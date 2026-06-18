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
  Archive
} from 'lucide-react';



export const SystemLogsAdmin = () => {
  const { t } = useLanguage();
  const { toast, alert, confirm } = usePopup();
  const { isDark } = useTheme();

  const getFirstAndLastDayOfCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDate = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getFirstAndLastDayOfCurrentMonth();


  // Log List State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;

  // Filter States
  const [logLevel, setLogLevel] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(lastDay);

  // Track last successfully archived date range to warn about un-archived clears
  const [lastArchivedRange, setLastArchivedRange] = useState(null);

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
    toast('Entire log JSON copied to clipboard!', 'success');
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
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>Action Payload (Parameters)</span>
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
        logLevel,
        source,
        search,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });

      if (res && res.isSuccess && res.data) {
        setLogs(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
        setTotalPages(res.data.totalPages || 1);
      } else {
        toast(res?.error || 'Failed to load system logs.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to fetch system logs.', 'error');
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setLogLevel('');
    setSource('');
    setSearch('');
    setSearchInput('');
    const { firstDay, lastDay } = getFirstAndLastDayOfCurrentMonth();
    setDateFrom(firstDay);
    setDateTo(lastDay);
    setPage(1);
  };

  const convertToCSV = (objArray) => {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    if (array.length === 0) return '';
    const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Target', 'User Email', 'Description', 'Error Message', 'Stack Trace'];
    let str = headers.join(',') + '\r\n';

    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      const line = [
        item.id,
        new Date(item.timestamp).toLocaleString(),
        item.logLevel,
        item.source,
        item.target || '',
        item.userEmail || 'Anonymous',
        `"${(item.description || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
        `"${(item.errorMessage || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
        `"${(item.stackTrace || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
      ];
      str += line.join(',') + '\r\n';
    }
    return str;
  };

  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleArchiveLogs = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetSystemLogs({
        page: 1,
        pageSize: 100000,
        logLevel,
        source,
        search,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });

      if (res && res.isSuccess && res.data && res.data.items) {
        const logsToExport = res.data.items;
        if (logsToExport.length === 0) {
          toast('No logs found in the selected range to archive.', 'warning');
          return;
        }

        const csv = convertToCSV(logsToExport);
        const fileName = `system_logs_archive_${dateFrom || 'start'}_to_${dateTo || 'end'}.csv`;
        downloadCSV(csv, fileName);

        setLastArchivedRange({ dateFrom, dateTo });

        await alert(
          'System logs have been successfully compiled and downloaded as CSV. You can now safely clear this log range from the system database.',
          'Archived Successfully!'
        );
      } else {
        toast(res?.error || 'Failed to export logs.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to archive logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllLogs = async () => {
    const isRangeArchived = lastArchivedRange &&
                            lastArchivedRange.dateFrom === dateFrom &&
                            lastArchivedRange.dateTo === dateTo;

    let warningMessage = 'Are you sure you want to permanently delete system logs for the selected range? This action cannot be undone.';
    let title = 'Purge System Logs?';

    if (!isRangeArchived) {
      title = '⚠️ Warning: Un-archived Data';
      warningMessage = 'CAUTION: You are about to clear logs that have NOT been archived yet! We highly recommend clicking the "Archive Logs" button first to download a CSV backup. Do you want to proceed with clearing anyway?';
    }

    const confirmed = await confirm({
      title,
      message: warningMessage,
      confirmText: isRangeArchived ? 'Yes, Purge' : 'Purge Anyway',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await api.adminClearSystemLogs({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      if (res && res.isSuccess) {
        toast('Selected system logs successfully cleared!', 'success');
        fetchLogs();
      } else {
        toast(res?.error || 'Failed to clear system logs.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to clear system logs.', 'error');
    }
  };

  const handleCopyStackTrace = (stack) => {
    if (!stack) return;
    navigator.clipboard.writeText(stack);
    setCopied(true);
    toast('Stack trace copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render log level badges
  const renderLevelBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return (
          <span className="log-badge badge-error">
            <AlertOctagon size={12} style={{ marginRight: '4px' }} />
            Error
          </span>
        );
      case 'warning':
        return (
          <span className="log-badge badge-warning">
            <AlertTriangle size={12} style={{ marginRight: '4px' }} />
            Warning
          </span>
        );
      default:
        return (
          <span className="log-badge badge-info">
            <Info size={12} style={{ marginRight: '4px' }} />
            Info
          </span>
        );
    }
  };

  // Helper to render source badges
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
      <span style={{
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: color,
        color: textColor,
        border: `1px solid ${textColor}30`
      }}>
        {src}
      </span>
    );
  };

  const isFilterActive = logLevel || source || search || dateFrom !== firstDay || dateTo !== lastDay;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: isDark ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Terminal size={24} color="var(--accent-primary)" />
            {t('systemLogs') || 'System Activity & Logs'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
            Audit administrative actions, monitor unhandled exceptions, and review client-side error reports.
          </p>
        </div>

        {/* STATS OVERVIEW */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={handleArchiveLogs}
            className="btn btn-primary"
            style={{ 
              padding: '10px 16px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              margin: 0
            }}
          >
            <Archive size={16} />
            Archive Logs (CSV)
          </button>

          <button 
            onClick={handleClearAllLogs}
            className="btn btn-secondary"
            style={{ 
              padding: '10px 16px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              margin: 0,
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)'; }}
          >
            <Trash2 size={16} />
            Clear Logs
          </button>

          <div className="glass-panel" style={{ padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="var(--accent-primary)" />
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Total Records</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isDark ? '#fff' : 'var(--text-primary)' }}>{totalCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          
          {/* Search Input */}
          <div style={{ flex: '1 1 250px', display: 'flex', position: 'relative' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="log-search-input"
                type="text"
                className="input-field"
                placeholder="Search descriptions, target APIs, emails..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  margin: 0
                }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            </div>
          </div>

          {/* Level Filter */}
          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Log Level</label>
            <select
              id="log-level-filter"
              className="input-field"
              value={logLevel}
              onChange={(e) => { setLogLevel(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                margin: 0,
                appearance: 'auto',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>All Levels</option>
              <option value="Info" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Info</option>
              <option value="Warning" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Warning</option>
              <option value="Error" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Error</option>
            </select>
          </div>

          {/* Source Filter */}
          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Log Source</label>
            <select
              id="log-source-filter"
              className="input-field"
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                margin: 0,
                appearance: 'auto',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>All Sources</option>
              <option value="API" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>API</option>
              <option value="Frontend" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Frontend</option>
              <option value="Mobile" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Mobile</option>
              <option value="AdminAction" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Admin Action</option>
            </select>
          </div>

          {/* Date From */}
          <div style={{ width: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Date From</label>
            <input
              type="date"
              className="input-field"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                margin: 0,
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Date To */}
          <div style={{ width: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Date To</label>
            <input
              type="date"
              className="input-field"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                margin: 0,
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Clear Button */}
          {isFilterActive && (
            <button onClick={handleClearFilters} className="btn btn-secondary" style={{ height: '42px', margin: 0, padding: '0 16px' }}>
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* LOGS TABLE CONTAINER */}
      <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Timestamp</th>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Level</th>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Source</th>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target</th>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>User</th>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '48px', textAlign: 'center' }}>
                  <Clock className="animate-spin" size={24} color="var(--accent-primary)" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No system logs found matching the filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr 
                  key={log.id} 
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Timestamp */}
                  <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--text-muted)" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  
                  {/* Log Level */}
                  <td style={{ padding: '14px 20px' }}>
                    {renderLevelBadge(log.logLevel)}
                  </td>
                  
                  {/* Source */}
                  <td style={{ padding: '14px 20px' }}>
                    {renderSourceBadge(log.source)}
                  </td>
                  
                  {/* Target API/Page */}
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: '#818cf8', fontFamily: 'monospace' }}>
                    {log.target || '/'}
                  </td>
                  
                  {/* User Email */}
                  <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {log.userEmail ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} color="var(--text-muted)" />
                        {log.userEmail}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Anonymous</span>
                    )}
                  </td>
                  
                  {/* Description */}
                  <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.description}
                  </td>
                  
                  {/* Action Trigger */}
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleOpenDetails(log)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0 }}
                    >
                      <Eye size={12} />
                      Details
                    </button>

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: 'rgba(0, 0, 0, 0.1)', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing Page {page} of {totalPages} ({totalCount} total logs)
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(prev => Math.max(1, prev - 1))} 
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              
              <button 
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* DETAIL INSPECTOR DIALOG MODAL */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(5, 5, 8, 0.75)' : 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(12px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="glass-panel modal-animation" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            boxShadow: isDark 
              ? '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 30px rgba(99, 102, 241, 0.05)'
              : '0 20px 50px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 30px rgba(99, 102, 241, 0.02)',
            overflow: 'hidden',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderTop: selectedLog.logLevel?.toLowerCase() === 'error' 
              ? '4px solid #ef4444' 
              : selectedLog.logLevel?.toLowerCase() === 'warning' 
                ? '4px solid #f59e0b' 
                : '4px solid #3b82f6',
            background: isDark 
              ? 'linear-gradient(135deg, rgba(20, 20, 28, 0.9) 0%, rgba(10, 10, 15, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(245, 245, 250, 0.95) 100%)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '22px 28px',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.015)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Terminal size={18} color="var(--accent-primary)" />
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '1.15rem', color: isDark ? '#fff' : '#1e293b', display: 'block', letterSpacing: '0.5px' }}>SYSTEM LOG INSPECTOR</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Log Record ID: {selectedLog.id}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {renderLevelBadge(selectedLog.logLevel)}
                  {renderSourceBadge(selectedLog.source)}
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  style={{ 
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                    color: 'var(--text-muted)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '50%',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  className="modal-close-btn"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Scroll Content */}
            <div style={{ padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }} className="custom-scroll">
              
              {/* Metadata Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                
                {/* Left Card - Context */}
                <div style={{ 
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', 
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.04)', 
                  borderRadius: '16px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>Date & Time (Local)</span>
                      <span style={{ fontSize: '0.85rem', color: isDark ? '#e2e8f0' : '#334155', fontWeight: 500 }}>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
                    <Globe size={14} color="var(--text-muted)" />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>Target Path / Resource</span>
                      <span style={{ fontSize: '0.8rem', color: isDark ? '#818cf8' : '#4f46e5', fontFamily: 'monospace', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedLog.target}>
                        {selectedLog.target || '/'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Card - Identity */}
                <div style={{ 
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', 
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.04)', 
                  borderRadius: '16px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={14} color="var(--text-muted)" />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>Triggered By</span>
                      <span style={{ fontSize: '0.85rem', color: isDark ? '#e2e8f0' : '#334155', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedLog.userEmail || 'Anonymous'}
                      </span>
                    </div>
                  </div>
                  {selectedLog.userId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
                      <Terminal size={14} color="var(--text-muted)" />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>User ID</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedLog.userId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Dynamic Modal Tab Bar (Only show if exception/stack trace exists) */}
              {(selectedLog.errorMessage || selectedLog.stackTrace) && (
                <div style={{
                  display: 'flex',
                  borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                  gap: '20px',
                  marginTop: '8px'
                }}>
                  <button
                    onClick={() => setActiveModalTab('overview')}
                    style={{
                      padding: '10px 4px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeModalTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: activeModalTab === 'overview' ? (isDark ? '#fff' : '#1e293b') : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    Overview
                  </button>
                  {selectedLog.errorMessage && (
                    <button
                      onClick={() => setActiveModalTab('exception')}
                      style={{
                        padding: '10px 4px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeModalTab === 'exception' ? '2px solid #ef4444' : '2px solid transparent',
                        color: activeModalTab === 'exception' ? (isDark ? '#f87171' : '#b91c1c') : 'var(--text-muted)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                    >
                      Exception Detail
                    </button>
                  )}
                  {selectedLog.stackTrace && (
                    <button
                      onClick={() => setActiveModalTab('stack')}
                      style={{
                        padding: '10px 4px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeModalTab === 'stack' ? '2px solid #a855f7' : '2px solid transparent',
                        color: activeModalTab === 'stack' ? (isDark ? '#c084fc' : '#7e22ce') : 'var(--text-muted)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                    >
                      Stack Trace
                    </button>
                  )}
                </div>
              )}

              {/* Tab Content Panel */}
              <div style={{ flexGrow: 1 }}>
                
                {/* 1. OVERVIEW TAB */}
                {activeModalTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>Log Description</span>
                    <div style={{ 
                      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.02)', 
                      padding: '18px 22px', 
                      borderRadius: '14px', 
                      border: isDark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.05)', 
                      boxShadow: isDark ? 'inset 0 2px 8px rgba(0,0,0,0.4)' : 'inset 0 2px 8px rgba(0,0,0,0.03)',
                      color: isDark ? '#e2e8f0' : '#334155'
                    }}>
                      {formatDescriptionPayload(selectedLog.description)}
                    </div>
                  </div>
                )}

                {/* 2. EXCEPTION TAB */}
                {activeModalTab === 'exception' && selectedLog.errorMessage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: isDark ? '#f87171' : '#b91c1c', fontWeight: 600, letterSpacing: '0.5px' }}>Exception Message</span>
                    <div style={{ 
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)', 
                      padding: '18px 22px', 
                      borderRadius: '14px', 
                      border: isDark ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)', 
                      color: isDark ? '#fca5a5' : '#b91c1c', 
                      fontSize: '0.85rem', 
                      fontFamily: 'monospace',
                      lineHeight: 1.6,
                      boxShadow: isDark ? 'inset 0 2px 8px rgba(239, 68, 68, 0.02)' : 'inset 0 2px 8px rgba(239, 68, 68, 0.01)'
                    }}>
                      {selectedLog.errorMessage}
                    </div>
                  </div>
                )}

                {/* 3. STACK TRACE TAB */}
                {activeModalTab === 'stack' && selectedLog.stackTrace && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: isDark ? '#c084fc' : '#7e22ce', fontWeight: 600, letterSpacing: '0.5px' }}>Execution Stack Trace</span>
                      <button 
                        onClick={() => handleCopyStackTrace(selectedLog.stackTrace)}
                        style={{
                          background: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.06)',
                          border: isDark ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(168, 85, 247, 0.15)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          color: isDark ? '#c084fc' : '#7e22ce',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.12)'; e.currentTarget.style.color = isDark ? '#e9d5ff' : '#6b21a8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.06)'; e.currentTarget.style.color = isDark ? '#c084fc' : '#7e22ce'; }}
                      >
                        {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        {copied ? 'Copied Stack' : 'Copy Stack'}
                      </button>
                    </div>
                    <pre style={{
                      backgroundColor: isDark ? '#050508' : '#f8fafc',
                      padding: '20px',
                      borderRadius: '14px',
                      color: isDark ? '#e2e8f0' : '#334155',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '260px',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.06)',
                      boxShadow: isDark ? 'inset 0 3px 12px rgba(0,0,0,0.6)' : 'inset 0 2px 8px rgba(0,0,0,0.03)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      lineHeight: 1.6,
                      margin: 0
                    }} className="custom-scroll">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '18px 28px',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.02)'
            }}>
              <button
                onClick={() => handleCopyEntireLog(selectedLog)}
                className="btn btn-secondary"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '0.85rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                  margin: 0
                }}
              >
                <Copy size={13} />
                Copy Log JSON
              </button>
              <button 
                onClick={() => setSelectedLog(null)}
                className="btn btn-primary" 
                style={{ padding: '8px 24px', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}
              >
                Close
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
        .admin-table th {
          border-bottom: 1px solid var(--border-color);
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
        .modal-close-btn {
          transition: all 0.25s ease !important;
        }
        .modal-close-btn:hover {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} !important;
          color: ${isDark ? '#fff' : '#1e293b'} !important;
          transform: scale(1.1) rotate(90deg);
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
