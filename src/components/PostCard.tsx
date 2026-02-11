import React, { useState } from "react";
import type { Post, ViewMode } from "../types/post";
import { formatRelativeTime } from "../utils/dateFormat";
import { toggleLike } from "../hooks/usePostInteraction";

interface PostCardProps {
  post: Post;
  viewMode?: ViewMode;
  onOpenComments?: (postId: number) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  viewMode = "grid",
  onOpenComments,
}) => {
  const isFeed = viewMode === "feed";
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes ?? 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await toggleLike(post.id);
    if (result) {
      const isNowLiked = (result.liked as boolean) ?? !liked;
      setLiked(isNowLiked);
      if (result.likeCount !== undefined) {
        setLikeCount(result.likeCount as number);
      } else {
        setLikeCount((prev) => (isNowLiked ? prev + 1 : prev - 1));
      }
    }
  };

  const handleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenComments?.(post.id);
  };

  return (
    <article
      className={`post-card ${isFeed ? "post-card--feed" : ""}`}
      onClick={() => window.open(post.url, "_blank")}
    >
      {post.thumbnail && (
        <div className="post-thumbnail">
          <img src={post.thumbnail} alt={post.title} />
        </div>
      )}
      <div className="post-content">
        <h2 className="post-title">{post.title}</h2>
        <p className="post-description">{post.content}</p>
        <div className="post-meta">
          <span className="post-date">
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>
      </div>
      <div className="post-footer">
        <div className="author-info">
          <img
            src={post.author_avatar}
            alt={post.author}
            className="author-img"
          />
          <span className="author-name">
            by <strong>{post.author}</strong>
          </span>
        </div>
        <div className="post-stats">
          <button
            className={`btn-like ${liked ? "liked" : ""}`}
            onClick={handleLike}
          >
            {liked ? "♥" : "♡"} {likeCount}
          </button>
          <button className="btn-comment" onClick={handleComments}>
            💬 {post.comments ?? 0}
          </button>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
