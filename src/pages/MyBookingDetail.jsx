// src/pages/MyBookingDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/MyBookingDetail.css";

function MyBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id || !user) return;

      setLoading(true);
      setErrorMsg("");

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
            user_id
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

      const isApplicant = bookingData.user_id === user.id;
      const isCarerOwner = bookingData.carers?.user_id === user.id;

      if (!isApplicant && !isCarerOwner) {
        setErrorMsg("이 예약에 접근할 권한이 없습니다.");
        setLoading(false);
        return;
      }

      setBooking(bookingData);
      setLoading(false);
    };

    if (user) {
      fetchBooking();
    }
  }, [id, user]);

  const formatRegion = (c) => {
    if (!c) return "지역 미입력";
    if (c.region_city && c.region_district) {
      return `${c.region_city} ${c.region_district}`;
    }
    if (c.region_city) return c.region_city;
    return c.region || "지역 미입력";
  };

  const getStatusMeta = (statusRaw) => {
    const key = statusRaw || "requested";
    const labelMap = {
      requested: "요청됨",
      accepted: "수락됨",
      rejected: "거절됨",
      cancelled_by_user: "신청자가 취소함",
    };
    return {
      key,
      label: labelMap[key] || statusRaw || "알 수 없음",
    };
  };

  if (authLoading) {
    return (
      <div className="mybooking-page mybooking-state">
        <p className="mybooking-state-text">
          로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mybooking-page mybooking-state">
        <p className="mybooking-state-text">
          예약 상세를 확인하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mybooking-page mybooking-state">
        <p className="mybooking-state-text">
          예약 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="mybooking-page mybooking-state">
        <p className="mybooking-state-text mybooking-state-error">
          {errorMsg || "예약 정보를 불러오지 못했습니다."}
        </p>
      </div>
    );
  }

  const { key: statusKey, label: statusLabel } = getStatusMeta(booking.status);

  const periodText = booking.end_date
    ? `${booking.booking_date} ~ ${booking.end_date}`
    : booking.booking_date;

  // ✅ 예약자 여부
  const isApplicant = booking.user_id === user.id;

  // ✅ 지난 예약 여부 (종료일자 또는 시작일자 기준)
  const lastDateStr = booking.end_date || booking.booking_date;
  let isPast = false;
  if (lastDateStr) {
    const today = new Date();
    const end = new Date(lastDateStr);
    // 해당 날짜 하루가 다 지난 시점 기준
    end.setHours(23, 59, 59, 999);
    isPast = end.getTime() < today.getTime();
  }

  // ✅ 버튼 노출 조건
  // - 예약자 + 아직 수락되지 않은 예약(= requested) → 수정 / 취소 가능
  const canEditOrCancel = isApplicant && statusKey === "requested";
  const canEdit = canEditOrCancel;
  const canCancel = canEditOrCancel;

  // - 예약자 + 수락된 예약 + 날짜 지난 경우 → 후기 쓰기 가능
  const canWriteReview = isApplicant && statusKey === "accepted" && isPast;

  // ✅ 예약 수정 (이미 만든 /booking/edit/:id 페이지로 이동)
  const handleEditBooking = () => {
    navigate(`/booking/edit/${booking.id}`);
  };

  // ✅ 예약 취소
  const handleCancelBooking = async () => {
    if (
      !window.confirm(
        "예약을 취소하시겠어요?\n돌보미와 이미 합의한 내용이 있다면 먼저 상의해주세요."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled_by_user" })
        .eq("id", booking.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        alert("예약 취소 중 오류가 발생했습니다.");
        return;
      }

      setBooking((prev) =>
        prev ? { ...prev, status: "cancelled_by_user" } : prev
      );
      alert("예약이 취소되었습니다.");
    } catch (err) {
      console.error(err);
      alert("예약 취소 중 알 수 없는 오류가 발생했습니다.");
    }
  };

  // ✅ 후기 작성 (/review/write/:bookingId 페이지로 이동)
  const handleWriteReview = () => {
    navigate(`/review/write/${booking.id}`);
  };

  return (
    <div className="mybooking-page">
      {/* 상단 헤더 */}
      <header className="mybooking-header">
        <div>
          <h1>예약 상세 정보</h1>
          <p className="mybooking-sub">
            돌봄 예약의 상세 내용을 확인하고, 연락 정보를 참고할 수 있어요.
          </p>
        </div>
        <span
          className={`mybooking-status-badge mybooking-status-${statusKey}`}
        >
          {statusLabel}
        </span>
      </header>

      {/* 본문 그리드 */}
      <section className="mybooking-grid">
        {/* 돌보미 정보 카드 */}
        <article className="mybooking-card">
          <h2 className="mybooking-card-title">돌보미 정보</h2>
          <div className="mybooking-row">
            <span className="label">이름</span>
            <span>{booking.carers?.name || "알 수 없는 돌보미"}</span>
          </div>
          <div className="mybooking-row">
            <span className="label">지역</span>
            <span>{formatRegion(booking.carers)}</span>
          </div>
        </article>

        {/* 예약 정보 카드 */}
        <article className="mybooking-card">
          <h2 className="mybooking-card-title">예약 정보</h2>
          <div className="mybooking-row">
            <span className="label">돌봄 기간</span>
            <span>{periodText}</span>
          </div>
          {/* <div className="mybooking-row">
            <span className="label">시작 시간</span>
            <span>{booking.booking_time || "-"}</span>
          </div> */}
          <div className="mybooking-row">
            <span className="label">반려동물</span>
            <span>{booking.pet_info}</span>
          </div>

          {booking.notes && (
            <div className="mybooking-row-block">
              <span className="label">특이사항</span>
              <p className="mybooking-text">{booking.notes}</p>
            </div>
          )}
        </article>

        {/* 연락 정보 카드 */}
        <article className="mybooking-card">
          <h2 className="mybooking-card-title">연락 정보</h2>
          <div className="mybooking-row">
            <span className="label">연락처</span>
            <span>{booking.contact_phone || "미입력"}</span>
          </div>
          <p className="mybooking-hint">
            실제 연락은 문자, 전화, 메신저 등으로 별도 진행됩니다.
            <br />
            Fluffy &amp; Feathers 데모 버전에는 인앱 채팅 기능이 포함되어
            있지 않습니다.
          </p>
        </article>
      </section>

      {/* 하단 버튼 */}
      <footer className="mybooking-footer">
        <div className="mybooking-footer-left">
          {canEditOrCancel && (
            <p className="mybooking-footer-hint">
              아직 돌보미가 수락하지 않은 예약입니다. 이 단계에서는
              <br />
              <b>예약 내용을 수정</b>하거나 <b>직접 취소</b>할 수 있어요.
            </p>
          )}
          {canWriteReview && (
            <p className="mybooking-footer-hint">
              돌봄이 모두 끝난 예약입니다. 돌보미에게{" "}
              <b>후기를 남겨보세요.</b>
            </p>
          )}
        </div>

        <div className="mybooking-footer-actions">
          {canEdit && (
            <button
              className="secondary-btn"
              type="button"
              onClick={handleEditBooking}
            >
              예약 수정
            </button>
          )}

          {canCancel && (
            <button
              className="secondary-btn"
              type="button"
              onClick={handleCancelBooking}
            >
              예약 취소
            </button>
          )}

          {canWriteReview && (
            <button
              className="secondary-btn"
              type="button"
              onClick={handleWriteReview}
            >
              후기 쓰기
            </button>
          )}

          <button className="primary-btn" type="button">
            채팅 / 연락하기
          </button>
        </div>
      </footer>
    </div>
  );
}

export default MyBookingDetail;
