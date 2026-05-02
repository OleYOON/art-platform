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

  useEffect(() => {
    fetch(`${API}/artworks/`)
      .then((r) => r.json())
      .then(setArtworks);
  }, []);

  return (
    <div className="container mt-4">
      <h1>Главная</h1>
      {token && (
        <div className="mb-3">
          <Link to="/profile" className="btn btn-outline-primary me-2">Мой профиль</Link>
          <Link to="/upload" className="btn btn-success me-2">Загрузить работу</Link>
          <button
            className="btn btn-outline-danger"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
          >
            Выйти
          </button>
        </div>
      )}
      <h2>Работы</h2>
      <div className="row">
        {artworks.map((a) => (
          <div key={a.id} className="col-md-4 mb-3">
            <div className="card h-100">
              <img src={a.image_url} className="card-img-top" alt={a.title} />
              <div className="card-body">
                <h5 className="card-title">{a.title}</h5>
                <p className="card-text">{a.description}</p>
                <p>{a.tags.map(t => <span key={t} className="badge bg-secondary me-1">{t}</span>)}</p>
                <Link to={`/user/${a.user_id}`} className="text-decoration-none d-flex align-items-center mt-2">
                  <div style={{ width: 30, height: 30, overflow: "hidden", borderRadius: "50%", marginRight: 8 }}>
                    <img
                      src={a.avatar_url || "https://placehold.co/30x30"}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span>{a.username}</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}