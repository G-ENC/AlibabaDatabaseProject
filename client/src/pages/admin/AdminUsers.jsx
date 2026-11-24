import { useState } from 'react';
import { api } from '../../api.js';
import { useApi } from '../../useApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import AdminNav from '../../components/AdminNav.jsx';
import { date } from '../../utils/format.js';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { data: users, loading, error, reload } = useApi('/users');
  const [actionError, setActionError] = useState('');

  const run = async (call) => {
    setActionError('');
    try {
      await call();
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const toggleAdmin = (u) => run(() => api.patch(`/users/${u.user_id}`, { is_admin: !u.is_admin }));
  const remove = (u) => window.confirm(`Delete user "${u.username}"?`) && run(() => api.del(`/users/${u.user_id}`));

  return (
    <>
      <AdminNav />
      <h1>Users</h1>
      {actionError && <p className="error">{actionError}</p>}
      {loading && <p aria-busy="true">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {users && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.user_id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.is_admin ? 'admin' : 'user'}</td>
                  <td>{date(u.created_at)}</td>
                  <td>
                    {u.user_id !== me.user_id && (
                      <div className="row-actions">
                        <button className="secondary" onClick={() => toggleAdmin(u)}>{u.is_admin ? 'Make user' : 'Make admin'}</button>
                        <button className="secondary" onClick={() => remove(u)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
