import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Supabase Auth 상태 변화를 실시간 반영
  useEffect(() => {
    // 초기 유저 정보 불러오기
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // 로그인/로그아웃/토큰갱신을 실시간으로 감지
    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 언마운트 시 cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  //  로그인 함수
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    setUser(data.user);
    return data.user;
  };

  //  회원가입 함수
  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    return data.user;
  };

  //  로그아웃 함수
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 다른 컴포넌트에서 쉽게 사용하기
export const useAuth = () => useContext(AuthContext);
