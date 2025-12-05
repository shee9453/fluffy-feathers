// src/pages/board/BoardList.jsx
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./css/BoardList.css";

function BoardList() {
  const { category } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const activeCategory = category || "all";

  // 1) 카테고리 불러오기
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("id", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setLoadError("카테고리를 불러오는 중 오류가 발생했습니다.");
        return;
      }

      setCategories(data || []);
    };
    loadCategories();
  }, []);

  // 2) 게시글 불러오기
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      setLoadError("");

      let query = supabase
        .from("posts")
        .select("id, title, content, created_at, category_id")
        .order("created_at", { ascending: false });

      // 특정 카테고리 필터
      if (category) {
        const { data: cat, error: catError } = await supabase
          .from("categories")
          .select("id")
          .eq("code", category)
          .maybeSingle();

        if (catError) {
          console.error(catError);
          setLoadError("게시글을 불러오는 중 오류가 발생했습니다.");
          setLoading(false);
          return;
        }

        if (cat?.id) {
          query = query.eq("category_id", cat.id);
        } else {
          // 잘못된 카테고리 코드인 경우 전체로 리다이렉트
          navigate("/board", { replace: true });
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        setLoadError("게시글을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      setPosts(data || []);
      setLoading(false);
    };

    loadPosts();
  }, [category, navigate]);

  const getCategoryName = (categoryId) => {
    const found = categories.find((c) => c.id === categoryId);
    return found?.name || "카테고리 없음";
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const makeExcerpt = (content) => {
    if (!content) return "";
    const plain = content.replace(/<[^>]+>/g, ""); // 에디터 쓴 경우 태그 제거
    if (plain.length <= 80) return plain;
    return plain.slice(0, 80) + "…";
  };

  return (
    <div className="list-page board-page">
      {/* 상단 헤더 */}
      <header className="list-header board-header">
        <h1>게시판</h1>
        <p>
          자유게시판, 이용 후기, 용품 후기 등
          <br />
          카테고리별로 소동물 · 앵무새 이야기를 나눠보세요.
        </p>
      </header>

      {/* 카테고리 탭 + 글쓰기 버튼 */}
      <div className="board-top-bar">
        {/* 카테고리 탭 */}
        <div className="board-category-tabs">
          {/* 전체 보기 */}
          <Link
            to="/board"
            className={`chip chip-outline ${
              activeCategory === "all" ? "chip-active" : ""
            }`}
          >
            전체
          </Link>

          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/board/${c.code}`}
              className={`chip chip-outline ${
                activeCategory === c.code ? "chip-active" : ""
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* 글쓰기 버튼 */}
        <div className="board-write-wrap">
          <Link to="/board/write">
            <button className="primary-btn">글쓰기</button>
          </Link>
        </div>
      </div>

      {/* 상태 메시지 */}
      {loadError && (
        <p className="booking-notice board-notice board-notice-error">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="booking-notice board-notice">
          게시글을 불러오는 중입니다...
        </p>
      ) : posts.length === 0 ? (
        <p className="booking-notice board-notice">
          아직 등록된 게시글이 없습니다.
        </p>
      ) : (
        <div className="card-grid board-card-grid">
          {posts.map((p) => (
            <Link
              to={`/board/post/${p.id}`}
              key={p.id}
              className="board-card-link"
            >
              <article className="care-card board-card">
                <div className="board-card-header">
                  <h3 className="board-card-title">{p.title}</h3>

                  <span className="board-card-category">
                    {getCategoryName(p.category_id)}
                  </span>
                </div>

                {p.content && (
                  <p className="board-card-excerpt">
                    {makeExcerpt(p.content)}
                  </p>
                )}

                <p className="board-card-date">
                  {formatDate(p.created_at)}
                </p>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default BoardList;
