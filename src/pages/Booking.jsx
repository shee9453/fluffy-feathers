// src/pages/Booking.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "../pages/css/Booking.css"; // 👈 위치에 맞게 조정 (src 기준) 

function Booking() {
  const { id } = useParams(); // carers.id (uuid)
  const { user } = useAuth();
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

  useEffect(() => {
    const fetchCarer = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("carers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("carer 불러오기 실패:", error);
        setLoadError("해당 돌보미 정보를 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      setCarer(data);
      setLoading(false);
    };

    if (id) {
      fetchCarer();
    }
  }, [id]);

  const formatRegion = (c) => {
    if (!c) return "";
    if (c.region_city && c.region_district) {
      return `${c.region_city} ${c.region_district}`;
    }
    if (c.region_city) return c.region_city;
    return c.region || "";
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

      const { error } = await supabase.from("bookings").insert([
        {
          carer_id: id,
          user_id: user.id,
          booking_date: date,
          end_date: endDate,
          booking_time: time,
          pet_info: petInfo,
          notes,
          contact_phone: contactPhone,
          status: "requested",
        },
      ]);

      if (error) {
        console.error("booking insert 실패:", error);
        setSaveError(
          "예약 요청 저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      // 폼 리셋
      setDate("");
      setEndDate("");
      setTime("");
      setPetInfo("");
      setNotes("");
      setContactPhone("");

      // 완료 모달 열기
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text">
          돌보미 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text booking-state-error">
          예약 요청을 보내려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loadError || !carer) {
    return (
      <div className="booking-page booking-state">
        <p className="booking-state-text booking-state-error">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="booking-page">
      {/* 상단 요약 */}
      <header className="booking-header">
        <div className="booking-header-text">
          <h1>예약 요청</h1>
          <p className="booking-sub">
            <span className="booking-name">{carer.name}</span> 님에게
            <br />
            돌봄 예약을 요청합니다.
          </p>
        </div>

        <div className="booking-summary">
          <p className="booking-summary-item">
            <span className="label">돌보미</span>
            <span>{carer.name}</span>
          </p>
          <p className="booking-summary-item">
            <span className="label">지역</span>
            <span>{formatRegion(carer) || "지역 미입력"}</span>
          </p>
          {typeof carer.price_per_night === "number" && (
            <p className="booking-summary-item">
              <span className="label">기본 요금</span>
              <span>{`1박 ${carer.price_per_night.toLocaleString()}원`}</span>
            </p>
          )}
        </div>
      </header>

      {/* 예약 폼 */}
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

            <div className="form-group">
              <label>돌봄 시작 시간</label>
              <input
                className="booking-input"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
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

            {saveError && (
              <p className="booking-error">{saveError}</p>
            )}

            <button
              type="submit"
              className="reserve-btn full-width"
              disabled={saving}
            >
              {saving ? "전송 중..." : "예약 요청 보내기"}
            </button>

            <p className="booking-notice">
              현재는 포트폴리오용 데모 서비스이며, 결제 및 자동 매칭은 포함되어
              있지 않습니다.
            </p>
          </div>
        </div>
      </form>

      {/* 완료 모달 */}
      {showSuccessModal && (
        <div className="booking-modal-backdrop">
          <div className="booking-modal">
            <h3 className="booking-modal-title">예약 요청 완료</h3>
            <p className="booking-modal-text">
              예약 요청이 저장되었어요.
              <br />
              돌보미와의 조율은 별도 연락으로 진행됩니다 😊
            </p>
            <button
              className="primary-btn booking-modal-btn"
              type="button"
              onClick={() => setShowSuccessModal(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Booking;
