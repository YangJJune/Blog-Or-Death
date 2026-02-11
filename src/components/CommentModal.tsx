import React, { useState, useEffect, useRef } from "react";
import type { Comment } from "../types/post";
import { fetchComments, addComment } from "../hooks/usePostInteraction";
import { formatRelativeTime } from "../utils/dateFormat";

interface CommentModalProps {
  postId: number;
  onClose: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ postId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchComments(postId).then((data) => {
      setComments(data);
      setIsLoading(false);
    });
  }, [postId]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    const comment = await addComment(postId, trimmed);
    if (comment) {
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    }
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="comment-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="comment-modal">
        <div className="comment-modal-header">
          <h3>댓글 {!isLoading && `(${comments.length})`}</h3>
          <button className="comment-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="comment-list">
          {isLoading ? (
            <p className="comment-empty">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment-item">
                <img
                  src={c.authorAvatar}
                  alt={c.author}
                  className="comment-avatar"
                />
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">{c.author}</span>
                    <span className="comment-date">
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="comment-text">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="comment-input-area">
          <textarea
            className="comment-input"
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className="btn-comment-submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? "..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
