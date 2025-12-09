// src/pages/board/BoardEdit.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./css/BoardWrite.css";

function BoardEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef(null);

  // 카테고리 + 기존 글 로드
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setErrorMsg("로그인 후 이용 가능합니다.");
        setLoading(false);
        return;
      }

      // 카테고리
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*");

      if (catError) {
        console.error(catError);
        setErrorMsg("카테고리를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      setCategories(catData || []);

      // 게시글
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (postError) {
        console.error(postError);
        setErrorMsg("게시글을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (!postData) {
        setErrorMsg("해당 게시글을 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      if (postData.user_id !== user.id) {
        setErrorMsg("이 글을 수정할 권한이 없습니다.");
        setLoading(false);
        return;
      }

      setCategoryId(postData.category_id?.toString() || "");
      setTitle(postData.title || "");
      setContent(postData.content || "");
      setLoading(false);
    };

    load();
  }, [id, user]);

  if (!user) {
    return (
      <div className="detail-page board-write-page">
        <p className="board-write-alert">로그인 후 이용 가능합니다.</p>
      </div>
    );
  }

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

    requestAnimationFrame(() => {
      const pos = start + wrapped.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    if (!categoryId || !title.trim()) {
      alert("카테고리와 제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        title: title.trim(),
        content,
        category_id: Number(categoryId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("수정 중 오류가 발생했습니다.");
      return;
    }

    navigate(`/board/post/${id}`);
  };

  const contentLength = content.trim().length;

  if (loading) {
    return (
      <div className="detail-page board-write-page">
        <p className="board-write-state-text">불러오는 중...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="detail-page board-write-page">
        <p className="board-write-state-text board-write-state-error">
          {errorMsg}
        </p>
      </div>
    );
  }

  return (
    <div className="detail-page board-write-page">
      <header className="board-write-header">
        <h1>글 수정</h1>
        <p className="board-write-sub">
          내용을 수정한 뒤 저장하면 바로 반영됩니다.
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

        {/* 내용 영역 */}
        <div className="board-form-field board-form-field-body">
          <div className="board-editor-header">
            <span className="board-label">내용</span>
            <span className="board-editor-hint">
              수정 후 다시 한 번 확인해 주세요.
            </span>
          </div>

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
            placeholder="내용을 수정해주세요."
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
            onClick={handleSave}
          >
            수정하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoardEdit;
