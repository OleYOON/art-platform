import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export interface Comment {
  id: number;
  body: string;
  username: string;
  created_at: string;
  parent_id: number | null;
  user_id: number;
  replies?: Comment[];
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

export function countAll(comments: Comment[]): number {
  let n = 0;
  for (const c of comments) {
    n += 1;
    if (c.replies) n += countAll(c.replies);
  }
  return n;
}

interface Props {
  artworkId: number;
  token: string | null;
  currentUserId: string | null;
  onDeleteArtwork?: () => void;
}

export default function CommentSection({ artworkId, token, currentUserId, onDeleteArtwork }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});
  const [replyTo, setReplyTo] = useState<{ username: string; parentId: number } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const fetchComments = () => {
    fetch(`${API}/artworks/${artworkId}/comments`)
      .then(r => r.json())
      .then(data => setComments(data));
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 1000);
    return () => clearInterval(interval);
  }, [artworkId]);

  const handleAddComment = async (parentId: number | null = null, replyUsername: string | null = null) => {
    if (sending) return;
    let body = newComment.trim();
    if (!body) return;
    if (replyUsername && !body.startsWith(`${replyUsername}, `)) body = `${replyUsername}, ${body}`;
    setSending(true);
    setNewComment("");
    try {
      await fetch(`${API}/artworks/${artworkId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body, parent_id: parentId }),
      });
      setReplyTo(null);
      fetchComments();
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    await fetch(`${API}/artworks/${artworkId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchComments();
  };

  const handleReply = (username: string, parentId: number) => {
    setReplyTo({ username, parentId });
    setNewComment("");
    setShowReplies(prev => ({ ...prev, [parentId]: true }));
  };

  const toggleReplies = (commentId: number) => setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));

  const renderComment = (c: Comment, rootParentId: number | null = null) => {
    const replyTargetId = rootParentId ?? c.id;
    return (
      <div key={c.id} className="mb-2 small">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <Link to={`/user/${c.user_id}`} className="text-dark fw-bold text-decoration-none">{c.username}</Link>
            <span className="text-muted ms-2">{formatDate(c.created_at)}</span>
          </div>
          {currentUserId && String(currentUserId) === String(c.user_id) && (
            <button className="btn btn-link btn-sm text-danger p-0" onClick={() => handleDeleteComment(c.id)}>✕</button>
          )}
        </div>
        <div>{c.body}</div>
        <div className="d-flex gap-2 mt-1">
          <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => handleReply(c.username, replyTargetId)}>ответить</button>
          {c.replies && c.replies.length > 0 && !c.parent_id && (
            <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => toggleReplies(c.id)}>
              {showReplies[c.id] ? "скрыть ответы" : `ответы (${c.replies.length})`}
            </button>
          )}
        </div>
        {c.replies && c.replies.length > 0 && showReplies[c.id] && (
          <div style={{ marginLeft: 16, borderLeft: "2px solid #f0edf5", paddingLeft: 12 }} className="mt-1">
            {c.replies.map(reply => renderComment(reply, replyTargetId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="comment-bar d-flex justify-content-end gap-3 border-top px-2 py-1">
        {currentUserId && onDeleteArtwork && (
          <button
            className="btn btn-sm text-danger p-0 border-0 bg-transparent"
            style={{ textDecoration: "none" }}
            onClick={onDeleteArtwork}
          >
            🗑
          </button>
        )}
        <button
          className="btn btn-sm text-muted p-0 border-0 bg-transparent"
          style={{ textDecoration: "none" }}
          onClick={() => { setShowComments(!showComments); if (!showComments) fetchComments(); }}
        >
          💬 {countAll(comments)}
        </button>
      </div>
      {showComments && (
        <div className="comment-block border-top p-2 text-start">
          {comments.map(c => renderComment(c))}
          {token && (
            <div className="d-flex mt-2">
            <div className="position-relative flex-grow-1">
                <input
                type="text"
                className="form-control form-control-sm pe-5"
                placeholder={replyTo ? `Ответ ${replyTo.username}...` : "Добавить комментарий..."}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddComment(replyTo?.parentId ?? null, replyTo?.username ?? null); }}
                />
                <button
                className="btn btn-sm position-absolute end-0 top-50 translate-middle-y border-0 p-1"
                style={{ textDecoration: "none", boxShadow: "none", backgroundColor: "#1a1a2e", color: "#b9adcc" }}
                disabled={sending}
                onClick={() => handleAddComment(replyTo?.parentId ?? null, replyTo?.username ?? null)}
                >
                {sending ? "..." : "→"}
                </button>
            </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}