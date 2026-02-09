import { useEffect, useState } from "react";
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import "./App.css";
import type { Post, TabType, ThemeMode, ViewMode } from "./types/post";

interface PostResponse {
  content: Post[];
  totalPages: number;
  totalElements: number;
  last: boolean;
}
// 샘플 데이터 (API 연동 시 제거하고 실제 데이터 사용)
function App() {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { user: discordUser, login: discordLogin, logout: discordLogout } = useDiscordAuth();

  // 👇 실제 데이터를 저장할 상태(state)를 정의합니다.
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트가 처음 마운트될 때 (로딩될 때) 데이터를 가져옵니다.
  useEffect(() => {
    const fetchData = async () => {
      try {
        // API에서 데이터 가져오기
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${baseUrl}/api/posts`);

        if (!response.ok) {
          throw new Error(`데이터 로딩 실패: ${response.status}`);
        }

        const data: PostResponse = await response.json();
        setPosts(data.content); // 상태 업데이트
      } catch (e) {
        alert("로컬 JSON 파일을 불러오는 중 오류 발생:" + e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // 빈 의존성 배열을 넣어 컴포넌트 마운트 시 한 번만 실행되도록 합니다.

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // TODO: API 호출하여 해당 탭의 데이터 가져오기
    // fetchPosts(tab);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (isLoading) return <p>게시글을 불러오는 중입니다...</p>;

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
      <main className="main-container">
        <div className="content-wrapper">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="그리드 뷰"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
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
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="0" y="0" width="18" height="4" rx="1" />
                <rect x="0" y="7" width="18" height="4" rx="1" />
                <rect x="0" y="14" width="18" height="4" rx="1" />
              </svg>
            </button>
          </div>
          <div className={viewMode === "grid" ? "post-grid" : "post-feed"}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} viewMode={viewMode} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
