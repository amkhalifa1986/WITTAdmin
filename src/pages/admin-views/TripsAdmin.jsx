import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import signalrService from '../../services/signalrService';
import L from 'leaflet';
import { useLanguage } from '../../context/LanguageContext';
import { usePopup } from '../../context/PopupContext';
import { useSettings } from '../../context/SettingsContext';
import { Edit2, Trash2, Plus, Clock, Search, Eraser, MapPin, X, Navigation } from 'lucide-react';

const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

const TripLocationModal = ({ trip, onClose, isRTL }) => {
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [tripDetails, setTripDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAutoCentering, setIsAutoCentering] = useState(true);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trainMarkerRef = useRef(null);
  const followerMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [trackingRes, detailsRes] = await Promise.all([
          api.getTripTracking(trip.id),
          api.getTripDetails(trip.id)
        ]);
        if (active) {
          if (trackingRes.isSuccess && trackingRes.data) {
            setLiveTelemetry(trackingRes.data);
          }
          if (detailsRes.isSuccess && detailsRes.data) {
            setTripDetails(detailsRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to get tracking or details:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();

    const joinGroup = async () => {
      try {
        await signalrService.joinTrip(trip.id);
      } catch (err) {
        console.error('SignalR join failed:', err);
      }
    };
    joinGroup();

    const unsubscribeLocation = signalrService.registerLocationListener((locUpdate) => {
      if (locUpdate && locUpdate.tripId && locUpdate.tripId.toString() === trip.id.toString() && active) {
        setLiveTelemetry(locUpdate);
      }
    });

    return () => {
      active = false;
      unsubscribeLocation();
      signalrService.leaveTrip(trip.id).catch(err => console.error(err));
    };
  }, [trip.id]);

  // Leaflet Map Init
  useEffect(() => {
    if (loading || !tripDetails || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([26.8206, 30.8025], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.on('movestart', (e) => {
      if (e.originalEvent) {
        setIsAutoCentering(false);
      }
    });

    // Draw route polyline if present
    if (tripDetails.routePath && tripDetails.routePath.length > 1) {
      polylineRef.current = L.polyline(tripDetails.routePath, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [20, 20] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      trainMarkerRef.current = null;
      followerMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, [loading, tripDetails]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !liveTelemetry) return;

    const trainIcon = L.divIcon({
      className: 'custom-train-marker-pin',
      html: `<div class="train-pulse-pin" style="background: rgba(99, 102, 241, 0.45)"></div><img src="/train-marker.png" style="width: 40px; height: 40px; display: block;" alt="Train Pin" />`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    // Snapped marker
    if (liveTelemetry.snappedLatitude && liveTelemetry.snappedLongitude) {
      const pos = [liveTelemetry.snappedLatitude, liveTelemetry.snappedLongitude];
      if (!trainMarkerRef.current) {
        trainMarkerRef.current = L.marker(pos, { icon: trainIcon })
          .addTo(map)
          .bindPopup(`Train ${trip.trainNumber} (Snapped)`);
      } else {
        trainMarkerRef.current.setLatLng(pos);
      }

      if (isAutoCentering) {
        map.setView(pos, 14, { animate: true });
      }
    }

    // Raw follower marker
    if (liveTelemetry.rawLatitude && liveTelemetry.rawLongitude) {
      const rawPos = [liveTelemetry.rawLatitude, liveTelemetry.rawLongitude];
      const followerIcon = L.divIcon({
        className: 'custom-follower-marker-pin',
        html: `
          <div style="position: relative; width: 16px; height: 16px;">
            <div style="position: absolute; width: 16px; height: 16px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s infinite;"></div>
            <div style="position: absolute; top: 3px; left: 3px; width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; border: 2px solid #ffffff;"></div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      if (!followerMarkerRef.current) {
        followerMarkerRef.current = L.marker(rawPos, { icon: followerIcon })
          .addTo(map)
          .bindPopup("Follower Raw GPS");
      } else {
        followerMarkerRef.current.setLatLng(rawPos);
      }
    } else {
      if (followerMarkerRef.current) {
        followerMarkerRef.current.remove();
        followerMarkerRef.current = null;
      }
    }
  }, [liveTelemetry, isAutoCentering]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', margin: '16px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <MapPin size={20} color="var(--accent-primary)" />
            {isRTL ? `الموقع المباشر للقطار ${trip.trainNumber}` : `Live Location for Train ${trip.trainNumber}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock className="animate-spin" size={32} color="var(--accent-primary)" />
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <div ref={mapRef} style={{ height: '350px', width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', zIndex: 1 }} />
              {liveTelemetry && liveTelemetry.snappedLatitude > 0 && (
                <button 
                  onClick={() => setIsAutoCentering(true)}
                  className="btn"
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backdropFilter: 'blur(12px)',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    cursor: 'pointer'
                  }}
                >
                  <Navigation size={12} style={{ transform: 'rotate(45deg)', fill: 'currentColor' }} />
                  {isRTL ? "تركيز التلقائي" : "Auto-Center"}
                </button>
              )}
            </div>

            {/* Coordinates HUD Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', background: 'rgba(120,120,120,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              {liveTelemetry ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {isRTL ? "موقع التتبع (المثبت):" : "Snapped Location:"}
                    </span>
                    <input 
                      readOnly 
                      value={`${liveTelemetry.snappedLatitude?.toFixed(6) || 0}, ${liveTelemetry.snappedLongitude?.toFixed(6) || 0}`}
                      onClick={(e) => e.target.select()}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        background: 'rgba(120,120,120,0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--accent-secondary)',
                        textAlign: 'center',
                        cursor: 'text',
                        width: '180px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {liveTelemetry.rawLatitude && liveTelemetry.rawLongitude && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {isRTL ? "موقع المتابع (الخام):" : "Follower GPS (Raw):"}
                      </span>
                      <input 
                        readOnly 
                        value={`${liveTelemetry.rawLatitude.toFixed(6)}, ${liveTelemetry.rawLongitude.toFixed(6)}`}
                        onClick={(e) => e.target.select()}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          background: 'rgba(120,120,120,0.05)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--accent-primary)',
                          textAlign: 'center',
                          cursor: 'text',
                          width: '180px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                    <span>{isRTL ? "السرعة الحالية:" : "Current Speed:"}</span>
                    <strong>{liveTelemetry.speed?.toFixed(0) || 0} km/h</strong>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {isRTL ? "لا توجد بيانات تتبع نشطة لهذه الرحلة." : "No active telemetry data for this trip."}
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{isRTL ? "إغلاق" : "Close"}</button>
        </div>
      </div>
    </div>
  );
};

export const TripsAdmin = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { toast, confirm } = usePopup();
  const { settings } = useSettings();
  const gpsTrackingEnabled = settings?.gpsTrackingEnabled !== false;
  const [trips, setTrips] = useState([]);
  const [trains, setTrains] = useState([]);
  const [trainTypes, setTrainTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainType, setSelectedTrainType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingModalTrip, setTrackingModalTrip] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    trainId: '',
    tripDate: '',
    status: 0
  });

  const tripStatuses = [
    { value: 0, label: 'Scheduled' },
    { value: 1, label: 'Departed' },
    { value: 2, label: 'InTransit' },
    { value: 3, label: 'Arrived' },
    { value: 4, label: 'Cancelled' },
    { value: 5, label: 'Delayed' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTrainType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tripsRes, trainsRes, typesRes] = await Promise.all([
        api.adminGetTrips(),
        api.adminGetTrains(),
        api.adminGetTrainTypes()
      ]);
      setTrips(tripsRes.data || []);
      setTrains(trainsRes.data || []);
      setTrainTypes(typesRes.data || []);
    } catch (err) {
      toast('Failed to fetch data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      trainId: '',
      tripDate: today,
      status: 0
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        trainId: formData.trainId,
        tripDate: formData.tripDate
      };
      await api.adminCreateTrip(payload);
      toast(t('tripCreatedSuccess'), 'success');
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm(t('confirmDeleteTrip'));
    if (!confirmed) return;
    try {
      await api.adminDeleteTrip(id);
      toast(t('tripDeletedSuccess'), 'success');
      fetchData();
    } catch (err) {
      toast('Failed to delete trip: ' + err.message, 'error');
    }
  };

  const handleClearEndedTripsTelemetry = async () => {
    const confirmed = await confirm(t('confirmClearOldTrips'));
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await api.adminClearEndedTripsTelemetry();
      toast(isRTL ? `تم مسح بيانات التتبع بنجاح للرحلات القديمة (تم مسح ${res.data} سجلات).` : `Successfully cleared telemetry data for ended/cancelled trips (cleared ${res.data} records).`, 'success');
      fetchData();
    } catch (err) {
      toast('Failed to clear progress data: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const handleClearTripTelemetry = async (tripId, trainNumber, tripDate) => {
    const confirmed = await confirm(t('confirmClearTrip').replace('{trainNumber}', trainNumber).replace('{tripDate}', tripDate));
    if (!confirmed) return;
    setLoading(true);
    try {
      await api.adminClearTripTelemetry(tripId);
      toast(t('tripTelemetryClearedSuccess').replace('{trainNumber}', trainNumber).replace('{tripDate}', tripDate), 'success');
      fetchData();
    } catch (err) {
      toast('Failed to clear progress data: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const getStatusValue = (val) => {
    if (typeof val === 'number') return val;
    const st = tripStatuses.find(s => s.label.toLowerCase() === String(val).toLowerCase());
    return st ? st.value : 0;
  };

  const getStatusLabel = (val) => {
    if (typeof val === 'number') {
      const st = tripStatuses.find(s => s.value === val);
      return st ? t(st.label) : 'Unknown';
    }
    const st = tripStatuses.find(s => s.label.toLowerCase() === String(val).toLowerCase());
    return st ? t(st.label) : val;
  };

  const filteredItems = trips.filter(item => {
    if (selectedTrainType && item.trainTypeId !== selectedTrainType) {
      return false;
    }
    const term = searchTerm.toLowerCase();
    const trainNo = item.trainNumber?.toLowerCase() || '';
    const trainName = (isRTL ? item.trainNameAr : item.trainNameEn)?.toLowerCase() || '';
    const date = item.tripDate || '';
    return trainNo.includes(term) || trainName.includes(term) || date.includes(term);
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && trips.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Clock className="animate-spin" size={32} color="var(--accent-primary)" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder={t('searchTripsPlaceholder')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <select
            className="input-field"
            value={selectedTrainType}
            onChange={(e) => {
              setSelectedTrainType(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '180px', height: '40px', margin: 0, padding: '0 12px', cursor: 'pointer', appearance: 'auto' }}
          >
            <option value="">{isRTL ? '-- نوع القطار --' : '-- Train Type --'}</option>
            {trainTypes.map(t => (
              <option key={t.id} value={t.id}>{isRTL ? t.nameAr : t.nameEn}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
            onClick={() => handleClearEndedTripsTelemetry()}
          >
            {t('clearOldTripsData')}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> {t('scheduleTrip')}
          </button>
        </div>
      </div>



      {/* Data Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>{t('trainNo')}</th>
                <th style={{ padding: '16px 24px' }}>{t('trainName')}</th>
                <th style={{ padding: '16px 24px' }}>{t('date')}</th>
                <th style={{ padding: '16px 24px' }}>{t('followers')}</th>
                <th style={{ padding: '16px 24px' }}>{t('status')}</th>
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noTripsFound')}</td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.trainNumber}</td>
                    <td style={{ padding: '16px 24px' }}>{isRTL ? item.trainNameAr : item.trainNameEn}</td>
                    <td style={{ padding: '16px 24px' }}>{item.tripDate}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{item.followerCount || 0}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span 
                        className="badge" 
                        style={{
                          backgroundColor: item.statusDetails?.color ? `${item.statusDetails.color}20` : 'var(--info-glow)',
                          color: item.statusDetails?.color || 'var(--info)',
                          borderColor: item.statusDetails?.color ? `${item.statusDetails.color}40` : 'rgba(59, 130, 246, 0.3)',
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {isRTL 
                          ? (item.statusDetails?.nameAr || item.status) 
                          : (item.statusDetails?.nameEn || item.status)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {gpsTrackingEnabled && (
                        <button 
                          onClick={() => setTrackingModalTrip(item)} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                          title={isRTL ? "عرض الموقع المباشر" : "View Live Location"}
                        >
                          <MapPin size={16} />
                        </button>
                      )}
                      <button onClick={() => navigate(`/edit-trip/${item.id}`)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }} title={t('edit')}>
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleClearTripTelemetry(item.id, item.trainNumber, item.tripDate)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                        title={t('clearTripData')}
                      >
                        <Eraser size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }} title={t('delete')}>
                        <Trash2 size={16} />
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

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', margin: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              {t('scheduleNewTrip')}
            </h3>
            


            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label>{t('trainSelect')}</label>
                <select className="input-field" required value={formData.trainId} onChange={(e) => setFormData({...formData, trainId: e.target.value})}>
                  <option value="">{t('selectTrainOption')}</option>
                  {trains.map(t => (
                    <option key={t.id} value={t.id}>{t.trainNumber} - {t.nameEn}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('tripDateLabel')}</label>
                <input type="date" className="input-field" required value={formData.tripDate} onChange={(e) => setFormData({...formData, tripDate: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('scheduleTrip')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Location Modal */}
      {trackingModalTrip && (
        <TripLocationModal 
          trip={trackingModalTrip} 
          onClose={() => setTrackingModalTrip(null)} 
          isRTL={isRTL}
        />
      )}
    </div>
  );
};
