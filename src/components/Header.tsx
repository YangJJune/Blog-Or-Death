import React from "react";
import type { TabType, ThemeMode, DiscordUser } from "../types/post";
import { getAvatarUrl } from "../hooks/useDiscordAuth";

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  discordUser: DiscordUser | null;
  onDiscordLogin: () => void;
  onDiscordLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  theme,
  onThemeToggle,
  discordUser,
  onDiscordLogin,
  onDiscordLogout,
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
          {discordUser ? (
            <div className="user-menu">
              <img
                src={getAvatarUrl(discordUser)}
                alt={discordUser.global_name || discordUser.username}
                className="user-avatar"
              />
              <span className="user-name">
                {discordUser.global_name || discordUser.username}
              </span>
              <button className="btn-logout" onClick={onDiscordLogout}>
                로그아웃
              </button>
            </div>
          ) : (
            <button className="btn-discord-login" onClick={onDiscordLogin}>
              <svg
                width="20"
                height="15"
                viewBox="0 0 71 55"
                fill="currentColor"
              >
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.6 59.6 0 00.4 45a.3.3 0 00.1.2 58.9 58.9 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.8 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.7 58.7 0 0070.7 45.2a.3.3 0 00.1-.2c1.6-16.7-2.7-31.2-11.4-44A.2.2 0 0060 5zM23.7 36.9c-3.8 0-6.9-3.5-6.9-7.8s3-7.8 6.9-7.8c3.9 0 7 3.5 6.9 7.8 0 4.3-3 7.8-6.9 7.8zm25.5 0c-3.8 0-6.9-3.5-6.9-7.8s3-7.8 6.9-7.8c3.9 0 7 3.5 6.9 7.8 0 4.3-3.1 7.8-6.9 7.8z" />
              </svg>
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
