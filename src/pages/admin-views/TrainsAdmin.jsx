import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { usePopup } from '../../context/PopupContext';
import { Edit2, Trash2, Plus, Clock, Search, Upload, Download, Eye, ChevronDown, X } from 'lucide-react';

const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const TrainsAdmin = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { toast, confirm } = usePopup();
  const [trains, setTrains] = useState([]);
  const [trainTypes, setTrainTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainType, setSelectedTrainType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Analysis Modal state
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzeDuplicateAction, setAnalyzeDuplicateAction] = useState('update');
  
  // Route Sequence Modal state
  const [selectedRouteTrain, setSelectedRouteTrain] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    trainNumber: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    trainTypeId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const renderStopsSequence = (item) => {
    if (!item.routeStops || item.routeStops.length === 0) return '-';
    const sortedStops = [...item.routeStops].sort((a, b) => a.stopOrder - b.stopOrder);
    const startStop = isRTL ? sortedStops[0].stopNameAr : sortedStops[0].stopNameEn;
    const endStop = isRTL ? sortedStops[sortedStops.length - 1].stopNameAr : sortedStops[sortedStops.length - 1].stopNameEn;
    
    if (sortedStops.length === 1) return startStop;
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.85rem' }}>{startStop}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>...</span>
        <span style={{ fontSize: '0.85rem' }}>{endStop}</span>
        <button 
          onClick={() => setSelectedRouteTrain(item)} 
          className="btn btn-secondary" 
          style={{ padding: '4px 6px', minWidth: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          title={isRTL ? "عرض خط السير" : "View Route Sequence"}
        >
          <Eye size={13} />
        </button>
      </div>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trainsRes, typesRes] = await Promise.all([
        api.adminGetTrains(),
        api.adminGetTrainTypes()
      ]);
      setTrains(trainsRes.data || []);
      setTrainTypes(typesRes.data || []);
    } catch (err) {
      toast('Failed to fetch data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      trainNumber: '',
      nameEn: '',
      nameAr: '',
      descriptionEn: '',
      descriptionAr: '',
      trainTypeId: ''
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
        ...formData,
        trainTypeId: formData.trainTypeId || null,
        routeStops: [] 
      };

      await api.adminCreateTrain(payload);
      toast('Train created successfully.', 'success');
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm('Are you sure you want to delete this train?');
    if (!confirmed) return;
    try {
      await api.adminDeleteTrain(id);
      toast('Train deleted successfully.', 'success');
      fetchData();
    } catch (err) {
      toast('Failed to delete train: ' + err.message, 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        toast('CSV is empty or invalid.', 'error');
        e.target.value = null;
        return;
      }
      
      const dataRows = lines.slice(1);
      let duplicateCount = 0;
      let newCount = 0;
      
      // We might have multiple rows for the same train (route stops), so use a Set for unique trains
      const processedTrains = new Set();

      dataRows.forEach(line => {
        const parts = line.split(',');
        if (parts.length > 0) {
          const tNumber = parts[0].trim().replace(/^"|"$/g, '').toLowerCase();
          if (tNumber && !processedTrains.has(tNumber)) {
            processedTrains.add(tNumber);
            const exists = trains.some(t => t.trainNumber?.toLowerCase() === tNumber);
            if (exists) duplicateCount++;
            else newCount++;
          }
        }
      });

      setAnalyzeResult({
        total: processedTrains.size,
        new: newCount,
        duplicates: duplicateCount,
        textContent: text,
        fileName: file.name
      });
      setAnalyzeDuplicateAction('update');
      setIsAnalyzeModalOpen(true);

    } catch (err) {
      toast('Failed to read file: ' + err.message, 'error');
    } finally {
      e.target.value = null;
    }
  };

  const handleConfirmImport = async () => {
    setIsAnalyzeModalOpen(false);
    setImporting(true);

    try {
      const ignoreDuplicates = analyzeDuplicateAction === 'ignore';
      const res = await api.adminImportTrains(analyzeResult.textContent, ignoreDuplicates);
      toast(`Imported successfully! (${analyzeResult.fileName})`, 'success');
      fetchData();
    } catch (err) {
      toast(err.message || 'Failed to import trains.', 'error');
    } finally {
      setImporting(false);
      setAnalyzeResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = "TrainNumber,NameAr,NameEn,DescAr,DescEn,StopCode,StopOrder,Arrival,Departure\nTR-100,قطار,Train,وصف,Description,ST-01,1,08:00:00,08:15:00";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TrainsTemplate.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const normalizeSearch = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');
  };

  const filteredItems = trains.filter(item => {
    if (selectedTrainType && item.trainTypeId !== selectedTrainType) {
      return false;
    }

    const term = normalizeSearch(searchTerm);
    if (!term) return true;

    const trainNum = normalizeSearch(item.trainNumber);
    const nameEn = normalizeSearch(item.nameEn);
    const nameAr = normalizeSearch(item.nameAr);
    const pathCode = normalizeSearch(item.pathCode);
    const pathNameEn = normalizeSearch(item.pathNameEn);
    const pathNameAr = normalizeSearch(item.pathNameAr);
    
    const matchesTrain = trainNum.includes(term) ||
      nameEn.includes(term) ||
      nameAr.includes(term) ||
      pathCode.includes(term) ||
      pathNameEn.includes(term) ||
      pathNameAr.includes(term);

    const matchesStops = item.routeStops && item.routeStops.some(stop => {
      const stopEn = normalizeSearch(stop.stopNameEn);
      const stopAr = normalizeSearch(stop.stopNameAr);
      const stopCode = normalizeSearch(stop.stopCode);
      return stopEn.includes(term) || 
             stopAr.includes(term) ||
             stopCode.includes(term);
    });

    return matchesTrain || matchesStops;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && trains.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Clock className="animate-spin" size={32} color="var(--accent-primary)" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          {isRTL ? 'القطارات' : 'Trains'}
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
          <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder={isRTL ? 'البحث برقم القطار، المحطات، المسارات...' : 'Search trains, stops, paths...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', paddingRight: searchTerm ? '36px' : '12px', height: '40px', margin: 0 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <input 
            type="file" 
            accept=".csv" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={importing}
              style={{ height: '40px', margin: 0 }}
            >
              {importing ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
              {importing ? 'Processing...' : 'Import'} <ChevronDown size={16} />
            </button>
            {isDropdownOpen && !importing && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                [isRTL ? 'left' : 'right']: 0, 
                marginTop: '8px', 
                background: 'var(--panel-bg)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px', 
                zIndex: 10,
                minWidth: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }} 
                  onClick={() => { fileInputRef.current?.click(); setIsDropdownOpen(false); }}
                >
                  <Upload size={16} /> Upload CSV
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }} 
                  onClick={() => { handleDownloadTemplate(); setIsDropdownOpen(false); }}
                >
                  <Download size={16} /> Download Template
                </button>
              </div>
            )}
          </div>
          
          <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ height: '40px', margin: 0 }}>
            <Plus size={18} /> {isRTL ? 'إضافة قطار' : 'Add Train'}
          </button>
        </div>
      </div>



      {/* Data Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>Number</th>
                <th style={{ padding: '16px 24px' }}>Name</th>
                <th style={{ padding: '16px 24px' }}>Type</th>
                <th style={{ padding: '16px 24px' }}>Path Code</th>
                <th style={{ padding: '16px 24px' }}>Followers</th>
                <th style={{ padding: '16px 24px' }}>Route (Stops)</th>
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No trains found.</td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.trainNumber}</td>
                    <td style={{ padding: '16px 24px' }}>{isRTL ? item.nameAr : item.nameEn}</td>
                    <td style={{ padding: '16px 24px' }}>
                      {item.markerPngUrl ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <img src={`http://localhost:5245${item.markerPngUrl}`} alt="Icon" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                          {isRTL ? item.trainTypeNameAr : item.trainTypeNameEn}
                        </span>
                      ) : (
                        <span>{isRTL ? item.trainTypeNameAr : item.trainTypeNameEn || '-'}</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {(isRTL ? item.pathNameAr : item.pathNameEn) ? (
                        <span className="badge" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {isRTL ? item.pathNameAr : item.pathNameEn}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{item.followerCount || 0}</td>
                    <td style={{ padding: '16px 24px' }}>{renderStopsSequence(item)}</td>
                    <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => navigate(`/edit-train/${item.id}`)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', margin: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              Add New Train
            </h3>
            


            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label>Train Number *</label>
                <input type="text" className="input-field" required value={formData.trainNumber} onChange={(e) => setFormData({...formData, trainNumber: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Name (En) *</label>
                  <input type="text" className="input-field" required value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Name (Ar) *</label>
                  <input type="text" className="input-field" required value={formData.nameAr} onChange={(e) => setFormData({...formData, nameAr: e.target.value})} />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description (En)</label>
                <textarea className="input-field" rows="2" value={formData.descriptionEn} onChange={(e) => setFormData({...formData, descriptionEn: e.target.value})}></textarea>
              </div>
              
              <div className="form-group">
                <label>Description (Ar)</label>
                <textarea className="input-field" rows="2" value={formData.descriptionAr} onChange={(e) => setFormData({...formData, descriptionAr: e.target.value})}></textarea>
              </div>

              <div className="form-group">
                <label>Train Type</label>
                <select 
                  className="input-field" 
                  value={formData.trainTypeId || ''} 
                  onChange={(e) => setFormData({...formData, trainTypeId: e.target.value})}
                >
                  <option value="">-- Select Train Type --</option>
                  {trainTypes.map(t => (
                    <option key={t.id} value={t.id}>{isRTL ? t.nameAr : t.nameEn}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Train</button>
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
              CSV Analysis Result
            </h3>
            
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              We analyzed the file <strong>{analyzeResult.fileName}</strong>. Found {analyzeResult.total} unique train(s).
            </p>

            <ul style={{ marginBottom: '24px', listStyleType: 'none', padding: 0 }}>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span>New Records:</span>
                <strong style={{ color: 'var(--success)' }}>{analyzeResult.new}</strong>
              </li>
              <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Duplicate Records (Existing Train Number):</span>
                <strong style={{ color: analyzeResult.duplicates > 0 ? 'var(--warning)' : 'inherit' }}>{analyzeResult.duplicates}</strong>
              </li>
            </ul>

            {analyzeResult.duplicates > 0 ? (
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '8px', display: 'block' }}>
                  Duplicates found. How would you like to handle them?
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
                    Overwrite Existing
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="duplicateAction" 
                      value="ignore" 
                      checked={analyzeDuplicateAction === 'ignore'} 
                      onChange={(e) => setAnalyzeDuplicateAction(e.target.value)} 
                    />
                    Ignore Duplicates
                  </label>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '8px', fontWeight: 500 }}>
                Everything looks OK. No duplicates found. You can safely proceed to insert.
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAnalyzeModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmImport}>Confirm & Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Route Sequence Modal */}
      {selectedRouteTrain && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '24px', margin: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isRTL ? `مسار القطار ${selectedRouteTrain.trainNumber}` : `Route for Train ${selectedRouteTrain.trainNumber}`}
              </h3>
              <button 
                onClick={() => setSelectedRouteTrain(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
              {[...selectedRouteTrain.routeStops].sort((a, b) => a.stopOrder - b.stopOrder).map((stop, index) => (
                <div key={stop.stopId || index} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(120, 120, 120, 0.02)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {stop.stopOrder}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {isRTL ? stop.stopNameAr : stop.stopNameEn}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Code: {stop.stopCode}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    {stop.scheduledArrival ? `Arr: ${stop.scheduledArrival.slice(0,5)}` : 'Arr: -'}
                    <br />
                    {stop.scheduledDeparture ? `Dep: ${stop.scheduledDeparture.slice(0,5)}` : 'Dep: -'}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRouteTrain(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
