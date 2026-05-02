import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [bio, setBio] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchProfile = async () => {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { localStorage.removeItem("token"); navigate("/login"); return; }
    if (res.ok) { const data = await res.json(); setUser(data); setBio(data.bio || ""); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdate = async () => {
    await fetch(`${API}/auth/me?bio=${encodeURIComponent(bio)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProfile();
  };

  if (!user) return <p className="text-center mt-5">Загрузка...</p>;

  return (
    <div className="container mt-4" style={{ maxWidth: 500 }}>
      <h1>Профиль</h1>
      <div className="card p-3 mb-3">
        <div className="mb-3 text-center">
          <div style={{ width: 120, height: 120, overflow: "hidden", borderRadius: "50%", margin: "0 auto" }}>
            <img
              src={user.avatar_url ? `${API}${user.avatar_url}` : "https://via.placeholder.com/120"}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <label className="btn btn-outline-secondary btn-sm mt-2">
            Выбрать фото
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("file", file);
                await fetch(`${API}/auth/me/avatar`, {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });
                fetchProfile();
              }}
            />
          </label>
        </div>
        <p><strong>Имя:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Роль:</strong> {user.role}</p>
      </div>
      <div className="mb-2">
        <label className="form-label">О себе</label>
        <textarea className="form-control" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
      </div>
      <button className="btn btn-primary" onClick={handleUpdate}>Сохранить</button>
      <button
        className="btn btn-outline-danger ms-2"
        onClick={() => {
          localStorage.removeItem("token");
          navigate("/login");
        }}
      >
        Выйти
      </button>
    </div>
  );
}