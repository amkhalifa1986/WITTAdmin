import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Clock, Loader, Save, X, ArrowLeft, ArrowRight } from 'lucide-react';

export const EditTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tripInfo, setTripInfo] = useState(null);
  const [status, setStatus] = useState(0);

  const tripStatuses = [
    { value: 0, label: 'Scheduled', labelAr: 'مجدول' },
    { value: 1, label: 'Departed', labelAr: 'غادر' },
    { value: 2, label: 'InTransit', labelAr: 'في الطريق' },
    { value: 3, label: 'Arrived', labelAr: 'وصل' },
    { value: 4, label: 'Cancelled', labelAr: 'ملغي' },
    { value: 5, label: 'Delayed', labelAr: 'متأخر' }
  ];

  const getStatusValue = (val) => {
    if (typeof val === 'number') return val;
    const st = tripStatuses.find(s => s.label.toLowerCase() === String(val).toLowerCase());
    return st ? st.value : 0;
  };

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.getTripDetails(id);
        if (res.isSuccess && res.data) {
          setTripInfo(res.data);
          setStatus(getStatusValue(res.data.status));
        } else {
          setError(res.error || 'Failed to fetch trip details.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch trip details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTrip();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.adminUpdateTripStatus(id, { status: parseInt(status) });
      if (res.isSuccess) {
        setSuccess(isRTL ? 'تم تحديث حالة الرحلة بنجاح.' : 'Trip status updated successfully.');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(res.error || 'Failed to update trip status.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Operation failed.');
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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Button */}

      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <Clock size={24} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {isRTL ? 'تحديث حالة الرحلة' : 'Update Trip Status'}
          </h2>
        </div>

        {tripInfo && (
          <div style={{ 
            background: 'rgba(120, 120, 120, 0.05)', 
            padding: '16px', 
            borderRadius: '10px', 
            marginBottom: '24px', 
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div>
              <strong>{isRTL ? 'رقم القطار:' : 'Train Number:'}</strong> {tripInfo.trainNumber}
            </div>
            <div>
              <strong>{isRTL ? 'اسم القطار:' : 'Train Name:'}</strong> {isRTL ? tripInfo.trainNameAr : tripInfo.trainNameEn}
            </div>
            <div>
              <strong>{isRTL ? 'التاريخ:' : 'Date:'}</strong> {tripInfo.tripDate}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'var(--success-glow)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--success)',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
              {isRTL ? 'حالة الرحلة *' : 'Trip Status *'}
            </label>
            <select 
              className="input-field" 
              required 
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              disabled={saving}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
            >
              {tripStatuses.map(st => (
                <option key={st.value} value={st.value}>
                  {isRTL ? st.labelAr : st.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={16} />
              <span>{isRTL ? 'إلغاء' : 'Cancel'}</span>
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
              <span>{isRTL ? 'حفظ الحالة' : 'Save Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTrip;
