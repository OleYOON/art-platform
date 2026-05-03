import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

interface Comment {
  id: number;
  body: string;
  username: string;
  created_at: string;
  parent_id: number | null;
  user_id: number;
  replies?: Comment[];
}

interface Artwork {
  id: number;
  title: string;
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
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});
  const [replyTo, setReplyTo] = useState<Record<number, { username: string; parentId: number } | null>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<Record<number, boolean>>({});
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
    if (res.ok) {
      const data = await res.json();
      setArtworks(data);
      data.forEach((a: Artwork) => fetchComments(a.id));
    }
  };

  const fetchComments = (artworkId: number) => {
    fetch(`${API}/artworks/${artworkId}/comments`)
      .then(r => r.json())
      .then(data => setComments(prev => ({ ...prev, [artworkId]: data })));
  };

  const handleDelete = async (artworkId: number) => {
    const res = await fetch(`${API}/artworks/${artworkId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && user) fetchMyArtworks(user.id);
  };

  const handleDeleteComment = async (artworkId: number, commentId: number) => {
    await fetch(`${API}/artworks/${artworkId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchComments(artworkId);
  };

  const handleAddComment = async (artworkId: number, parentId: number | null = null, replyUsername: string | null = null) => {
    if (sending[artworkId]) return;
    let body = newComment[artworkId]?.trim();
    if (!body) return;
    if (replyUsername && !body.startsWith(`${replyUsername} `)) body = `${replyUsername} ${body}`;
    setSending(prev => ({ ...prev, [artworkId]: true }));
    setNewComment(prev => ({ ...prev, [artworkId]: "" }));
    try {
      await fetch(`${API}/artworks/${artworkId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body, parent_id: parentId }),
      });
      setReplyTo(prev => ({ ...prev, [artworkId]: null }));
      fetchComments(artworkId);
    } finally {
      setSending(prev => ({ ...prev, [artworkId]: false }));
    }
  };

  const handleReply = (artworkId: number, username: string, parentId: number) => {
    setReplyTo(prev => ({ ...prev, [artworkId]: { username, parentId } }));
    setNewComment(prev => ({ ...prev, [artworkId]: "" }));
    setShowReplies(prev => ({ ...prev, [parentId]: true }));
  };

  const toggleComments = (artworkId: number) => {
    setShowComments(prev => ({ ...prev, [artworkId]: !prev[artworkId] }));
    if (!comments[artworkId]) fetchComments(artworkId);
  };

  const toggleReplies = (commentId: number) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const renderComment = (c: Comment, artworkId: number, rootParentId: number | null = null) => {
    const replyTargetId = rootParentId ?? c.id;
    return (
      <div key={c.id} className="mb-2 small">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <Link to={`/user/${c.user_id}`} className="text-dark fw-bold text-decoration-none">{c.username}</Link>
            <span className="text-muted ms-2">{formatDate(c.created_at)}</span>
          </div>
          {currentUserId && String(currentUserId) === String(c.user_id) && (
            <button className="btn btn-link btn-sm text-danger p-0" onClick={() => handleDeleteComment(artworkId, c.id)}>✕</button>
          )}
        </div>
        <div>{c.body}</div>
        <div className="d-flex gap-2 mt-1">
          <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => handleReply(artworkId, c.username, replyTargetId)}>ответить</button>
          {c.replies && c.replies.length > 0 && !c.parent_id && (
            <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => toggleReplies(c.id)}>
              {showReplies[c.id] ? "скрыть ответы" : `ответы (${c.replies.length})`}
            </button>
          )}
        </div>
        {c.replies && c.replies.length > 0 && showReplies[c.id] && (
          <div style={{ marginLeft: 16, borderLeft: "2px solid #eee", paddingLeft: 12 }} className="mt-1">
            {c.replies.map(reply => renderComment(reply, artworkId, replyTargetId))}
          </div>
        )}
      </div>
    );
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
            <p className="text-muted small mb-1">{formatDate(a.created_at)}</p>
            {a.tags.map(t => <span key={t} className="badge bg-secondary me-1">{t}</span>)}
            <button className="btn btn-danger btn-sm mt-2" onClick={() => handleDelete(a.id)}>Удалить</button>
          </div>
          <div className="border-top px-2 py-1">
            <button className="btn btn-sm btn-link text-muted p-0" onClick={() => toggleComments(a.id)}>
              💬 {countAll((comments[a.id] || [])) || ""}
            </button>
          </div>
          {showComments[a.id] && (
            <div className="border-top p-2 text-start">
              {(comments[a.id] || []).map(c => renderComment(c, a.id))}
              <div className="d-flex mt-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={replyTo[a.id]?.username ? `Ответ ${replyTo[a.id]?.username}...` : "Добавить комментарий..."}
                  value={newComment[a.id] || ""}
                  onChange={e => setNewComment(prev => ({ ...prev, [a.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { const p = replyTo[a.id]?.parentId ?? null; const u = replyTo[a.id]?.username ?? null; handleAddComment(a.id, p, u); } }}
                />
                <button className="btn btn-sm btn-outline-primary ms-1" disabled={sending[a.id]} onClick={() => { const p = replyTo[a.id]?.parentId ?? null; const u = replyTo[a.id]?.username ?? null; handleAddComment(a.id, p, u); }}>{sending[a.id] ? "..." : "→"}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function countAll(comments: Comment[]): number {
  let n = 0;
  for (const c of comments) {
    n += 1;
    if (c.replies) n += countAll(c.replies);
  }
  return n;
}