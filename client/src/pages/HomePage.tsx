import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

interface Artwork {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export default function HomePage() {
  const token = localStorage.getItem("token");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const fetchArtworks = (tag?: string | null) => {
    const url = tag ? `${API}/artworks/?tag=${encodeURIComponent(tag)}` : `${API}/artworks/`;
    fetch(url)
      .then((r) => r.json())
      .then(setArtworks);
  };

  useEffect(() => {
    fetchArtworks(filterTag);
  }, [filterTag]);

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      {/* Верхняя панель */}
      <div className="d-flex justify-content-between align-items-center py-3 border-bottom mb-3">
        <h4 className="m-0">🐾 paws</h4>
        <div>
          {token ? (
            <>
              <Link to="/upload" className="btn btn-outline-dark btn-sm me-2">+</Link>
              <Link to="/profile" className="btn btn-outline-dark btn-sm me-2">👤</Link>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.reload();
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-primary btn-sm me-2">Войти</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Регистрация</Link>
            </>
          )}
        </div>
      </div>

      {/* Фильтр по тегу */}
      {filterTag && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2">
          <span>#{filterTag}</span>
          <button className="btn-close" onClick={() => setFilterTag(null)}></button>
        </div>
      )}

      {/* Лента */}
      {artworks.map((a) => (
        <div key={a.id} className="mb-4 border rounded">
          <div className="d-flex align-items-center p-2">
            <Link to={`/user/${a.user_id}`} className="text-decoration-none d-flex align-items-center">
              <div style={{ width: 36, height: 36, overflow: "hidden", borderRadius: "50%", marginRight: 10 }}>
                <img
                  src={a.avatar_url || "https://placehold.co/36x36"}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <strong className="text-dark">{a.username}</strong>
            </Link>
          </div>

          <img src={a.image_url} alt={a.title} style={{ width: "100%" }} />

          <div className="p-2">
            <p className="mb-1"><strong>{a.username}</strong> {a.title}</p>
            <p className="text-muted small mb-1">{a.description}</p>
            {a.tags.length > 0 && (
              <p className="mb-0">
                {a.tags.map(t => (
                  <span
                    key={t}
                    className="text-primary me-2"
                    style={{ fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => setFilterTag(t)}
                  >
                    #{t}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      ))}

      {artworks.length === 0 && (
        <p className="text-center text-muted mt-5">Нет работ{filterTag ? ` с тегом #${filterTag}` : ""}</p>
      )}
    </div>
  );
}