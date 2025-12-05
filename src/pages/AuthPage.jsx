// src/pages/AuthPage.jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./css/AuthPage.css";

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "signup"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 회원가입용 추가 정보
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 이미 로그인한 상태라면 간단 안내
  if (user) {
    return (
      <div className="detail-page auth-page">
        <div className="detail-box auth-card">
          <h1 className="auth-title">이미 로그인되어 있어요</h1>
          <p className="auth-description">
            상단 메뉴에서 <strong>마이페이지</strong> 또는 다른 기능을 이용해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMsg("로그인에 실패했습니다. 이메일/비밀번호를 확인해 주세요.");
      return;
    }

    navigate("/");
  };

  const handleSignUp = async () => {
    setErrorMsg("");

    if (!email || !password || !name) {
      setErrorMsg("이메일, 비밀번호, 닉네임은 필수입니다.");
      return;
    }

    setLoading(true);

    // 1) Supabase Auth 회원 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error(error);
      setErrorMsg("회원가입 중 오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    const newUser = data.user;

    if (!newUser) {
      setErrorMsg("회원정보를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    // 2) profiles 테이블에 프로필 행 생성 (user_id = auth.users.id)
    const ageNumber = age ? Number(age) : null;

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: newUser.id,
      name,
      region,
      gender,
      age: ageNumber,
    });

    if (profileError) {
      console.error(profileError);
      setErrorMsg("프로필 저장 중 오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    setLoading(false);
    alert("회원가입이 완료되었습니다. 이제 로그인해 주세요.");
    setMode("login");
  };

  return (
    <div className="detail-page auth-page">
      <div className="detail-box auth-card">
        {/* 모드 토글 */}
        <div className="auth-toggle">
          <button
            className={`auth-toggle-btn ${
              mode === "login" ? "auth-toggle-active" : ""
            }`}
            type="button"
            onClick={() => setMode("login")}
          >
            로그인
          </button>
          <button
            className={`auth-toggle-btn ${
              mode === "signup" ? "auth-toggle-active" : ""
            }`}
            type="button"
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        <h1 className="auth-title">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="auth-subtitle">
          Fluffy & Feathers 서비스를 이용하려면{" "}
          {mode === "login" ? "로그인" : "계정을 만들어 주세요."}
        </p>

        {errorMsg && <p className="auth-error">{errorMsg}</p>}

        {/* 공통: 이메일 / 비밀번호 */}
        <div className="form-group">
          <label>이메일</label>
          <input
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group form-group-spaced">
          <label>비밀번호</label>
          <input
            type="password"
            placeholder="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* 회원가입일 때만 추가 정보 입력 */}
        {mode === "signup" && (
          <>
            <div className="form-group form-group-spaced">
              <label>닉네임</label>
              <input
                placeholder="게시판/후기에서 보일 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group form-group-spaced">
              <label>지역</label>
              <input
                placeholder="예: 서울 은평구"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>

            <div className="form-group form-group-row form-group-spaced">
              <div className="form-col">
                <label>성별</label>
                <input
                  placeholder="선택 (예: 여성)"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />
              </div>
              <div className="form-col form-col-small">
                <label>나이</label>
                <input
                  type="number"
                  placeholder="나이"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <div className="auth-submit-wrap">
          {mode === "login" ? (
            <button
              className="primary-btn full-width"
              type="button"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          ) : (
            <button
              className="primary-btn full-width"
              type="button"
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
