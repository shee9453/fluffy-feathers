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
  const [petInfo, setPetInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // 👉 옵션 관련 상태 (Booking 과 동일한 이름/타입)
  const [wingStatus, setWingStatus] = useState(""); // "wingcut" | "fullwing"
  const [needPickup, setNeedPickup] = useState(false);
  const [needMedication, setNeedMedication] = useState(false);
  const [needHandfeeding, setNeedHandfeeding] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 예약 + 돌보미 불러오기
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      if (authLoading) return;

      setLoading(true);
      setLoadError("");

      try {
        // 1) 예약 정보
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", id)
          .single();

        if (bookingError || !bookingData) {
          console.error("booking 불러오기 실패:", bookingError);
          setLoadError("예약 정보를 찾을 수 없어요.");
          setLoading(false);
          return;
        }

        // 2) 권한 체크 - 로그인 유저와 예약 user_id 비교
        if (!user) {
          setLoadError("예약을 수정하려면 먼저 로그인해주세요.");
          setLoading(false);
          return;
        }
        if (bookingData.user_id !== user.id) {
          setLoadError("이 예약을 수정할 권한이 없습니다.");
          setLoading(false);
          return;
        }

        setBooking(bookingData);

        // 폼 상태 초기값 세팅
        setDate(bookingData.booking_date || "");
        setEndDate(bookingData.end_date || "");
        setPetInfo(bookingData.pet_info || "");
        setNotes(bookingData.notes || "");
        setContactPhone(bookingData.contact_phone || "");

        setWingStatus(bookingData.wing_status || "");
        setNeedPickup(!!bookingData.needs_pickup_drop);
        setNeedMedication(!!bookingData.needs_medication);
        setNeedHandfeeding(!!bookingData.needs_handfeeding);

        // 3) 돌보미 정보
        const { data: carerData, error: carerError } = await supabase
          .from("carers")
          .select("*")
          .eq("id", bookingData.carer_id)
          .single();

        if (carerError || !carerData) {
          console.error("carer 불러오기 실패:", carerError);
          setLoadError("돌보미 정보를 찾을 수 없어요.");
          setLoading(false);
          return;
        }

        setCarer(carerData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("예약 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, authLoading]);

  const formatRegion = (c) => {
    if (!c) return "";
    if (c.region_city && c.region_district) {
      return `${c.region_city} ${c.region_district}`;
    }
    if (c.region_city) return c.region_city;
    return c.region || "";
  };

  const getMinPrice = (c) => {
    if (!c) return null;
    const prices = [];
    if (c.supports_small && typeof c.price_small_per_night === "number") {
      prices.push(c.price_small_per_night);
    }
    if (c.supports_medium && typeof c.price_medium_per_night === "number") {
      prices.push(c.price_medium_per_night);
    }
    if (c.supports_large && typeof c.price_large_per_night === "number") {
      prices.push(c.price_large_per_night);
    }
    if (prices.length === 0) {
      if (typeof c.price_per_night === "number") {
        return c.price_per_night;
      }
      return null;
    }
    return Math.min(...prices);
  };

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

      if (!wingStatus) {
        setSaveError("우리 앵이의 날개 상태(윙컷/풀윙)를 선택해주세요.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_date: date,
          end_date: endDate,
          pet_info: petInfo,
          notes,
          contact_phone: contactPhone,
          wing_status: wingStatus,
          needs_pickup_drop: needPickup,
          needs_medication: needMedication,
          needs_handfeeding: needHandfeeding,
        })
        .eq("id", id);

      if (error) {
        console.error("booking update 실패:", error);
        setSaveError(
          "예약 수정 저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."
        );
        setSaving(false);
        return;
      }

      // 수정 완료 후 이전 페이지로 이동 (원하면 원하는 경로로 바꿔도 됨)
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text">예약 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text booking-state-error">
          예약을 수정하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loadError || !booking || !carer) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text booking-state-error">{loadError}</p>
      </div>
    );
  }

  const minPrice = getMinPrice(carer);

  return (
    <div className="booking-page">
      {/* 상단 요약 */}
      <header className="booking-header">
        <div className="booking-header-text">
          <h1>예약 수정</h1>
          <p className="booking-sub">
            <span className="booking-name">{carer.name}</span> 님에게 요청한
            <br />
            예약 내용을 수정합니다.
          </p>
        </div>

        <div className="booking-summary">
          <p className="booking-summary-item">
            <span className="label">돌보미</span>
            <span>{carer.name}</span>
          </p>
          <p className="booking-summary-item">
            <span className="label">지역</span>
            <span>{formatRegion(carer) || "지역 미입력"} </span>
          </p>
          {minPrice != null && (
            <p className="booking-summary-item">
              <span className="label">기본 요금</span>
              <span>{`1박 ${minPrice.toLocaleString()}원~`}</span>
            </p>
          )}

          <div className="booking-summary-options">
            {carer.accepts_fullwing && (
              <span className="booking-chip">풀윙 수용</span>
            )}
            {carer.pickup_drop_available && (
              <span className="booking-chip">픽업·드랍 가능</span>
            )}
            {carer.medication_available && (
              <span className="booking-chip">약물 관리 가능</span>
            )}
            {carer.handfeeding_available && (
              <span className="booking-chip">이유식 가능</span>
            )}
          </div>
        </div>
      </header>

      {/* 예약 폼 */}
      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="booking-form-grid">
          {/* 1. 돌봄 기간 */}
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
          </div>

          {/* 2. 반려동물 정보 + 옵션 */}
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

            {/* 우리 앵이 날개 상태 */}
            <div className="form-group">
              <label>우리 앵이 날개 상태</label>
              <div className="booking-chip-row">
                <button
                  type="button"
                  className={`booking-chip selectable ${
                    wingStatus === "wingcut" ? "active" : ""
                  }`}
                  onClick={() => setWingStatus("wingcut")}
                >
                  윙컷 상태예요
                </button>
                <button
                  type="button"
                  className={`booking-chip selectable ${
                    wingStatus === "fullwing" ? "active" : ""
                  }`}
                  onClick={() => setWingStatus("fullwing")}
                >
                  풀윙이에요
                </button>
              </div>
              <p className="booking-hint">
                돌보미가 수용 가능한 조건(윙컷/풀윙)과 맞는지 확인해주세요.
              </p>
            </div>

            {/* 추가 케어 옵션 - Booking 과 동일한 로직 + disabled 조건 */}
            <div className="form-group">
              <label>추가로 필요한 케어</label>
              <div className="booking-chip-row">
                <button
                  type="button"
                  className={`booking-chip selectable ${
                    needPickup ? "active" : ""
                  }`}
                  onClick={() =>
                    carer.pickup_drop_available &&
                    setNeedPickup((prev) => !prev)
                  }
                  disabled={!carer.pickup_drop_available}
                  title={
                    carer.pickup_drop_available
                      ? ""
                      : "이 돌보미는 픽업·드랍 옵션을 제공하지 않습니다."
                  }
                >
                  픽업·드랍이 필요해요
                </button>

                <button
                  type="button"
                  className={`booking-chip selectable ${
                    needMedication ? "active" : ""
                  }`}
                  onClick={() =>
                    carer.medication_available &&
                    setNeedMedication((prev) => !prev)
                  }
                  disabled={!carer.medication_available}
                  title={
                    carer.medication_available
                      ? ""
                      : "이 돌보미는 약물 관리 옵션을 제공하지 않습니다."
                  }
                >
                  약 복용 관리가 필요해요
                </button>

                <button
                  type="button"
                  className={`booking-chip selectable ${
                    needHandfeeding ? "active" : ""
                  }`}
                  onClick={() =>
                    carer.handfeeding_available &&
                    setNeedHandfeeding((prev) => !prev)
                  }
                  disabled={!carer.handfeeding_available}
                  title={
                    carer.handfeeding_available
                      ? ""
                      : "이 돌보미는 이유식 급여 옵션을 제공하지 않습니다."
                  }
                >
                  이유식 급여가 필요해요
                </button>
              </div>
              <p className="booking-hint">
                옵션 선택 시, 세부 내용과 추가 금액은 추후 채팅으로 조율됩니다.
              </p>
            </div>

            <div className="form-group">
              <label>특이사항</label>
              <textarea
                className="booking-textarea"
                rows={4}
                placeholder="아이 성격, 먹이 주는 방법, 약 복용 방법, 이유식 간격 등 자세히 적어주시면 좋아요."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* 3. 연락 정보 */}
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

            <button
              type="submit"
              className="reserve-btn full-width"
              disabled={saving}
            >
              {saving ? "수정 중..." : "예약 내용 저장하기"}
            </button>

            <p className="booking-notice">
              결제 및 자동 매칭은 포함되어 있지 않습니다.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default BookingEdit;
