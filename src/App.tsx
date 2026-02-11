import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import CommentModal from "./components/CommentModal";
import BlogUrlPage from "./pages/BlogUrlPage";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { fetchMember } from "./hooks/useBlogUrl";
import "./App.css";
import type { Post, TabType, ThemeMode, ViewMode } from "./types/post";

interface PostResponse {
  content: Post[];
  totalPages: number;
  totalElements: number;
  last: boolean;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const {
    user: discordUser,
    login: discordLogin,
    logout: discordLogout,
  } = useDiscordAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0); // 현재 페이지
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [commentPostId, setCommentPostId] = useState<number | null>(null);

  // 최초 로그인 감지: undefined(초기) → null(미로그인) → user(로그인)
  const prevUserRef = useRef<string | null | undefined>(undefined);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fetchData = useCallback(
    async (pageNum: number) => {
      if (isLoading || !hasNextPage) return;

      setIsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        // 탭(sort) 정보와 페이지 번호를 쿼리 파라미터로 전달
        const response = await fetch(
          `${baseUrl}/api/posts?mode=${activeTab}&page=${pageNum}&size=20`,
        );

        if (!response.ok)
          throw new Error(`데이터 로딩 실패: ${response.status}`);

        const data: PostResponse = await response.json();

        setPosts((prev) => [...prev, ...data.content]); // 기존 데이터에 추가
        setHasNextPage(!data.last); // 마지막 페이지 여부 업데이트
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, hasNextPage, isLoading],
  );
  useEffect(() => {
    setPosts([]);
    setPage(0);
    setHasNextPage(true);
    // 탭이 바뀌면 0페이지부터 다시 시작
  }, [activeTab]);

  useEffect(() => {
    fetchData(page);
  }, [page]);
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasNextPage],
  );
  useEffect(() => {
    if (prevUserRef.current === null && discordUser !== null) {
      // 방금 로그인 완료 → 블로그 등록 여부 확인
      fetchMember(discordUser.id).then((member) => {
        if (!member) {
          navigate("/blog-url");
        }
      });
    }
    prevUserRef.current = discordUser?.id ?? null;
  }, [discordUser, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${baseUrl}/api/posts`);

        if (!response.ok) {
          throw new Error(`데이터 로딩 실패: ${response.status}`);
        }

        const data: PostResponse = await response.json();
        setPosts(data.content);
      } catch (e) {
        alert("로컬 JSON 파일을 불러오는 중 오류 발생:" + e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className={`app ${theme}-mode`}>
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        discordUser={discordUser}
        onDiscordLogin={discordLogin}
        onDiscordLogout={discordLogout}
      />
      <Routes>
        <Route
          path="/"
          element={
            isLoading ? (
              <p style={{ padding: "2rem", textAlign: "center" }}>
                게시글을 불러오는 중입니다...
              </p>
            ) : (
              <main className="main-container">
                <div className="content-wrapper">
                  <div className="view-toggle">
                    <button
                      className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="그리드 뷰"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="currentColor"
                      >
                        <rect x="0" y="0" width="8" height="8" rx="1" />
                        <rect x="10" y="0" width="8" height="8" rx="1" />
                        <rect x="0" y="10" width="8" height="8" rx="1" />
                        <rect x="10" y="10" width="8" height="8" rx="1" />
                      </svg>
                    </button>
                    <button
                      className={`view-toggle-btn ${viewMode === "feed" ? "active" : ""}`}
                      onClick={() => setViewMode("feed")}
                      title="피드 뷰"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="currentColor"
                      >
                        <rect x="0" y="0" width="18" height="4" rx="1" />
                        <rect x="0" y="7" width="18" height="4" rx="1" />
                        <rect x="0" y="14" width="18" height="4" rx="1" />
                      </svg>
                    </button>
                  </div>
                  <div
                    className={viewMode === "grid" ? "post-grid" : "post-feed"}
                  >
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        viewMode={viewMode}
                        onOpenComments={(id) => setCommentPostId(id)}
                      />
                    ))}
                  </div>
                  {/* 무한 스크롤 트리거 요소 */}
                  <div
                    ref={lastElementRef}
                    style={{ height: "20px", margin: "20px 0" }}
                  >
                    {isLoading && (
                      <p style={{ textAlign: "center" }}>
                        게시글을 더 불러오는 중입니다...
                      </p>
                    )}
                    {!hasNextPage && posts.length > 0 && (
                      <p style={{ textAlign: "center", color: "#888" }}>
                        마지막 게시글입니다.
                      </p>
                    )}
                  </div>
                </div>
              </main>
            )
          }
        />
        <Route
          path="/blog-url"
          element={<BlogUrlPage discordUser={discordUser} />}
        />
      </Routes>
      {commentPostId !== null && (
        <CommentModal
          postId={commentPostId}
          onClose={() => setCommentPostId(null)}
        />
      )}
    </div>
  );
}

export default App;
