import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});
  const [replyTo, setReplyTo] = useState<Record<number, { username: string; parentId: number } | null>>({});
  const [sending, setSending] = useState<Record<number, boolean>>({});

  const fetchArtworks = (tag?: string | null, searchTerm?: string) => {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (searchTerm) params.set("search", searchTerm);
    const url = `${API}/artworks/${params.toString() ? "?" + params.toString() : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setArtworks(data);
        data.forEach((a: Artwork) => fetchComments(a.id));
      });
  };

  const fetchComments = (artworkId: number) => {
    fetch(`${API}/artworks/${artworkId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments((prev) => ({ ...prev, [artworkId]: data })));
  };

  const handleAddComment = async (
    artworkId: number,
    parentId: number | null = null,
    replyUsername: string | null = null
  ) => {
    if (sending[artworkId]) return;
    let body = newComment[artworkId]?.trim();
    if (!body) return;
    if (replyUsername && !body.startsWith(`${replyUsername} `)) {
      body = `${replyUsername} ${body}`;
    }
    setSending((prev) => ({ ...prev, [artworkId]: true }));
    setNewComment((prev) => ({ ...prev, [artworkId]: "" }));
    try {
      await fetch(`${API}/artworks/${artworkId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body, parent_id: parentId }),
      });
      setReplyTo((prev) => ({ ...prev, [artworkId]: null }));
      fetchComments(artworkId);
    } finally {
      setSending((prev) => ({ ...prev, [artworkId]: false }));
    }
  };

  const handleDeleteComment = async (artworkId: number, commentId: number) => {
    await fetch(`${API}/artworks/${artworkId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchComments(artworkId);
  };

  const handleReply = (artworkId: number, username: string, parentId: number) => {
    setReplyTo((prev) => ({ ...prev, [artworkId]: { username, parentId } }));
    setNewComment((prev) => ({ ...prev, [artworkId]: "" }));
    setShowReplies((prev) => ({ ...prev, [parentId]: true }));
  };

  const toggleComments = (artworkId: number) => {
    setShowComments((prev) => ({ ...prev, [artworkId]: !prev[artworkId] }));
    if (!comments[artworkId]) fetchComments(artworkId);
  };

  const toggleReplies = (commentId: number) => {
    setShowReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleTagClick = (tag: string) => {
    setFilterTag(tag);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderComment = (c: Comment, artworkId: number, rootParentId: number | null = null) => {
    const replyTargetId = rootParentId ?? c.id;
    return (
      <div key={c.id} className="mb-2 small">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <Link
              to={`/user/${c.user_id}`}
              className="text-dark fw-bold text-decoration-none"
            >
              {c.username}
            </Link>
            <span className="text-muted ms-2">{formatDate(c.created_at)}</span>
          </div>
          {currentUserId && String(currentUserId) === String(c.user_id) && (
            <button
              className="btn btn-link btn-sm text-danger p-0"
              onClick={() => handleDeleteComment(artworkId, c.id)}
            >
              ✕
            </button>
          )}
        </div>
        <div>{c.body}</div>
        <div className="d-flex gap-2 mt-1">
          {token && (
            <button
              className="btn btn-link btn-sm p-0 text-muted"
              onClick={() => handleReply(artworkId, c.username, replyTargetId)}
            >
              ответить
            </button>
          )}
          {c.replies && c.replies.length > 0 && !c.parent_id && (
            <button
              className="btn btn-link btn-sm p-0 text-muted"
              onClick={() => toggleReplies(c.id)}
            >
              {showReplies[c.id] ? "скрыть ответы" : `ответы (${c.replies.length})`}
            </button>
          )}
        </div>
        {c.replies && c.replies.length > 0 && showReplies[c.id] && (
          <div
            style={{ marginLeft: 16, borderLeft: "2px solid #eee", paddingLeft: 12 }}
            className="mt-1"
          >
            {c.replies.map((reply) => renderComment(reply, artworkId, replyTargetId))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchArtworks(filterTag, search);
  }, [filterTag, search]);

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="text-center mt-5 pt-5">
          <h1>🐾 paws</h1>
          <p className="text-muted">Войдите или зарегистрируйтесь, чтобы смотреть работы</p>
          <Link to="/login" className="btn btn-primary me-2">
            Войти
          </Link>
          <Link to="/signup" className="btn btn-outline-primary">
            Регистрация
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <div className="d-flex justify-content-between align-items-center py-3 border-bottom mb-0 sticky-top bg-white">
        <h4 className="m-0">🐾 paws</h4>
        <div className="d-flex align-items-center">
          <div className="input-group input-group-sm me-2" style={{ maxWidth: 150 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>
          <Link to="/upload" className="btn btn-outline-dark btn-sm me-2">
            +
          </Link>
          <Link to="/profile" className="btn btn-outline-dark btn-sm me-2">
            👤
          </Link>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {filterTag && (
        <div
          className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3 sticky-top"
          style={{ top: 56 }}
        >
          <span>#{filterTag}</span>
          <button
            className="btn-close"
            onClick={() => {
              setFilterTag(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          ></button>
        </div>
      )}

      <div className="mt-3" />

      {artworks.map((a) => (
        <div key={a.id} className="mb-4 border rounded">
          <div className="d-flex align-items-center p-2">
            <Link
              to={`/user/${a.user_id}`}
              className="text-decoration-none d-flex align-items-center"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  overflow: "hidden",
                  borderRadius: "50%",
                  marginRight: 10,
                }}
              >
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
            <p className="mb-1">
              <strong>{a.title}</strong>
            </p>
            <p className="text-muted small mb-1">{formatDate(a.created_at)}</p>
            <p className="text-muted small mb-1">{a.description}</p>
            {a.tags.length > 0 && (
              <p className="mb-0">
                {a.tags.map((t) => (
                  <span
                    key={t}
                    className="text-primary me-2"
                    style={{
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={() => handleTagClick(t)}
                  >
                    #{t}
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="border-top px-2 py-1">
            <button
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => toggleComments(a.id)}
            >
              💬 {countAll(comments[a.id] || []) || ""}
            </button>
          </div>

          {showComments[a.id] && (
            <div className="border-top p-2 text-start">
              {(comments[a.id] || []).map((c) => renderComment(c, a.id))}
              <div className="d-flex mt-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={
                    replyTo[a.id]?.username
                      ? `Ответ ${replyTo[a.id]?.username}...`
                      : "Добавить комментарий..."
                  }
                  value={newComment[a.id] || ""}
                  onChange={(e) =>
                    setNewComment((prev) => ({ ...prev, [a.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parentId = replyTo[a.id]?.parentId ?? null;
                      const username = replyTo[a.id]?.username ?? null;
                      handleAddComment(a.id, parentId, username);
                    }
                  }}
                />
                <button
                  className="btn btn-sm btn-outline-primary ms-1"
                  disabled={sending[a.id]}
                  onClick={() => {
                    const parentId = replyTo[a.id]?.parentId ?? null;
                    const username = replyTo[a.id]?.username ?? null;
                    handleAddComment(a.id, parentId, username);
                  }}
                >
                  {sending[a.id] ? "..." : "→"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {artworks.length === 0 && (
        <p className="text-center text-muted mt-5">Ничего не найдено</p>
      )}
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