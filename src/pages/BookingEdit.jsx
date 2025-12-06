// src/pages/BookingEdit.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "../pages/css/Booking.css";

function BookingEdit() {
  const { id } = useParams(); // bookings.id (uuid)
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [booking, setBooking] = useState(null);
  const [carer, setCarer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 폼 상태
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [petInfo, setPetInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 모달
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ---------------------------------------
  // 예약 + 돌보미 정보 로딩
  // ---------------------------------------
  useEffect(() => {
    const fetchBooking = async () => {
      if (!id || !user) return;

      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
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
        setLoadError("예약 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (!data) {
        setLoadError("해당 예약 정보를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      // 예약자 본인이 아닌 경우
      if (data.user_id !== user.id) {
        setLoadError("이 예약을 수정할 권한이 없습니다.");
        setLoading(false);
        return;
      }

      // 이미 수락/거절/취소된 예약은 수정 불가
      if (data.status && data.status !== "requested") {
        setLoadError("이미 수락/거절/취소된 예약은 수정할 수 없습니다.");
        setLoading(false);
        return;
      }

      setBooking(data);
      setCarer(data.carers || null);

      // 폼 초기값 세팅
      setDate(data.booking_date || "");
      setEndDate(data.end_date || "");
      setTime(data.booking_time || "");
      setPetInfo(data.pet_info || "");
      setNotes(data.notes || "");
      setContactPhone(data.contact_phone || "");

      setLoading(false);
    };

    if (user) {
      fetchBooking();
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

  // ---------------------------------------
  // 예약 수정 저장
  // ---------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);

    try {
      if (!date || !endDate) {
        setSaveError("돌봄 시작일과 종료일을 모두 선택해주세요.");
        setSaving(false);
        return;
      }

      if (new Date(endDate) < new Date(date)) {
        setSaveError("종료일은 시작일보다 같거나 이후여야 합니다.");
        setSaving(false);
        return;
      }

      if (!petInfo.trim()) {
        setSaveError("반려동물 정보를 입력해주세요.");
        setSaving(false);
        return;
      }

      if (!contactPhone.trim()) {
        setSaveError("연락받을 연락처를 입력해주세요.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_date: date,
          end_date: endDate,
        //   booking_time: time,
          pet_info: petInfo,
          notes,
          contact_phone: contactPhone,
          // status는 그대로 requested 유지
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("booking update 실패:", error);
        setSaveError(
          "예약 수정 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // 상태별 UI 처리
  // ---------------------------------------
  if (authLoading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text">
          로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text booking-state-error">
          예약을 수정하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text">
          예약 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text booking-state-error">
          {loadError || "예약 정보를 불러오지 못했습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="booking-page">
      {/* 상단 요약 */}
      <header className="booking-header">
        <div className="booking-header-text">
          <h1>예약 수정</h1>
          <p className="booking-sub">
            <span className="booking-name">
              {carer?.name || "알 수 없는 돌보미"}
            </span>{" "}
            님에게 요청한
            <br />
            예약 내용을 수정합니다.
          </p>
        </div>

        <div className="booking-summary">
          <p className="booking-summary-item">
            <span className="label">돌보미</span>
            <span>{carer?.name || "알 수 없는 돌보미"}</span>
          </p>
          <p className="booking-summary-item">
            <span className="label">지역</span>
            <span>{formatRegion(carer) || "지역 미입력"}</span>
          </p>
          {typeof carer?.price_per_night === "number" && (
            <p className="booking-summary-item">
              <span className="label">기본 요금</span>
              <span>{`1박 ${carer.price_per_night.toLocaleString()}원`}</span>
            </p>
          )}
        </div>
      </header>

      {/* 예약 수정 폼 */}
      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="booking-form-grid">
          <div className="form-section">
            <h2 className="form-section-title">1. 돌봄 기간</h2>

            <div className="form-group">
              <label>돌봄 시작 날짜</label>
              <input
                className="booking-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>돌봄 종료 날짜</label>
              <input
                className="booking-input"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* <div className="form-group">
              <label>돌봄 시작 시간</label>
              <input
                className="booking-input"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div> */}
          </div>

          <div className="form-section">
            <h2 className="form-section-title">2. 반려동물 정보</h2>

            <div className="form-group">
              <label>반려동물 정보</label>
              <input
                className="booking-input"
                type="text"
                placeholder="예: 코뉴어 1마리, 햄스터 2마리"
                required
                value={petInfo}
                onChange={(e) => setPetInfo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>특이사항</label>
              <textarea
                className="booking-textarea"
                rows={4}
                placeholder="아이 성격, 먹이 주는 방법, 약 복용 여부 등 알려주세요."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">3. 연락 정보</h2>

            <div className="form-group">
              <label>연락받을 연락처</label>
              <input
                className="booking-input"
                type="tel"
                placeholder="예: 010-0000-0000"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            {saveError && <p className="booking-error">{saveError}</p>}

            <div className="booking-button-row">
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
                className="reserve-btn"
                disabled={saving}
              >
                {saving ? "수정 중..." : "예약 내용 저장하기"}
              </button>
            </div>

            <p className="booking-notice">
              아직 돌보미가 예약을 수락하기 전 단계에서만 수정할 수 있습니다.
            </p>
          </div>
        </div>
      </form>

      {/* 완료 모달 */}
      {showSuccessModal && (
        <div className="booking-modal-backdrop">
          <div className="booking-modal">
            <h3 className="booking-modal-title">예약 수정 완료</h3>
            <p className="booking-modal-text">
              예약 내용이 수정되었어요.
              <br />
              돌보미와의 조율은 별도 연락으로 진행됩니다 😊
            </p>
            <button
              className="primary-btn booking-modal-btn"
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                navigate(`/mybooking/${id}`);
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

export default BookingEdit;
