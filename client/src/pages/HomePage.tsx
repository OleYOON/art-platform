import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CommentSection from "../components/CommentSection";

import { apiFetch } from "../api";

interface Artwork {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  user_id: number;
  username: string;
  avatar_url: string | null;
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

export default function HomePage() {
  const token = localStorage.getItem("token");
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).sub : null;
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchArtworks = (tag?: string | null, searchTerm?: string) => {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (searchTerm) params.set("search", searchTerm);
    const url = `/artworks/${params.toString() ? "?" + params.toString() : ""}`;
    apiFetch(url).then(r => r.json()).then(data => setArtworks(data));
  };

  const handleTagClick = (tag: string) => {
    setFilterTag(tag);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    fetchArtworks(filterTag, search);
    const interval = setInterval(() => fetchArtworks(filterTag, search), 10000);
    return () => clearInterval(interval);
  }, [filterTag, search]);

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="text-center mt-5 pt-5">
          <h1>🐾 paws</h1>
          <p className="text-muted">Войдите или зарегистрируйтесь, чтобы смотреть работы</p>
          <Link to="/login" className="btn btn-primary me-2">Войти</Link>
          <Link to="/signup" className="btn btn-outline-primary">Регистрация</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      {/* Шапка с поиском по центру */}
      <div className="d-flex align-items-center justify-content-between py-3 border-bottom mb-0 sticky-top" style={{ backgroundColor: "#2d2d44", padding: "10px 20px", borderRadius: "0 0 10px 10px" }}>
        <h4 className="m-0" style={{ color: "#f0edf5", width: 80 }}>paws</h4>
        <div className="input-group input-group-sm" style={{ maxWidth: 300, width: "100%" }}>
          <input type="text" className="form-control" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>✕</button>}
        </div>
        <div style={{ width: 80, textAlign: "right" }}>
          <Link to="/profile" className="btn btn-outline-dark btn-sm">👤</Link>
        </div>
      </div>

      {filterTag && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3 sticky-top" style={{ top: 56 }}>
          <span>#{filterTag}</span>
          <button className="btn-close" onClick={() => { setFilterTag(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}></button>
        </div>
      )}

      <div className="mt-3" />

      {artworks.map(a => (
        <div key={a.id} className="mb-4 border rounded">
          <div className="d-flex align-items-center p-2">
            <Link to={`/user/${a.user_id}`} className="text-decoration-none d-flex align-items-center">
              <div style={{ width: 36, height: 36, overflow: "hidden", borderRadius: "50%", marginRight: 10 }}>
                <img src={a.avatar_url || "https://placehold.co/36x36"} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <strong className="text-dark">{a.username}</strong>
            </Link>
            <span className="ms-auto text-muted small">{formatDate(a.created_at)}</span>
          </div>

          <img src={a.image_url} alt={a.title} style={{ width: "100%" }} />

          <div className="p-2">
            <p className="mb-1"><strong>{a.title}</strong></p>
            <p className="text-muted small mb-1">{a.description}</p>
            {a.tags.length > 0 && (
              <p className="mb-0">
                {a.tags.map(t => (
                  <span key={t} className="text-primary me-2" style={{ fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleTagClick(t)}>#{t}</span>
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

      {artworks.length === 0 && <p className="text-center text-muted mt-5">Ничего не найдено</p>}
    </div>
  );
}