// src/pages/Detail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../pages/css/Detail.css";
import "../pages/css/Booking.css"; // 👈 모달 스타일 재사용용

function Detail() {
  const { id } = useParams(); // carers.id (uuid)
  const navigate = useNavigate();

  const [carer, setCarer] = useState(null);
  const [animalTypes, setAnimalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);

  // 📸 이미지 모달 상태
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalImages, setPhotoModalImages] = useState([]);
  const [photoModalIndex, setPhotoModalIndex] = useState(0);
  const [photoModalTitle, setPhotoModalTitle] = useState("");

  // 📌 예약 전 안내 모달 상태
  const [showBookingDisclaimer, setShowBookingDisclaimer] = useState(false);

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
      } else {
        setCarer(carerData);
        setAnimalTypes(typesData || []);
      }

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

  const getMinPrice = () => {
    if (!carer) return null;
    const prices = [];
    if (carer.supports_small && typeof carer.price_small_per_night === "number") {
      prices.push(carer.price_small_per_night);
    }
    if (carer.supports_medium && typeof carer.price_medium_per_night === "number") {
      prices.push(carer.price_medium_per_night);
    }
    if (carer.supports_large && typeof carer.price_large_per_night === "number") {
      prices.push(carer.price_large_per_night);
    }
    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  const renderSpaceLabel = (value) => {
    switch (value) {
      case "room":
        return "방 안에서 지내요";
      case "living_room":
        return "거실에서 지내요";
      case "balcony":
        return "베란다에서 지내요";
      case "other":
        return "기타 공간에서 지내요";
      default:
        return "주 공간 정보 없음";
    }
  };

  const renderPlayAreas = (areas) => {
    if (!Array.isArray(areas) || areas.length === 0)
      return "놀이/비행 공간 정보 없음";

    const map = {
      cage_only: "새장 안에서만",
      playground: "새장 근처 놀이터/스탠드",
      near_cage: "새장 근처 플레이스탠드",
      room: "방 하나 자유롭게",
      living_room: "거실에서 자유롭게",
      whole_house: "집 전체 자유롭게",
    };

    return areas
      .map((key) => map[key] || key)
      .filter(Boolean)
      .join(" · ");
  };

  const renderDailyPlayHours = (code) => {
    switch (code) {
      case "0-2":
        return "하루 0~2시간 정도";
      case "3-5":
        return "하루 3~5시간 정도";
      case "6-8":
        return "하루 6~8시간 정도";
      case "8+":
        return "하루 8시간 이상";
      default:
        return "놀이/비행 시간 정보 없음";
    }
  };

  const animalNames = getAnimalNames();
  const fullRegion =
    carer?.region_city && carer?.region_district
      ? `${carer.region_city} ${carer.region_district}`
      : carer?.region_city || "지역 정보 없음";

  // 📸 메인/환경 사진
  const mainPhotoUrl = carer?.photo_url || null;
  const parrotPhotos =
    carer?.parrot_photo_urls ||
    carer?.parrot_photos ||
    carer?.my_parrot_photos ||
    [];
  const spacePhotos =
    carer?.space_photo_urls ||
    carer?.environment_photo_urls ||
    carer?.boarding_space_photos ||
    [];

  // 📸 모달 제어 함수들
  const openPhotoModal = (images, startIndex = 0, title = "") => {
    if (!images || images.length === 0) return;
    setPhotoModalImages(images);
    setPhotoModalIndex(startIndex);
    setPhotoModalTitle(title);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
  };

  const showPrevPhoto = (e) => {
    e.stopPropagation();
    setPhotoModalIndex((prev) =>
      prev === 0 ? photoModalImages.length - 1 : prev - 1
    );
  };

  const showNextPhoto = (e) => {
    e.stopPropagation();
    setPhotoModalIndex((prev) =>
      prev === photoModalImages.length - 1 ? 0 : prev + 1
    );
  };

  const minPrice = getMinPrice();

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

  return (
    <div className="detail-page">
      {/* 상단 프로필 영역 */}
      <section className="detail-top">
        {mainPhotoUrl && (
          <button
            type="button"
            className="detail-photo-wrap"
            onClick={() => openPhotoModal([mainPhotoUrl], 0, "대표 이미지")}
          >
            <img
              src={mainPhotoUrl}
              alt={`${carer.name} 돌보미 대표 이미지`}
              className="detail-photo"
            />
          </button>
        )}

        <div className="detail-top-info">
          <header className="detail-header">
            <div className="detail-header-main">
              <h1>{carer.name}</h1>
              <p className="detail-location">{fullRegion}</p>

              <p className="detail-rating">
                ⭐ 평균 {(avgRating ?? 0).toFixed(1)}점 · 리뷰 {reviews.length}개
              </p>

              {/* 윙컷/풀윙, 크기 지원 뱃지 */}
              <div className="detail-badge-row">
                <span className="detail-badge">
                  {carer.accepts_fullwing ? "풀윙도 수용 가능" : "윙컷 앵이만 수용"}
                </span>
                <br />
                <div className="detail-size-badges">
                  {carer.supports_small && (
                    <span className="detail-badge subtle">소형</span>
                  )}
                  {carer.supports_medium && (
                    <span className="detail-badge subtle">중형</span>
                  )}
                  {carer.supports_large && (
                    <span className="detail-badge subtle">대형</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-header-side">
              <span className="detail-badge">돌보미 프로필</span>
              <p className="detail-price-pill">
                {minPrice != null
                  ? `1박 ${minPrice.toLocaleString()}원~`
                  : "요금 협의"}
              </p>
            </div>
          </header>

          {/* 돌봄 가능 동물 태그 (필요시 다시 노출 가능)
          {animalNames.length > 0 && (
            <div className="detail-animals">
              {animalNames.map((name) => (
                <span className="detail-tag" key={name}>
                  {name}
                </span>
              ))}
            </div>
          )} */}
        </div>
      </section>

      {/* 환경 사진 – 각 그룹당 썸네일 1장만, 클릭 시 모달에서 슬라이드 */}
      {(parrotPhotos.length > 0 || spacePhotos.length > 0) && (
        <section className="detail-box detail-photo-section">
          <h3>환경 사진</h3>
          <div className="detail-photo-grid">
            {parrotPhotos.length > 0 && (
              <div className="detail-photo-group">
                <h4>돌보미가 키우는 앵이들</h4>
                <button
                  type="button"
                  className="detail-photo-thumb"
                  onClick={() =>
                    openPhotoModal(parrotPhotos, 0, "돌보미가 키우는 앵이들")
                  }
                >
                  <img src={parrotPhotos[0]} alt="돌보미 앵무새 대표 사진" />
                  {parrotPhotos.length > 1 && (
                    <span className="detail-photo-count">
                      +{parrotPhotos.length - 1}장 더 보기
                    </span>
                  )}
                </button>
              </div>
            )}

            {spacePhotos.length > 0 && (
              <div className="detail-photo-group">
                <h4>위탁 앵이들이 머무를 공간</h4>
                <button
                  type="button"
                  className="detail-photo-thumb"
                  onClick={() =>
                    openPhotoModal(spacePhotos, 0, "위탁 앵이들이 머무를 공간")
                  }
                >
                  <img src={spacePhotos[0]} alt="위탁 공간 대표 사진" />
                  {spacePhotos.length > 1 && (
                    <span className="detail-photo-count">
                      +{spacePhotos.length - 1}장 더 보기
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

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
          <p className="detail-long-text">
            <span className="detail-label">집에 앵무새 유무</span>
            <br />
            {carer.has_parrots === true
              ? "집에 앵무새를 함께 키우고 있어요."
              : carer.has_parrots === false
              ? "집에 앵무새는 키우지 않아요."
              : "앵무새 유무 정보가 등록되지 않았어요."}
          </p>
          <p className="detail-long-text">
            <span className="detail-label">다른 반려동물</span>
            <br />
            {carer.has_other_pets_non_parrot === true
              ? carer.other_pet_types ||
                "앵무새 외 다른 반려동물을 함께 키우고 있어요."
              : carer.has_other_pets_non_parrot === false
              ? "앵무새 외 다른 반려동물을 키우지 않아요."
              : "다른 반려동물 정보가 등록되지 않았어요."}
          </p>
        </div>
      </section>

      {/* 환경 / 외출 시간 / 놀이 정보 */}
      <section className="detail-grid detail-grid-full">
        <div className="detail-box">
          <h3>돌봄 환경</h3>
          <p className="detail-long-text">
            <span className="detail-label">주로 지내는 공간</span>
            <br />
            {renderSpaceLabel(carer.main_space)}
          </p>
          <p className="detail-long-text">
            <span className="detail-label">놀이/비행 가능한 공간</span>
            <br />
            {renderPlayAreas(carer.play_areas)}
          </p>
          <p className="detail-long-text">
            <span className="detail-label">별도 케이지/새장 여부</span>
            <br />
            {carer.has_separate_cage
              ? "위탁 앵이 전용 케이지/새장이 준비되어 있어요."
              : "위탁 전, 케이지/새장 지참 여부를 꼭 상의해주세요."}
          </p>
        </div>

        <div className="detail-box">
          <h3>외출 & 놀이 시간</h3>
          <p className="detail-long-text">
            <span className="detail-label">평일 기준 집을 비우는 시간</span>
            <br />
            {typeof carer.weekday_away_hours === "number"
              ? `${carer.weekday_away_hours}시간`
              : "정보 없음"}
          </p>
          <p className="detail-long-text">
            <span className="detail-label">주말 기준 집을 비우는 시간</span>
            <br />
            {typeof carer.weekend_away_hours === "number"
              ? `${carer.weekend_away_hours}시간`
              : "정보 없음"}
          </p>
          <p className="detail-long-text">
            <span className="detail-label">하루 놀이/비행 시간</span>
            <br />
            {renderDailyPlayHours(carer.daily_play_hours)}
          </p>
        </div>
      </section>

      {/* 요금 안내 */}
      <section className="detail-box detail-price-box">
        <h3>기본 요금 (1박 기준)</h3>

        <div className="detail-price-table">
          {carer.supports_small && (
            <p className="detail-price-row">
              <span className="detail-label">소형 </span>
              <span>
                {typeof carer.price_small_per_night === "number"
                  ? `${carer.price_small_per_night.toLocaleString()}원`
                  : "협의"}
              </span>
            </p>
          )}
          {carer.supports_medium && (
            <p className="detail-price-row">
              <span className="detail-label">중소형 </span>
              <span>
                {typeof carer.price_medium_per_night === "number"
                  ? `${carer.price_medium_per_night.toLocaleString()}원`
                  : "협의"}
              </span>
            </p>
          )}
          {carer.supports_large && (
            <p className="detail-price-row">
              <span className="detail-label">대형 </span>
              <span>
                {typeof carer.price_large_per_night === "number"
                  ? `${carer.price_large_per_night.toLocaleString()}원`
                  : "협의"}
              </span>
            </p>
          )}
          {!carer.supports_small &&
            !carer.supports_medium &&
            !carer.supports_large && (
              <p className="detail-price-main">
                요금 정보가 아직 등록되지 않았어요.
              </p>
            )}
        </div>

        {/* 옵션 요금 */}
        <div className="detail-options">
          <h4>추가 옵션</h4>
          <ul className="detail-option-list">
            {carer.pickup_drop_available && (
              <li>
                픽업·드랍 가능{" "}
                {typeof carer.pickup_drop_fee === "number"
                  ? `(+ ${carer.pickup_drop_fee.toLocaleString()}원/일)`
                  : "(추가 비용은 사전 협의)"}
              </li>
            )}
            {carer.medication_available && (
              <li>
                약물 관리 가능{" "}
                {typeof carer.medication_extra_fee === "number"
                  ? `(+ ${carer.medication_extra_fee.toLocaleString()}원/일)`
                  : "(추가 비용은 사전 협의)"}
              </li>
            )}
            {carer.handfeeding_available && (
              <li>
                이유식 급여 가능{" "}
                {typeof carer.handfeeding_extra_fee === "number"
                  ? `(+ ${carer.handfeeding_extra_fee.toLocaleString()}원/일)`
                  : "(추가 비용은 사전 협의)"}
              </li>
            )}
            {!carer.pickup_drop_available &&
              !carer.medication_available &&
              !carer.handfeeding_available && (
                <li>등록된 추가 옵션이 없습니다.</li>
              )}
          </ul>
        </div>

        <p className="detail-notice">
          정확한 금액 및 장기 위탁, 약 먹이기, 특수 케어 등은 예약 요청 후
          채팅/연락으로 조율할 수 있어요.
        </p>
      </section>

      {/* 이용 후기 */}
      <section className="detail-box detail-review-box">
        <div className="detail-review-header">
          <h3>이용 후기</h3>
          <span className="detail-review-count">{reviews.length}개 후기</span>
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

      {/* 📌 돌보미 상세 페이지 하단 안내 문구 */}
      <section className="detail-box">
        <h3>예약 전 꼭 확인해주세요</h3>
        <p className="detail-notice">
          Fluffy &amp; Feathers는 결제·계약 시스템을 제공하지 않으며,
          <br />
          위탁자와 돌보미 간에 발생하는 분쟁에 개입하거나 책임질 수 없습니다.
          <br />
          위탁 비용 또한 플랫폼이 결정하지 않고, 양측이 직접 협의해야 합니다.
          <br />
          <br />
          예약 전 돌보미 정보와 조건을 반드시 꼼꼼히 확인해 주세요.
        </p>
      </section>

      {/* 하단 예약 / 뒤로가기 */}
      <div className="detail-footer">
        <Link to="/list" className="detail-secondary-link">
          ← 목록으로 돌아가기
        </Link>
        <button
          type="button"
          className="reserve-btn"
          onClick={() => setShowBookingDisclaimer(true)}
        >
          예약하기
        </button>
      </div>

      {/* 📌 예약 전 안내 모달 */}
      {showBookingDisclaimer && (
        <div className="booking-modal-backdrop">
          <div className="booking-modal">
            <h3 className="booking-modal-title">📌 예약 전에 꼭 확인해주세요</h3>
            <p className="booking-modal-text">
              Fluffy &amp; Feathers는 <br /><b>결제·계약</b> 시스템을 제공하지 않으며,
              <br />
              위탁자와 돌보미 간에 발생하는 <br /><b>분쟁</b>에 개입하거나 책임질 수 없습니다.
              <br />
              <b>위탁 비용</b> 또한 플랫폼이 결정하지 않고,<br />양측이 직접 협의해야 합니다.
              <br />
              <br />
              예약 전 돌보미 정보와 조건을 반드시 꼼꼼히 확인해 주세요.
            </p>

            <div className="booking-modal-actions">
              <button
                type="button"
                className="secondary-btn booking-modal-btn"
                onClick={() => setShowBookingDisclaimer(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-btn booking-modal-btn"
                onClick={() => {
                  setShowBookingDisclaimer(false);
                  navigate(`/booking/${carer.id}`);
                }}
              >
                동의하고 예약 진행하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 이미지 모달 */}
      {photoModalOpen && (
        <div className="photo-modal-backdrop" onClick={closePhotoModal}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="photo-modal-close"
              onClick={closePhotoModal}
            >
              ×
            </button>
            {photoModalTitle && (
              <h4 className="photo-modal-title">{photoModalTitle}</h4>
            )}
            <div className="photo-modal-main">
              <img
                src={photoModalImages[photoModalIndex]}
                alt="확대 이미지"
                className="photo-modal-image"
              />
            </div>
            {photoModalImages.length > 1 && (
              <div className="photo-modal-controls">
                <button
                  type="button"
                  className="photo-modal-nav"
                  onClick={showPrevPhoto}
                >
                  ‹
                </button>
                <span className="photo-modal-index">
                  {photoModalIndex + 1} / {photoModalImages.length}
                </span>
                <button
                  type="button"
                  className="photo-modal-nav"
                  onClick={showNextPhoto}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Detail;
