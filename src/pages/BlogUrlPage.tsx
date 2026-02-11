import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { DiscordUser } from "../types/post";
import { useBlogUrl, detectPlatform } from "../hooks/useBlogUrl";

interface BlogUrlPageProps {
  discordUser: DiscordUser | null;
}

const BlogUrlPage: React.FC<BlogUrlPageProps> = ({ discordUser }) => {
  const navigate = useNavigate();
  const { blogUrl, isLoading, load, save } = useBlogUrl(discordUser?.id);

  const [inputUrl, setInputUrl] = useState("");
  const [error, setError] = useState("");
  const [detectedLabel, setDetectedLabel] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!blogUrl;

  useEffect(() => {
    if (!discordUser) {
      navigate("/", { replace: true });
      return;
    }
    load();
  }, [discordUser, navigate, load]);

  useEffect(() => {
    if (blogUrl) setInputUrl(blogUrl);
  }, [blogUrl]);

  const handleUrlChange = (value: string) => {
    setInputUrl(value);
    setError("");
    const trimmed = value.trim();
    if (!trimmed) {
      setDetectedLabel(null);
      return;
    }
    const detected = detectPlatform(trimmed);
    setDetectedLabel(detected ? detected.label : null);
  };

  const handleSubmit = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setError("블로그 URL을 입력해주세요.");
      return;
    }
    const detected = detectPlatform(trimmed);
    if (!detected) {
      setError(
        "지원하지 않는 블로그입니다. Medium, Velog, DEV.to, Tistory, GitHub Pages를 지원합니다."
      );
      return;
    }
    setIsSaving(true);
    const ok = await save(trimmed);
    setIsSaving(false);
    if (ok) {
      navigate("/");
    } else {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (isLoading) {
    return (
      <div className="blog-url-page">
        <div className="blog-url-card">
          <p>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-url-page">
      <div className="blog-url-card">
        <h2>{isEditing ? "블로그 URL 수정" : "블로그 URL 등록"}</h2>
        <p>
          운영 중인 블로그의 URL을 등록해주세요.
        </p>
        <div className="platform-list">
          <span className="platform-tag">Velog</span>
          <span className="platform-tag">Medium</span>
          <span className="platform-tag">DEV.to</span>
          <span className="platform-tag">Tistory</span>
          <span className="platform-tag">GitHub Pages</span>
        </div>
        <input
          type="url"
          className={`blog-url-input ${error ? "error" : ""}`}
          placeholder="https://velog.io/@username"
          value={inputUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {detectedLabel && (
          <span className="platform-badge">{detectedLabel}</span>
        )}
        {error && <p className="blog-url-error">{error}</p>}
        <div className="blog-url-actions">
          <button
            className="btn-blog-cancel"
            onClick={() => navigate("/")}
          >
            취소
          </button>
          <button
            className="btn-blog-submit"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : isEditing ? "저장" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogUrlPage;
