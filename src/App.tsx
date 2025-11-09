import { useEffect, useState } from "react";
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import "./App.css";
import type { Post, TabType, ThemeMode } from "./types/post";

// 샘플 데이터 (API 연동 시 제거하고 실제 데이터 사용)
function App() {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [theme, setTheme] = useState<ThemeMode>("light");

  // 👇 실제 데이터를 저장할 상태(state)를 정의합니다.
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트가 처음 마운트될 때 (로딩될 때) 데이터를 가져옵니다.
  useEffect(() => {
    const fetchData = async () => {
      try {
        // public/data/posts.json 경로로 fetch 요청
        const response = await fetch("/forum-posts.json");

        if (!response.ok) {
          throw new Error(`데이터 로딩 실패: ${response.status}`);
        }

        const data: Post[] = await response.json();
        setPosts(data); // 상태 업데이트
      } catch (error) {
        console.error("로컬 JSON 파일을 불러오는 중 오류 발생:", error);
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
  if (error) return <p>오류: {error}</p>;

  return (
    <div className={`app ${theme}-mode`}>
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />
      <main className="main-container">
        <div className="content-wrapper">
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
