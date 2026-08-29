import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Users() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await api.get("/users");
    setUsers(res.data.data);
    setLoading(false);
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    await api.post(`/users/${id}/deactivate`);
    fetchUsers();
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">User Management</h1>
      <div className="card">
        {loading ? (
          <div className="text-center p-4">Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.username}</td>
                  <td className="capitalize">
                    {u.role?.name?.replace("_", " ")}
                  </td>
                  <td>
                    <span
                      className={`badge badge-${u.is_active ? "green" : "red"}`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {u.is_active && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeactivate(u.id)}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
