import React from "react";
import type { Post } from "../types/post";
import { formatRelativeTime } from "../utils/dateFormat";

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <article
      className="post-card"
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
          {post.comments !== undefined && (
            <>
              <span className="separator">·</span>
              <span className="post-comments">{post.comments}개의 댓글</span>
            </>
          )}
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
        {post.likes !== undefined && (
          <div className="post-stats">
            <span className="likes">♥ {post.likes}</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default PostCard;
