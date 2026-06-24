import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function UserDashboard() {
  const { t, isRTL } = useLanguage();

  // Registration State
  const [regTimeframe, setRegTimeframe] = useState('Day'); // Day, Month, Year
  const [regGender, setRegGender] = useState('All'); // All, Male, Female
  const [regData, setRegData] = useState([]);
  const [regLoading, setRegLoading] = useState(false);
  const [genders, setGenders] = useState([]);

  // Engagement State
  const [engTimeframe, setEngTimeframe] = useState('Day'); // Day, Month, Year
  const [engDateContext, setEngDateContext] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  const [engData, setEngData] = useState([]);
  const [engLoading, setEngLoading] = useState(false);

  // Load Registration Data
  const fetchRegData = async () => {
    setRegLoading(true);
    try {
      const res = await api.adminGetUserRegistrationAnalytics(regTimeframe, regGender);
      setRegData(res.data || []);
    } catch (err) {
      console.error('Error fetching registration analytics:', err);
    } finally {
      setRegLoading(false);
    }
  };

  // Load Engagement Data
  const fetchEngData = async () => {
    setEngLoading(true);
    try {
      const res = await api.adminGetUserEngagementAnalytics(engTimeframe, new Date(engDateContext));
      setEngData(res.data || []);
    } catch (err) {
      console.error('Error fetching engagement analytics:', err);
    } finally {
      setEngLoading(false);
    }
  };

  useEffect(() => {
    fetchRegData();
  }, [regTimeframe, regGender]);

  useEffect(() => {
    const fetchGenders = async () => {
      try {
        const res = await api.adminGetGenders();
        setGenders(res.data || []);
      } catch (err) {
        console.error('Error fetching genders:', err);
      }
    };
    fetchGenders();
  }, []);

  useEffect(() => {
    fetchEngData();
  }, [engTimeframe, engDateContext]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* 1. Registered Users Chart */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>{t('registeredUsers')}</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select 
              value={regTimeframe} 
              onChange={e => setRegTimeframe(e.target.value)}
              className="input-field"
              style={{ padding: '0 8px', borderRadius: '6px', height: '38px', margin: 0, width: '180px', cursor: 'pointer', appearance: 'auto' }}
            >
              <option value="Day">{t('dayViewCurrentMonth')}</option>
              <option value="Month">{t('monthViewLast12Months')}</option>
              <option value="Year">{t('yearView')}</option>
            </select>
            
            <select 
              value={regGender} 
              onChange={e => setRegGender(e.target.value)}
              className="input-field"
              style={{ padding: '0 8px', borderRadius: '6px', height: '38px', margin: 0, width: '150px', cursor: 'pointer', appearance: 'auto' }}
            >
              <option value="All">{t('allGenders')}</option>
              {genders.map(g => (
                <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        {regLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>{t('loading')}</div>
        ) : regData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>{t('noRegistrationData')}</div>
        ) : (
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                <YAxis allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" name={t('registrations')} fill="#4299e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. User Engagement Graph */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>{t('userEngagement')}</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select 
              value={engTimeframe} 
              onChange={e => setEngTimeframe(e.target.value)}
              className="input-field"
              style={{ padding: '0 8px', borderRadius: '6px', height: '38px', margin: 0, width: '180px', cursor: 'pointer', appearance: 'auto' }}
            >
              <option value="Day">{t('dayViewPerHour')}</option>
              <option value="Month">{t('monthViewPerDay')}</option>
              <option value="Year">{t('yearViewPerMonth')}</option>
            </select>
            
            {engTimeframe === 'Day' && (
              <input 
                type="date" 
                value={engDateContext}
                onChange={e => setEngDateContext(e.target.value)}
                className="input-field"
                style={{ padding: '0 8px', borderRadius: '6px', height: '38px', margin: 0 }}
              />
            )}
            {engTimeframe === 'Month' && (
              <input 
                type="month" 
                value={engDateContext.substring(0, 7)}
                onChange={e => {
                  if(e.target.value) setEngDateContext(e.target.value + '-01');
                }}
                className="input-field"
                style={{ padding: '0 8px', borderRadius: '6px', height: '38px', margin: 0 }}
              />
            )}
            {engTimeframe === 'Year' && (
              <input 
                type="number" 
                value={engDateContext.substring(0, 4)}
                onChange={e => {
                  if(e.target.value) setEngDateContext(`${e.target.value}-01-01`);
                }}
                min="2020" max="2100"
                className="input-field"
                style={{ padding: '0 8px', borderRadius: '6px', height: '38px', margin: 0, width: '100px' }}
              />
            )}
          </div>
        </div>

        {engLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>{t('loading')}</div>
        ) : engData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>{t('noEngagementData')}</div>
        ) : (
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                <YAxis allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" name={t('activeUsers')} fill="#48bb78" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
