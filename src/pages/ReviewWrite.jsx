// src/pages/ReviewWrite.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/ReviewWrite.css";

function ReviewWrite() {
  const { id } = useParams(); // bookings.id
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [booking, setBooking] = useState(null);
  const [carer, setCarer] = useState(null);

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 날짜가 지난 예약인지 체크
  const isPastBooking = (b) => {
    if (!b) return false;
    const baseDateStr = b.end_date || b.booking_date;
    if (!baseDateStr) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseDate = new Date(baseDateStr);
    baseDate.setHours(0, 0, 0, 0);

    return baseDate < today;
  };

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;

      setLoading(true);
      setErrorMsg("");

      // 1) 예약 + 돌보미 정보
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          carers (
            id,
            name,
            region,
            region_city,
            region_district,
            user_id,
            price_per_night
          )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setErrorMsg("예약 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (!bookingData) {
        setErrorMsg("해당 예약 정보를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      // 2) 예약자 본인인지 확인
      if (bookingData.user_id !== user.id) {
        setErrorMsg("이 예약에 대한 후기를 작성할 권한이 없습니다.");
        setLoading(false);
        return;
      }

      // 3) 상태 체크 (수락된 예약만 후기 가능)
      if (bookingData.status !== "accepted") {
        setErrorMsg("수락된 예약에 대해서만 후기를 작성할 수 있습니다.");
        setLoading(false);
        return;
      }

      // 4) 날짜가 지난 예약인지 체크
      if (!isPastBooking(bookingData)) {
        setErrorMsg("아직 진행 중이거나 미래의 예약입니다. 종료 이후에 후기를 남겨주세요.");
        setLoading(false);
        return;
      }

      // 5) 이미 이 예약에 대한 후기가 있는지 확인
      const { data: existingReview, error: reviewError } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", bookingData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (reviewError) {
        console.error(reviewError);
        setErrorMsg("기존 후기 정보를 확인하는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (existingReview) {
        setErrorMsg("이 예약에 대해서는 이미 후기를 작성하셨습니다.");
        setLoading(false);
        return;
      }

      setBooking(bookingData);
      setCarer(bookingData.carers || null);
      setLoading(false);
    };

    if (user) {
      load();
    }
  }, [id, user]);

  const formatRegion = (c) => {
    if (!c) return "";
    if (c.region_city && c.region_district) {
      return `${c.region_city} ${c.region_district}`;
    }
    if (c.region_city) return c.region_city;
    return c.region || "";
  };

  const periodText =
    booking && (booking.end_date
      ? `${booking.booking_date} ~ ${booking.end_date}`
      : booking.booking_date);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");

    if (!booking || !user) return;

    if (!rating || rating < 1 || rating > 5) {
      setSaveError("별점을 1~5점 사이에서 선택해주세요.");
      return;
    }

    if (!content.trim()) {
      setSaveError("후기 내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("reviews").insert([
        {
          booking_id: booking.id,
          carer_id: booking.carer_id,
          user_id: user.id,
          rating,
          content: content.trim(),
        },
      ]);

      if (error) {
        console.error(error);
        setSaveError("후기 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  // 상태별 UI
  if (authLoading) {
    return (
      <div className="review-page review-state">
        <p className="review-state-text">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <div className="review-page review-state">
        <p className="review-state-text review-state-error">
          후기를 작성하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="review-page review-state">
        <p className="review-state-text">예약 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="review-page review-state">
        <p className="review-state-text review-state-error">
          {errorMsg || "예약 정보를 불러오지 못했습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="review-card">
        {/* 상단 헤더 */}
        <header className="review-header">
          <h1 className="review-title">돌봄 후기 작성</h1>
          <p className="review-sub">
            <span className="review-name">{carer?.name || "알 수 없는 돌보미"}</span>{" "}
            님에게 맡겼던 돌봄에 대해 후기를 남겨주세요.
          </p>

          <div className="review-summary">
            <p className="review-summary-item">
              <span className="label">돌보미</span>
              <span>{carer?.name || "알 수 없는 돌보미"}</span>
            </p>
            <p className="review-summary-item">
              <span className="label">지역</span>
              <span>{formatRegion(carer) || "지역 미입력"}</span>
            </p>
            <p className="review-summary-item">
              <span className="label">돌봄 기간</span>
              <span>{periodText}</span>
            </p>
          </div>
        </header>

        {/* 후기 폼 */}
        <form className="review-form" onSubmit={handleSubmit}>
          {/* 별점 */}
          <div className="form-group">
            <label>별점</label>
            <div className="review-rating-row">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`review-rating-chip ${
                    rating === score ? "review-rating-active" : ""
                  }`}
                  onClick={() => setRating(score)}
                >
                  {score}점
                </button>
              ))}
            </div>
            <p className="review-hint">
              1점(매우 불만족) ~ 5점(매우 만족) 중 선택해주세요.
            </p>
          </div>

          {/* 내용 */}
          <div className="form-group">
            <label>후기 내용</label>
            <textarea
              className="review-textarea"
              rows={6}
              placeholder="돌봄 환경, 소통, 전체적인 만족도 등을 솔직하게 적어주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {saveError && <p className="review-error">{saveError}</p>}

          {/* 버튼 */}
          <div className="review-button-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              돌아가기
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? "저장 중..." : "후기 저장하기"}
            </button>
          </div>
        </form>
      </div>

      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className="review-modal-backdrop">
          <div className="review-modal">
            <h3 className="review-modal-title">후기 작성 완료</h3>
            <p className="review-modal-text">
              소중한 후기를 남겨주셔서 감사합니다 😊
            </p>
            <button
              type="button"
              className="primary-btn review-modal-btn"
              onClick={() => {
                setShowSuccessModal(false);
                navigate(`/mybooking/${booking.id}`);
              }}
            >
              예약 상세로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewWrite;
