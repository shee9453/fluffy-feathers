// src/pages/Detail.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../pages/css/Detail.css";

function Detail() {
  const { id } = useParams(); // carers.id (uuid)
  const [carer, setCarer] = useState(null);
  const [animalTypes, setAnimalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadError("");

      // 1) 돌보미 1명 조회
      const { data: carerData, error: carerError } = await supabase
        .from("carers")
        .select("*")
        .eq("id", id)
        .single();

      if (carerError) {
        console.error("carer 불러오기 실패:", carerError);
        setLoadError("해당 돌보미 정보를 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      // 2) 이 돌보미에 대한 리뷰 목록
      const { data: reviewRows, error: reviewError } = await supabase
        .from("reviews")
        .select("rating, content, created_at")
        .eq("carer_id", id)
        .order("created_at", { ascending: false });

      if (!reviewError && reviewRows) {
        setReviews(reviewRows);

        if (reviewRows.length > 0) {
          const avg =
            reviewRows.reduce((sum, r) => sum + r.rating, 0) /
            reviewRows.length;
          setAvgRating(avg);
        } else {
          setAvgRating(null);
        }
      }

      // 3) 동물 소분류 전체
      const { data: typesData, error: typesError } = await supabase
        .from("animal_types")
        .select("*")
        .order("name", { ascending: true });

      if (typesError) {
        console.error("animal_types 불러오기 실패:", typesError);
        setLoadError("동물 분류 정보를 불러오는 중 오류가 발생했어요.");
        setLoading(false);
        return;
      }

      setCarer(carerData);
      setAnimalTypes(typesData || []);
      setLoading(false);
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const getAnimalNames = () => {
    if (!carer) return [];
    return (carer.animal_type_codes || []).map((code) => {
      const t = animalTypes.find((t) => t.code === code);
      return t?.name || code;
    });
  };

  if (loading) {
    return (
      <div className="detail-page detail-state">
        <p className="detail-state-text">돌보미 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (loadError || !carer) {
    return (
      <div className="detail-page detail-state">
        <p className="detail-state-text detail-state-error">{loadError}</p>
        <Link to="/list" className="detail-back-link">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const animalNames = getAnimalNames();
  const fullRegion =
    carer.region_city && carer.region_district
      ? `${carer.region_city} ${carer.region_district}`
      : carer.region_city || "지역 정보 없음";

  return (
    <div className="detail-page">
      {/* 상단 프로필 영역 */}
      <section className="detail-top">
        {carer.photo_url && (
          <div className="detail-photo-wrap">
            <img
              src={carer.photo_url}
              alt={`${carer.name} 돌보미 이미지`}
              className="detail-photo"
            />
          </div>
        )}

        <header className="detail-header">
          <div className="detail-header-main">
            <h1>{carer.name}</h1>
            <p className="detail-location">{fullRegion}</p>
            {avgRating && (
              <p className="detail-rating">
                ⭐ 평균 {avgRating.toFixed(1)}점 · 리뷰 {reviews.length}개
              </p>
            )}
          </div>

          <div className="detail-header-side">
            <span className="detail-badge">돌보미 프로필</span>
            <p className="detail-price-pill">
              {typeof carer.price_per_night === "number"
                ? `1박 ${carer.price_per_night.toLocaleString()}원`
                : "요금 협의"}
            </p>
          </div>
        </header>

        {/* 돌봄 가능 동물 태그 */}
        {animalNames.length > 0 && (
          <div className="detail-animals">
            {animalNames.map((name) => (
              <span className="detail-tag" key={name}>
                {name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 소개 + 기본 정보 */}
      <section className="detail-grid">
        <div className="detail-box">
          <h3>소개</h3>
          <p className="detail-long-text">
            {carer.experience || "소개 정보가 아직 없어요."}
          </p>
        </div>

        <div className="detail-box">
          <h3>기본 정보</h3>
          <p className="detail-long-text">
            <span className="detail-label">활동 지역</span>
            <br />
            {fullRegion}
          </p>
          <p className="detail-long-text">
            <span className="detail-label">연락처</span>
            <br />
            {carer.phone || "연락처 정보가 아직 등록되지 않았습니다."}
          </p>
        </div>
      </section>

      {/* 환경 / 외출 시간 */}
      <section className="detail-grid detail-grid-full">
        <div className="detail-box">
          <h3>돌봄 환경</h3>
          <p className="detail-long-text">
            {carer.has_other_pets
              ? "집에 다른 반려동물을 함께 키우고 있어요."
              : "집에 다른 반려동물을 키우고 있지 않아요."}
            <br />
            {carer.has_separate_cage
              ? "위탁 기간 동안 사용할 별도의 케이지/새장이 준비되어 있어요."
              : "위탁 전, 케이지/새장 준비 여부를 사전에 꼭 확인해주세요."}
          </p>
        </div>

        <div className="detail-box">
          <h3>외출 시간</h3>
          <p className="detail-long-text">
            평일 기준 집을 비우는 시간:{" "}
            {typeof carer.weekday_away_hours === "number"
              ? `${carer.weekday_away_hours}시간`
              : "정보 없음"}
            <br />
            주말 기준 집을 비우는 시간:{" "}
            {typeof carer.weekend_away_hours === "number"
              ? `${carer.weekend_away_hours}시간`
              : "정보 없음"}
          </p>
        </div>
      </section>

      {/* 요금 안내 */}
      <section className="detail-box detail-price-box">
        <h3>기본 요금 (1박 기준)</h3>
        <p className="detail-price-main">
          {typeof carer.price_per_night === "number"
            ? `1박 ${carer.price_per_night.toLocaleString()}원`
            : "요금 협의"}
        </p>
        <p className="detail-notice">
          정확한 금액 및 추가 옵션(장기 위탁, 약 먹이기 등)은 예약 요청 후
          채팅/연락으로 조율할 수 있어요.
        </p>
      </section>

      {/* 이용 후기 */}
      <section className="detail-box detail-review-box">
        <div className="detail-review-header">
          <h3>이용 후기</h3>
          <span className="detail-review-count">
            {reviews.length}개 후기
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="detail-notice">
            아직 등록된 후기가 없습니다.
            <br />
            예약 후 마이페이지에서 후기를 남길 수 있어요.
          </p>
        ) : (
          <div className="detail-review-list">
            {reviews.map((r, idx) => (
              <article key={idx} className="review-card">
                <p className="review-rating">
                  {Array.from({ length: r.rating })
                    .map(() => "⭐")
                    .join("")}
                </p>
                <p className="review-content">{r.content}</p>
                <p className="review-date">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 하단 예약 / 뒤로가기 */}
      <div className="detail-footer">
        <Link to="/list" className="detail-secondary-link">
          ← 목록으로 돌아가기
        </Link>
        <Link to={`/booking/${carer.id}`} className="reserve-btn">
          예약하기
        </Link>
      </div>
    </div>
  );
}

export default Detail;
