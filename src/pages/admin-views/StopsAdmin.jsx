import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Edit2, Trash2, Plus, Clock, Search, Upload, Download, Map, X } from 'lucide-react';

const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const StopsAdmin = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [stops, setStops] = useState([]);
  const [cities, setCities] = useState([]);
  const [railwayPaths, setRailwayPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Analysis Modal state
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzeDuplicateAction, setAnalyzeDuplicateAction] = useState('update');
  
  // Form state
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

  // View Map Modal state
  const [viewStop, setViewStop] = useState(null);
  const viewMapContainerRef = useRef(null);
  const viewMapInstanceRef = useRef(null);
  const viewMarkerRef = useRef(null);

  useEffect(() => {
    if (!viewStop) {
      if (viewMapInstanceRef.current) {
        viewMapInstanceRef.current.remove();
        viewMapInstanceRef.current = null;
      }
      viewMarkerRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      if (!viewMapContainerRef.current) return;

      const lat = viewStop.latitude;
      const lng = viewStop.longitude;

      if (!viewMapInstanceRef.current) {
        if (viewMapContainerRef.current._leaflet_id) {
          return;
        }
        viewMapInstanceRef.current = L.map(viewMapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([lat, lng], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 20
        }).addTo(viewMapInstanceRef.current);
      } else {
        viewMapInstanceRef.current.setView([lat, lng], 14);
      }

      const map = viewMapInstanceRef.current;
      map.invalidateSize();

      if (viewMarkerRef.current) {
        viewMarkerRef.current.remove();
      }

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker-view',
        html: `<div style="background-color: var(--accent-primary); width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.4)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      viewMarkerRef.current = L.marker([lat, lng], { icon: stopIcon })
        .addTo(map)
        .bindPopup(`<b>${isRTL ? viewStop.nameAr : viewStop.nameEn}</b>`)
        .openPopup();

    }, 100);

    return () => clearTimeout(timer);
  }, [viewStop, isRTL]);


  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stopsRes, citiesRes, pathsRes] = await Promise.all([
        api.adminGetStops(),
        api.adminGetCities(),
        api.adminGetRailwayPaths()
      ]);
      setStops(stopsRes.data || []);
      setCities(citiesRes.data || []);
      setRailwayPaths(pathsRes.data || []);
    } catch (err) {
      setError((isRTL ? 'فشل في تحميل البيانات: ' : 'Failed to fetch data: ') + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
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
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      await api.adminCreateStop(payload);
      setSuccess(t('stopCreatedSuccess'));
      handleCloseModal();
      fetchData();
    } catch (err) {
      setError(err.message || (isRTL ? 'فشلت العملية.' : 'Operation failed.'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteStopConfirm'))) return;
    try {
      await api.adminDeleteStop(id);
      setSuccess(t('stopDeletedSuccess'));
      fetchData();
    } catch (err) {
      setError((isRTL ? 'فشل في حذف المحطة: ' : 'Failed to delete stop: ') + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        setError(t('csvEmptyOrInvalid'));
        e.target.value = null;
        return;
      }
      
      const dataRows = lines.slice(1);
      let duplicateCount = 0;
      let newCount = 0;

      dataRows.forEach(line => {
        const parts = line.split(',');
        if (parts.length > 0) {
          const code = parts[0].trim().replace(/^"|"$/g, '').toLowerCase();
          if (code) {
            const exists = stops.some(s => s.code?.toLowerCase() === code);
            if (exists) duplicateCount++;
            else newCount++;
          }
        }
      });

      setAnalyzeResult({
        total: dataRows.length,
        new: newCount,
        duplicates: duplicateCount,
        textContent: text,
        fileName: file.name
      });
      setAnalyzeDuplicateAction('update');
      setIsAnalyzeModalOpen(true);

    } catch (err) {
      setError((isRTL ? 'فشل في قراءة الملف: ' : 'Failed to read file: ') + err.message);
    } finally {
      e.target.value = null;
    }
  };

  const handleConfirmImport = async () => {
    setIsAnalyzeModalOpen(false);
    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const ignoreDuplicates = analyzeDuplicateAction === 'ignore';
      const res = await api.adminImportStops(analyzeResult.textContent, ignoreDuplicates);
      setSuccess(`${t('importSuccessful')} (${analyzeResult.fileName})`);
      fetchData();
    } catch (err) {
      setError(err.message || (isRTL ? 'فشل استيراد المحطات.' : 'Failed to import stops.'));
    } finally {
      setImporting(false);
      setAnalyzeResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = "Code,NameAr,NameEn,CityAr,CityEn,Latitude,Longitude,DescriptionAr,DescriptionEn\nST-01,محطة,Station,القاهرة,Cairo,30.0444,31.2357,وصف,Description";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'StopsTemplate.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStops = stops.filter(s => 
    (s.nameEn && s.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.nameAr && s.nameAr.includes(searchTerm)) ||
    (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredStops.length / itemsPerPage);
  const paginatedStops = filteredStops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && stops.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Clock className="animate-spin" size={32} color="var(--accent-primary)" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder={t('searchStops')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: '40px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="file" 
            accept=".csv" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
            {importing ? t('processing') : t('importCsv')}
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadTemplate} title="Download Template">
            <Download size={18} />
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> {t('addStop')}
          </button>
        </div>
      </div>

      {error && !isModalOpen && <div style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}
      {success && !isModalOpen && <div style={{ color: 'var(--success)', fontWeight: 500 }}>{success}</div>}

      {/* Data Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>{t('code')}</th>
                <th style={{ padding: '16px 24px' }}>{t('name')}</th>
                <th style={{ padding: '16px 24px' }}>{t('city')}</th>
                <th style={{ padding: '16px 24px' }}>{t('paths')}</th>
                <th style={{ padding: '16px 24px' }}>{t('coords')}</th>
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStops.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noStopsFound')}</td></tr>
              ) : (
                paginatedStops.map((stop) => {
                  const stopPaths = stop.railwayPathIds
                    ? stop.railwayPathIds
                        .map(id => railwayPaths.find(rp => rp.id === id)?.code)
                        .filter(Boolean)
                        .join(', ')
                    : '';
                  return (
                    <tr key={stop.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{stop.code}</td>
                      <td style={{ padding: '16px 24px' }}>{isRTL ? stop.nameAr : stop.nameEn}</td>
                      <td style={{ padding: '16px 24px' }}>{(isRTL ? stop.city?.nameAr : stop.city?.nameEn) || '-'}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--accent-primary)', fontWeight: 500 }}>{stopPaths || '-'}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                      </td>
                      <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => setViewStop(stop)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }} title={isRTL ? "عرض التفاصيل والخريطة" : "View Details & Map"}>
                          <Map size={16} />
                        </button>
                        <button onClick={() => navigate(`/edit-stop/${stop.id}`)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(stop.id)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', margin: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              {t('addNewStop')}
            </h3>
            
            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>{t('nameEnLabel')}</label>
                  <input type="text" className="input-field" required value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('nameArLabel')}</label>
                  <input type="text" className="input-field" required value={formData.nameAr} onChange={(e) => setFormData({...formData, nameAr: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('stationCodeLabel')}</label>
                  <input type="text" className="input-field" required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('cityLabel')}</label>
                  <select className="input-field" value={formData.cityId} onChange={(e) => setFormData({...formData, cityId: e.target.value})}>
                    <option value="">-- {isRTL ? 'اختر المدينة' : 'Select City'} --</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{isRTL ? c.nameAr : c.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('latitudeLabel')}</label>
                  <input type="number" step="any" className="input-field" required value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('longitudeLabel')}</label>
                  <input type="number" step="any" className="input-field" required value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('railwayPaths')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
                  {railwayPaths.map(path => {
                    const isChecked = formData.railwayPathIds.includes(path.id);
                    return (
                      <label key={path.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
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
              
              <div className="form-group">
                <label>{t('descEnLabel')}</label>
                <textarea className="input-field" rows="2" value={formData.descriptionEn} onChange={(e) => setFormData({...formData, descriptionEn: e.target.value})}></textarea>
              </div>
              
              <div className="form-group">
                <label>{t('descArLabel')}</label>
                <textarea className="input-field" rows="2" value={formData.descriptionAr} onChange={(e) => setFormData({...formData, descriptionAr: e.target.value})}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('createStop')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Analysis Modal */}
      {isAnalyzeModalOpen && analyzeResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', margin: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              {t('csvAnalysisResult')}
            </h3>
            
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {isRTL 
                ? `تم تحليل الملف ${analyzeResult.fileName} ويحتوي على ${analyzeResult.total} من الصفوف الصالحة.` 
                : `We analyzed the file ${analyzeResult.fileName} containing ${analyzeResult.total} valid row(s).`}
            </p>

            <ul style={{ marginBottom: '24px', listStyleType: 'none', padding: 0 }}>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('newRecords')}</span>
                <strong style={{ color: 'var(--success)' }}>{analyzeResult.new}</strong>
              </li>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('duplicateRecords')}</span>
                <strong style={{ color: analyzeResult.duplicates > 0 ? 'var(--warning)' : 'inherit' }}>{analyzeResult.duplicates}</strong>
              </li>
            </ul>

            {analyzeResult.duplicates > 0 ? (
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '8px', display: 'block' }}>
                  {t('duplicatesFoundAction')}
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="duplicateAction" 
                      value="update" 
                      checked={analyzeDuplicateAction === 'update'} 
                      onChange={(e) => setAnalyzeDuplicateAction(e.target.value)} 
                    />
                    {t('overwriteExisting')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="duplicateAction" 
                      value="ignore" 
                      checked={analyzeDuplicateAction === 'ignore'} 
                      onChange={(e) => setAnalyzeDuplicateAction(e.target.value)} 
                    />
                    {t('ignoreDuplicates')}
                  </label>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '8px', fontWeight: 500 }}>
                {t('everythingLooksOkNoDuplicates')}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAnalyzeModalOpen(false)}>{t('cancel')}</button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmImport}>{t('confirmAndInsert')}</button>
            </div>
          </div>
        </div>
      )}
      {/* View Stop Details Modal */}
      {viewStop && (

        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', margin: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {t('stopDetails')}
              </h3>
              <button onClick={() => setViewStop(null)} className="btn btn-secondary" style={{ padding: '4px', minWidth: 'auto', border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('code')}</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{viewStop.code}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{isRTL ? 'الاسم (En)' : 'Name (En)'}</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{viewStop.nameEn}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{isRTL ? 'الاسم (Ar)' : 'Name (Ar)'}</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{viewStop.nameAr}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('city')}</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>
                        {(isRTL ? viewStop.city?.nameAr : viewStop.city?.nameEn) || '-'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('paths')}</td>
                      <td style={{ padding: '8px 0', color: 'var(--accent-primary)', fontWeight: 500 }}>
                        {viewStop.railwayPathIds
                          ? viewStop.railwayPathIds
                              .map(id => railwayPaths.find(rp => rp.id === id)?.code)
                              .filter(Boolean)
                              .join(', ')
                          : '-'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('coords')}</td>
                      <td style={{ padding: '8px 0', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {viewStop.latitude?.toFixed(6)}, {viewStop.longitude?.toFixed(6)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>
                    {isRTL ? 'الوصف' : 'Description'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {(isRTL ? viewStop.descriptionAr : viewStop.descriptionEn) || t('noDescriptionAvailable')}
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div 
                ref={viewMapContainerRef} 
                style={{ 
                  width: '100%', 
                  height: '280px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  background: 'rgba(120, 120, 120, 0.05)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => { setViewStop(null); navigate(`/edit-stop/${viewStop.id}`); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit2 size={16} /> {t('editStop')}
              </button>
              <button className="btn btn-primary" onClick={() => setViewStop(null)}>{isRTL ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

