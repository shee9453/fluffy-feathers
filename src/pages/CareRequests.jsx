// src/pages/CareRequests.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import "./css/CareRequests.css";

function CareRequests() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");

      const { data: carers, error: carerError } = await supabase
        .from("carers")
        .select("id, name, region, region_city, region_district")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (carerError) {
        console.error(carerError);
        setLoadError("돌보미 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (!carers || carers.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const carerIds = carers.map((c) => c.id);

      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .in("carer_id", carerIds)
        .order("created_at", { ascending: false });

      if (bookingError) {
        console.error(bookingError);
        setLoadError("예약 신청을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      const carerMap = {};
      carers.forEach((c) => {
        carerMap[c.id] = c;
      });

      const merged = (bookings || []).map((b) => ({
        ...b,
        carer: carerMap[b.carer_id],
      }));

      setRequests(merged);
      setLoading(false);
    };

    if (!authLoading) fetchRequests();
  }, [user, authLoading]);

  const formatRegion = (carer) => {
    if (!carer) return "지역 없음";
    if (carer.region_city && carer.region_district) {
      return `${carer.region_city} ${carer.region_district}`;
    }
    if (carer.region_city) return carer.region_city;
    return carer.region || "지역 없음";
  };

  const makePeriodText = (req) => {
    if (req.end_date) return `${req.booking_date} ~ ${req.end_date}`;
    return req.booking_date;
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    const actionText = nextStatus === "accepted" ? "수락" : "거절";
    const confirmed = window.confirm(`정말 ${actionText}하시겠습니까?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("상태 변경 중 오류가 발생했습니다.");
      return;
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
    );

    window.alert(
      nextStatus === "accepted"
        ? "예약을 수락했습니다."
        : "예약을 거절했습니다."
    );
  };

  if (authLoading || loading) {
    return (
      <div className="care-requests-page care-requests-state">
        <p className="care-requests-state-text">불러오는 중입니다...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="care-requests-page care-requests-state">
        <p className="care-requests-state-text care-requests-state-error">
          신청 목록을 보려면 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="care-requests-page care-requests-state">
        <p className="care-requests-state-text care-requests-state-error">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="care-requests-page">
      <header className="care-requests-header">
        <h1>돌봄 신청 목록</h1>
        <p className="care-requests-sub">
          내 돌보미 프로필에 들어온 예약 신청들을 한눈에 관리할 수 있습니다.
        </p>
      </header>

      {requests.length === 0 ? (
        <p className="care-requests-empty">
          현재 들어온 신청이 없습니다.
          <br />
          리스트에 프로필을 등록하면 신청이 도착할 거예요.
        </p>
      ) : (
        <div className="care-requests-list">
          {requests.map((req) => {
            const status = req.status || "requested";

            const statusLabel =
              status === "accepted"
                ? "수락됨"
                : status === "rejected"
                ? "거절됨"
                : status === "cancelled_by_user"
                ? "신청자가 취소함"
                : "요청됨";

            return (
              <article key={req.id} className="care-requests-item">
                {/* 상단: 돌보미 + 상태 */}
                <div className="care-requests-item-header">
                  <div>
                    <div className="care-requests-item-title">
                      {req.carer?.name || "돌보미"}
                    </div>
                    <div className="care-requests-item-sub">
                      {formatRegion(req.carer)}
                    </div>
                  </div>

                  <span
                    className={`care-status-badge care-status-${status}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* 예약 정보 */}
                <div className="care-requests-item-body">
                  <div className="care-requests-row">
                    <span className="label">돌봄 기간</span>
                    <span>{makePeriodText(req)}</span>
                  </div>

                  {/* <div className="care-requests-row">
                    <span className="label">시작 시간</span>
                    <span>{req.booking_time || "-"}</span>
                  </div> */}

                  <div className="care-requests-row">
                    <span className="label">반려동물</span>
                    <span>{req.pet_info}</span>
                  </div>
                </div>

                {/* 버튼 영역 */}
                <div className="care-requests-item-footer">
                  <Link to={`/mybooking/${req.id}`}>
                    <button className="small-btn" type="button">
                      상세
                    </button>
                  </Link>

                  {status === "requested" && (
                    <div className="care-requests-actions">
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, "accepted")}
                      >
                        수락
                      </button>

                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, "rejected")}
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CareRequests;
