// src/pages/board/BoardDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import "./css/BoardDetail.css";

function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [authorName, setAuthorName] = useState("익명");

  const [loadingPost, setLoadingPost] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // ------------------------------------------------------
  //  게시글 + 작성자 이름 불러오기
  // ------------------------------------------------------
  useEffect(() => {
    const loadPost = async () => {
      setLoadingPost(true);
      setErrorMsg("");

      // 1) 게시글 데이터 가져오기
      const { data, error } = await supabase
        .from("posts")
        .select("*, categories(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setErrorMsg("게시글을 불러오는 중 오류가 발생했습니다.");
        setLoadingPost(false);
        return;
      }

      if (!data) {
        setErrorMsg("해당 게시글을 찾을 수 없습니다.");
        setLoadingPost(false);
        return;
      }

      setPost(data);

      // 2) 작성자 이름 조회 (profiles.user_id 로 조회)
      if (data.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", data.user_id)
          .maybeSingle();

        if (!profileError && profile?.name) {
          setAuthorName(profile.name);
        } else {
          setAuthorName("익명");
        }
      }

      setLoadingPost(false);
    };

    loadPost();
  }, [id]);

  // ------------------------------------------------------
  //  댓글 불러오기
  // ------------------------------------------------------
  useEffect(() => {
    const loadComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setComments(data || []);
    };

    if (id) {
      loadComments();
    }
  }, [id]);

  // ------------------------------------------------------
  //  댓글 작성
  // ------------------------------------------------------
  const handleAddComment = async () => {
    if (!user) {
      alert("댓글을 작성하려면 로그인해주세요.");
      return;
    }

    if (!newComment.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    setSavingComment(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: Number(id),
        user_id: user.id,
        content: newComment.trim(),
      })
      .select()
      .single();

    setSavingComment(false);

    if (error) {
      console.error(error);
      alert("댓글 작성 중 오류가 발생했습니다.");
      return;
    }

    setComments((prev) => [...prev, data]);
    setNewComment("");
  };

  // ------------------------------------------------------
  //  댓글 삭제
  // ------------------------------------------------------
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("정말 이 댓글을 삭제하시겠어요?")) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error(error);
      alert("댓글 삭제 중 오류가 발생했습니다.");
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // ------------------------------------------------------
  // 게시글 삭제
  // ------------------------------------------------------
  const handleDeletePost = async () => {
    if (!window.confirm("정말 이 글을 삭제할까요?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했습니다.");
      return;
    }

    alert("삭제되었습니다.");
    navigate("/board");
  };

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------
  if (loadingPost) {
    return (
      <div className="detail-page board-detail-page">
        <p className="board-detail-state-text">불러오는 중...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="detail-page board-detail-page">
        <p className="board-detail-state-text board-detail-state-error">
          {errorMsg}
        </p>
      </div>
    );
  }

  if (!post) return null;

  const isAuthor = user?.id === post.user_id;

  return (
    <div className="detail-page board-detail-page">
      {/* 제목 + 카테고리 */}
      <header className="detail-header board-detail-header">
        <div>
          <h1>{post.title}</h1>
          <p className="board-detail-meta">
            <span>작성자: {authorName}</span>
            <span className="divider">·</span>
            <span>
              작성일:{" "}
              {post.created_at &&
                new Date(post.created_at).toLocaleString("ko-KR")}
            </span>
          </p>
        </div>
        <span className="detail-badge board-detail-category-badge">
          {post.categories?.name || "게시글"}
        </span>
      </header>

      {/* 본문 HTML 렌더링 */}
      <section className="detail-box board-detail-content-box">
        <div
          className="detail-long-text post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </section>

      {/* 수정/삭제 버튼 (작성자만) */}
      {isAuthor && (
        <div className="detail-footer board-detail-actions">
          <Link to={`/board/edit/${post.id}`}>
            <button className="secondary-btn" type="button">
              글 수정
            </button>
          </Link>
          <button
            className="small-btn small-btn-danger"
            type="button"
            onClick={handleDeletePost}
          >
            글 삭제
          </button>
        </div>
      )}

      {/* 댓글 섹션 */}
      <section className="comment-section">
        <h3>댓글</h3>

        {/* 댓글 목록 */}
        {comments.length === 0 ? (
          <p className="booking-notice">아직 댓글이 없습니다.</p>
        ) : (
          <div className="comment-list">
            {comments.map((c) => (
              <article key={c.id} className="comment-item">
                <div className="comment-meta">
                  <span className="comment-author">작성자</span>
                  <span className="comment-date">
                    {new Date(c.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="comment-content">{c.content}</p>

                {user?.id === c.user_id && (
                  <div className="comment-actions">
                    <button
                      className="small-btn"
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* 댓글 입력 */}
        <div className="comment-form">
          <textarea
            rows={3}
            placeholder={
              user
                ? "댓글을 입력해주세요."
                : "로그인 후 댓글을 작성할 수 있습니다."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!user}
          />
          <button
            className="primary-btn full-width"
            type="button"
            onClick={handleAddComment}
            disabled={!user || savingComment}
          >
            {savingComment ? "작성 중..." : "댓글 작성"}
          </button>
        </div>
      </section>

      {/* 목록 버튼 */}
      <div className="detail-footer board-detail-bottom">
        <Link to="/board">
          <button className="small-btn" type="button">
            목록으로
          </button>
        </Link>
      </div>
    </div>
  );
}

export default BoardDetail;
