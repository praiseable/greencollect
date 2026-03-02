import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiSearch, FiFilter, FiMoreVertical, FiCheck, FiX, FiUser, FiMail, FiPhone } from 'react-icons/fi';
import { getUsers, toggleUser, changeUserRole } from '../services/api';

const ROLES = ['ALL', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN', 'DEALER', 'COLLECTOR', 'CUSTOMER', 'SHOP_OWNER', 'HOME_OWNER'];
const STATUSES = ['ALL', 'ACTIVE', 'SUSPENDED', 'PENDING'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openMenu, setOpenMenu] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const limit = 15;

  useEffect(() => { fetchUsers(); }, [page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await getUsers(params);
      setUsers(res.data?.users || res.data || []);
      setTotal(res.data?.total || res.data?.length || 0);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggle = async (userId) => {
    try {
      await toggleUser(userId);
      toast.success('User status updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setOpenMenu(null);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await changeUserRole(userId, { role: newRole });
      toast.success('Role updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setRoleModal(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </form>
          <select className="input w-auto" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            {ROLES.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r.replace(/_/g, ' ')}</option>)}
          </select>
          <select className="input w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {STATUSES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Zone</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No users found</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        {u.email && <p className="text-gray-600 text-xs flex items-center gap-1"><FiMail size={12} /> {u.email}</p>}
                        {u.phone && <p className="text-gray-600 text-xs flex items-center gap-1"><FiPhone size={12} /> {u.phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge-blue cursor-pointer" onClick={() => setRoleModal(u)}>
                        {u.role?.name?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {u.geoZone?.name || u.city?.name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : u.status === 'SUSPENDED' ? 'badge-red' : 'badge-yellow'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)} className="p-1 rounded hover:bg-gray-100">
                          <FiMoreVertical size={16} />
                        </button>
                        {openMenu === u.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-10 overflow-hidden">
                            <button onClick={() => handleToggle(u.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              {u.status === 'ACTIVE' ? <><FiX size={14} className="text-red-500" /> Suspend</> : <><FiCheck size={14} className="text-green-500" /> Activate</>}
                            </button>
                            <button onClick={() => { setRoleModal(u); setOpenMenu(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                              <FiUser size={14} /> Change Role
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Change Role: {roleModal.firstName} {roleModal.lastName}</h3>
            <div className="space-y-2">
              {ROLES.filter(r => r !== 'ALL').map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(roleModal.id, r)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                    roleModal.role?.name === r ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {r.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setRoleModal(null)} className="mt-4 w-full btn-secondary justify-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
