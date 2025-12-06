// src/pages/ChangePassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/ChangePassword.css";

function ChangePassword() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (authLoading) {
    return (
      <div className="changepw-page changepw-state">
        <p className="changepw-state-text">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="changepw-page changepw-state">
        <h1 className="changepw-title">비밀번호 변경</h1>
        <p className="changepw-sub">
          비밀번호를 변경하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setErrorMsg("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("새 비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setErrorMsg("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg("현재 비밀번호와 다른 새 비밀번호를 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      // 1) 현재 비밀번호가 맞는지 재로그인으로 검증
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        console.error(signInError);
        setErrorMsg("현재 비밀번호가 올바르지 않습니다.");
        return;
      }

      // 2) 새 비밀번호로 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error(updateError);
        setErrorMsg("비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setSuccessMsg(
        "비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요."
      );
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="changepw-page">
      <div className="changepw-card">
        <h1 className="changepw-title">비밀번호 변경</h1>
        <p className="changepw-sub">
          현재 사용 중인 비밀번호를 한 번 더 확인한 뒤,
          <br />
          새 비밀번호로 변경할 수 있습니다.
        </p>

        {errorMsg && <p className="changepw-error">{errorMsg}</p>}
        {successMsg && <p className="changepw-success">{successMsg}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>현재 비밀번호</label>
            <input
              type="password"
              placeholder="현재 비밀번호"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-group form-group-spaced">
            <label>새 비밀번호</label>
            <input
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group form-group-spaced">
            <label>새 비밀번호 확인</label>
            <input
              type="password"
              placeholder="새 비밀번호 다시 입력"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
            />
          </div>

          <div className="changepw-button-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              취소
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
