import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

interface Comment {
  id: number;
  body: string;
  username: string;
  created_at: string;
  parent_id: number | null;
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
}

export default function HomePage() {
  const token = localStorage.getItem("token");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [replyTo, setReplyTo] = useState<Record<number, string | null>>({});
  const [replyParentId, setReplyParentId] = useState<Record<number, number | null>>({});

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

  const handleAddComment = async (artworkId: number, parentId: number | null = null) => {
    const body = newComment[artworkId]?.trim();
    if (!body) return;
    await fetch(`${API}/artworks/${artworkId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body, parent_id: parentId }),
    });
    setNewComment((prev) => ({ ...prev, [artworkId]: "" }));
    setReplyTo((prev) => ({ ...prev, [artworkId]: null }));
    setReplyParentId((prev) => ({ ...prev, [artworkId]: null }));
    fetchComments(artworkId);
  };

  const handleReply = (artworkId: number, username: string, commentId: number) => {
    setReplyTo((prev) => ({ ...prev, [artworkId]: username }));
    setReplyParentId((prev) => ({ ...prev, [artworkId]: commentId }));
    setNewComment((prev) => ({ ...prev, [artworkId]: `@${username} ` }));
    setShowComments((prev) => ({ ...prev, [artworkId]: true }));
  };

  const toggleComments = (artworkId: number) => {
    setShowComments((prev) => ({ ...prev, [artworkId]: !prev[artworkId] }));
    if (!comments[artworkId]) fetchComments(artworkId);
  };

  const handleTagClick = (tag: string) => {
    setFilterTag(tag);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderComments = (commentList: Comment[], artworkId: number, depth: number = 0) => {
    return commentList.map((c) => (
      <div key={c.id} style={{ marginLeft: depth * 20 }} className="mb-1 small border-start ps-2">
        <Link to={`/user/${c.username}`} className="text-dark fw-bold text-decoration-none">{c.username}</Link>{" "}
        {c.body}
        {token && (
          <button
            className="btn btn-link btn-sm p-0 ms-1 text-muted"
            onClick={() => handleReply(artworkId, c.username, c.id)}
          >
            ответить
          </button>
        )}
        {c.replies && c.replies.length > 0 && renderComments(c.replies, artworkId, depth + 1)}
      </div>
    ));
  };

  useEffect(() => {
    fetchArtworks(filterTag, search);
  }, [filterTag, search]);

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
              <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>✕</button>
            )}
          </div>
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

      {filterTag && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3 sticky-top" style={{ top: 56 }}>
          <span>#{filterTag}</span>
          <button className="btn-close" onClick={() => { setFilterTag(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}></button>
        </div>
      )}

      <div className="mt-3" />

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
            <p className="mb-1"><strong>{a.title}</strong></p>
            <p className="text-muted small mb-1">{a.description}</p>
            {a.tags.length > 0 && (
              <p className="mb-0">
                {a.tags.map(t => (
                  <span
                    key={t}
                    className="text-primary me-2"
                    style={{ fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => handleTagClick(t)}
                  >
                    #{t}
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* Кнопка комментариев */}
          <div className="border-top px-2 py-1">
            <button
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => toggleComments(a.id)}
            >
              💬 {countAll((comments[a.id] || [])) || ""}
            </button>
          </div>

          {/* Комментарии */}
          {showComments[a.id] && (
            <div className="border-top p-2">
              {renderComments(comments[a.id] || [], a.id)}
              {token && (
                <div className="d-flex mt-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={replyTo[a.id] ? `Ответ @${replyTo[a.id]}...` : "Добавить комментарий..."}
                    value={newComment[a.id] || ""}
                    onChange={(e) => setNewComment((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(a.id, replyParentId[a.id] || null)}
                  />
                  <button className="btn btn-sm btn-outline-primary ms-1" onClick={() => handleAddComment(a.id, replyParentId[a.id] || null)}>→</button>
                </div>
              )}
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