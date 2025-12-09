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
  const [applicantProfile, setApplicantProfile] = useState(null); // 예약자 프로필
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
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
            phone
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

      // 2) 예약자 프로필 조회
      let profile = null;
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          user_id,
          name,
          region,
          phone
        `
        )
        .eq("user_id", bookingData.user_id)
        .maybeSingle();

      if (profileError) {
        console.error("예약자 프로필 조회 중 오류:", profileError);
      } else {
        profile = profileData;
      }

      setApplicantProfile(profile);
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

  // 예약자 지역: profiles.region 하나만 사용
  const formatApplicantRegion = (p) => {
    if (!p || !p.region) return "지역 미입력";
    return p.region;
  };

  const getStatusMeta = (statusRaw) => {
    const key = statusRaw || "requested";
    const labelMap = {
      requested: "요청됨",
      accepted: "수락됨",
      rejected: "거절됨",
      cancelled: "취소됨",
      completed: "완료됨",
    };
    return {
      key,
      label: labelMap[key] || statusRaw || "알 수 없음",
    };
  };

  const formatWingStatus = (wingStatus) => {
    if (wingStatus === "wingcut") return "윙컷";
    if (wingStatus === "fullwing") return "풀윙";
    return "-";
  };

  const formatExtraCare = (b) => {
    if (!b) return "-";
    const items = [];
    if (b.needs_pickup_drop) items.push("픽업·드랍");
    if (b.needs_medication) items.push("약 복용 관리");
    if (b.needs_handfeeding) items.push("이유식 급여");
    if (items.length === 0) return "없음";
    return items.join(" · ");
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

  // ✅ 채팅 가능 여부: 승인(accepted) 상태에서만
  const canChat = statusKey === "accepted";

  const periodText = booking.end_date
    ? `${booking.booking_date} ~ ${booking.end_date}`
    : booking.booking_date;

  // ✅ 예약자 여부
  const isApplicant = booking.user_id === user.id;

  // ✅ 지난 예약 여부
  const lastDateStr = booking.end_date || booking.booking_date;
  let isPast = false;
  if (lastDateStr) {
    const today = new Date();
    const end = new Date(lastDateStr);
    end.setHours(23, 59, 59, 999);
    isPast = end.getTime() < today.getTime();
  }

  // 버튼 노출 조건
  const canEditOrCancel = isApplicant && statusKey === "requested";
  const canEdit = canEditOrCancel;
  const canCancel = canEditOrCancel;
  const canWriteReview = isApplicant && statusKey === "accepted" && isPast;

  const handleEditBooking = () => {
    navigate(`/booking/edit/${booking.id}`);
  };

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
        .update({ status: "cancelled" })
        .eq("id", booking.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        alert("예약 취소 중 오류가 발생했습니다.");
        return;
      }

      setBooking((prev) =>
        prev ? { ...prev, status: "cancelled" } : prev
      );
      alert("예약이 취소되었습니다.");
    } catch (err) {
      console.error(err);
      alert("예약 취소 중 알 수 없는 오류가 발생했습니다.");
    }
  };

  const handleWriteReview = () => {
    navigate(`/review/write/${booking.id}`);
  };

  // ✅ 채팅 열기: 예약자(user_id) + 돌보미(carers.user_id) + booking_id 조합으로 방 찾기/생성
  const handleOpenChat = async () => {
    // ✅ 승인 상태가 아닐 때는 채팅 불가
    if (!canChat) {
      alert("채팅은 돌보미가 예약을 승인(수락)한 이후에만 가능합니다.");
      return;
    }

    if (!booking || !booking.carers || !booking.carers.user_id) {
      alert("채팅을 시작할 수 있는 돌보미 정보가 없습니다.");
      return;
    }

    try {
      // 1) 기존 방 있는지 조회
      const { data: existingRoom, error: roomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("user_id", booking.user_id)
        .eq("carer_id", booking.carers.user_id)
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (roomError && roomError.code !== "PGRST116") {
        console.error(roomError);
        alert("채팅방을 불러오는 중 오류가 발생했습니다.");
        return;
      }

      // 2) 있으면 그 방으로
      if (existingRoom) {
        navigate(`/chat/${existingRoom.id}`);
        return;
      }

      // 3) 없으면 새로 생성
      const { data: newRoom, error: insertError } = await supabase
        .from("chat_rooms")
        .insert({
          user_id: booking.user_id,
          carer_id: booking.carers.user_id,
          booking_id: booking.id,
          last_message: null,
          last_message_at: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error(insertError);
        alert("채팅방을 생성하는 중 오류가 발생했습니다.");
        return;
      }

      navigate(`/chat/${newRoom.id}`);
    } catch (e) {
      console.error(e);
      alert("채팅을 여는 중 알 수 없는 오류가 발생했습니다.");
    }
  };

  // 예약자 정보 파생값
  const applicantName =
    applicantProfile?.name || (isApplicant ? "나" : "예약자");
  const applicantRegion = formatApplicantRegion(applicantProfile);
  const applicantPhone =
    applicantProfile?.phone || booking.contact_phone || "미입력";

  return (
    <div className="mybooking-page">
      {/* 상단 헤더 */}
      <header className="mybooking-header">
        <div>
          <h1>예약 상세 정보</h1>
          <p className="mybooking-sub">
            돌봄 예약의 상세 내용을 확인하고, 예약자와 돌보미 정보를 함께 볼 수
            있어요.
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
        {/* 예약자 정보 카드 */}
        <article className="mybooking-card">
          <h2 className="mybooking-card-title">예약자 정보</h2>
          <div className="mybooking-row">
            <span className="label">이름</span>
            <span>{applicantName}</span>
          </div>
          <div className="mybooking-row">
            <span className="label">지역</span>
            <span>{applicantRegion}</span>
          </div>
          <div className="mybooking-row">
            <span className="label">연락처</span>
            <span>{applicantPhone}</span>
          </div>
        </article>

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
          <div className="mybooking-row">
            <span className="label">연락처</span>
            <span>{booking.carers?.phone || "미입력"}</span>
          </div>
        </article>

        {/* 예약 정보 카드 */}
        <article className="mybooking-card">
          <h2 className="mybooking-card-title">예약 정보</h2>
          <div className="mybooking-row">
            <span className="label">돌봄 기간</span>
            <span>{periodText}</span>
          </div>
          <div className="mybooking-row">
            <span className="label">반려동물</span>
            <span>{booking.pet_info}</span>
          </div>

          <div className="mybooking-row">
            <span className="label">날개 상태</span>
            <span>{formatWingStatus(booking.wing_status)}</span>
          </div>

          <div className="mybooking-row">
            <span className="label">추가 케어 요청</span>
            <span>{formatExtraCare(booking)}</span>
          </div>

          {booking.notes && (
            <div className="mybooking-row-block">
              <span className="label">특이사항</span>
              <p className="mybooking-text">{booking.notes}</p>
            </div>
          )}
        </article>
      </section>

      {/* 하단 버튼 */}
      <footer className="mybooking-footer">
        <div className="mybooking-footer-left">
          {canEditOrCancel && (
            <p className="mybooking-footer-hint">
              아직 돌보미가 수락하지 않은 예약입니다. <br />
              이 단계에서는<b>예약 내용을 수정</b>하거나 <b>직접 취소</b>할 수
              있어요.
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

          {/* ✅ 승인 상태일 때만 채팅 버튼 노출 */}
          {canChat && (
            <button
              className="primary-btn"
              type="button"
              onClick={handleOpenChat}
            >
              채팅
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default MyBookingDetail;
