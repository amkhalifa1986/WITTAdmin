import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { MapPin, Loader, Save, X, ArrowLeft, ArrowRight } from 'lucide-react';


export const EditStop = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cities, setCities] = useState([]);
  const [railwayPaths, setRailwayPaths] = useState([]);

  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    code: '',
    latitude: '',
    longitude: '',
    cityId: '',
    descriptionEn: '',
    descriptionAr: '',
    railwayPathIds: []
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize Map when stop details are loaded
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

    const initialLat = parseFloat(formData.latitude) || 30.0444;
    const initialLng = parseFloat(formData.longitude) || 31.2357;

    if (!mapInstanceRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        return;
      }
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([initialLat, initialLng], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      // Map click handler to reposition
      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6)
        }));
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [loading]);

  // Synchronize map marker when latitude or longitude changes in form state
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    const map = mapInstanceRef.current;

    const stopIcon = L.divIcon({
      className: 'custom-stop-marker-edit',
      html: `<div style="background-color: var(--accent-primary); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(0,0,0,0.5)"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { 
        icon: stopIcon,
        draggable: true 
      }).addTo(map);

      // Marker drag handler
      markerRef.current.on('dragend', (e) => {
        const position = markerRef.current.getLatLng();
        setFormData(prev => ({
          ...prev,
          latitude: position.lat.toFixed(6),
          longitude: position.lng.toFixed(6)
        }));
      });
    } else {
      const currentLatLng = markerRef.current.getLatLng();
      if (currentLatLng.lat !== lat || currentLatLng.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    // Centering the map when updated, but checking dragging to avoid jumpiness
    const activeDragging = markerRef.current.dragging?.moving?.();
    if (!activeDragging) {
      map.panTo([lat, lng]);
    }

  }, [formData.latitude, formData.longitude]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [stopsRes, citiesRes, pathsRes] = await Promise.all([
          api.adminGetStops(),
          api.adminGetCities(),
          api.adminGetRailwayPaths()
        ]);

        const stops = stopsRes.data || [];
        setCities(citiesRes.data || []);
        setRailwayPaths(pathsRes.data || []);

        const stop = stops.find(s => s.id === id);
        if (stop) {
          setFormData({
            nameEn: stop.nameEn || '',
            nameAr: stop.nameAr || '',
            code: stop.code || '',
            latitude: stop.latitude || '',
            longitude: stop.longitude || '',
            cityId: stop.cityId || '',
            descriptionEn: stop.descriptionEn || '',
            descriptionAr: stop.descriptionAr || '',
            railwayPathIds: stop.railwayPathIds || []
          });
        } else {
          setError('Stop not found.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch stop or city details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Convert lat/lng to numbers
    const payload = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      cityId: formData.cityId || null,
      railwayPathIds: formData.railwayPathIds
    };

    try {
      const res = await api.adminUpdateStop(id, payload);
      if (res.isSuccess) {
        setSuccess(isRTL ? 'تم تحديث المحطة بنجاح.' : 'Stop updated successfully.');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(res.error || 'Failed to update stop.');
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
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '20px', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Back Button */}

      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <MapPin size={24} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {isRTL ? 'تعديل بيانات المحطة' : 'Edit Stop Details'}
          </h2>
        </div>

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

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          {/* Form Section */}
          <div style={{ flex: '1', minWidth: '320px' }}>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'رمز المحطة *' : 'Station Code *'}
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={formData.code} 
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                    disabled={saving}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'المدينة' : 'City'}
                  </label>
                  <select 
                    className="input-field" 
                    value={formData.cityId} 
                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })} 
                    disabled={saving}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
                  >
                    <option value="">-- {isRTL ? 'اختر المدينة' : 'Select City'} --</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {isRTL ? city.nameAr : city.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'خط العرض (Latitude) *' : 'Latitude *'}
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    className="input-field" 
                    required 
                    value={formData.latitude} 
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} 
                    disabled={saving}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isRTL ? 'خط الطول (Longitude) *' : 'Longitude *'}
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    className="input-field" 
                    required 
                    value={formData.longitude} 
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} 
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isRTL ? 'مسارات السكك الحديدية' : 'Railway Paths'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
                  {railwayPaths.map(path => {
                    const isChecked = formData.railwayPathIds.includes(path.id);
                    return (
                      <label key={path.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={saving}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...formData.railwayPathIds, path.id]
                              : formData.railwayPathIds.filter(id => id !== path.id);
                            setFormData({ ...formData, railwayPathIds: newIds });
                          }}
                          style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', borderRadius: '4px' }}
                        />
                        <span>{path.code}</span>
                      </label>
                    );
                  })}
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
                  <span>{isRTL ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Map Section */}
          <div style={{ flex: '3', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isRTL ? 'تحديد الموقع على الخريطة' : 'Set Location on Map'}
            </label>
            <div 
              ref={mapContainerRef} 
              style={{ 
                width: '100%', 
                height: '720px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                background: 'rgba(120, 120, 120, 0.05)'
              }}
            />

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="var(--accent-primary)" />
              <span>
                {isRTL 
                  ? 'انقر على الخريطة لتغيير الموقع، أو قم بسحب العلامة الزرقاء لتعديل الإحداثيات.' 
                  : 'Click on the map to set location, or drag the blue marker to update coordinates.'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditStop;
