import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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

export default function UserProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const token = localStorage.getItem("token");
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).sub : null;

  useEffect(() => {
    apiFetch(`/auth/profile/${userId}`)
      .then(r => r.json())
      .then(setProfile);
    apiFetch(`/artworks/user/${userId}`)
      .then(r => r.json())
      .then(setArtworks);
  }, [userId]);

  if (!profile) return <p className="text-center mt-5" style={{ color: "#f0edf5" }}>Загрузка...</p>;

  return (
    <div className="container mt-4" style={{ maxWidth: 600 }}>
      {/* Шапка */}
      <div className="d-flex justify-content-between align-items-center mb-3" style={{ backgroundColor: "#2d2d44", padding: "10px 20px", borderRadius: "0 0 10px 10px" }}>
        <Link to="/" className="btn btn-outline-secondary btn-sm">← Назад</Link>
        <h1 style={{ fontSize: "1.3rem", margin: 0, color: "#f0edf5" }}>{profile.username}</h1>
        <div style={{ width: 60 }}></div> {/* пустое место для симметрии */}
      </div>

      {/* Карточка профиля */}
      <div className="card p-3 mb-3">
        <div className="mb-3 text-center">
          <div style={{ width: 120, height: 120, overflow: "hidden", borderRadius: "50%", margin: "0 auto" }}>
            <img src={profile.avatar_url || "https://placehold.co/120x120"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
        <p><strong>Имя:</strong> {profile.username}</p>
        <p><strong>Роль:</strong> {profile.role}</p>
        <p><strong>О себе:</strong> {profile.bio || "—"}</p>
      </div>

      <h2 className="mt-4" style={{ color: "#f0edf5" }}>Работы</h2>

      {artworks.map((a) => (
        <div key={a.id} className="mb-4 border rounded">
          {/* Шапка поста */}
          <div className="d-flex align-items-center p-2">
            <Link to={`/user/${a.user_id}`} className="text-decoration-none d-flex align-items-center">
              <div style={{ width: 36, height: 36, overflow: "hidden", borderRadius: "50%", marginRight: 10 }}>
                <img
                  src={a.avatar_url || profile.avatar_url || "https://placehold.co/36x36"}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <strong className="text-dark">{a.username || profile.username}</strong>
            </Link>
            <span className="ms-auto text-muted small">{formatDate(a.created_at)}</span>
          </div>

          <img src={a.image_url} alt={a.title} style={{ width: "100%" }} />

          <div className="p-2">
            <p className="mb-1"><strong>{a.title}</strong></p>
            {a.description && <p className="text-muted small mb-1">{a.description}</p>}
            {a.tags.length > 0 && (
              <p className="mb-0">
                {a.tags.map(t => (
                  <span key={t} className="text-primary me-2" style={{ fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}>
                    #{t}
                  </span>
                ))}
              </p>
            )}
          </div>

          <CommentSection
            artworkId={a.id}
            token={token}
            currentUserId={currentUserId}
          />
        </div>
      ))}
    </div>
  );
}