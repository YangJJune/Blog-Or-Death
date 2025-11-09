import React from "react";
import type { TabType, ThemeMode } from "../types/post";

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  theme,
  onThemeToggle,
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: "trending", label: "트렌딩" },
    { id: "curated", label: "큐레이션" },
    { id: "recent", label: "최신" },
    { id: "feed", label: "피드" },
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <h1>블로그 안 쓰면 죽는 모임</h1>
        </div>
        <nav className="nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" onClick={onThemeToggle}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button className="btn-search">🔍</button>
          <button className="btn-write">새 글 작성</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
