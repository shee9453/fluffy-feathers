// src/pages/board/BoardWrite.jsx
import { useState, useEffect, useRef } from "react";
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
  const textareaRef = useRef(null);

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

  // 간단한 마크다운 포맷 적용 함수
  const applyFormat = (type) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);

    let wrapped = "";
    if (type === "bold") {
      wrapped = `**${selected || "굵게"}**`;
    } else if (type === "italic") {
      wrapped = `*${selected || "기울임"}*`;
    } else if (type === "underline") {
      // 마크다운엔 밑줄이 없어서, 그냥 __text__로 처리
      wrapped = `__${selected || "밑줄"}__`;
    } else if (type === "ul") {
      wrapped = selected
        ? selected
            .split("\n")
            .map((line) => (line ? `- ${line}` : ""))
            .join("\n")
        : "- 항목";
    } else if (type === "ol") {
      wrapped = selected
        ? selected
            .split("\n")
            .map((line, idx) => (line ? `${idx + 1}. ${line}` : ""))
            .join("\n")
        : "1. 항목";
    } else if (type === "quote") {
      wrapped = selected
        ? selected
            .split("\n")
            .map((line) => (line ? `> ${line}` : ""))
            .join("\n")
        : "> 인용문";
    } else if (type === "hr") {
      wrapped = "\n---\n";
    }

    const newValue = content.slice(0, start) + wrapped + content.slice(end);
    setContent(newValue);

    // 커서 위치 적당히 재설정
    requestAnimationFrame(() => {
      const pos = start + wrapped.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async () => {
    const value = content;

    if (!categoryId || !title.trim()) {
      alert("카테고리와 제목을 입력해주세요.");
      return;
    }

    if (!value.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    const { error } = await supabase.from("posts").insert({
      title: title.trim(),
      content: value, // 마크다운/텍스트 그대로 저장
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
              기본 텍스트 + 간단한 마크다운(**굵게**, *기울임*, 목록 등)을 쓸 수
              있어요.
            </span>
          </div>

          {/* 툴바 */}
          <div className="board-editor-toolbar">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormat("bold")}
            >
              B
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormat("italic")}
            >
              I
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormat("underline")}
            >
              U
            </button>
            <span className="toolbar-divider" />
            <button
              type="button"
              className="toolbar-btn-sm"
              onClick={() => applyFormat("ul")}
            >
              • 목록
            </button>
            <button
              type="button"
              className="toolbar-btn-sm"
              onClick={() => applyFormat("ol")}
            >
              1. 목록
            </button>
            <button
              type="button"
              className="toolbar-btn-sm"
              onClick={() => applyFormat("quote")}
            >
              &gt; 인용
            </button>
            <button
              type="button"
              className="toolbar-btn-sm"
              onClick={() => applyFormat("hr")}
            >
              ─ 구분선
            </button>
          </div>

          <textarea
            ref={textareaRef}
            className="board-textarea"
            rows={12}
            placeholder={
              "후기, 자유글, 정보 공유 등 자유롭게 작성해주세요.\n줄바꿈과 리스트, 구분선 등으로 내용을 보기 좋게 정리해보세요 :)"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="board-editor-footer">
            <span className="board-editor-count">{contentLength} 글자</span>
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
