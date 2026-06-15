import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Edit2, Trash2, Plus, Clock, Search, Shield, ShieldAlert, Key } from 'lucide-react';

const toArabicDigits = (num) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const AdminsRolesAdmin = () => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('admins'); // admins, roles
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const getModuleTranslation = (mod) => {
    const mapping = {
      'Dashboard': 'dashboard',
      'Users': 'users',
      'Trains': 'trains',
      'Trips': 'trips',
      'Stops': 'stops',
      'Lookups': 'lookups',
      'LostFound': 'lostFound',
      'Suggestions': 'routeSuggestions',
      'Disruptions': 'serviceAlerts',
      'RailwayPaths': 'railwayPaths',
      'Updates': 'liveUpdatesModeration',
      'Settings': 'systemSettings'
    };
    const key = mapping[mod];
    return key ? t(key) : mod;
  };

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Forms state
  const [roleForm, setRoleForm] = useState({ name: '', description: '', privileges: [] });
  const [adminForm, setAdminForm] = useState({ email: '', displayName: '', password: '', roleId: '' });

  const modules = ["Dashboard", "Users", "Trains", "Trips", "Stops", "Lookups", "LostFound", "Suggestions", "Disruptions", "RailwayPaths", "Updates", "Settings"];

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
      const [adminsRes, rolesRes] = await Promise.all([
        api.adminGetAdmins(),
        api.adminGetRoles()
      ]);
      setAdmins(adminsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err) {
      setError('Failed to fetch admin data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoleModal = (role = null) => {
    setEditingRole(role);
    if (role) {
      setRoleForm({
        name: role.name,
        description: role.description || '',
        privileges: modules.map(m => {
          const priv = role.privileges.find(p => p.module.toLowerCase() === m.toLowerCase());
          return {
            module: m,
            canView: priv ? !!priv.canView : false,
            canAdd: priv ? !!priv.canAdd : false,
            canEdit: priv ? !!priv.canEdit : false,
            canDelete: priv ? !!priv.canDelete : false
          };
        })
      });
    } else {
      setRoleForm({
        name: '',
        description: '',
        privileges: modules.map(m => ({
          module: m,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false
        }))
      });
    }
    setIsRoleModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleOpenAdminModal = (admin = null) => {
    setEditingAdmin(admin);
    if (admin) {
      setAdminForm({
        email: admin.email,
        displayName: admin.displayName,
        password: '', // Leave blank unless changing
        roleId: admin.roleId || ''
      });
    } else {
      setAdminForm({
        email: '',
        displayName: '',
        password: '',
        roleId: ''
      });
    }
    setIsAdminModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleRolePrivilegeChange = (moduleIndex, privilegeType, value) => {
    const updatedPrivs = [...roleForm.privileges];
    updatedPrivs[moduleIndex] = {
      ...updatedPrivs[moduleIndex],
      [privilegeType]: value
    };
    // Automatically check View if Add, Edit, or Delete are checked
    if ((privilegeType === 'canAdd' || privilegeType === 'canEdit' || privilegeType === 'canDelete') && value) {
      updatedPrivs[moduleIndex].canView = true;
    }
    setRoleForm({ ...roleForm, privileges: updatedPrivs });
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingRole) {
        await api.adminUpdateRole(editingRole.id, roleForm);
        setSuccess(t('roleUpdatedSuccess'));
      } else {
        await api.adminCreateRole(roleForm);
        setSuccess(t('roleCreatedSuccess'));
      }
      setIsRoleModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        email: adminForm.email,
        displayName: adminForm.displayName,
        roleId: adminForm.roleId || null
      };
      if (adminForm.password.trim()) {
        payload.password = adminForm.password;
      } else if (!editingAdmin) {
        throw new Error("Password is required for new admin.");
      }

      if (editingAdmin) {
        await api.adminUpdateAdmin(editingAdmin.id, payload);
        setSuccess(t('adminUpdatedSuccess'));
      } else {
        await api.adminCreateAdmin(payload);
        setSuccess(t('adminCreatedSuccess'));
      }
      setIsAdminModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm(t('confirmDeleteRole'))) return;
    setError('');
    setSuccess('');
    try {
      await api.adminDeleteRole(id);
      setSuccess(t('roleDeletedSuccess'));
      fetchData();
    } catch (err) {
      setError('Failed to delete role: ' + err.message);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm(t('confirmDeleteAdmin'))) return;
    setError('');
    setSuccess('');
    try {
      await api.adminDeleteAdmin(id);
      setSuccess(t('adminDeletedSuccess'));
      fetchData();
    } catch (err) {
      setError('Failed to delete admin: ' + err.message);
    }
  };

  const filteredAdmins = admins.filter(a =>
    a.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.roleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const itemsPerPage = 10;
  const totalPagesAdmins = Math.ceil(filteredAdmins.length / itemsPerPage);
  const totalPagesRoles = Math.ceil(filteredRoles.length / itemsPerPage);

  const paginatedAdmins = filteredAdmins.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && admins.length === 0 && roles.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Clock className="animate-spin" size={32} color="var(--accent-primary)" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => { setActiveTab('admins'); setSearchTerm(''); }} className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          {t('systemAdmins')}
        </button>
        <button onClick={() => { setActiveTab('roles'); setSearchTerm(''); }} className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          {t('customRoles')}
        </button>
      </div>

      {/* Header Search & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder={t('searchPlaceholder').replace('{item}', activeTab === 'admins' ? t('systemAdmins') : t('customRoles'))}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        {activeTab === 'admins' ? (
          <button className="btn btn-primary" onClick={() => handleOpenAdminModal()}>
            <Plus size={18} /> {t('addAdmin')}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => handleOpenRoleModal()}>
            <Plus size={18} /> {t('addCustomRole')}
          </button>
        )}
      </div>

      {error && <div style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)', fontWeight: 500 }}>{success}</div>}

      {/* ADMINS TABLE */}
      {activeTab === 'admins' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '16px 24px' }}>{t('name')}</th>
                  <th style={{ padding: '16px 24px' }}>{t('email')}</th>
                  <th style={{ padding: '16px 24px' }}>{t('role')}</th>
                  <th style={{ padding: '16px 24px' }}>{t('status')}</th>
                  <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {t('noAdminsFound')}
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((adm) => (
                    <tr key={adm.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {adm.isSuperAdmin ? <ShieldAlert size={16} color="var(--danger)" /> : <Shield size={16} color="var(--accent-primary)" />}
                          {adm.displayName}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{adm.email}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className={`badge ${adm.isSuperAdmin ? 'badge-cancelled' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                          {adm.roleName}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className="badge badge-on-time" style={{ fontSize: '0.65rem' }}>{t('active')}</span>
                      </td>
                      <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {!adm.isSuperAdmin && (
                          <>
                            <button onClick={() => handleOpenAdminModal(adm)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }} title={t('edit')}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteAdmin(adm.id)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }} title={t('delete')}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPagesAdmins > 1 && (
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
                  ? `صفحة ${toArabicDigits(currentPage)} من ${toArabicDigits(totalPagesAdmins)}`
                  : `Page ${currentPage} of ${totalPagesAdmins}`}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPagesAdmins))}
                disabled={currentPage === totalPagesAdmins}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {t('next')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ROLES TABLE */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '16px 24px', width: '200px' }}>{t('roleNameLabel')}</th>
                  <th style={{ padding: '16px 24px' }}>{t('desc')}</th>
                  <th style={{ padding: '16px 24px', width: '120px', textAlign: 'center' }}>{isRTL ? 'الأقسام المحددة' : 'Modules Configured'}</th>
                  <th style={{ padding: '16px 24px', textAlign: 'center' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {t('noCustomRolesFound')}
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => (
                    <tr key={role.id} style={{ borderBottom: '1px solid rgba(120,120,120,0.02)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{role.name}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{role.description || '-'}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 600 }}>
                        {role.privileges.filter(p => p.canView || p.canAdd || p.canEdit || p.canDelete).length} / {modules.length}
                      </td>
                      <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenRoleModal(role)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto' }} title={t('edit')}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteRole(role.id)} className="btn btn-secondary" style={{ padding: '6px', minWidth: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }} title={t('delete')}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPagesRoles > 1 && (
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
                  ? `صفحة ${toArabicDigits(currentPage)} من ${toArabicDigits(totalPagesRoles)}`
                  : `Page ${currentPage} of ${totalPagesRoles}`}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPagesRoles))}
                disabled={currentPage === totalPagesRoles}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {t('next')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ROLE MODAL FORM */}
      {isRoleModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              {editingRole ? t('editRole') : t('addCustomRole')}
            </h3>
            
            <form onSubmit={handleRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 250px' }}>
                  <label>{t('roleNameLabel')}</label>
                  <input type="text" className="input-field" required value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: '2 1 350px' }}>
                  <label>{t('desc')}</label>
                  <input type="text" className="input-field" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
                </div>
              </div>

              <label style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '-4px' }}>{t('modulePermissions')}</label>
              
              <div style={{ overflowY: 'auto', flexGrow: 1, border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(120,120,120,0.01)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: isRTL ? 'right' : 'left' }}>
                      <th style={{ padding: '8px' }}>{t('module')}</th>
                      <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>{t('view')}</th>
                      <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>{t('add')}</th>
                      <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>{t('edit')}</th>
                      <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>{t('delete')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleForm.privileges.map((p, idx) => (
                      <tr key={p.module} style={{ borderBottom: '1px solid rgba(120,120,120,0.03)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{getModuleTranslation(p.module)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={p.canView} onChange={(e) => handleRolePrivilegeChange(idx, 'canView', e.target.checked)} />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={p.canAdd} onChange={(e) => handleRolePrivilegeChange(idx, 'canAdd', e.target.checked)} />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={p.canEdit} onChange={(e) => handleRolePrivilegeChange(idx, 'canEdit', e.target.checked)} />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={p.canDelete} onChange={(e) => handleRolePrivilegeChange(idx, 'canDelete', e.target.checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRoleModalOpen(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{editingRole ? t('saveChanges') : t('createRole')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MODAL FORM */}
      {isAdminModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              {editingAdmin ? t('editAdminDetails') : t('addSystemAdmin')}
            </h3>
            
            <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>{t('displayNameLabel')}</label>
                <input type="text" className="input-field" required value={adminForm.displayName} onChange={(e) => setAdminForm({ ...adminForm, displayName: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label>{t('emailLabel')}</label>
                <input type="email" className="input-field" required value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
              </div>

              <div className="form-group">
                <label>{t('passwordLabel')} {editingAdmin ? (isRTL ? '(اتركه فارغاً للاحتفاظ بالحالي)' : '(Leave blank to keep current)') : '*'}</label>
                <div style={{ position: 'relative' }}>
                  <input type="password" className="input-field" required={!editingAdmin} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
                  <Key size={16} style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label>{t('assignRoleLabel')}</label>
                <select className="input-field" required value={adminForm.roleId} onChange={(e) => setAdminForm({ ...adminForm, roleId: e.target.value })}>
                  <option value="">{t('selectCustomRoleOption')}</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdminModalOpen(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{editingAdmin ? t('saveChanges') : t('createAdmin')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminsRolesAdmin;
