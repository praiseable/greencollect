import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FiMapPin, FiUser, FiPlus, FiTrash2, FiRefreshCw, FiClock,
  FiChevronRight, FiCheck, FiX, FiAlertTriangle, FiShield
} from 'react-icons/fi';
import {
  getTerritories, getGeoZones, getUsers, assignTerritory, removeTerritory,
  updateTerritory, getEscalationRules, updateEscalationRule, bulkAssignTerritories,
} from '../services/api';

const ROLE_COLORS = {
  DEALER: 'bg-blue-100 text-blue-700',
  FRANCHISE_OWNER: 'bg-purple-100 text-purple-700',
  REGIONAL_MANAGER: 'bg-orange-100 text-orange-700',
  WHOLESALE_BUYER: 'bg-green-100 text-green-700',
};

const ZONE_TYPE_COLORS = {
  COUNTRY: 'bg-red-50 text-red-700 border-red-200',
  PROVINCE: 'bg-orange-50 text-orange-700 border-orange-200',
  CITY: 'bg-blue-50 text-blue-700 border-blue-200',
  LOCAL_AREA: 'bg-green-50 text-green-700 border-green-200',
};

const VISIBILITY_COLORS = {
  LOCAL: '#22c55e',
  NEIGHBOR: '#3b82f6',
  CITY: '#8b5cf6',
  PROVINCE: '#f59e0b',
  NATIONAL: '#ef4444',
  PUBLIC: '#6b7280',
};

export default function Territories() {
  const [tab, setTab] = useState('assignments'); // assignments | escalation | assign-new
  const [territories, setTerritories] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [escalationRules, setEscalationRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assign form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedZones, setSelectedZones] = useState([]);
  const [isExclusive, setIsExclusive] = useState(true);
  const [notes, setNotes] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterZoneType, setFilterZoneType] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [terRes, zoneRes, userRes, escRes] = await Promise.all([
        getTerritories({ limit: 200 }),
        getGeoZones({ limit: 500 }),
        getUsers({ limit: 200, role: 'DEALER,FRANCHISE_OWNER,REGIONAL_MANAGER,WHOLESALE_BUYER' }),
        getEscalationRules(),
      ]);
      setTerritories(terRes.data?.data || []);
      setZones(zoneRes.data?.data || zoneRes.data || []);
      setUsers(userRes.data?.data || userRes.data?.users || []);
      setEscalationRules(escRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch territory data:', err);
      toast.error('Failed to load territory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedUser || selectedZones.length === 0) {
      toast.warning('Please select a user and at least one zone');
      return;
    }
    try {
      if (selectedZones.length === 1) {
        await assignTerritory({ userId: selectedUser, geoZoneId: selectedZones[0], isExclusive, notes });
      } else {
        await bulkAssignTerritories({ userId: selectedUser, geoZoneIds: selectedZones, isExclusive, notes });
      }
      toast.success(`Assigned ${selectedZones.length} zone(s) to dealer`);
      setSelectedUser('');
      setSelectedZones([]);
      setNotes('');
      setTab('assignments');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to assign territory');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this territory assignment?')) return;
    try {
      await removeTerritory(id);
      toast.success('Territory removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove territory');
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await updateTerritory(id, { isActive: !currentActive });
      toast.success(`Territory ${currentActive ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update territory');
    }
  };

  const handleUpdateEscalation = async (id, field, value) => {
    try {
      await updateEscalationRule(id, { [field]: value });
      toast.success('Escalation rule updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update rule');
    }
  };

  const toggleZoneSelection = (zoneId) => {
    setSelectedZones(prev =>
      prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]
    );
  };

  // Group zones by hierarchy for display
  const zonesByType = {};
  zones.forEach(z => {
    if (!zonesByType[z.type]) zonesByType[z.type] = [];
    zonesByType[z.type].push(z);
  });

  // Filter territories
  const filteredTerritories = territories.filter(t => {
    if (filterRole && t.user?.role !== filterRole) return false;
    if (filterZoneType && t.geoZone?.type !== filterZoneType) return false;
    return true;
  });

  // Get assigned zone IDs for exclusivity checks
  const assignedZoneMap = {};
  territories.forEach(t => {
    if (t.isActive) {
      if (!assignedZoneMap[t.geoZoneId]) assignedZoneMap[t.geoZoneId] = [];
      assignedZoneMap[t.geoZoneId].push(t);
    }
  });

  const dealerUsers = users.filter(u => ['DEALER', 'FRANCHISE_OWNER', 'REGIONAL_MANAGER', 'WHOLESALE_BUYER'].includes(u.role));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiMapPin className="text-primary-600" />
            Dealer Territories
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign dealers to geographic zones. Each zone can have exclusive or shared dealer assignments.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-icon" title="Refresh">
            <FiRefreshCw size={18} />
          </button>
          <button
            onClick={() => setTab('assign-new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <FiPlus size={16} /> Assign Territory
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'assignments', label: 'Territory Assignments', count: territories.length },
          { key: 'escalation', label: 'Escalation Rules', count: escalationRules.length },
          { key: 'assign-new', label: 'Assign New', icon: FiPlus },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon && <t.icon size={14} />}
            {t.label}
            {t.count !== undefined && (
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: Assignments ─── */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">All Roles</option>
              <option value="DEALER">Dealer</option>
              <option value="FRANCHISE_OWNER">Franchise Owner</option>
              <option value="REGIONAL_MANAGER">Regional Manager</option>
              <option value="WHOLESALE_BUYER">Wholesale Buyer</option>
            </select>
            <select
              value={filterZoneType}
              onChange={e => setFilterZoneType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">All Zone Types</option>
              <option value="LOCAL_AREA">Local Area</option>
              <option value="CITY">City</option>
              <option value="PROVINCE">Province</option>
              <option value="COUNTRY">Country</option>
            </select>
          </div>

          {/* Territory Cards */}
          {filteredTerritories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FiMapPin size={48} className="mx-auto mb-3 opacity-50" />
              <p>No territory assignments found</p>
              <button onClick={() => setTab('assign-new')} className="text-primary-600 hover:underline text-sm mt-2">
                Assign a territory
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredTerritories.map(t => (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl border p-4 transition hover:shadow-md ${
                    !t.isActive ? 'opacity-50 border-gray-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FiUser className="text-primary-600" size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {t.user?.firstName} {t.user?.lastName}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[t.user?.role] || 'bg-gray-100'}`}>
                          {t.user?.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleActive(t.id, t.isActive)}
                        className={`p-1.5 rounded-md transition ${t.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={t.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                      >
                        {t.isActive ? <FiCheck size={14} /> : <FiX size={14} />}
                      </button>
                      <button
                        onClick={() => handleRemove(t.id)}
                        className="p-1.5 rounded-md text-red-400 hover:bg-red-50 transition"
                        title="Remove assignment"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className={`px-3 py-2 rounded-lg border text-sm ${ZONE_TYPE_COLORS[t.geoZone?.type] || 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <FiMapPin size={14} />
                      <span className="font-medium">{t.geoZone?.name}</span>
                      <span className="text-[10px] opacity-70">({t.geoZone?.type})</span>
                    </div>
                    {t.geoZone?.parent && (
                      <p className="text-[11px] mt-0.5 opacity-60 ml-5">
                        {t.geoZone.parent.name} ({t.geoZone.parent.type})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                    {t.isExclusive && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <FiShield size={12} /> Exclusive
                      </span>
                    )}
                    <span>Since {new Date(t.createdAt).toLocaleDateString('en-PK')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Escalation Rules ─── */}
      {tab === 'escalation' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <FiAlertTriangle size={16} /> Auto-Escalation Timeline
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              When a listing has no active deal, it automatically escalates to a wider audience after the configured time.
              Each escalation notifies the relevant dealers in the new geographic scope.
            </p>

            {/* Visual timeline */}
            <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-2">
              {escalationRules.map((rule, i) => (
                <div key={rule.id} className="flex items-center">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: VISIBILITY_COLORS[rule.fromLevel] }}
                    >
                      {rule.fromLevel}
                    </div>
                  </div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-gray-500">{rule.delayHours}h</span>
                    <FiChevronRight size={16} className="text-gray-400" />
                  </div>
                  {i === escalationRules.length - 1 && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: VISIBILITY_COLORS[rule.toLevel] }}
                      >
                        {rule.toLevel}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editable rules table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">From</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">To</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Delay (hours)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Notify Roles</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Active</th>
                </tr>
              </thead>
              <tbody>
                {escalationRules.map(rule => (
                  <tr key={rule.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: VISIBILITY_COLORS[rule.fromLevel] }}
                      >
                        {rule.fromLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: VISIBILITY_COLORS[rule.toLevel] }}
                      >
                        {rule.toLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={rule.delayHours}
                        min={1}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-md text-center"
                        onBlur={e => {
                          const val = parseInt(e.target.value);
                          if (val !== rule.delayHours && val > 0) {
                            handleUpdateEscalation(rule.id, 'delayHours', val);
                          }
                        }}
                      />
                      <span className="text-gray-400 ml-1">hrs</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(rule.notifyRoles || []).map(role => (
                          <span key={role} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] || 'bg-gray-100'}`}>
                            {role.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUpdateEscalation(rule.id, 'isActive', !rule.isActive)}
                        className={`p-1.5 rounded-md transition ${rule.isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                      >
                        {rule.isActive ? <FiCheck size={14} /> : <FiX size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB: Assign New ─── */}
      {tab === 'assign-new' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiPlus size={16} className="text-primary-600" /> Assign Dealer to Territory
            </h3>

            {/* Step 1: Select User */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Dealer/Franchise</label>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">-- Choose a dealer/franchise/manager --</option>
                {dealerUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} — {u.role?.replace('_', ' ')} ({u.city || 'No city'})
                  </option>
                ))}
              </select>
              {selectedUser && (
                <p className="text-xs text-gray-400 mt-1">
                  Role determines which zone types can be assigned (Dealer → Local Area, Franchise → City, etc.)
                </p>
              )}
            </div>

            {/* Step 2: Select Zones */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select Zone(s) <span className="text-gray-400">({selectedZones.length} selected)</span>
              </label>

              {['LOCAL_AREA', 'CITY', 'PROVINCE'].map(type => {
                const typeZones = zonesByType[type] || [];
                if (typeZones.length === 0) return null;
                return (
                  <div key={type} className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{type.replace('_', ' ')}s</p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                      {typeZones.map(z => {
                        const isSelected = selectedZones.includes(z.id);
                        const isAssigned = assignedZoneMap[z.id]?.some(t => t.isExclusive && t.userId !== selectedUser);
                        return (
                          <button
                            key={z.id}
                            onClick={() => !isAssigned && toggleZoneSelection(z.id)}
                            disabled={isAssigned}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                              isAssigned
                                ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed line-through'
                                : isSelected
                                  ? 'bg-primary-100 text-primary-800 border-primary-300 font-semibold'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                            }`}
                            title={isAssigned ? `Exclusively assigned to ${assignedZoneMap[z.id][0]?.user?.firstName}` : z.name}
                          >
                            {z.name}
                            {isAssigned && ' 🔒'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Options */}
            <div className="flex gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={e => setIsExclusive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Exclusive assignment (no other same-role dealer in this zone)</span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                rows={2}
                placeholder="e.g., Assigned for Q1 2026 trial period"
              />
            </div>

            <button
              onClick={handleAssign}
              disabled={!selectedUser || selectedZones.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <FiCheck size={16} />
              Assign {selectedZones.length} Zone(s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
