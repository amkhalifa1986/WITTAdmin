import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Edit2, Trash2, Plus, Clock, Search, Upload, Map, MapPin, X, ArrowLeft, Check, AlertTriangle, Download } from 'lucide-react';

const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const RailwayPathsAdmin = () => {
  const { t, isRTL } = useLanguage();
  const [paths, setPaths] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Form / Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPath, setEditingPath] = useState(null);
  const [selectedStartStationId, setSelectedStartStationId] = useState('');
  const [selectedEndStationId, setSelectedEndStationId] = useState('');
  const [pathCode, setPathCode] = useState('');
  const [geoJsonText, setGeoJsonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Preview Map Modal State
  const [previewPath, setPreviewPath] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const previewPolylineRef = useRef(null);
  const previewMarkersRef = useRef([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [pathsRes, stopsRes] = await Promise.all([
        api.adminGetRailwayPaths(),
        api.adminGetStops()
      ]);
      setPaths(pathsRes.data || []);
      setStops(stopsRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingPath(null);
    setSelectedStartStationId('');
    setSelectedEndStationId('');
    setPathCode('');
    setGeoJsonText('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (path) => {
    setEditingPath(path);
    setSelectedStartStationId(path.startStationId);
    setSelectedEndStationId(path.endStationId);
    setPathCode(path.code || '');
    
    // Format coordinates back to standard GeoJSON LineString format for presentation
    // The database store is [Lng, Lat], but RoutePath DTO returned [Lat, Lng]
    // Let's format it as a valid GeoJSON LineString
    const coordinates = path.routePath.map(coords => [coords[1], coords[0]]); // Swap back to [Lng, Lat]
    const geoJsonObj = {
      type: 'Feature',
      properties: {
        start: path.startStationNameEn,
        end: path.endStationNameEn
      },
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    };
    
    setGeoJsonText(JSON.stringify(geoJsonObj, null, 2));
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPath(null);
    setFormError('');
  };

  const downloadGeoJson = (path) => {
    if (!path || !path.routePath) return;
    const coordinates = path.routePath.map(coords => [coords[1], coords[0]]);
    const geoJsonObj = {
      type: 'Feature',
      properties: {
        startStationNameEn: path.startStationNameEn,
        startStationNameAr: path.startStationNameAr,
        endStationNameEn: path.endStationNameEn,
        endStationNameAr: path.endStationNameAr
      },
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    };
    const blob = new Blob([JSON.stringify(geoJsonObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const startName = (path.startStationNameEn || 'Station').replace(/\s+/g, '_');
    const endName = (path.endStationNameEn || 'Station').replace(/\s+/g, '_');
    a.download = `${startName}_to_${endName}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Basic syntax validation
        JSON.parse(text); 
        setGeoJsonText(text);
      } catch (err) {
        setFormError('Uploaded file is not in valid JSON/GeoJSON format.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const validateForm = () => {
    if (!selectedStartStationId || !selectedEndStationId) {
      setFormError('Please select both Start and End Stations.');
      return false;
    }

    if (selectedStartStationId === selectedEndStationId) {
      setFormError('Start Station and End Station cannot be identical.');
      return false;
    }

    if (!editingPath && !pathCode.trim()) {
      setFormError('Please provide a Path Code.');
      return false;
    }

    if (!geoJsonText.trim()) {
      setFormError('Please provide GeoJSON path geometry.');
      return false;
    }

    try {
      const parsed = JSON.parse(geoJsonText);
      
      // Look for a LineString inside the geometry structure (handles raw LineString or Feature with LineString)
      let geometry = parsed;
      if (parsed.type === 'Feature') {
        geometry = parsed.geometry;
      } else if (parsed.type === 'FeatureCollection') {
        const feature = parsed.features?.[0];
        if (feature) {
          geometry = feature.geometry;
        }
      }

      if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
        setFormError('GeoJSON must define a valid LineString geometry.');
        return false;
      }

      if (geometry.coordinates.length < 2) {
        setFormError('A railway path LineString must have at least 2 coordinate points.');
        return false;
      }
    } catch (err) {
      setFormError('Invalid JSON format: ' + err.message);
      return false;
    }

    // Check for duplicates (only for creation)
    if (!editingPath) {
      const duplicate = paths.some(p => 
        (p.startStationId === selectedStartStationId && p.endStationId === selectedEndStationId) ||
        (p.startStationId === selectedEndStationId && p.endStationId === selectedStartStationId)
      );
      if (duplicate) {
        setFormError('A railway path already exists between these stations. Please edit the existing path instead.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setFormError('');
    setSuccess('');

    try {
      if (editingPath) {
        await api.adminUpdateRailwayPath(editingPath.id, geoJsonText);
        setSuccess('Railway path updated successfully.');
      } else {
        await api.adminCreateRailwayPath(selectedStartStationId, selectedEndStationId, pathCode, geoJsonText);
        setSuccess('Railway path created successfully.');
      }
      handleCloseForm();
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this railway path? Associated stations will not be deleted.')) return;
    
    setError('');
    setSuccess('');
    try {
      await api.adminDeleteRailwayPath(id);
      setSuccess('Railway path deleted successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete railway path: ' + err.message);
    }
  };

  // Map Initialization & Updates when previewing
  useEffect(() => {
    if (!previewPath) {
      // Clean up map when closed
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      previewPolylineRef.current = null;
      previewMarkersRef.current = [];
      return;
    }

    // Wait for the modal container to render
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        if (mapContainerRef.current._leaflet_id) {
          return;
        }
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([30.0444, 31.2357], 10);

        // Light Theme base map as requested
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 20
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;
      map.invalidateSize();

      // Clear old layers
      if (previewPolylineRef.current) {
        previewPolylineRef.current.remove();
      }
      previewMarkersRef.current.forEach(m => m.remove());
      previewMarkersRef.current = [];

      // Draw Path
      const coordinates = previewPath.routePath; // already [Lat, Lng] from API MapToDto mapping
      if (coordinates && coordinates.length > 0) {
        previewPolylineRef.current = L.polyline(coordinates, {
          color: '#3b82f6', // Elegant blue track line
          weight: 6,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Fit map bounds to show the entire track nicely
        map.fitBounds(previewPolylineRef.current.getBounds(), { padding: [40, 40] });
      }

      // Add Start Station Marker
      const startStop = stops.find(s => s.id === previewPath.startStationId);
      if (startStop) {
        const startIcon = L.divIcon({
          className: 'custom-station-marker start',
          html: `<div style="background-color: var(--success); width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        const m = L.marker([startStop.latitude, startStop.longitude], { icon: startIcon })
          .addTo(map)
          .bindPopup(`<b>Start Station:</b> ${isRTL ? startStop.nameAr : startStop.nameEn}`);
        previewMarkersRef.current.push(m);
      }

      // Add End Station Marker
      const endStop = stops.find(s => s.id === previewPath.endStationId);
      if (endStop) {
        const endIcon = L.divIcon({
          className: 'custom-station-marker end',
          html: `<div style="background-color: var(--danger); width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        const m = L.marker([endStop.latitude, endStop.longitude], { icon: endIcon })
          .addTo(map)
          .bindPopup(`<b>End Station:</b> ${isRTL ? endStop.nameAr : endStop.nameEn}`);
        previewMarkersRef.current.push(m);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [previewPath, stops]);

  const filteredPaths = paths.filter(p => {
    const code = p.code || '';
    const sNameEn = p.startStationNameEn || '';
    const sNameAr = p.startStationNameAr || '';
    const eNameEn = p.endStationNameEn || '';
    const eNameAr = p.endStationNameAr || '';
    
    return code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sNameAr.includes(searchTerm) ||
           eNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
           eNameAr.includes(searchTerm);
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredPaths.length / itemsPerPage);
  const paginatedPaths = filteredPaths.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && paths.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Clock className="animate-spin" size={32} color="var(--accent-primary)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search paths by station..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        <button className="btn btn-primary" onClick={handleOpenAddForm}>
          <Plus size={18} /> Define New Railway Path
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontWeight: 500, padding: '8px 0' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)', fontWeight: 500, padding: '8px 0' }}>{success}</div>}

      {/* Railway Paths List Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>Code</th>
                <th style={{ padding: '16px 24px' }}>Start Station</th>
                <th style={{ padding: '16px 24px' }}>End Station</th>
                <th style={{ padding: '16px 24px' }}>Path Points</th>
                <th style={{ padding: '16px 24px' }}>Created At</th>
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaths.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No railway paths defined.
                  </td>
                </tr>
              ) : (
                paginatedPaths.map((path) => (
                  <tr key={path.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                      <span className="badge" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {path.code}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isRTL ? path.startStationNameAr : path.startStationNameEn}
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isRTL ? path.endStationNameAr : path.endStationNameEn}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      {path.routePath?.length || 0} points
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(path.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => setPreviewPath(path)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                        title="Preview on Map"
                      >
                        <Map size={14} /> Preview
                      </button>
                      <button 
                        onClick={() => downloadGeoJson(path)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', minWidth: 'auto' }}
                        title="Download GeoJSON"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => handleOpenEditForm(path)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', minWidth: 'auto' }}
                        title="Edit Geometry"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(path.id)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        title="Delete Path"
                      >
                        <Trash2 size={14} />
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

      {/* CREATE / EDIT RAILWAY PATH FORM MODAL */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', margin: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {editingPath ? 'Edit Railway Path Geometry' : 'Define New Railway Path'}
              </h3>
              <button onClick={handleCloseForm} className="btn btn-secondary" style={{ padding: '4px', minWidth: 'auto', border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            
            {formError && (
              <div style={{
                background: 'var(--danger-glow)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Path Code *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. CA-AS" 
                  value={pathCode}
                  onChange={(e) => setPathCode(e.target.value.toUpperCase())}
                  required
                  disabled={!!editingPath}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Start Station *</label>
                  <select 
                    className="input-field" 
                    value={selectedStartStationId} 
                    onChange={(e) => setSelectedStartStationId(e.target.value)}
                    required
                    disabled={!!editingPath} // Cannot modify stations after creation, must delete and recreate
                  >
                    <option value="">-- Select Start Station --</option>
                    {stops.map(stop => (
                      <option key={stop.id} value={stop.id}>{isRTL ? stop.nameAr : stop.nameEn} ({stop.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>End Station *</label>
                  <select 
                    className="input-field" 
                    value={selectedEndStationId} 
                    onChange={(e) => setSelectedEndStationId(e.target.value)}
                    required
                    disabled={!!editingPath}
                  >
                    <option value="">-- Select End Station --</option>
                    {stops.map(stop => (
                      <option key={stop.id} value={stop.id}>{isRTL ? stop.nameAr : stop.nameEn} ({stop.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', background: 'rgba(120, 120, 120, 0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>GeoJSON Track Geometry *</span>
                  
                  <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={14} /> Upload .geojson
                    <input 
                      type="file" 
                      accept=".geojson,.json" 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload} 
                    />
                  </label>
                </div>

                <textarea 
                  className="input-field" 
                  rows="8" 
                  placeholder='{"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[31.2357, 30.0444], [31.24, 30.05], ...]}}'
                  value={geoJsonText}
                  onChange={(e) => setGeoJsonText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  required
                ></textarea>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Provide a valid GeoJSON object containing a LineString representing the physical route track path between the two stations.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingPath ? 'Update Geometry' : 'Create Path')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAP PREVIEW MODAL */}
      {previewPath && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '24px', margin: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Railway Path Route Preview
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isRTL ? previewPath.startStationNameAr : previewPath.startStationNameEn} ⇄ {isRTL ? previewPath.endStationNameAr : previewPath.endStationNameEn}
                </div>
              </div>
              <button onClick={() => setPreviewPath(null)} className="btn btn-secondary" style={{ padding: '4px', minWidth: 'auto', border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {/* Map Container */}
            <div 
              ref={mapContainerRef} 
              style={{ 
                width: '100%', 
                height: '400px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                background: 'rgba(120, 120, 120, 0.05)'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Map Mode: Light Theme</span>
              <span>Total Points: {previewPath.routePath?.length || 0}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button className="btn btn-secondary" onClick={() => downloadGeoJson(previewPath)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Download GeoJSON
              </button>
              <button className="btn btn-primary" onClick={() => setPreviewPath(null)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RailwayPathsAdmin;
