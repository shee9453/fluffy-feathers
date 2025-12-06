// src/pages/ResetPassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/ResetPassword.css";

function ResetPassword() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 1) 로그인/세션 확인 중일 때
  if (authLoading) {
    return (
      <div className="resetpw-page resetpw-state">
        <p className="resetpw-state-text">
          비밀번호 재설정 정보를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // 2) 세션(유저)이 없는 경우: 이메일 링크가 만료/잘못된 경우
    if (!user) {
      setErrorMsg(
        "비밀번호 재설정 링크가 유효하지 않거나 세션이 만료되었습니다.\n다시 비밀번호 재설정을 요청해 주세요."
      );
      return;
    }

    // 3) 기본 검증
    if (!newPassword || !confirmPassword) {
      setErrorMsg("새 비밀번호와 비밀번호 확인을 모두 입력해 주세요.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("비밀번호는 8자 이상으로 설정해 주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      // 4) Supabase에 직접 새 비밀번호 업데이트 (이전 비번 필요 없음)
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error(error);
        setErrorMsg("비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setSuccessMsg(
        "비밀번호가 성공적으로 변경되었습니다.\n이제 새로운 비밀번호로 로그인할 수 있어요."
      );
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resetpw-page">
      <div className="resetpw-card">
        <h1 className="resetpw-title">새 비밀번호 설정</h1>
        <p className="resetpw-sub">
          메일에서 전송된 링크를 통해 접속한 화면이에요.
          <br />
          아래에 사용할 <b>새 비밀번호</b>를 입력하고 저장해 주세요.
        </p>

        {user ? (
          <p className="resetpw-info">
            현재 <b>{user.email}</b> 계정의 비밀번호를 변경합니다.
          </p>
        ) : (
          <p className="resetpw-info resetpw-info-warning">
            유효한 재설정 세션이 없습니다.
            <br />
            다시{" "}
            <button
              type="button"
              className="resetpw-inline-link"
              onClick={() => navigate("/auth")}
            >
              로그인 / 비밀번호 재설정
            </button>
            을 진행해 주세요.
          </p>
        )}

        {errorMsg && (
          <p className="resetpw-error">
            {errorMsg.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br />
              </span>
            ))}
          </p>
        )}

        {successMsg && (
          <p className="resetpw-success">
            {successMsg.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br />
              </span>
            ))}
          </p>
        )}

        {/* 세션이 있을 때만 비밀번호 변경 폼 노출 */}
        {user && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>새 비밀번호</label>
              <input
                type="password"
                placeholder="8자 이상"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>새 비밀번호 확인</label>
              <input
                type="password"
                placeholder="한 번 더 입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="resetpw-button-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate("/auth")}
                disabled={loading}
              >
                로그인 화면으로
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? "변경 중..." : "비밀번호 변경하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
