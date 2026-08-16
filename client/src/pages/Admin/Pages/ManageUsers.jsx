import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [pendingRole, setPendingRole] = useState("");
  const [savingId, setSavingId] = useState(null);

  const token = localStorage.getItem("token");

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to load users.");
        return;
      }
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEditing(user) {
    setEditingId(user.id);
    setPendingRole(user.role);
  }

  function cancelEditing() {
    setEditingId(null);
    setPendingRole("");
  }

  async function handleSaveRole(userId) {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: pendingRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update role.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: pendingRole } : u)),
      );
      setEditingId(null);
      setPendingRole("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setSavingId(null);
    }
  }

  const roleBadgeClass = (role) => `admin-user-role-badge ${role}`;

  return (
    <div className="admin-user-page">
      <h1 className="admin-user-title">Manage Users</h1>
      <p className="admin-user-subtitle">
        Promote users to admin or manage account roles.
      </p>

      <div className="admin-user-filters">
        <select
          className="admin-user-filter-select"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
          }}
          onBlur={fetchUsers}
        >
          <option value="">All roles</option>
          <option value="guest">Guest</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>

        <div className="admin-user-search-wrap">
          <input
            className="admin-user-search-input"
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
          />
          <button
            type="button"
            className="admin-user-search-btn"
            onClick={fetchUsers}
            aria-label="Search"
          >
            <FaSearch size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="admin-user-status">Loading users…</p>
      ) : error ? (
        <p className="admin-user-status error">{error}</p>
      ) : users.length === 0 ? (
        <p className="admin-user-status">No users found.</p>
      ) : (
        <div className="admin-user-list">
          {users.map((u) => {
            const isEditing = editingId === u.id;
            return (
              <div key={u.id} className="admin-user-row">
                <div className="admin-user-row-main">
                  {u.picture ? (
                    <img src={u.picture} alt={u.firstName} className="admin-user-avatar" />
                  ) : (
                    <div className="admin-user-avatar-fallback">
                      {u.firstName?.[0]}
                    </div>
                  )}

                  <div className="admin-user-meta">
                    <span className="admin-user-name">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="admin-user-email">{u.email}</span>
                    {!isEditing && (
                      <span className={roleBadgeClass(u.role)}>{u.role}</span>
                    )}
                  </div>
                </div>

                <div className="admin-user-actions">
                  {isEditing ? (
                    <>
                      <select
                        className="admin-user-role-select"
                        value={pendingRole}
                        onChange={(e) => setPendingRole(e.target.value)}
                      >
                        <option value="guest">Guest</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="button"
                        className="admin-user-close-btn"
                        onClick={cancelEditing}
                        disabled={savingId === u.id}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="admin-user-save-btn"
                        onClick={() => handleSaveRole(u.id)}
                        disabled={savingId === u.id || pendingRole === u.role}
                      >
                        {savingId === u.id ? "Saving…" : "Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="admin-user-action-btn-secondary"
                      onClick={() => startEditing(u)}
                    >
                      Edit Role
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
