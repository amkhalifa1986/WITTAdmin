import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import signalrService from '../services/signalrService';
import { 
  User as UserIcon, 
  LogOut, 
  AlertTriangle,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  Users,
  Lightbulb,
  Clock,
  Settings,
  Train,
  MapPin,
  Calendar,
  Database,
  Map,
  LayoutDashboard,
  MessageSquare,
  Shield,
  TrendingUp,
  Terminal,
  Archive,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Image
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const hasPermission = (moduleName, permissionType = 'canView') => {
    if (!user) return false;
    if (user.isSuperAdmin || user.IsSuperAdmin) return true;
    if (!user.privileges) return false;
    const priv = user.privileges.find(p => p.module.toLowerCase() === moduleName.toLowerCase());
    if (!priv) return false;
    const key = permissionType;
    const pascalKey = permissionType.charAt(0).toUpperCase() + permissionType.slice(1);
    return !!(priv[key] || priv[pascalKey]);
  };

  const getActiveTab = () => {
    if (location.pathname === '/') {
      return new URLSearchParams(location.search).get('tab') || 'dashboard';
    }
    if (location.pathname.startsWith('/edit-train') || location.pathname.startsWith('/train/')) {
      return 'trains';
    }
    if (location.pathname.startsWith('/edit-trip') || location.pathname.startsWith('/trip/')) {
      return 'trips';
    }
    if (location.pathname.startsWith('/edit-stop')) {
      return 'stops';
    }
    return '';
  };
  const activeTab = getActiveTab();
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [isSystemLogsMenuOpen, setIsSystemLogsMenuOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'users-dashboard' || activeTab === 'users-list' || activeTab === 'users') setIsUsersMenuOpen(true);
    if (activeTab === 'system-logs' || activeTab === 'system-log-archives') setIsSystemLogsMenuOpen(true);
  }, [activeTab]);

  const [disruptions, setDisruptions] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const fetchDisruptions = async () => {
      try {
        const res = await api.getDisruptions();
        if (res.data) {
          setDisruptions(res.data.filter(d => d.isActive));
        }
      } catch (err) {
        console.error('Failed to fetch disruptions:', err);
      }
    };
    fetchDisruptions();
    const interval = setInterval(fetchDisruptions, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();

    const initHub = async () => {
      try {
        await signalrService.connect();
      } catch (err) {
        console.error('SignalR connection failed:', err);
      }
    };
    initHub();

    const unsubscribe = signalrService.registerNotificationListener((newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    if (!profileDropdownOpen && !notificationsOpen) return;
    
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.user-menu-container') && !e.target.closest('.notifications-menu-container')) {
        setProfileDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [profileDropdownOpen, notificationsOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user && (user.role === 1 || user.role === 'Admin');

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="top-navbar">
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <img 
            src={isDark ? "/logo-light.png" : "/logo-dark.png"} 
            alt="WITT logo" 
            style={{ width: '50px', height: '50px', objectFit: 'contain' }} 
          />
          <span>{t('appName')}</span>
        </div>

        {/* Desktop Navigation Links Removed */}

        {/* Action Controls & User Dropdown */}
        <div className="navbar-actions">
          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme} 
            className="navbar-btn" 
            title={t('Toggle Theme')}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage} 
            className="navbar-btn lang-btn" 
            title={t('Change Language')}
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>

          {/* Notifications Dropdown (between language switcher and profile) */}
          {user && (
            <div className="notifications-menu-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationsOpen(!notificationsOpen);
                  setProfileDropdownOpen(false);
                }} 
                className="navbar-btn" 
                title={t('Notifications')}
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 6px #ef4444'
                  }}></span>
                )}
              </button>

              {notificationsOpen && (
                <div 
                  className="notifications-dropdown glass-panel" 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: isRTL ? 'auto' : '0',
                    left: isRTL ? '0' : 'auto',
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {t('notifications') || 'Notifications'}
                    </span>
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await api.markAllNotificationsAsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          } catch (err) {
                            console.error('Failed to mark all as read:', err);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {t('markAllRead') || 'Mark all read'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {t('noNotifications') || 'No notifications yet'}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              if (!n.isRead) {
                                await api.markNotificationAsRead(n.id);
                                setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                              }
                              setNotificationsOpen(false);
                              if (n.link) {
                                navigate(n.link);
                              }
                            } catch (err) {
                              console.error('Failed to process notification click:', err);
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                            borderLeft: n.isRead ? 'none' : '3px solid var(--accent-primary)',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            textAlign: isRTL ? 'right' : 'left'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)'; }}
                        >
                          <span style={{ fontSize: '0.8rem', color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: n.isRead ? 400 : 600 }}>
                            {n.message}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {n.createdAt && !isNaN(new Date(n.createdAt).getTime()) 
                              ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop User profile dropdown */}
          {user && (
            <div className="user-menu-container desktop-only">
              <div 
                className="user-profile-trigger" 
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileDropdownOpen(!profileDropdownOpen);
                }}
              >
                {user.avatarUrl ? (
                  <img src={api.resolveImageUrl(user.avatarUrl)} alt={user.displayName} className="navbar-avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="navbar-avatar">
                    {getInitials(user.displayName)}
                  </div>
                )}
                <span className="navbar-username">{user.displayName}</span>
              </div>

              {profileDropdownOpen && (
                <div className="profile-dropdown glass-panel">
                  <div className="dropdown-user-info">
                    <span className="dropdown-name">{user.displayName}</span>
                    <span className="dropdown-role">{isAdmin ? t('adminPanel') : t('following')}</span>
                  </div>
                  <Link to="/profile" className="dropdown-link">
                    <UserIcon size={16} />
                    <span>{t('myProfile')}</span>
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="dropdown-logout"
                  >
                    <LogOut size={16} />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button 
            className="navbar-btn mobile-header-toggle" 
            style={{ display: 'none' }}
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Overlay Panel */}
      {mobileMenuOpen && (
        <div className="mobile-nav-panel">
          <ul className="mobile-menu-links">

            {user && (
              <li className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
                <Link to="/profile">
                  <UserIcon size={18} />
                  <span>{t('myProfile')}</span>
                </Link>
              </li>
            )}
          </ul>

          {user && (
            <>
              <div className="mobile-user-block">
                {user.avatarUrl ? (
                  <img src={api.resolveImageUrl(user.avatarUrl)} alt={user.displayName} className="navbar-avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="navbar-avatar">
                    {getInitials(user.displayName)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.displayName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {isAdmin ? t('adminPanel') : t('following')}
                  </div>
                </div>
              </div>

              <button onClick={handleLogout} className="mobile-logout-btn">
                <LogOut size={16} />
                <span>{t('signOut')}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {/* Active Service Disruptions Alert Ticker */}
        {disruptions.length > 0 && (
          <div className="disruption-banner animate-fade" style={{ marginTop: '0px' }}>
            <span className="disruption-badge">Alert</span>
            <div className="disruption-ticker">
              <div className="disruption-marquee" style={{ display: 'inline-block', paddingLeft: '100%', animation: 'marquee 25s linear infinite' }}>
                {disruptions.map((disruption, idx) => (
                  <span key={disruption.id} style={{ marginRight: '50px' }}>
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom', color: 'var(--warning)' }} />
                    <strong>{isRTL ? disruption.titleAr : disruption.titleEn} (Line {disruption.affectedLine || 'All'}):</strong> {isRTL ? disruption.descriptionAr : disruption.descriptionEn}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '32px', flexGrow: 1, alignItems: 'stretch' }}>
          {user && (
            <aside style={{ 
              width: '250px', 
              flexShrink: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              borderRight: isRTL ? 'none' : '1px solid var(--border-color)', 
              borderLeft: isRTL ? '1px solid var(--border-color)' : 'none', 
              paddingRight: isRTL ? '0' : '24px', 
              paddingLeft: isRTL ? '24px' : '0' 
            }}>
              {hasPermission('Dashboard') && (
                <button onClick={() => navigate('/?tab=dashboard')} className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'dashboard' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <LayoutDashboard size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('dashboard')}</span>
                </button>
              )}
              {hasPermission('Users') && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <button onClick={() => setIsUsersMenuOpen(!isUsersMenuOpen)} className={`btn ${activeTab.startsWith('user') ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'space-between', border: 'none', background: activeTab.startsWith('user') ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('users')}</span>
                    </div>
                    {isUsersMenuOpen ? <ChevronDown size={16} /> : (isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
                  </button>
                  {isUsersMenuOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: isRTL ? 0 : '34px', marginRight: isRTL ? '34px' : 0, marginTop: '4px', gap: '4px' }}>
                      <button onClick={() => navigate('/?tab=users-dashboard')} className={`btn ${activeTab === 'users-dashboard' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '0.85rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'users-dashboard' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('usersDashboard')}</span>
                      </button>
                      <button onClick={() => navigate('/?tab=users-list')} className={`btn ${activeTab === 'users-list' || activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '0.85rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'users-list' || activeTab === 'users' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('usersList')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {hasPermission('Trains') && (
                <button onClick={() => navigate('/?tab=trains')} className={`btn ${activeTab === 'trains' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'trains' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Train size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('trains')}</span>
                </button>
              )}
              {hasPermission('Trips') && (
                <button onClick={() => navigate('/?tab=trips')} className={`btn ${activeTab === 'trips' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'trips' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Calendar size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('trips')}</span>
                </button>
              )}
              {hasPermission('Stops') && (
                <button onClick={() => navigate('/?tab=stops')} className={`btn ${activeTab === 'stops' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'stops' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <MapPin size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('stops')}</span>
                </button>
              )}
              {hasPermission('Lookups') && (
                <button onClick={() => navigate('/?tab=lookups')} className={`btn ${activeTab === 'lookups' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'lookups' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Database size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('lookups')}</span>
                </button>
              )}
              {hasPermission('Lookups') && (
                <button onClick={() => navigate('/?tab=gallery')} className={`btn ${activeTab === 'gallery' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'gallery' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Image size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('photoGallery') || 'Photo Gallery'}</span>
                </button>
              )}
              {hasPermission('LostFound') && (
                <button onClick={() => navigate('/?tab=lost-found')} className={`btn ${activeTab === 'lost-found' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'lost-found' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <MessageSquare size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('lostFound')}</span>
                </button>
              )}
              {hasPermission('Suggestions') && (
                <button onClick={() => navigate('/?tab=suggestions')} className={`btn ${activeTab === 'suggestions' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'suggestions' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Lightbulb size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('routeSuggestions')}</span>
                </button>
              )}
              {hasPermission('Disruptions') && (
                <button onClick={() => navigate('/?tab=disruptions')} className={`btn ${activeTab === 'disruptions' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'disruptions' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('serviceAlerts')}</span>
                </button>
              )}
              {hasPermission('RailwayPaths') && (
                <button onClick={() => navigate('/?tab=railway-paths')} className={`btn ${activeTab === 'railway-paths' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'railway-paths' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Map size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('railwayPaths')}</span>
                </button>
              )}
              {hasPermission('Updates') && (
                <button onClick={() => navigate('/?tab=updates')} className={`btn ${activeTab === 'updates' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'updates' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Clock size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('liveUpdatesModeration')}</span>
                </button>
              )}
              {hasPermission('Settings') && (
                <button onClick={() => navigate('/?tab=ads-dashboard')} className={`btn ${activeTab === 'ads-dashboard' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'ads-dashboard' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <TrendingUp size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('adsDashboard')}</span>
                </button>
              )}
              {hasPermission('Settings') && (
                <button onClick={() => navigate('/?tab=settings')} className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'settings' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Settings size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('systemSettings')}</span>
                </button>
              )}
              {hasPermission('Settings') && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <button onClick={() => setIsSystemLogsMenuOpen(!isSystemLogsMenuOpen)} className={`btn ${activeTab.startsWith('system-log') ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'space-between', border: 'none', background: activeTab.startsWith('system-log') ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Terminal size={18} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('systemLogs')}</span>
                    </div>
                    {isSystemLogsMenuOpen ? <ChevronDown size={16} /> : (isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
                  </button>
                  {isSystemLogsMenuOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: isRTL ? 0 : '34px', marginRight: isRTL ? '34px' : 0, marginTop: '4px', gap: '4px' }}>
                      <button onClick={() => navigate('/?tab=system-logs')} className={`btn ${activeTab === 'system-logs' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '0.85rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'system-logs' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('systemLogs')}</span>
                      </button>
                      <button onClick={() => navigate('/?tab=system-log-archives')} className={`btn ${activeTab === 'system-log-archives' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '0.85rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'system-log-archives' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('systemLogArchives')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {(user?.isSuperAdmin || user?.IsSuperAdmin) && (
                <button onClick={() => navigate('/?tab=admins-roles')} className={`btn ${activeTab === 'admins-roles' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '12px 16px', fontSize: '0.95rem', justifyContent: 'flex-start', border: 'none', background: activeTab === 'admins-roles' ? 'var(--accent-primary)' : 'transparent', width: '100%', margin: 0, overflow: 'hidden' }}>
                  <Shield size={18} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('adminsRoles')}</span>
                </button>
              )}
            </aside>
          )}

          <div style={{ flexGrow: 1, minWidth: 0, paddingBottom: '32px' }}>
            {children}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .disruption-ticker {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
        }
        .disruption-marquee {
          display: inline-block;
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .mobile-header-toggle {
            display: flex !important;
          }
          .desktop-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
