import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { usePopup } from '../../context/PopupContext';
import { Edit2, Trash2, Plus, Clock, Search } from 'lucide-react';

const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const LookupsAdmin = () => {
  const { t, isRTL } = useLanguage();
  const { toast, confirm } = usePopup();
  const [activeTab, setActiveTab] = useState('cities'); // cities, governorates, statusTags, crowdLevels, trainTypes
  const [cities, setCities] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [statusTags, setStatusTags] = useState([]);
  const [crowdLevels, setCrowdLevels] = useState([]);
  const [trainTypes, setTrainTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [citiesRes, govRes, tagsRes, crowdRes, typeRes] = await Promise.all([
        api.adminGetCities(),
        api.adminGetGovernorates(),
        api.adminGetStatusTags(),
        api.adminGetCrowdLevels(),
        api.adminGetTrainTypes()
      ]);
      setCities(citiesRes.data || []);
      setGovernorates(govRes.data || []);
      setStatusTags(tagsRes.data || []);
      setCrowdLevels(crowdRes.data || []);
      setTrainTypes(typeRes.data || []);
    } catch (err) {
      toast('Failed to fetch data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (activeTab === 'cities') {
      setFormData({
        nameEn: item ? item.nameEn : '',
        nameAr: item ? item.nameAr : '',
        governorateId: item ? item.governorateId : ''
      });
    } else if (activeTab === 'governorates') {
      setFormData({
        nameEn: item ? item.nameEn : '',
        nameAr: item ? item.nameAr : ''
      });
    } else if (activeTab === 'statusTags') {
      setFormData({
        nameEn: item ? item.nameEn : '',
        nameAr: item ? item.nameAr : '',
        code: item ? item.code : '',
        color: item ? item.color : '#3b82f6'
      });
    } else if (activeTab === 'crowdLevels') {
      setFormData({
        nameEn: item ? item.nameEn : '',
        nameAr: item ? item.nameAr : '',
        code: item ? item.code : '',
        level: item ? item.level : 0
      });
    } else if (activeTab === 'trainTypes') {
      setFormData({
        nameEn: item ? item.nameEn : '',
        nameAr: item ? item.nameAr : '',
        markerPngUrl: item ? item.markerPngUrl : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (activeTab === 'cities') {
        const payload = {
          nameEn: formData.nameEn,
          nameAr: formData.nameAr,
          governorateId: formData.governorateId || null
        };
        if (editingItem) {
          await api.adminUpdateCity(editingItem.id, payload);
          toast('City updated successfully.', 'success');
        } else {
          await api.adminCreateCity(payload);
          toast('City created successfully.', 'success');
        }
      } else if (activeTab === 'governorates') {
        const payload = {
          nameEn: formData.nameEn,
          nameAr: formData.nameAr
        };
        if (editingItem) {
          await api.adminUpdateGovernorate(editingItem.id, payload);
          toast('Governorate updated successfully.', 'success');
        } else {
          await api.adminCreateGovernorate(payload);
          toast('Governorate created successfully.', 'success');
        }
      } else if (activeTab === 'statusTags') {
        if (editingItem) {
          await api.adminUpdateStatusTag(editingItem.id, formData.nameAr, formData.nameEn, formData.code, formData.color);
          toast('Status Tag updated successfully.', 'success');
        } else {
          await api.adminCreateStatusTag(formData.nameAr, formData.nameEn, formData.code, formData.color);
          toast('Status Tag created successfully.', 'success');
        }
      } else if (activeTab === 'crowdLevels') {
        if (editingItem) {
          await api.adminUpdateCrowdLevel(editingItem.id, formData.nameAr, formData.nameEn, formData.code, formData.level);
          toast('Crowd Level updated successfully.', 'success');
        } else {
          await api.adminCreateCrowdLevel(formData.nameAr, formData.nameEn, formData.code, formData.level);
          toast('Crowd Level created successfully.', 'success');
        }
      } else if (activeTab === 'trainTypes') {
        const payload = {
          nameEn: formData.nameEn,
          nameAr: formData.nameAr,
          markerPngUrl: formData.markerPngUrl || null
        };
        if (editingItem) {
          await api.adminUpdateTrainType(editingItem.id, payload);
          toast('Train Type updated successfully.', 'success');
        } else {
          await api.adminCreateTrainType(payload);
          toast('Train Type created successfully.', 'success');
        }
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    let tabLabel = activeTab;
    if (activeTab === 'statusTags') tabLabel = 'status tag';
    if (activeTab === 'crowdLevels') tabLabel = 'crowd level';

    const confirmed = await confirm(`Are you sure you want to delete this ${tabLabel}?`);
    if (!confirmed) return;
    
    try {
      if (activeTab === 'cities') {
        await api.adminDeleteCity(id);
      } else if (activeTab === 'governorates') {
        await api.adminDeleteGovernorate(id);
      } else if (activeTab === 'statusTags') {
        await api.adminDeleteStatusTag(id);
      } else if (activeTab === 'crowdLevels') {
        await api.adminDeleteCrowdLevel(id);
      } else if (activeTab === 'trainTypes') {
        await api.adminDeleteTrainType(id);
      }
      toast('Item deleted successfully.', 'success');
      fetchData();
    } catch (err) {
      toast('Failed to delete item: ' + err.message, 'error');
    }
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'cities': return cities;
      case 'governorates': return governorates;
      case 'statusTags': return statusTags;
      case 'crowdLevels': return crowdLevels;
      case 'trainTypes': return trainTypes;
      default: return [];
    }
  };

  const filteredItems = getActiveList().filter(item => 
    (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.nameAr && item.nameAr.includes(searchTerm)) ||
    (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && cities.length === 0 && governorates.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Clock className="animate-spin" size={32} color="var(--accent-primary)" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Internal Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => { setActiveTab('cities'); setSearchTerm(''); }} className={`btn ${activeTab === 'cities' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          Cities
        </button>
        <button onClick={() => { setActiveTab('governorates'); setSearchTerm(''); }} className={`btn ${activeTab === 'governorates' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          Governorates
        </button>
        <button onClick={() => { setActiveTab('statusTags'); setSearchTerm(''); }} className={`btn ${activeTab === 'statusTags' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          Status Tags
        </button>
        <button onClick={() => { setActiveTab('crowdLevels'); setSearchTerm(''); }} className={`btn ${activeTab === 'crowdLevels' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          Crowd Levels
        </button>
        <button onClick={() => { setActiveTab('trainTypes'); setSearchTerm(''); }} className={`btn ${activeTab === 'trainTypes' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          Train Types
        </button>
      </div>

      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder={`Search lookups...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add {
            activeTab === 'cities' ? 'City' : 
            activeTab === 'governorates' ? 'Governorate' : 
            activeTab === 'statusTags' ? 'Status Tag' : 
            activeTab === 'trainTypes' ? 'Train Type' : 'Crowd Level'
          }
        </button>
      </div>



      {/* Data Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '16px 24px' }}>Name</th>
                {(activeTab === 'statusTags' || activeTab === 'crowdLevels') && <th style={{ padding: '16px 24px' }}>Code</th>}
                {activeTab === 'cities' && <th style={{ padding: '16px 24px' }}>Governorate</th>}
                {activeTab === 'statusTags' && <th style={{ padding: '16px 24px' }}>Color</th>}
                {activeTab === 'crowdLevels' && <th style={{ padding: '16px 24px' }}>Numeric Level</th>}
                {activeTab === 'trainTypes' && <th style={{ padding: '16px 24px' }}>Map Marker</th>}
                <th style={{ padding: '16px 24px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No items found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{isRTL ? item.nameAr : item.nameEn}</td>
                    {(activeTab === 'statusTags' || activeTab === 'crowdLevels') && <td style={{ padding: '16px 24px', fontFamily: 'monospace' }}>{item.code}</td>}
                    {activeTab === 'cities' && <td style={{ padding: '16px 24px' }}>{(isRTL ? item.governorate?.nameAr : item.governorate?.nameEn) || '-'}</td>}
                    {activeTab === 'statusTags' && (
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: item.color || '#ccc', border: '1px solid var(--border-color)' }}></span>
                          {item.color}
                        </span>
                      </td>
                    )}
                    {activeTab === 'crowdLevels' && <td style={{ padding: '16px 24px', fontWeight: 600 }}>{item.level}</td>}
                    {activeTab === 'trainTypes' && (
                      <td style={{ padding: '16px 24px' }}>
                        {item.markerPngUrl ? (
                          <img 
                            src={`http://localhost:5245${item.markerPngUrl}`} 
                            alt="Marker" 
                            style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Default</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleOpenModal(item)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }}>
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

      {/* Modal Form */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', margin: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              {editingItem ? 'Edit' : 'Add'} {
                activeTab === 'cities' ? 'City' : 
                activeTab === 'governorates' ? 'Governorate' : 
                activeTab === 'statusTags' ? 'Status Tag' : 
                activeTab === 'trainTypes' ? 'Train Type' : 'Crowd Level'
              }
            </h3>
            


            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Name (En) *</label>
                <input type="text" className="input-field" required value={formData.nameEn || ''} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Name (Ar) *</label>
                <input type="text" className="input-field" required value={formData.nameAr || ''} onChange={(e) => setFormData({...formData, nameAr: e.target.value})} />
              </div>
              
              {activeTab === 'cities' && (
                <div className="form-group">
                  <label>Governorate</label>
                  <select className="input-field" value={formData.governorateId || ''} onChange={(e) => setFormData({...formData, governorateId: e.target.value})}>
                    <option value="">-- Select Governorate --</option>
                    {governorates.map(g => (
                      <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.nameEn}</option>
                    ))}
                  </select>
                </div>
              )}

              {(activeTab === 'statusTags' || activeTab === 'crowdLevels') && (
                <div className="form-group">
                  <label>Code *</label>
                  <input type="text" className="input-field" required value={formData.code || ''} onChange={(e) => setFormData({...formData, code: e.target.value})} />
                </div>
              )}

              {activeTab === 'statusTags' && (
                <div className="form-group">
                  <label>Color Code *</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} value={formData.color || '#3b82f6'} onChange={(e) => setFormData({...formData, color: e.target.value})} />
                    <input type="text" className="input-field" required value={formData.color || ''} onChange={(e) => setFormData({...formData, color: e.target.value})} />
                  </div>
                </div>
              )}

              {activeTab === 'crowdLevels' && (
                <div className="form-group">
                  <label>Numeric Level Value *</label>
                  <input type="number" className="input-field" required min="0" max="100" value={formData.level !== undefined ? formData.level : ''} onChange={(e) => setFormData({...formData, level: e.target.value})} />
                </div>
              )}

              {activeTab === 'trainTypes' && (
                <div className="form-group">
                  <label>Marker Image (PNG/JPG/SVG)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            const res = await api.adminUploadTrainTypeMarker(file);
                            if (res.isSuccess) {
                              setFormData({...formData, markerPngUrl: res.data});
                            }
                          } catch (err) {
                            toast('Failed to upload marker: ' + err.message, 'error');
                          }
                        }
                      }} 
                    />
                    {formData.markerPngUrl && (
                      <img 
                        src={`http://localhost:5245${formData.markerPngUrl}`} 
                        alt="Preview" 
                        style={{ width: '30px', height: '30px', objectFit: 'contain' }} 
                      />
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
