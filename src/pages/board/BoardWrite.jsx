// src/pages/board/BoardWrite.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./css/BoardWrite.css";

function BoardWrite() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("categories").select("*");

      if (error) {
        console.error(error);
        return;
      }

      setCategories(data || []);
    };
    load();
  }, []);

  if (!user) {
    return (
      <div className="detail-page board-write-page">
        <p className="board-write-alert">
          글을 작성하려면 로그인이 필요합니다.
        </p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!categoryId || !title.trim()) {
      alert("카테고리와 제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    const { error } = await supabase.from("posts").insert({
      title: title.trim(),
      content,
      category_id: Number(categoryId),
      user_id: user.id,
    });

    if (error) {
      console.error(error);
      alert("작성 중 오류가 발생했습니다.");
      return;
    }

    navigate("/board");
  };

  const contentLength = content.trim().length;

  return (
    <div className="detail-page board-write-page">
      <header className="board-write-header">
        <h1>새 글 작성</h1>
        <p className="board-write-sub">
          자유게시판 · 방문후기 · 용품후기에서 함께 이야기해요.
        </p>
      </header>

      <div className="detail-box board-write-box">
        {/* 상단: 카테고리 + 제목 */}
        <div className="board-form-row">
          <div className="board-form-field">
            <label className="board-label">카테고리</label>
            <select
              className="board-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">선택해주세요</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="board-form-field flex-1">
            <label className="board-label">제목</label>
            <input
              className="board-input"
              placeholder="글 제목을 입력해주세요."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* 에디터 느낌의 내용 영역 */}
        <div className="board-form-field board-form-field-body">
          <div className="board-editor-header">
            <span className="board-label">내용</span>
            <span className="board-editor-hint">
              최소 한 줄 이상 작성해주세요.
            </span>
          </div>

          {/* 가짜 툴바 (디자인용) */}
          <div className="board-editor-toolbar">
            <button type="button" className="toolbar-btn">
              B
            </button>
            <button type="button" className="toolbar-btn">
              I
            </button>
            <button type="button" className="toolbar-btn">
              U
            </button>
            <span className="toolbar-divider" />
            <button type="button" className="toolbar-btn-sm">
              • 목록
            </button>
            <button type="button" className="toolbar-btn-sm">
              1. 목록
            </button>
          </div>

          <textarea
            className="board-textarea"
            rows={12}
            placeholder={
              "후기, 자유글, 정보 공유 등 자유롭게 작성해주세요.\n줄바꿈과 리스트, 구분선 등으로 내용을 보기 좋게 정리해보세요 :)"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="board-editor-footer">
            <span className="board-editor-count">
              {contentLength} 글자
            </span>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="board-write-actions">
          <button
            className="secondary-btn"
            type="button"
            onClick={() => navigate(-1)}
          >
            취소
          </button>
          <button
            className="primary-btn"
            type="button"
            onClick={handleSubmit}
          >
            작성하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoardWrite;
