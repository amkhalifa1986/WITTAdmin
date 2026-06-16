import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { usePopup } from '../../context/PopupContext';
import { Train, Loader, Save, X, ArrowLeft, ArrowRight, Trash2, Plus, GripVertical } from 'lucide-react';
import FollowersBox from '../../components/FollowersBox';

export const EditTrain = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { toast } = usePopup();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    trainNumber: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    trainTypeId: ''
  });

  const [routeStops, setRouteStops] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [trainTypes, setTrainTypes] = useState([]);
  const [selectedAddStopId, setSelectedAddStopId] = useState('');
  const [newArrival, setNewArrival] = useState('');
  const [newDeparture, setNewDeparture] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragEnabledIndex, setDragEnabledIndex] = useState(null);
  const [associatedTripId, setAssociatedTripId] = useState(null);
  const [tripStatus, setTripStatus] = useState(null);

  useEffect(() => {
    const fetchTrainAndStops = async () => {
      try {
        setLoading(true);
        
        // Fetch train details
        const trainRes = await api.getTrainDetails(id);
        if (trainRes.isSuccess && trainRes.data) {
          setFormData({
            trainNumber: trainRes.data.trainNumber || '',
            nameEn: trainRes.data.nameEn || '',
            nameAr: trainRes.data.nameAr || '',
            descriptionEn: trainRes.data.descriptionEn || '',
            descriptionAr: trainRes.data.descriptionAr || '',
            trainTypeId: trainRes.data.trainTypeId || ''
          });
          const stops = trainRes.data.routeStops || [];
          setRouteStops(stops.sort((a, b) => a.stopOrder - b.stopOrder));
        } else {
          toast(trainRes.error || 'Failed to fetch train details.', 'error');
        }

        // Fetch all stops
        const stopsRes = await api.adminGetStops();
        if (stopsRes.isSuccess && stopsRes.data) {
          setAllStops(stopsRes.data);
        }

        // Fetch train types
        const typesRes = await api.adminGetTrainTypes();
        if (typesRes.isSuccess && typesRes.data) {
          setTrainTypes(typesRes.data);
        }

        // Fetch train trips to find active/upcoming ones
        try {
          const tripsRes = await api.getTrainTrips(id);
          if (tripsRes.isSuccess && tripsRes.data) {
            // Find an active trip first (running or upcoming)
            let selectedTrip = tripsRes.data.find(t => 
              t.status === "Scheduled" || 
              t.status === "Departed" || 
              t.status === "InTransit" || 
              t.status === "Delayed"
            );
            
            // If no active trip, fall back to the most recent trip
            if (!selectedTrip && tripsRes.data.length > 0) {
              const sortedTrips = [...tripsRes.data].sort((a, b) => new Date(b.tripDate) - new Date(a.tripDate));
              selectedTrip = sortedTrips[0];
            }

            if (selectedTrip) {
              setAssociatedTripId(selectedTrip.id);
              setTripStatus(selectedTrip.status);
            }
          }
        } catch (err) {
          console.error("Failed to load train trips:", err);
        }
      } catch (err) {
        console.error(err);
        toast(err.message || 'Failed to load details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTrainAndStops();
    }
  }, [id]);

  const handleAddStop = () => {
    if (!selectedAddStopId) return;
    const selectedStop = allStops.find(s => s.id === selectedAddStopId);
    if (!selectedStop) return;

    if (routeStops.some(s => s.stopId === selectedAddStopId)) {
      setError(isRTL ? 'هذه المحطة مضافة بالفعل في المسار.' : 'This stop is already added in the route.');
      return;
    }

    const newStop = {
      stopId: selectedStop.id,
      stopCode: selectedStop.code,
      stopNameEn: selectedStop.nameEn,
      stopNameAr: selectedStop.nameAr,
      scheduledArrival: newArrival || null,
      scheduledDeparture: newDeparture || null,
      stopOrder: routeStops.length + 1
    };

    setRouteStops([...routeStops, newStop]);
    setSelectedAddStopId('');
    setNewArrival('');
    setNewDeparture('');
    setError('');
  };

  const handleRemoveStop = (index) => {
    const updated = routeStops.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      stopOrder: i + 1
    }));
    setRouteStops(updated);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }

    const updated = [...routeStops];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setRouteStops(updated.map((s, i) => ({ ...s, stopOrder: i + 1 })));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragEnabledIndex(null);
  };

  const handleInlineChange = (index, field, value) => {
    const updated = [...routeStops];
    updated[index] = {
      ...updated[index],
      [field]: value || null
    };
    setRouteStops(updated);
  };

  const handleStationChange = (index, newStopId) => {
    const selectedStop = allStops.find(s => s.id === newStopId);
    if (!selectedStop) return;

    const duplicate = routeStops.some((s, i) => i !== index && s.stopId === newStopId);
    if (duplicate) {
      toast(isRTL ? 'هذه المحطة مضافة بالفعل في المسار.' : 'This stop is already added in the route.', 'warning');
      return;
    }

    const updated = [...routeStops];
    updated[index] = {
      ...updated[index],
      stopId: selectedStop.id,
      stopCode: selectedStop.code,
      stopNameEn: selectedStop.nameEn,
      stopNameAr: selectedStop.nameAr
    };
    setRouteStops(updated);
  };

  const displayTime = (timeStr) => {
    if (!timeStr) return '';
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr.slice(0, 5);
    }
    return timeStr;
  };

  const formatTimeSpan = (timeStr) => {
    if (!timeStr) return null;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return `${timeStr}:00`;
    }
    if (/^\d{1}:\d{2}$/.test(timeStr)) {
      return `0${timeStr}:00`;
    }
    return timeStr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        trainTypeId: formData.trainTypeId || null,
        routeStops: routeStops.map((stop, index) => ({
          stopId: stop.stopId,
          stopOrder: index + 1,
          scheduledArrival: stop.scheduledArrival ? formatTimeSpan(stop.scheduledArrival) : null,
          scheduledDeparture: stop.scheduledDeparture ? formatTimeSpan(stop.scheduledDeparture) : null
        }))
      };
      const res = await api.adminUpdateTrain(id, payload);
      if (res.isSuccess) {
        toast(isRTL ? 'تم تحديث القطار بنجاح.' : 'Train updated successfully.', 'success');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast(res.error || 'Failed to update train.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast(err.message || 'Operation failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="animate-spin" size={32} color="var(--accent-primary)" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{ width: '100%', maxWidth: 'none', padding: '20px', direction: isRTL ? 'rtl' : 'ltr' }}>
        {/* Header section with Actions and Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Train size={28} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {isRTL ? 'تعديل بيانات القطار' : 'Edit Train Details'}
              </h2>
            </div>
            
            {/* Active/Upcoming/Past Trip Link */}
            {associatedTripId ? (
              <button
                type="button"
                onClick={() => navigate(`/trip/${associatedTripId}`)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: (tripStatus === "Arrived" || tripStatus === "Cancelled") ? 'var(--border-color)' : 'var(--success)',
                  color: (tripStatus === "Arrived" || tripStatus === "Cancelled") ? 'var(--text-secondary)' : 'var(--success)',
                  background: (tripStatus === "Arrived" || tripStatus === "Cancelled") ? 'rgba(120, 120, 120, 0.05)' : 'var(--success-glow)'
                }}
                title={isRTL ? 'الانتقال إلى صفحة تفاصيل الرحلة' : 'Go to trip details page'}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: (tripStatus === "Arrived" || tripStatus === "Cancelled") ? 'var(--text-muted)' : 'var(--success)', 
                  display: 'inline-block',
                  animation: (tripStatus === "Arrived" || tripStatus === "Cancelled") ? 'none' : 'pulseGlow 1.5s infinite'
                }}></span>
                <span>
                  {isRTL 
                    ? (tripStatus === "Arrived" ? 'تفاصيل الرحلة (منتهية)' : tripStatus === "Cancelled" ? 'تفاصيل الرحلة (ملغاة)' : 'الرحلة النشطة') 
                    : (tripStatus === "Arrived" ? 'Trip Details (Ended)' : tripStatus === "Cancelled" ? 'Trip Details (Cancelled)' : 'Active Trip')
                  }
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}
                title={isRTL ? 'لم يتم إنشاء أي رحلة لهذا القطار بعد' : 'No trips created for this train yet'}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }}></span>
                <span>{isRTL ? 'لا توجد رحلات' : 'No Trips Created'}</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <X size={16} />
              <span>{isRTL ? 'إلغاء' : 'Cancel'}</span>
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
              <span>{isRTL ? 'حفظ التعديلات' : 'Save Changes'}</span>
            </button>
          </div>
        </div>



        {/* Grid Container */}
        <div className="edit-train-grid" style={{
          display: 'grid',
          gridTemplateColumns: '40% 60%',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Left Column: Train Info & Followers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                {isRTL ? 'معلومات القطار الأساسية' : 'Basic Train Info'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'رقم القطار *' : 'Train Number *'}
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={formData.trainNumber} 
                    onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })} 
                    disabled={saving}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {isRTL ? 'الاسم بالإنجليزية *' : 'Name (English) *'}
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required 
                      value={formData.nameEn} 
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} 
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {isRTL ? 'الاسم بالعربية *' : 'Name (Arabic) *'}
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required 
                      value={formData.nameAr} 
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} 
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'الوصف بالإنجليزية' : 'Description (English)'}
                  </label>
                  <textarea 
                    className="input-field" 
                    rows="3" 
                    value={formData.descriptionEn} 
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} 
                    disabled={saving}
                    style={{ resize: 'none' }}
                  ></textarea>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'الوصف بالعربية' : 'Description (Arabic)'}
                  </label>
                  <textarea 
                    className="input-field" 
                    rows="3" 
                    value={formData.descriptionAr} 
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })} 
                    disabled={saving}
                    style={{ resize: 'none' }}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                {isRTL ? 'نوع القطار' : 'Train Type'}
              </label>
              <select 
                className="input-field" 
                value={formData.trainTypeId || ''} 
                onChange={(e) => setFormData({ ...formData, trainTypeId: e.target.value })}
                disabled={saving}
              >
                <option value="">-- {isRTL ? 'اختر نوع القطار' : 'Select Train Type'} --</option>
                {trainTypes.map(t => (
                  <option key={t.id} value={t.id}>{isRTL ? t.nameAr : t.nameEn}</option>
                ))}
              </select>
            </div>

            {/* Followers List Box */}
            <FollowersBox type="train" id={id} />
          </div>

          {/* Right Column: Stops Sequence Manager */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                {isRTL ? 'ترتيب محطات المسار' : 'Route Stops Sequence'}
              </h3>

              {/* Table of current stops */}
              <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '20px', padding: '16px', background: 'rgba(120, 120, 120, 0.01)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '8px 12px', width: '40px', textAlign: 'center' }}></th>
                      <th style={{ padding: '8px 12px', width: '60px' }}>{isRTL ? 'الترتيب' : 'Order'}</th>
                      <th style={{ padding: '8px 12px', width: '330px' }}>{isRTL ? 'المحطة' : 'Station'}</th>
                      <th style={{ padding: '8px 12px', width: '110px' }}>{isRTL ? 'الوصول' : 'Arrival'}</th>
                      <th style={{ padding: '8px 12px', width: '110px' }}>{isRTL ? 'القيام' : 'Departure'}</th>
                      <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center' }}>{isRTL ? 'حذف' : 'Remove'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeStops.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {isRTL ? 'لا توجد محطات مضافة لهذا القطار بعد.' : 'No stops added to this train yet.'}
                        </td>
                      </tr>
                    ) : (
                      routeStops.map((stop, index) => {
                        const isDragged = index === draggedIndex;
                        const isDragOver = index === dragOverIndex;
                        
                        return (
                          <tr 
                            key={`${stop.stopId}-${index}`} 
                            draggable={dragEnabledIndex === index}
                            onDragStart={(e) => {
                              setDraggedIndex(index);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (dragOverIndex !== index) {
                                setDragOverIndex(index);
                              }
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                              setDragEnabledIndex(null);
                            }}
                            onDrop={(e) => handleDrop(e, index)}
                            style={{ 
                              borderBottom: '1px solid rgba(120,120,120,0.05)', 
                              fontSize: '0.9rem',
                              opacity: isDragged ? 0.4 : 1,
                              background: isDragOver ? 'var(--info-glow)' : 'transparent',
                              border: isDragged ? '2px dashed var(--accent-primary)' : 'none',
                              transition: 'background-color 0.2s ease, opacity 0.2s ease'
                            }}
                          >
                            {/* Drag Handle Cell */}
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onMouseDown={() => setDragEnabledIndex(index)}
                                onMouseUp={() => setDragEnabledIndex(null)}
                                onMouseLeave={() => setDragEnabledIndex(null)}
                                style={{
                                  cursor: dragEnabledIndex === index ? 'grabbing' : 'grab',
                                  padding: '6px',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'none',
                                  border: 'none'
                                }}
                                title={isRTL ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                              >
                                <GripVertical size={16} />
                              </button>
                            </td>

                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{index + 1}</td>
                            
                            <td style={{ padding: '8px 12px' }}>
                              <select 
                                className="input-field"
                                value={stop.stopId}
                                onChange={(e) => handleStationChange(index, e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%' }}
                                disabled={saving}
                              >
                                {allStops.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {isRTL ? `${s.code} - ${s.nameAr}` : `${s.code} - ${s.nameEn}`}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <input 
                                type="time"
                                className="input-field"
                                value={displayTime(stop.scheduledArrival)}
                                onChange={(e) => handleInlineChange(index, 'scheduledArrival', e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                disabled={saving}
                              />
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <input 
                                type="time"
                                className="input-field"
                                value={displayTime(stop.scheduledDeparture)}
                                onChange={(e) => handleInlineChange(index, 'scheduledDeparture', e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                disabled={saving}
                              />
                            </td>

                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleRemoveStop(index)}
                                disabled={saving}
                                style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title={isRTL ? 'إزالة' : 'Remove'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Stop Form */}
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(120, 120, 120, 0.02)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  {isRTL ? 'إضافة محطة جديدة للمسار' : 'Add New Route Stop'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {isRTL ? 'المحطة *' : 'Station *'}
                    </label>
                    <select
                      className="input-field"
                      value={selectedAddStopId}
                      onChange={(e) => setSelectedAddStopId(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                      disabled={saving}
                    >
                      <option value="">{isRTL ? '-- اختر المحطة --' : '-- Select Station --'}</option>
                      {allStops
                        .filter(s => !routeStops.some(rs => rs.stopId === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {isRTL ? `${s.code} - ${s.nameAr}` : `${s.code} - ${s.nameEn}`}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {isRTL ? 'الوصول المجدول' : 'Arrival Time'}
                    </label>
                    <input
                      type="time"
                      className="input-field"
                      value={newArrival}
                      onChange={(e) => setNewArrival(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {isRTL ? 'القيام المجدول' : 'Departure Time'}
                    </label>
                    <input
                      type="time"
                      className="input-field"
                      value={newDeparture}
                      onChange={(e) => setNewDeparture(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                      disabled={saving}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddStop}
                    disabled={!selectedAddStopId || saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px' }}
                  >
                    <Plus size={16} />
                    <span>{isRTL ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add a responsive global media query styles using standard React-style tags or standard CSS */}
        <style>{`
          @media (max-width: 1024px) {
            .edit-train-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </form>
  );
};

export default EditTrain;
