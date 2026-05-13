import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CommentSection from "../components/CommentSection";
import { apiFetch } from "../api";

interface Artwork {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  created_at: string;
  user_id: number;
  username: string;
  avatar_url: string | null;
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
  const [editingProfile, setEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const token = localStorage.getItem("token");
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).sub : null;
  const navigate = useNavigate();

  const fetchProfile = async () => {
    const res = await apiFetch(`/auth/me`, {
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
    const res = await apiFetch(`/artworks/user/${userId}`);
    if (res.ok) setArtworks(await res.json());
  };

  const handleDelete = async (artworkId: number) => {
    if (!confirm("Вы уверены, что хотите удалить эту работу?")) return;
    await apiFetch(`/artworks/${artworkId}`, {
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

    await apiFetch(`/artworks/${artworkId}?${params.toString()}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setEditId(null);
    if (user) fetchMyArtworks(user.id);
  };

  const startProfileEdit = () => {
    setEditingProfile(true);
    setEditUsername(user.username);
    setEditBio(bio);
    setEditAvatar(null);
  };

  const handleProfileSave = async () => {
    // Имя
    if (editUsername !== user.username) {
      await apiFetch(`/auth/me/username?username=${encodeURIComponent(editUsername)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Описание
    if (editBio !== bio) {
      await apiFetch(`/auth/me?bio=${encodeURIComponent(editBio)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Аватарка
    if (editAvatar) {
      const formData = new FormData();
      formData.append("file", editAvatar);
      await apiFetch(`/auth/me/avatar`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }
    setEditingProfile(false);
    fetchProfile();
  };

  useEffect(() => { fetchProfile(); }, []);

  if (!user) return <p className="text-center mt-5">Загрузка...</p>;

  return (
    <div className="container mt-4" style={{ maxWidth: 600 }}>
      <Link to="/" className="btn btn-outline-secondary mb-3">← Назад</Link>
      <h1>Профиль</h1>

      {/* Карточка профиля */}
      <div className="card p-3 mb-3">
        {!editingProfile ? (
          <>
            <div className="mb-3 text-center">
              <div style={{ width: 120, height: 120, overflow: "hidden", borderRadius: "50%", margin: "0 auto" }}>
                <img src={user.avatar_url || "https://placehold.co/120x120"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>
            <p><strong>Имя:</strong> {user.username}</p>
            <p><strong>Роль:</strong> {user.role}</p>
            <p><strong>О себе:</strong> {bio || "—"}</p>
            <button className="btn btn-primary btn-sm mt-2" onClick={startProfileEdit}>Редактировать профиль</button>
          </>
        ) : (
          <div className="mt-3">
            <div className="mb-3 text-center">
              <div style={{ width: 120, height: 120, overflow: "hidden", borderRadius: "50%", margin: "0 auto" }}>
                <img
                  src={editAvatar ? URL.createObjectURL(editAvatar) : (user.avatar_url || "https://placehold.co/120x120")}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <label className="btn btn-outline-secondary btn-sm mt-2">
                Сменить фото
                <input type="file" accept="image/*" hidden onChange={(e) => setEditAvatar(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="mb-2">
              <label className="form-label">Имя</label>
              <input className="form-control form-control-sm" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} style={{ boxShadow: "none" }} />
            </div>
            <div className="mb-2">
              <label className="form-label">О себе</label>
              <textarea className="form-control form-control-sm" value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} style={{ boxShadow: "none" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <button className="btn btn-outline-light btn-sm me-2" onClick={handleProfileSave}>Сохранить</button>
              <button className="btn btn-outline-danger btn-sm" onClick={() => setEditingProfile(false)}>Отмена</button>
            </div>
          </div>
        )}
      </div>

      <button className="btn btn-outline-danger" onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}>Выйти</button>

      <h2 className="mt-5">Мои работы</h2>
      {artworks.map((a) => (
        <div key={a.id} className="mb-4 border rounded">
          {/* Шапка */}
          <div className="d-flex align-items-center p-2">
            <Link to={`/user/${a.user_id}`} className="text-decoration-none d-flex align-items-center">
              <div style={{ width: 36, height: 36, overflow: "hidden", borderRadius: "50%", marginRight: 10 }}>
                <img
                  src={a.avatar_url || user.avatar_url || "https://placehold.co/36x36"}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <strong className="text-dark">{a.username || user.username}</strong>
            </Link>
            <span className="ms-auto text-muted small">{formatDate(a.created_at)}</span>
          </div>

          <img src={a.image_url} alt={a.title} style={{ width: "100%" }} />

          <div className="p-2">
            <p className="mb-1"><strong>{a.title}</strong></p>
            {a.description && <p className="text-muted small mb-1">{a.description}</p>}
            {a.tags.length > 0 && (
              <p className="mb-0">
                {a.tags.map(t => <span key={t} className="badge bg-secondary me-1">{t}</span>)}
              </p>
            )}
          </div>

          {editId === a.id && (
            <div className="p-2 border-top" style={{ backgroundColor: "#7c6fa0" }}>
              <input className="form-control form-control-sm mb-1" placeholder="Название" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <textarea className="form-control form-control-sm mb-1" placeholder="Описание" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
              <input className="form-control form-control-sm mb-2" placeholder="Теги (через запятую)" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
              <button className="btn btn-success btn-sm me-2" onClick={() => handleEditSave(a.id)}>Сохранить</button>
              <button className="btn btn-outline-danger btn-sm" onClick={() => setEditId(null)}>Отмена</button>
            </div>
          )}

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
