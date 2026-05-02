import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("tags", tags);
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/artworks/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/login"); return; }
      if (!res.ok) { setError("Ошибка загрузки"); return; }
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 500 }}>
      <h2 className="mb-3">Загрузить работу</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input className="form-control mb-2" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea className="form-control mb-2" placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        <input className="form-control mb-2" placeholder="Теги (через запятую)" value={tags} onChange={e => setTags(e.target.value)} />
        <input className="form-control mb-3" type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} required />
        <button className="btn btn-success w-100" type="submit" disabled={loading}>
          {loading ? "Загрузка..." : "Загрузить"}
        </button>
        <button className="btn btn-secondary w-100 mt-2" type="button" onClick={() => navigate("/")}>
          Отмена
        </button>
      </form>
    </div>
  );
}