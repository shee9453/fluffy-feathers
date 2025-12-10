// src/App.jsx
import "./App.css";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

function App() {
  const { user, logout } = useAuth();

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

            {/* <Link to="/board" className="menu-item">
              게시판
            </Link> */}

            <Link to="/list" className="menu-item">
              돌보미 찾기
            </Link>

            <Link to="/care-requests" className="menu-item">
              신청 목록
            </Link>

            {/* 🔥 채팅 메뉴 – 알림 점 제거됨 */}
            {user && (
              <Link to="/chat" className="menu-item">
                채팅
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
