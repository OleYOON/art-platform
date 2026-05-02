import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

interface Artwork {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  user_id: number;
  username: string;
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    fetch(`${API}/auth/profile/${userId}`)
      .then((r) => r.json())
      .then(setProfile);
    fetch(`${API}/artworks/user/${userId}`)
      .then((r) => r.json())
      .then(setArtworks);
  }, [userId]);

  if (!profile) return <p className="text-center mt-5">Загрузка...</p>;

  return (
    <div className="container mt-4">
      <Link to="/" className="btn btn-outline-secondary mb-3">← Назад</Link>
      <h1>{profile.username}</h1>
      <p>{profile.bio}</p>
      <h2 className="mt-3">Работы</h2>
      <div className="row">
        {artworks.map((a) => (
          <div key={a.id} className="col-md-4 mb-3">
            <div className="card h-100">
              <img src={`${API}${a.image_url}`} className="card-img-top" alt={a.title} />
              <div className="card-body">
                <h5>{a.title}</h5>
                <p>{a.description}</p>
                {a.tags.map(t => <span key={t} className="badge bg-secondary me-1">{t}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}