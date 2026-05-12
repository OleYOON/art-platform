import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CommentSection from "../components/CommentSection";

const API = import.meta.env.VITE_API_URL;

interface Artwork {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  created_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso + "Z");
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [bio, setBio] = useState("");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const token = localStorage.getItem("token");
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).sub : null;
  const navigate = useNavigate();

  const fetchProfile = async () => {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { localStorage.removeItem("token"); navigate("/login"); return; }
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setBio(data.bio || "");
      fetchMyArtworks(data.id);
    }
  };

  const fetchMyArtworks = async (userId: number) => {
    const res = await fetch(`${API}/artworks/user/${userId}`);
    if (res.ok) setArtworks(await res.json());
  };

  const handleDelete = async (artworkId: number) => {
    if (!confirm("Вы уверены, что хотите удалить эту работу?")) return;
    await fetch(`${API}/artworks/${artworkId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (user) fetchMyArtworks(user.id);
  };

const startEdit = (a: Artwork) => {
  setEditId(a.id);
  setEditTitle(a.title);
  setEditDescription(a.description || "");
  setEditTags(a.tags.join(", "));
};

  const handleEditSave = async (artworkId: number) => {
    const params = new URLSearchParams();
    if (editTitle) params.set("title", editTitle);
    if (editDescription) params.set("description", editDescription);
    if (editTags) params.set("tags", editTags);

    await fetch(`${API}/artworks/${artworkId}?${params.toString()}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setEditId(null);
    if (user) fetchMyArtworks(user.id);
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
    <div className="container mt-4" style={{ maxWidth: 600 }}>
      <Link to="/" className="btn btn-outline-secondary mb-3">← Назад</Link>
      <h1>Профиль</h1>
      <div className="card p-3 mb-3">
        <div className="mb-3 text-center">
          <div style={{ width: 120, height: 120, overflow: "hidden", borderRadius: "50%", margin: "0 auto" }}>
            <img src={user.avatar_url || "https://placehold.co/120x120"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <label className="btn btn-outline-secondary btn-sm mt-2">
            Выбрать фото
            <input type="file" accept="image/*" hidden onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("file", file);
              await fetch(`${API}/auth/me/avatar`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: formData });
              fetchProfile();
            }} />
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
      <button className="btn btn-outline-danger ms-2" onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}>Выйти</button>

      <h2 className="mt-5">Мои работы</h2>
      {artworks.map((a) => (
        <div key={a.id} className="mb-4 border rounded">
          <img src={a.image_url} alt={a.title} style={{ width: "100%" }} />
          <div className="p-2">
            <p className="mb-1"><strong>{a.title}</strong></p>
            {a.description && <p className="text-muted small mb-1">{a.description}</p>}
            <p className="text-muted small mb-1">{formatDate(a.created_at)}</p>  
            {a.tags.map(t => <span key={t} className="badge bg-secondary me-1">{t}</span>)}

            {editId === a.id && (
              <div className="p-2 mt-2 border-top" style={{ backgroundColor: "#7c6fa0" }}>
                <input
                  className="form-control form-control-sm mb-1"
                  placeholder="Название"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  className="form-control form-control-sm mb-1"
                  placeholder="Описание"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                />
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Теги (через запятую)"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
                <button
                  className="btn btn-success btn-sm me-2"
                  onClick={() => handleEditSave(a.id)}
                >
                  Сохранить
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setEditId(null)}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
          <CommentSection
            artworkId={a.id}
            token={token}
            currentUserId={currentUserId}
            onDeleteArtwork={() => handleDelete(a.id)}
            onEditArtwork={() => startEdit(a)}
          />
        </div>
      ))}
    </div>
  );
}