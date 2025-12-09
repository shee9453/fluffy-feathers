// src/App.jsx
import "./App.css";
import { Outlet, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabaseClient";

function App() {
  const { user, logout } = useAuth();
  const [hasNewChat, setHasNewChat] = useState(false);

  // ✅ 실시간 채팅 알림 구독
  useEffect(() => {
    // 로그아웃 시 구독 해제 & 뱃지 초기화
    if (!user) {
      setHasNewChat(false);
      return;
    }

    // receiver_id = 현재 유저 인 새 메시지 INSERT 구독
    const channel = supabase
      .channel(`chat-noti-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // 새 DM 이 도착하면 헤더에 뱃지 ON
          setHasNewChat(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="layout">
      {/* 네비게이션 바 */}
      <nav className="navbar">
        <div className="nav-inner">
          <Link to="/" className="logo">
            Fluffy & Feathers
          </Link>

          <div className="menu">
            <Link to="/" className="menu-item">
              홈
            </Link>

            <Link to="/board" className="menu-item">
              게시판
            </Link>

            <Link to="/list" className="menu-item">
              돌보미 찾기
            </Link>

            <Link to="/care-requests" className="menu-item">
              신청 목록
            </Link>

            {/* ✅ 채팅 메뉴 + 새 채팅 뱃지 */}
            {user && (
              <Link to="/chat" className="menu-item">
                채팅
                {hasNewChat && <span className="chat-dot" />}
              </Link>
            )}

            {user ? (
              <Link to="/mypage" className="menu-item">
                마이페이지
              </Link>
            ) : (
              ""
            )}

            {user ? (
              <button
                onClick={logout}
                className="menu-item"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            ) : (
              <Link to="/auth" className="menu-item">
                로그인/회원가입
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 페이지 내용 */}
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
