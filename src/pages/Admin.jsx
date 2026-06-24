import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePopup } from '../context/PopupContext';
import api from '../services/api';
import { 
  Users, 
  Lightbulb, 
  AlertTriangle, 
  Upload, 
  Clock, 
  UserMinus, 
  UserCheck, 
  Shield, 
  Check, 
  X,
  FileSpreadsheet,
  Settings,
  Train,
  MapPin,
  Calendar,
  Database,
  Ticket,
  Map,
  LayoutDashboard,
  MessageSquare,
  Activity,
  TrendingUp,
  MousePointerClick,
  Eye
} from 'lucide-react';

import { StopsAdmin } from './admin-views/StopsAdmin';
import { LookupsAdmin } from './admin-views/LookupsAdmin';
import { TrainsAdmin } from './admin-views/TrainsAdmin';
import { TripsAdmin } from './admin-views/TripsAdmin';
import { RailwayPathsAdmin } from './admin-views/RailwayPathsAdmin';
import { AdminsRolesAdmin } from './admin-views/AdminsRolesAdmin';
import { LostFoundAdmin } from './admin-views/LostFoundAdmin';
import { SystemLogsAdmin } from './admin-views/SystemLogsAdmin';
import { SystemLogArchivesAdmin } from './admin-views/SystemLogArchivesAdmin';
import { GalleryAdmin } from './admin-views/GalleryAdmin';
import UserDashboard from './admin-views/UserDashboard';
import { DashboardMapAndFeed } from './DashboardMapAndFeed';


const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const Admin = () => {
  const { t, isRTL } = useLanguage();
  const { toast, alert, confirm } = usePopup();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const activeTab = query.get('tab') || 'dashboard';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab States
  const [statsData, setStatsData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [trainSuggestionsList, setTrainSuggestionsList] = useState([]);
  const [stopSuggestionsList, setStopSuggestionsList] = useState([]);
  const [suggestionsSubTab, setSuggestionsSubTab] = useState('trains'); // 'trains' or 'stops'
  const [usersSubTab, setUsersSubTab] = useState('dashboard'); // 'list' or 'dashboard'
  const [cities, setCities] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [disruptionsList, setDisruptionsList] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [removalRequests, setRemovalRequests] = useState([]);

  // Disruption Form State
  const [dispTitleEn, setDispTitleEn] = useState('');
  const [dispTitleAr, setDispTitleAr] = useState('');
  const [dispDescEn, setDispDescEn] = useState('');
  const [dispDescAr, setDispDescAr] = useState('');
  const [dispLine, setDispLine] = useState('');
  const [submittingDisruption, setSubmittingDisruption] = useState(false);

  // Suggestion Review Modal State
  const [reviewingTrain, setReviewingTrain] = useState(null);
  const [reviewingStop, setReviewingStop] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // CSV Import State
  const [stopsCsv, setStopsCsv] = useState('');
  const [trainsCsv, setTrainsCsv] = useState('');
  const [importingStops, setImportingStops] = useState(false);
  const [importingTrains, setImportingTrains] = useState(false);

  const [settingsSubTab, setSettingsSubTab] = useState('content'); // 'content' or 'ads'

  // Ad Analytics & Dashboard State
  const [adAnalytics, setAdAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [datePreset, setDatePreset] = useState('30days'); // 'today', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [chartMetric, setChartMetric] = useState('both'); // 'impressions', 'clicks', 'both'
  const [selectedTrain, setSelectedTrain] = useState('all');
  const [trainsList, setTrainsList] = useState([]);

  const fetchAdAnalyticsData = async (sDate, eDate, trainNum) => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const res = await api.adminGetAdAnalytics(sDate, eDate, trainNum);
      if (res && res.isSuccess) {
        setAdAnalytics(res.data);
      } else {
        setAnalyticsError(res.error || 'Failed to load analytics.');
      }
    } catch (err) {
      console.error(err);
      setAnalyticsError('Failed to fetch ad analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ads-dashboard') {
      let sDate = null;
      let eDate = null;
      const today = new Date();

      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      if (datePreset === 'today') {
        sDate = formatDate(today);
        eDate = formatDate(today);
      } else if (datePreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        sDate = formatDate(d);
        eDate = formatDate(today);
      } else if (datePreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        sDate = formatDate(d);
        eDate = formatDate(today);
      } else if (datePreset === 'custom') {
        if (customStartDate) sDate = customStartDate;
        if (customEndDate) eDate = customEndDate;
      }

      fetchAdAnalyticsData(sDate, eDate, selectedTrain);
    }
  }, [activeTab, datePreset, customStartDate, customEndDate, selectedTrain]);


  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await api.getDashboardStats();
        setStatsData(res.data || null);
      } else if (activeTab === 'users' || activeTab === 'users-list') {
        const res = await api.adminGetUsers();
        setUsersList(res.data || []);
      } else if (activeTab === 'suggestions') {
        const [trainRes, stopRes, citiesRes, govsRes] = await Promise.all([
          api.adminGetPendingTrainSuggestions(),
          api.adminGetPendingStopSuggestions(),
          api.getCities(),
          api.getGovernorates()
        ]);
        setTrainSuggestionsList(trainRes.data || []);
        setStopSuggestionsList(stopRes.data || []);
        setCities(citiesRes.data || []);
        setGovernorates(govsRes.data || []);
      } else if (activeTab === 'disruptions') {
        const res = await api.getDisruptions();
        setDisruptionsList(res.data || []);

      } else if (activeTab === 'updates') {
        const pendingRes = await api.adminGetPendingLiveUpdates();
        const removalRes = await api.adminGetLiveUpdateRemovalRequests();
        setPendingUpdates(pendingRes.data || []);
        setRemovalRequests(removalRes.data || []);
      } else if (activeTab === 'settings') {
        const res = await api.adminGetSystemSettings();
        setSystemSettings(res.data || res);
      } else if (activeTab === 'ads-dashboard') {
        const res = await api.adminGetTrains();
        setTrainsList(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast(t('Failed to fetch admin data: ') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
    setUsersPage(1);
    setSuggestionsPage(1);
    fetchData();
  }, [activeTab]);

  const handleToggleSuspend = async (userId, isCurrentlySuspended) => {
    try {
      await api.adminToggleUserSuspension(userId, !isCurrentlySuspended);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: !isCurrentlySuspended } : u));
      toast(`User successfully ${!isCurrentlySuspended ? 'suspended' : 'unsuspended'}.`, 'success');
    } catch (err) {
      toast('Error updating user suspension: ' + err.message, 'error');
    }
  };

  const handleCreateDisruption = async (e) => {
    e.preventDefault();
    if (!dispTitleEn.trim() || !dispDescEn.trim()) return;

    setSubmittingDisruption(true);

    try {
      await api.adminCreateDisruption(
        dispTitleAr.trim() || dispTitleEn.trim(),
        dispTitleEn.trim(),
        dispDescAr.trim() || dispDescEn.trim(),
        dispDescEn.trim(),
        dispLine.trim() || null
      );
      toast(t('Service disruption alert created.'), 'success');
      setDispTitleEn('');
      setDispTitleAr('');
      setDispDescEn('');
      setDispDescAr('');
      setDispLine('');
      const res = await api.getDisruptions();
      setDisruptionsList(res.data || []);
    } catch (err) {
      toast(err.message || 'Failed to create disruption.', 'error');
    } finally {
      setSubmittingDisruption(false);
    }
  };

  const handleDeactivateDisruption = async (id) => {
    try {
      await api.adminDeactivateDisruption(id);
      setDisruptionsList(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
      toast(t('Service disruption deactivated.'), 'success');
    } catch (err) {
      toast('Failed to deactivate disruption: ' + err.message, 'error');
    }
  };

  const handleOpenTrainReview = (sug) => {
    setReviewingTrain({
      id: sug.id,
      trainNumber: sug.trainNumber || '',
      nameAr: sug.nameAr || '',
      nameEn: sug.nameEn || '',
      descriptionAr: sug.descriptionAr || '',
      descriptionEn: sug.descriptionEn || '',
      routeDescriptionEn: sug.routeDescriptionEn || '',
      adminNotes: sug.adminNotes || ''
    });
  };

  const handleOpenStopReview = (sug) => {
    setReviewingStop({
      id: sug.id,
      code: sug.code || '',
      nameAr: sug.nameAr || '',
      nameEn: sug.nameEn || '',
      cityId: sug.cityId || '',
      newCityNameAr: sug.newCityNameAr || '',
      newCityNameEn: sug.newCityNameEn || '',
      newCityGovernorateId: sug.newCityGovernorateId || '',
      latitude: sug.latitude !== undefined ? sug.latitude : '',
      longitude: sug.longitude !== undefined ? sug.longitude : '',
      descriptionAr: sug.descriptionAr || '',
      descriptionEn: sug.descriptionEn || '',
      adminNotes: sug.adminNotes || ''
    });
  };

  const handleReviewTrainSuggestion = async (status) => {
    if (!reviewingTrain) return;
    setSubmittingReview(true);
    try {
      await api.adminReviewTrainSuggestion(reviewingTrain.id, status, {
        trainNumber: reviewingTrain.trainNumber,
        nameAr: reviewingTrain.nameAr,
        nameEn: reviewingTrain.nameEn,
        descriptionAr: reviewingTrain.descriptionAr || null,
        descriptionEn: reviewingTrain.descriptionEn || null,
        routeDescriptionEn: reviewingTrain.routeDescriptionEn || null,
        adminNotes: reviewingTrain.adminNotes || null
      });

      if (status === 1 || status === 2) {
        setTrainSuggestionsList(prev => prev.filter(s => s.id !== reviewingTrain.id));
        toast(`Train suggestion successfully ${status === 1 ? 'approved' : 'rejected'}.`, 'success');
      } else {
        // Save Draft (status = 0)
        setTrainSuggestionsList(prev => prev.map(s => s.id === reviewingTrain.id ? { ...s, ...reviewingTrain } : s));
        toast('Train suggestion draft saved successfully.', 'success');
      }
      setReviewingTrain(null);
    } catch (err) {
      toast('Failed to review train suggestion: ' + err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewStopSuggestion = async (status) => {
    if (!reviewingStop) return;

    if (status === 1) {
      if (!reviewingStop.code.trim()) {
        toast('Stop code is required.', 'error');
        return;
      }
      if (!reviewingStop.nameEn.trim() || !reviewingStop.nameAr.trim()) {
        toast('Stop names are required.', 'error');
        return;
      }
      if (!reviewingStop.cityId && (!reviewingStop.newCityNameEn.trim() || !reviewingStop.newCityNameAr.trim() || !reviewingStop.newCityGovernorateId)) {
        toast('Please select an existing city or enter new city details.', 'error');
        return;
      }
    }

    setSubmittingReview(true);
    try {
      await api.adminReviewStopSuggestion(reviewingStop.id, status, {
        code: reviewingStop.code,
        nameAr: reviewingStop.nameAr,
        nameEn: reviewingStop.nameEn,
        cityId: reviewingStop.cityId ? reviewingStop.cityId : null,
        newCityNameAr: reviewingStop.cityId ? null : (reviewingStop.newCityNameAr || null),
        newCityNameEn: reviewingStop.cityId ? null : (reviewingStop.newCityNameEn || null),
        newCityGovernorateId: reviewingStop.cityId ? null : (reviewingStop.newCityGovernorateId || null),
        latitude: reviewingStop.latitude !== '' ? parseFloat(reviewingStop.latitude) : null,
        longitude: reviewingStop.longitude !== '' ? parseFloat(reviewingStop.longitude) : null,
        descriptionAr: reviewingStop.descriptionAr || null,
        descriptionEn: reviewingStop.descriptionEn || null,
        adminNotes: reviewingStop.adminNotes || null
      });

      if (status === 1 || status === 2) {
        setStopSuggestionsList(prev => prev.filter(s => s.id !== reviewingStop.id));
        toast(`Stop suggestion successfully ${status === 1 ? 'approved' : 'rejected'}.`, 'success');
      } else {
        // Save Draft (status = 0)
        setStopSuggestionsList(prev => prev.map(s => s.id === reviewingStop.id ? { ...s, ...reviewingStop } : s));
        toast('Stop suggestion draft saved successfully.', 'success');
      }
      setReviewingStop(null);
    } catch (err) {
      toast('Failed to review stop suggestion: ' + err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleImportStops = async () => {
    if (!stopsCsv.trim()) return;
    setImportingStops(true);
    try {
      const res = await api.adminImportStops(stopsCsv.trim());
      toast(`Imported ${res.data} stops successfully!`, 'success');
      setStopsCsv('');
    } catch (err) {
      toast(err.message || 'Failed to import stops.', 'error');
    } finally {
      setImportingStops(false);
    }
  };

  const handleImportTrains = async () => {
    if (!trainsCsv.trim()) return;
    setImportingTrains(true);
    try {
      const res = await api.adminImportTrains(trainsCsv.trim());
      toast(`Imported ${res.data} trains and schedules successfully!`, 'success');
      setTrainsCsv('');
    } catch (err) {
      toast(err.message || 'Failed to import trains.', 'error');
    } finally {
      setImportingTrains(false);
    }
  };


  const handleSaveSettings = async () => {
    if (!systemSettings) return;
    setSavingSettings(true);
    try {
      await api.adminUpdateSystemSettings(systemSettings);
      toast('System settings saved successfully.', 'success');
    } catch (err) {
      toast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveUpdate = async (id) => {
    try {
      await api.adminApproveLiveUpdate(id);
      setPendingUpdates(prev => prev.filter(u => u.id !== id));
      toast('Live update approved successfully.', 'success');
    } catch (err) {
      toast('Error approving update: ' + err.message, 'error');
    }
  };

  const handleDeleteUpdate = async (id) => {
    const isConfirmed = await confirm(t('Are you sure you want to reject and delete this update?'));
    if (!isConfirmed) return;
    try {
      await api.adminDeleteLiveUpdate(id);
      setPendingUpdates(prev => prev.filter(u => u.id !== id));
      toast('Live update rejected and deleted.', 'success');
    } catch (err) {
      toast('Error deleting update: ' + err.message, 'error');
    }
  };

  const handleConfirmRemoval = async (id) => {
    const isConfirmed = await confirm(t('Are you sure you want to confirm removal and delete this update?'));
    if (!isConfirmed) return;
    try {
      await api.adminDeleteLiveUpdate(id);
      setRemovalRequests(prev => prev.filter(u => u.id !== id));
      toast('Live update deleted successfully.', 'success');
    } catch (err) {
      toast('Error confirming removal: ' + err.message, 'error');
    }
  };

  const handleDenyRemoval = async (id) => {
    try {
      await api.adminDenyLiveUpdateRemoval(id);
      setRemovalRequests(prev => prev.filter(u => u.id !== id));
      toast('Live update removal request denied.', 'success');
    } catch (err) {
      toast('Error denying removal: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Clock className="animate-spin" size={32} color="var(--accent-primary)" />
        </div>
      ) : (
        <>
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && statsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Stats Grid */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(66, 153, 225, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Users size={24} color="#4299e1" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('totalUsers')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{statsData.totalUsers ?? 0}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(72, 187, 120, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Train size={24} color="#48bb78" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('activeTrains')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{statsData.totalTrains ?? 0}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(237, 137, 54, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Calendar size={24} color="#ed8936" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('pendingTripsToday')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{statsData.pendingTripsToday ?? 0}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(56, 178, 172, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Activity size={24} color="#38b2ac" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('runningTripsToday')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{statsData.runningTripsToday ?? 0}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(159, 122, 234, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Clock size={24} color="#9f7aea" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('liveUpdatesToday')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{statsData.totalLiveUpdatesToday ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Side-by-side Map (70%) and Passenger Live updates (30%) */}
              <DashboardMapAndFeed statsData={statsData} api={api} isRTL={isRTL} />
            </div>
          )}

          {/* USERS MANAGEMENT TAB */}
          {(activeTab === 'users' || activeTab === 'users-list' || activeTab === 'users-dashboard') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(activeTab === 'users' || activeTab === 'users-list') && (
                <>
                  <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '16px 24px' }}>{t('tableName')}</th>
                      <th style={{ padding: '16px 24px' }}>{t('tableEmail')}</th>
                      <th style={{ padding: '16px 24px' }}>{t('tableStatus')}</th>
                      <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.slice((usersPage - 1) * 10, usersPage * 10).map((usr) => (
                      <tr key={usr.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{usr.displayName}</td>
                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{usr.email}</td>
                        <td style={{ padding: '16px 24px' }}>
                          {usr.isSuspended ? (
                            <span className="badge badge-cancelled" style={{ fontSize: '0.65rem' }}>{t('suspend')}</span>
                          ) : (
                            <span className="badge badge-on-time" style={{ fontSize: '0.65rem' }}>{t('active')}</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleToggleSuspend(usr.id, usr.isSuspended)}
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: usr.isSuspended ? 'var(--success)' : 'var(--danger)', color: usr.isSuspended ? 'var(--success)' : 'var(--danger)' }}
                          >
                            {usr.isSuspended ? <UserCheck size={14} /> : <UserMinus size={14} />}
                            <span>{usr.isSuspended ? t('unsuspend') : t('suspend')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {usersList.length > 10 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setUsersPage(p => Math.max(p - 1, 1))}
                    disabled={usersPage === 1}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    {t('prev')}
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {isRTL 
                      ? `صفحة ${toArabicDigits(usersPage)} من ${toArabicDigits(Math.ceil(usersList.length / 10))}`
                      : `Page ${usersPage} of ${Math.ceil(usersList.length / 10)}`}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setUsersPage(p => Math.min(p + 1, Math.ceil(usersList.length / 10)))}
                    disabled={usersPage === Math.ceil(usersList.length / 10)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    {t('next')}
                  </button>
                </div>
              )}
            </>
          )}
          {activeTab === 'users-dashboard' && <UserDashboard />}
        </div>
      )}

          {/* TRAINS CRUD TAB */}
          {activeTab === 'trains' && <TrainsAdmin />}

          {/* TRIPS CRUD TAB */}
          {activeTab === 'trips' && <TripsAdmin />}

          {/* STOPS CRUD TAB */}
          {activeTab === 'stops' && <StopsAdmin />}

          {/* LOOKUPS CRUD TAB */}
          {activeTab === 'lookups' && <LookupsAdmin />}

          {/* LOST & FOUND MODERATION TAB */}
          {activeTab === 'lost-found' && <LostFoundAdmin />}

          {/* RAILWAY PATHS CRUD TAB */}
          {activeTab === 'railway-paths' && <RailwayPathsAdmin />}

          {/* ADMINS & ROLES TAB */}
          {activeTab === 'admins-roles' && <AdminsRolesAdmin />}

          {/* ROUTE SUGGESTIONS TAB */}
          {activeTab === 'suggestions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Sub tabs */}
              <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <button
                  onClick={() => { setSuggestionsSubTab('trains'); setSuggestionsPage(1); }}
                  className={`btn ${suggestionsSubTab === 'trains' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  🚂 {isRTL ? 'مقترحات القطارات' : 'Train Suggestions'}
                </button>
                <button
                  onClick={() => { setSuggestionsSubTab('stops'); setSuggestionsPage(1); }}
                  className={`btn ${suggestionsSubTab === 'stops' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  📍 {isRTL ? 'مقترحات المحطات' : 'Stop Suggestions'}
                </button>
              </div>

              {suggestionsSubTab === 'trains' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {trainSuggestionsList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                      {isRTL ? 'لا توجد مقترحات قطارات قيد الانتظار' : 'No pending train suggestions.'}
                    </p>
                  ) : (
                    <>
                      {trainSuggestionsList.slice((suggestionsPage - 1) * 10, suggestionsPage * 10).map((sug) => (
                        <div key={sug.id} className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '20px' }}>
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                {isRTL ? 'قطار رقم' : 'Train #'} {sug.trainNumber} - {isRTL ? sug.nameAr : sug.nameEn}
                              </span>
                              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                {isRTL ? 'قيد المراجعة' : 'Pending Review'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {isRTL ? 'بواسطة:' : 'By:'} {sug.suggestedByName || 'User'}
                              </span>
                            </div>

                            {sug.routeDescriptionEn && (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                <strong>{isRTL ? 'المسار المقترح:' : 'Suggested Route:'}</strong> {sug.routeDescriptionEn}
                              </p>
                            )}
                            
                            {(isRTL ? sug.descriptionAr : sug.descriptionEn) && (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <strong>{isRTL ? 'الوصف:' : 'Description:'}</strong> {isRTL ? sug.descriptionAr : sug.descriptionEn}
                              </p>
                            )}
                          </div>

                          <button onClick={() => handleOpenTrainReview(sug)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                            {isRTL ? 'مراجعة وتعديل' : 'Review & Edit'}
                          </button>
                        </div>
                      ))}

                      {trainSuggestionsList.length > 10 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setSuggestionsPage(p => Math.max(p - 1, 1))}
                            disabled={suggestionsPage === 1}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            {t('prev')}
                          </button>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {isRTL 
                              ? `صفحة ${toArabicDigits(suggestionsPage)} من ${toArabicDigits(Math.ceil(trainSuggestionsList.length / 10))}`
                              : `Page ${suggestionsPage} of ${Math.ceil(trainSuggestionsList.length / 10)}`}
                          </span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setSuggestionsPage(p => Math.min(p + 1, Math.ceil(trainSuggestionsList.length / 10)))}
                            disabled={suggestionsPage === Math.ceil(trainSuggestionsList.length / 10)}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            {t('next')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {suggestionsSubTab === 'stops' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {stopSuggestionsList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                      {isRTL ? 'لا توجد مقترحات محطات قيد الانتظار' : 'No pending stop suggestions.'}
                    </p>
                  ) : (
                    <>
                      {stopSuggestionsList.slice((suggestionsPage - 1) * 10, suggestionsPage * 10).map((sug) => (
                        <div key={sug.id} className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '20px' }}>
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                {isRTL ? 'محطة:' : 'Stop:'} {isRTL ? sug.nameAr : sug.nameEn} ({sug.code})
                              </span>
                              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                {isRTL ? 'قيد المراجعة' : 'Pending Review'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {isRTL ? 'بواسطة:' : 'By:'} {sug.suggestedByName || 'User'}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              <strong>{isRTL ? 'المدينة:' : 'City:'}</strong>{' '}
                              {sug.cityId
                                ? (isRTL ? sug.cityNameAr : sug.cityNameEn)
                                : `${isRTL ? sug.newCityNameAr : sug.newCityNameEn} (${isRTL ? 'مدينة جديدة' : 'New City'})`}
                            </p>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              <strong>{isRTL ? 'الإحداثيات:' : 'Coordinates:'}</strong> Lat: {sug.latitude}, Long: {sug.longitude}
                            </p>

                            {(isRTL ? sug.descriptionAr : sug.descriptionEn) && (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <strong>{isRTL ? 'الوصف:' : 'Description:'}</strong> {isRTL ? sug.descriptionAr : sug.descriptionEn}
                              </p>
                            )}
                          </div>

                          <button onClick={() => handleOpenStopReview(sug)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                            {isRTL ? 'مراجعة وتعديل' : 'Review & Edit'}
                          </button>
                        </div>
                      ))}

                      {stopSuggestionsList.length > 10 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setSuggestionsPage(p => Math.max(p - 1, 1))}
                            disabled={suggestionsPage === 1}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            {t('prev')}
                          </button>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {isRTL 
                              ? `صفحة ${toArabicDigits(suggestionsPage)} من ${toArabicDigits(Math.ceil(stopSuggestionsList.length / 10))}`
                              : `Page ${suggestionsPage} of ${Math.ceil(stopSuggestionsList.length / 10)}`}
                          </span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setSuggestionsPage(p => Math.min(p + 1, Math.ceil(stopSuggestionsList.length / 10)))}
                            disabled={suggestionsPage === Math.ceil(stopSuggestionsList.length / 10)}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            {t('next')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SERVICE ALERTS TAB */}
          {activeTab === 'disruptions' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '16px' }}>{t('activeDisruptions')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {disruptionsList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('noUpdatesFeed')}</p>
                  ) : (
                    disruptionsList.map((alert) => (
                      <div 
                        key={alert.id} 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '10px', 
                          border: `1px solid ${alert.isActive ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`,
                          background: alert.isActive ? 'var(--danger-glow)' : 'rgba(120,120,120,0.01)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {isRTL ? alert.titleAr : alert.titleEn} {alert.affectedLine && <span style={{ color: 'var(--warning)', marginInlineStart: '8px' }}>Line {alert.affectedLine}</span>}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {isRTL ? alert.descriptionAr : alert.descriptionEn}
                          </p>
                        </div>
                        {alert.isActive ? (
                          <button onClick={() => handleDeactivateDisruption(alert.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
                            {t('deactivate')}
                          </button>
                        ) : (
                          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{t('deactivated')}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '16px' }}>{t('createServiceAlert')}</h3>
                <form onSubmit={handleCreateDisruption}>
                  <div className="form-group">
                    <label>{t('title')} (En)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Cairo-Alex Line Delay" 
                      value={dispTitleEn}
                      onChange={(e) => setDispTitleEn(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('title')} (Ar)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="تأخيرات خط القاهرة" 
                      value={dispTitleAr}
                      onChange={(e) => setDispTitleAr(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('desc')} (En)</label>
                    <textarea 
                      className="input-field" 
                      rows="2" 
                      placeholder="Expected delay time..." 
                      value={dispDescEn}
                      onChange={(e) => setDispDescEn(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label>{t('desc')} (Ar)</label>
                    <textarea 
                      className="input-field" 
                      rows="2" 
                      placeholder="الوصف باللغة العربية..." 
                      value={dispDescAr}
                      onChange={(e) => setDispDescAr(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label>{t('affectedLineOpt')}</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Train 980" 
                      value={dispLine}
                      onChange={(e) => setDispLine(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-danger" style={{ width: '100%' }} disabled={submittingDisruption || !dispTitleEn.trim()}>
                    {submittingDisruption ? t('loading') : t('postAlert')}
                  </button>
                </form>
              </div>
            </div>
          )}


          {/* LIVE UPDATES MODERATION TAB */}
          {activeTab === 'updates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Pending Approval Section */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '16px' }}>{t('pendingApproval')}</h3>
                {pendingUpdates.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('noPendingUpdates')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingUpdates.map((upd) => (
                      <div 
                        key={upd.id} 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '10px', 
                          border: '1px solid var(--border-color)',
                          background: 'rgba(120,120,120,0.01)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            Train #{upd.trainNumber} ({upd.tripDate}) - By: {upd.authorName}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {upd.content}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            {upd.statusTag && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{upd.statusTag}</span>}
                            {upd.crowdState && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{upd.crowdState}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleDeleteUpdate(upd.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
                            {t('reject')}
                          </button>
                          <button onClick={() => handleApproveUpdate(upd.id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', borderColor: 'var(--success)' }}>
                            {t('approve')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Removal Requests Section */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '16px' }}>{t('removalRequests')}</h3>
                {removalRequests.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('noRemovalRequests')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {removalRequests.map((upd) => (
                      <div 
                        key={upd.id} 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '10px', 
                          border: '1px solid rgba(239,68,68,0.2)',
                          background: 'var(--danger-glow)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            Train #{upd.trainNumber} ({upd.tripDate}) - By: {upd.authorName}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {upd.content}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            {upd.statusTag && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{upd.statusTag}</span>}
                            {upd.crowdState && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{upd.crowdState}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleDenyRemoval(upd.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                            {t('denyRemoval')}
                          </button>
                          <button onClick={() => handleConfirmRemoval(upd.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                            {t('confirmRemoval')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ADS ANALYTICS DASHBOARD TAB */}
          {activeTab === 'ads-dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', width: '100%' }}>
              {/* Google Ads Monitoring Dashboard Header */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={22} color="var(--accent-primary)" /> {t('adsDashboard')}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Monitor Google Ads metrics and performance.
                  </p>
                </div>

                {/* Train DDL and Date Filters (Separate Row) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {/* Train Filter Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {isRTL ? 'القطار:' : 'Train:'}
                    </span>
                    <select
                      value={selectedTrain}
                      onChange={(e) => setSelectedTrain(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--panel-bg)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <option value="all">{isRTL ? 'كل القطارات' : 'All Trains'}</option>
                      {trainsList.map(train => (
                        <option key={train.id} value={train.trainNumber}>
                          {train.trainNumber} - {isRTL ? train.nameAr : train.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Presets */}
                  <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
                    {[
                      { id: 'today', label: t('today') },
                      { id: '7days', label: t('last7days') },
                      { id: '30days', label: t('last30days') },
                      { id: 'custom', label: t('customRange') }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setDatePreset(preset.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          border: 'none',
                          borderRadius: '6px',
                          background: datePreset === preset.id ? 'var(--accent-primary)' : 'transparent',
                          color: datePreset === preset.id ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {datePreset === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
                      />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Loading/Error banner */}
              {analyticsError && (
                <div style={{ color: 'var(--danger)', background: 'var(--danger-glow)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}>
                  {analyticsError}
                </div>
              )}

              {/* Summary Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Eye size={24} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('impressions')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {analyticsLoading ? '...' : (adAnalytics?.summary?.totalImpressions ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(237, 137, 54, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <MousePointerClick size={24} color="#ed8936" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('adsClicked')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {analyticsLoading ? '...' : (adAnalytics?.summary?.totalClicks ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <TrendingUp size={24} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('ctr')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {analyticsLoading ? '...' : `${adAnalytics?.summary?.ctr ?? 0}%`}
                      {!analyticsLoading && (adAnalytics?.summary?.ctr ?? 0) > 0 && (
                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '1px 6px' }}>
                          Good
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <Users size={24} color="#8b5cf6" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('uniqueReach')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {analyticsLoading ? '...' : (adAnalytics?.summary?.uniqueUsers ?? 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Trend Chart */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('dailyTrend')}</h4>
                  
                  {/* Chart Metric Filter Toggles */}
                  <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
                    {[
                      { id: 'both', label: 'Both' },
                      { id: 'impressions', label: 'Impressions' },
                      { id: 'clicks', label: 'Clicks' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setChartMetric(opt.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.65rem',
                          border: 'none',
                          borderRadius: '4px',
                          background: chartMetric === opt.id ? 'var(--accent-primary)' : 'transparent',
                          color: chartMetric === opt.id ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Render SVG */}
                {analyticsLoading ? (
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock className="animate-spin" size={24} color="var(--accent-primary)" />
                  </div>
                ) : adAnalytics?.dailyTrend?.length > 0 ? (
                  (() => {
                    const trendData = adAnalytics.dailyTrend;
                    const maxImp = Math.max(...trendData.map(t => t.impressions), 1);
                    const maxClk = Math.max(...trendData.map(t => t.clicks), 1);
                    const maxOverall = Math.max(maxImp, maxClk);

                    const pointsImp = trendData.map((item, idx) => {
                      const x = idx * (380 / (trendData.length - 1 || 1)) + 45;
                      const y = 180 - (item.impressions / maxOverall) * 140;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    const pointsClk = trendData.map((item, idx) => {
                      const x = idx * (380 / (trendData.length - 1 || 1)) + 45;
                      const y = 180 - (item.clicks / maxOverall) * 140;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return (
                      <svg viewBox="0 0 450 220" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                        {/* Grid lines */}
                        <line x1="45" y1="40" x2="425" y2="40" stroke="rgba(200, 200, 200, 0.35)" strokeDasharray="3,3" />
                        <line x1="45" y1="110" x2="425" y2="110" stroke="rgba(200, 200, 200, 0.35)" strokeDasharray="3,3" />
                        <line x1="45" y1="180" x2="425" y2="180" stroke="rgba(200, 200, 200, 0.5)" />

                        {/* Vertical grid lines */}
                        {trendData.map((item, idx) => {
                          const isHourly = trendData.length > 0 && trendData[0].date.length > 10;
                          const showGrid = isHourly
                            ? (idx % 6 === 0 || idx === trendData.length - 1)
                            : (idx === 0 || idx === Math.floor(trendData.length / 2) || idx === trendData.length - 1);
                          if (!showGrid) return null;
                          const x = idx * (380 / (trendData.length - 1 || 1)) + 45;
                          return (
                            <line 
                              key={`v-grid-${idx}`} 
                              x1={x} 
                              y1="40" 
                              x2={x} 
                              y2="180" 
                              stroke="rgba(200, 200, 200, 0.35)" 
                              strokeDasharray="3,3" 
                            />
                          );
                        })}

                        {/* Y Axis text values */}
                        <text x="35" y="44" fill="var(--text-secondary)" fontSize="8" textAnchor="end">{maxOverall}</text>
                        <text x="35" y="114" fill="var(--text-secondary)" fontSize="8" textAnchor="end">{Math.round(maxOverall / 2)}</text>
                        <text x="35" y="184" fill="var(--text-secondary)" fontSize="8" textAnchor="end">0</text>

                        {/* Paths */}
                        {(chartMetric === 'both' || chartMetric === 'impressions') && (
                          <path d={pointsImp} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {(chartMetric === 'both' || chartMetric === 'clicks') && (
                          <path d={pointsClk} fill="none" stroke="#ed8936" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        )}

                        {/* Dots & Labels */}
                        {trendData.map((item, idx) => {
                          const x = idx * (380 / (trendData.length - 1 || 1)) + 45;
                          const yImp = 180 - (item.impressions / maxOverall) * 140;
                          const yClk = 180 - (item.clicks / maxOverall) * 140;

                          return (
                            <g key={idx}>
                              {(chartMetric === 'both' || chartMetric === 'impressions') && (
                                <circle cx={x} cy={yImp} r="4" fill="var(--accent-primary)" stroke="#ffffff" strokeWidth="1.5" style={{ cursor: 'pointer' }}>
                                  <title>{`Date: ${item.date}\nImpressions: ${item.impressions}`}</title>
                                </circle>
                              )}
                              {(chartMetric === 'both' || chartMetric === 'clicks') && (
                                <circle cx={x} cy={yClk} r="4" fill="#ed8936" stroke="#ffffff" strokeWidth="1.5" style={{ cursor: 'pointer' }}>
                                  <title>{`Date: ${item.date}\nClicks: ${item.clicks}`}</title>
                                </circle>
                              )}
                              {/* Date labels on X axis */}
                              {(() => {
                                const isHourly = trendData.length > 0 && trendData[0].date.length > 10;
                                const showLabel = isHourly
                                  ? (idx % 6 === 0 || idx === trendData.length - 1)
                                  : (idx === 0 || idx === Math.floor(trendData.length / 2) || idx === trendData.length - 1);
                                if (!showLabel) return null;
                                const labelToShow = isHourly ? item.date.split(' ')[1] : item.date.substring(5);
                                return (
                                  <text x={x} y="200" fill="var(--text-secondary)" fontSize="8" textAnchor="middle">
                                    {labelToShow}
                                  </text>
                                );
                              })()}
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()
                ) : (
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No trend data available for this range.
                  </div>
                )}
              </div>

              {/* Page Breakdown List Table */}
              <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Page / Placement Performance Breakdown
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <th style={{ padding: '12px 16px' }}>{t('screenName')}</th>
                      <th style={{ padding: '12px 16px' }}>{t('impressions')}</th>
                      <th style={{ padding: '12px 16px' }}>{t('adsClicked')}</th>
                      <th style={{ padding: '12px 16px' }}>{t('ctr')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const pages = [
                        { key: 'dashboard', label: t('pageDashboard') },
                        { key: 'search', label: t('pageSearch') },
                        { key: 'tripDetails', label: t('pageTripDetails') },
                        { key: 'trainDetails', label: t('pageTrainDetails') },
                        { key: 'lostFound', label: t('pageLostFound') },
                        { key: 'suggestions', label: t('pageSuggestions') },
                        { key: 'profile', label: t('pageProfile') }
                      ];

                      return pages.map(p => {
                        const stats = adAnalytics?.pageBreakdown?.find(pb => pb.screenId === p.key);
                        const impressionsCount = stats?.impressions ?? 0;
                        const clicksCount = stats?.clicks ?? 0;
                        const clickThroughRate = stats?.ctr ?? 0;

                        return (
                          <tr key={p.key} style={{ borderBottom: '1px solid rgba(120, 120, 120, 0.02)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{impressionsCount}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{clicksCount}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span 
                                className="badge" 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  padding: '2px 8px', 
                                  background: clickThroughRate > 10 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                                  color: clickThroughRate > 10 ? '#10b981' : 'var(--text-secondary)'
                                }}
                              >
                                {clickThroughRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', width: '100%' }}>
              {/* Sub-menu Tabs */}
              <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <button
                  onClick={() => setSettingsSubTab('content')}
                  className={`btn ${settingsSubTab === 'content' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', background: settingsSubTab === 'content' ? 'var(--accent-primary)' : 'transparent', margin: 0 }}
                >
                  <Settings size={16} />{t('contentModerationSubTab')}
                </button>
                <button
                  onClick={() => setSettingsSubTab('ads')}
                  className={`btn ${settingsSubTab === 'ads' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', background: settingsSubTab === 'ads' ? 'var(--accent-primary)' : 'transparent', margin: 0 }}
                >
                  <TrendingUp size={16} />{t('adManagementSubTab')}
                </button>
              </div>

              {settingsSubTab === 'content' && (
                <>
                  <div className="glass-panel" style={{ padding: '28px' }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Settings size={20} color="var(--accent-primary)" /> Content Moderation
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                      Control which types of user-generated content are published immediately versus held for review.
                    </p>

                    {systemSettings && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {[
                          {
                            key: 'lostFoundPostAutoPublish',
                            label: 'Lost & Found Auto-Publish',
                            desc: 'When enabled, new Lost & Found posts appear immediately without admin approval.',
                            value: systemSettings.lostFoundPostAutoPublish ?? systemSettings.LostFoundPostAutoPublish,
                            onChange: (v) => setSystemSettings(s => ({ ...s, lostFoundPostAutoPublish: v, LostFoundPostAutoPublish: v }))
                          },
                          {
                            key: 'lostFoundCommentAutoPublish',
                            label: 'Lost & Found Comments Auto-Publish',
                            desc: 'When enabled, comments on Lost & Found posts are published immediately.',
                            value: systemSettings.lostFoundCommentAutoPublish ?? systemSettings.LostFoundCommentAutoPublish,
                            onChange: (v) => setSystemSettings(s => ({ ...s, lostFoundCommentAutoPublish: v, LostFoundCommentAutoPublish: v }))
                          },
                          {
                            key: 'tripLiveUpdateAutoPublish',
                            label: 'Trip Live Updates Auto-Publish',
                            desc: 'When enabled, crowdsourced live updates from passengers are published immediately.',
                            value: systemSettings.tripLiveUpdateAutoPublish ?? systemSettings.TripLiveUpdateAutoPublish,
                            onChange: (v) => setSystemSettings(s => ({ ...s, tripLiveUpdateAutoPublish: v, TripLiveUpdateAutoPublish: v }))
                          },
                          {
                            key: 'tripLiveUpdateRemovalAutoApprove',
                            label: 'Auto-Approve Removal Requests',
                            desc: 'When enabled, a user\'s own "remove post" request is immediately processed. When disabled, the request is queued and requires admin approval.',
                            value: systemSettings.tripLiveUpdateRemovalAutoApprove ?? systemSettings.TripLiveUpdateRemovalAutoApprove,
                            onChange: (v) => setSystemSettings(s => ({ ...s, tripLiveUpdateRemovalAutoApprove: v, TripLiveUpdateRemovalAutoApprove: v }))
                          }
                        ].map(item => (
                          <label
                            key={item.key}
                            style={{
                              display: 'flex',
                              alignItems: 'start',
                              gap: '16px',
                              cursor: 'pointer',
                              padding: '16px',
                              borderRadius: '10px',
                              border: `1px solid ${item.value ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                              background: item.value ? 'rgba(59,130,246,0.05)' : 'rgba(120,120,120,0.02)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                              <input
                                type="checkbox"
                                checked={item.value || false}
                                onChange={(e) => item.onChange(e.target.checked)}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                              />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '4px' }}>{item.label}</div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600, width: 'fit-content' }}
                    disabled={savingSettings || !systemSettings}
                  >
                    {savingSettings ? 'Saving...' : '💾 Save Settings'}
                  </button>
                </>
              )}

              {settingsSubTab === 'ads' && (
                <>
                  <div className="glass-panel" style={{ padding: '28px' }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TrendingUp size={20} color="var(--accent-primary)" /> {t('adPlacementManagement')}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                      {t('adManagementDesc')}
                    </p>

                    {systemSettings && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {[
                          { key: 'dashboard', label: t('pageDashboard') },
                          { key: 'search', label: t('pageSearch') },
                          { key: 'tripDetails', label: t('pageTripDetails') },
                          { key: 'trainDetails', label: t('pageTrainDetails') },
                          { key: 'lostFound', label: t('pageLostFound') },
                          { key: 'suggestions', label: t('pageSuggestions') },
                          { key: 'profile', label: t('pageProfile') }
                        ].map(page => {
                          let enabledPages = {};
                          try {
                            enabledPages = JSON.parse(systemSettings.adsEnabledPages || systemSettings.AdsEnabledPages || '{}');
                          } catch (e) {
                            enabledPages = {};
                          }
                          const value = !!enabledPages[page.key];

                          return (
                            <label
                              key={page.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                padding: '16px',
                                borderRadius: '10px',
                                border: `1px solid ${value ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                                background: value ? 'rgba(59,130,246,0.05)' : 'rgba(120,120,120,0.02)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{page.label}</span>
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updated = { ...enabledPages, [page.key]: checked };
                                  const jsonStr = JSON.stringify(updated);
                                  setSystemSettings(s => ({
                                    ...s,
                                    adsEnabledPages: jsonStr,
                                    AdsEnabledPages: jsonStr
                                  }));
                                }}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600, width: 'fit-content' }}
                    disabled={savingSettings || !systemSettings}
                  >
                    {savingSettings ? 'Saving...' : '💾 ' + t('save')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* SYSTEM LOGS TAB */}
          {activeTab === 'system-logs' && (
            <SystemLogsAdmin />
          )}

          {/* SYSTEM LOG ARCHIVES TAB */}
          {activeTab === 'system-log-archives' && (
            <SystemLogArchivesAdmin />
          )}

          {/* PHOTO GALLERY TAB */}
          {activeTab === 'gallery' && (
            <GalleryAdmin />
          )}
        </>
      )}

      {/* Review Train Suggestion Modal */}
      {reviewingTrain && (
        <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                {isRTL ? 'مراجعة مقترح القطار' : 'Review Train Suggestion'} #{reviewingTrain.trainNumber}
              </h3>
              <button onClick={() => setReviewingTrain(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>{isRTL ? 'رقم القطار' : 'Train Number'}</label>
                <input
                  type="text"
                  className="input-field"
                  value={reviewingTrain.trainNumber}
                  onChange={(e) => setReviewingTrain({ ...reviewingTrain, trainNumber: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم (بالإنجليزي)' : 'Name (English)'}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={reviewingTrain.nameEn}
                    onChange={(e) => setReviewingTrain({ ...reviewingTrain, nameEn: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم (بالعربي)' : 'Name (Arabic)'}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={reviewingTrain.nameAr}
                    onChange={(e) => setReviewingTrain({ ...reviewingTrain, nameAr: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف (بالإنجليزي)' : 'Description (English)'}</label>
                  <textarea
                    className="input-field"
                    rows="2"
                    value={reviewingTrain.descriptionEn}
                    onChange={(e) => setReviewingTrain({ ...reviewingTrain, descriptionEn: e.target.value })}
                    style={{ resize: 'none' }}
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف (بالعربي)' : 'Description (Arabic)'}</label>
                  <textarea
                    className="input-field"
                    rows="2"
                    value={reviewingTrain.descriptionAr}
                    onChange={(e) => setReviewingTrain({ ...reviewingTrain, descriptionAr: e.target.value })}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  {isRTL ? 'مسار المحطات المقترحة (مفصولة بـ " -> ")' : 'Suggested Route Stops (separated by " -> ")'}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={reviewingTrain.routeDescriptionEn}
                  onChange={(e) => setReviewingTrain({ ...reviewingTrain, routeDescriptionEn: e.target.value })}
                  placeholder="e.g. Cairo -> Tanta -> Alexandria"
                />
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  {isRTL
                    ? 'سيقوم النظام بالبحث عن المحطات حسب أسمائها الإنجليزية وربطها بالترتيب.'
                    : 'System will match stops by their English names and link them in sequence.'}
                </small>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'ملاحظات المراجعة (أو سبب الرفض)' : 'Moderation / Admin Notes'}</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={reviewingTrain.adminNotes}
                  onChange={(e) => setReviewingTrain({ ...reviewingTrain, adminNotes: e.target.value })}
                  placeholder={isRTL ? 'اكتب ملاحظاتك هنا...' : 'Type feedback reason...'}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => handleReviewTrainSuggestion(2)}
                className="btn btn-danger"
                disabled={submittingReview}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <X size={16} /> {isRTL ? 'رفض وازالة' : 'Reject'}
              </button>
              
              <button
                onClick={() => handleReviewTrainSuggestion(0)}
                className="btn btn-secondary"
                disabled={submittingReview}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
              >
                💾 {isRTL ? 'حفظ كمسودة' : 'Save Draft'}
              </button>

              <button
                onClick={() => handleReviewTrainSuggestion(1)}
                className="btn btn-primary"
                disabled={submittingReview}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--success)', borderColor: 'var(--success)' }}
              >
                <Check size={16} /> {isRTL ? 'موافقة واعتماد' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Stop Suggestion Modal */}
      {reviewingStop && (
        <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                {isRTL ? 'مراجعة مقترح المحطة' : 'Review Stop Suggestion'} ({reviewingStop.code || 'NEW'})
              </h3>
              <button onClick={() => setReviewingStop(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{isRTL ? 'رمز المحطة' : 'Stop Code'}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={reviewingStop.code}
                    onChange={(e) => setReviewingStop({ ...reviewingStop, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم (بالإنجليزي)' : 'Name (English)'}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={reviewingStop.nameEn}
                    onChange={(e) => setReviewingStop({ ...reviewingStop, nameEn: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'الاسم (بالعربي)' : 'Name (Arabic)'}</label>
                <input
                  type="text"
                  className="input-field"
                  value={reviewingStop.nameAr}
                  onChange={(e) => setReviewingStop({ ...reviewingStop, nameAr: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{isRTL ? 'خط العرض' : 'Latitude'}</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field"
                    value={reviewingStop.latitude}
                    onChange={(e) => setReviewingStop({ ...reviewingStop, latitude: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'خط الطول' : 'Longitude'}</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field"
                    value={reviewingStop.longitude}
                    onChange={(e) => setReviewingStop({ ...reviewingStop, longitude: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'المدينة' : 'City'}</label>
                <select
                  className="input-field"
                  value={reviewingStop.cityId || 'new'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReviewingStop({
                      ...reviewingStop,
                      cityId: val === 'new' ? '' : val
                    });
                  }}
                >
                  <option value="new" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                    ✨ {isRTL ? 'إضافة مدينة جديدة...' : 'Add New City...'}
                  </option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>
                      {isRTL ? c.nameAr : c.nameEn} ({isRTL ? c.governorateAr || c.governorateNameAr : c.governorateEn || c.governorateNameEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* New City form if cityId is empty/new */}
              {(!reviewingStop.cityId) && (
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                    📌 {isRTL ? 'تفاصيل المدينة الجديدة' : 'New City Details'}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>{isRTL ? 'اسم المدينة (En)' : 'City Name (En)'}</label>
                      <input
                        type="text"
                        className="input-field"
                        value={reviewingStop.newCityNameEn || ''}
                        onChange={(e) => setReviewingStop({ ...reviewingStop, newCityNameEn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>{isRTL ? 'اسم المدينة (Ar)' : 'City Name (Ar)'}</label>
                      <input
                        type="text"
                        className="input-field"
                        value={reviewingStop.newCityNameAr || ''}
                        onChange={(e) => setReviewingStop({ ...reviewingStop, newCityNameAr: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{isRTL ? 'المحافظة' : 'Governorate'}</label>
                    <select
                      className="input-field"
                      value={reviewingStop.newCityGovernorateId || ''}
                      onChange={(e) => setReviewingStop({ ...reviewingStop, newCityGovernorateId: e.target.value })}
                      required
                    >
                      <option value="">-- {isRTL ? 'اختر محافظة' : 'Select Governorate'} --</option>
                      {governorates.map(g => (
                        <option key={g.id} value={g.id}>
                          {isRTL ? g.nameAr : g.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف (En)' : 'Description (En)'}</label>
                  <textarea
                    className="input-field"
                    rows="2"
                    value={reviewingStop.descriptionEn}
                    onChange={(e) => setReviewingStop({ ...reviewingStop, descriptionEn: e.target.value })}
                    style={{ resize: 'none' }}
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف (Ar)' : 'Description (Ar)'}</label>
                  <textarea
                    className="input-field"
                    rows="2"
                    value={reviewingStop.descriptionAr}
                    onChange={(e) => setReviewingStop({ ...reviewingStop, descriptionAr: e.target.value })}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'ملاحظات المراجعة (أو سبب الرفض)' : 'Moderation / Admin Notes'}</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={reviewingStop.adminNotes}
                  onChange={(e) => setReviewingStop({ ...reviewingStop, adminNotes: e.target.value })}
                  placeholder={isRTL ? 'اكتب ملاحظاتك هنا...' : 'Type feedback reason...'}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => handleReviewStopSuggestion(2)}
                className="btn btn-danger"
                disabled={submittingReview}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <X size={16} /> {isRTL ? 'رفض وازالة' : 'Reject'}
              </button>

              <button
                onClick={() => handleReviewStopSuggestion(0)}
                className="btn btn-secondary"
                disabled={submittingReview}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
              >
                💾 {isRTL ? 'حفظ كمسودة' : 'Save Draft'}
              </button>

              <button
                onClick={() => handleReviewStopSuggestion(1)}
                className="btn btn-primary"
                disabled={submittingReview}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--success)', borderColor: 'var(--success)' }}
              >
                <Check size={16} /> {isRTL ? 'موافقة واعتماد' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
