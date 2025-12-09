// src/pages/List.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../pages/css/List.css";

function ListPage() {
  const location = useLocation();

  const [carers, setCarers] = useState([]);
  const [animalTypes, setAnimalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 검색 / 필터 / 정렬 상태
  const [searchText, setSearchText] = useState("");

  // 지역 필터: 시 / 구 (기본 필터바 용)
  const [regionCityFilter, setRegionCityFilter] = useState("all");
  const [regionDistrictFilter, setRegionDistrictFilter] = useState("all");

  // 정렬
  const [sortOption, setSortOption] = useState("recent");

  // 🔍 /filter 에서 넘어온 쿼리 파라미터 파싱
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);

    const qCity = params.get("city") || "";
    const qDistrict = params.get("district") || "";
    const qSize = params.get("size") || ""; // small / medium / large
    const qWing = params.get("wing") || ""; // wingcut / fullwing

    const qNoOtherPets = params.get("noOtherPets") === "1"; // true면 "다른 반려동물 없는 집만"
    const qMinPlay = params.get("minPlay") || ""; // 1+ / 3+ / 6+

    const qPickup = params.get("pickup") === "1";
    const qMedication = params.get("medication") === "1";
    const qHandfeeding = params.get("handfeeding") === "1";

    const maxPriceParam = params.get("maxPrice");
    const qMaxPrice = maxPriceParam ? Number(maxPriceParam) : null;

    const hasParrotsParam = params.get("hasParrots");
    let qHasParrots = null; // true / false / null
    if (hasParrotsParam === "1") qHasParrots = true;
    if (hasParrotsParam === "0") qHasParrots = false;

    return {
      qCity,
      qDistrict,
      qSize,
      qWing,
      qNoOtherPets,
      qMinPlay,
      qPickup,
      qMedication,
      qHandfeeding,
      qMaxPrice,
      qHasParrots,
    };
  }, [location.search]);

  const {
    qCity,
    qDistrict,
    qSize,
    qWing,
    qNoOtherPets,
    qMinPlay,
    qPickup,
    qMedication,
    qHandfeeding,
    qMaxPrice,
    qHasParrots,
  } = filterQuery;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadError("");

      const { data: carersData, error: carersError } = await supabase
        .from("carers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const { data: typeData, error: typeError } = await supabase
        .from("animal_types")
        .select("*")
        .order("name", { ascending: true });

      if (carersError || typeError) {
        console.error(carersError || typeError);
        setLoadError("돌보미 목록을 불러오는 중 오류가 발생했습니다.");
      } else {
        setCarers(carersData || []);
        setAnimalTypes(typeData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // 🔁 /filter 에서 넘어온 지역 조건을 UI 필터에도 반영
  useEffect(() => {
    if (qCity) {
      setRegionCityFilter(qCity);
    } else {
      setRegionCityFilter("all");
    }

    if (qDistrict) {
      setRegionDistrictFilter(qDistrict);
    } else {
      setRegionDistrictFilter("all");
    }
  }, [qCity, qDistrict]);

  // 시 목록
  const regionCities = useMemo(() => {
    const set = new Set();
    carers.forEach((c) => {
      if (c.region_city) set.add(c.region_city);
    });
    return Array.from(set);
  }, [carers]);

  // 선택된 시 → 구 목록
  const regionDistricts = useMemo(() => {
    if (regionCityFilter === "all") return [];
    const set = new Set();
    carers.forEach((c) => {
      if (c.region_city === regionCityFilter && c.region_district) {
        set.add(c.region_district);
      }
    });
    return Array.from(set);
  }, [carers, regionCityFilter]);

  // code → name 매핑
  const animalTypeMap = useMemo(() => {
    const map = {};
    animalTypes.forEach((t) => {
      map[t.code] = t.name;
    });
    return map;
  }, [animalTypes]);

  // 각 돌보미의 최소 1박 요금 (소/중소/대 중 지원하는 것들 중 최소)
  const getMinPrice = (c) => {
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

    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  // 놀이 시간 레벨 매핑
  const playLevelMap = {
    "0-2": 0,
    "3-5": 1,
    "6-8": 2,
    "8+": 3,
  };

  const demandPlayLevelMap = {
    "1+": 0,
    "3+": 1,
    "6+": 2,
  };

  const filteredAndSortedCarers = useMemo(() => {
    let list = [...carers];

    // 1) 텍스트 검색 (이름, 지역, 소개)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((c) => {
        const target = `${c.name || ""} ${c.region_city || ""} ${
          c.region_district || ""
        } ${c.experience || ""}`.toLowerCase();
        return target.includes(q);
      });
    }

    // 2) 지역 필터 (UI + /filter 동기)
    if (regionCityFilter !== "all") {
      list = list.filter((c) => c.region_city === regionCityFilter);
    }

    if (regionDistrictFilter !== "all") {
      list = list.filter((c) => c.region_district === regionDistrictFilter);
    }

    // 3) /filter에서 온 고급 조건들

    // 3-1) 앵무새 있는 집 / 없는 집
    if (qHasParrots === true) {
      list = list.filter((c) => c.has_parrots === true);
    } else if (qHasParrots === false) {
      list = list.filter((c) => c.has_parrots === false);
    }

    // 3-2) 앵무새 외 다른 반려동물 없는 집만
    if (qNoOtherPets) {
      list = list.filter(
        (c) =>
          c.has_other_pets_non_parrot === false ||
          c.has_other_pets_non_parrot === null
      );
    }

    // 3-3) 내 앵이 크기별 지원 여부 + 예산
    if (qSize) {
      if (qSize === "small") {
        list = list.filter((c) => c.supports_small === true);
      } else if (qSize === "medium") {
        list = list.filter((c) => c.supports_medium === true);
      } else if (qSize === "large") {
        list = list.filter((c) => c.supports_large === true);
      }
    }

    if (qMaxPrice != null && !Number.isNaN(qMaxPrice)) {
      // 크기가 선택된 경우 → 해당 크기의 가격 기준으로 필터
      if (qSize === "small") {
        list = list.filter(
          (c) =>
            c.supports_small === true &&
            typeof c.price_small_per_night === "number" &&
            c.price_small_per_night <= qMaxPrice
        );
      } else if (qSize === "medium") {
        list = list.filter(
          (c) =>
            c.supports_medium === true &&
            typeof c.price_medium_per_night === "number" &&
            c.price_medium_per_night <= qMaxPrice
        );
      } else if (qSize === "large") {
        list = list.filter(
          (c) =>
            c.supports_large === true &&
            typeof c.price_large_per_night === "number" &&
            c.price_large_per_night <= qMaxPrice
        );
      } else {
        // 크기 선택이 없으면 → 최소 요금 기준으로 필터
        list = list.filter((c) => {
          const mp = getMinPrice(c);
          return mp != null && mp <= qMaxPrice;
        });
      }
    }

    // 3-4) 날개 상태 (윙컷 / 풀윙)
    if (qWing === "fullwing") {
      // 풀윙이면 풀윙 수용 가능한 집만
      list = list.filter((c) => c.accepts_fullwing === true);
    } else if (qWing === "wingcut") {
      // 윙컷이면 윙컷 수용 가능한 집 (우리는 항상 true로 저장하지만 혹시 몰라서)
      list = list.filter((c) => c.accepts_wingcut !== false);
    }

    // 3-5) 최소 놀이/비행 시간
    if (qMinPlay && qMinPlay !== "any") {
      const minLevel = demandPlayLevelMap[qMinPlay];
      if (minLevel !== undefined) {
        list = list.filter((c) => {
          const lv = playLevelMap[c.daily_play_hours];
          if (lv === undefined) return false; // 정보 없는 경우 제외
          return lv >= minLevel;
        });
      }
    }

    // 3-6) 추가 옵션 (픽업·드랍 / 약물 / 이유식)
    if (qPickup) {
      list = list.filter((c) => c.pickup_drop_available === true);
    }

    if (qMedication) {
      list = list.filter((c) => c.medication_available === true);
    }

    if (qHandfeeding) {
      list = list.filter((c) => c.handfeeding_available === true);
    }

    // 4) 정렬
    if (sortOption === "price_low") {
      list.sort((a, b) => {
        const pa = getMinPrice(a);
        const pb = getMinPrice(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      });
    } else if (sortOption === "price_high") {
      list.sort((a, b) => {
        const pa = getMinPrice(a);
        const pb = getMinPrice(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pb - pa;
      });
    } else if (sortOption === "recent") {
      list.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }

    return list;
  }, [
    carers,
    searchText,
    regionCityFilter,
    regionDistrictFilter,
    sortOption,
    qHasParrots,
    qNoOtherPets,
    qSize,
    qWing,
    qMinPlay,
    qPickup,
    qMedication,
    qHandfeeding,
    qMaxPrice,
  ]);

  if (loading) {
    return (
      <div className="list-page list-state">
        <p className="list-state-text">돌보미 목록을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="list-page list-state">
        <p className="list-state-text list-state-error">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="list-page">
      {/* 헤더 */}
      <header className="list-header">
        <div className="list-header-text">
          <h1>돌보미 찾기</h1>
          <p>
            소동물 · 앵무새 전문 돌보미들을 둘러보세요.
            <br />
            세부 조건 검색은 <b>“내 앵이에 맞게 찾기”</b>에서 설정할 수 있어요.
          </p>
        </div>
        <div className="list-header-meta">
          <span className="pill">
            현재 활성 돌보미 <strong>{filteredAndSortedCarers.length}</strong>명
          </span>
          <Link to="/filter" className="pill pill-cta">
            🔍 내 앵이에 맞게 찾기
          </Link>
        </div>
      </header>

      {/* 심플 필터 바 */}
      <section className="filter-bar">
        {/* 검색 */}
        <div className="filter-group filter-group-wide">
          <span className="filter-label">검색</span>
          <input
            className="filter-input"
            type="text"
            placeholder="이름, 지역, 소개로 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* 지역 필터 */}
        <div className="filter-group">
          <span className="filter-label">지역</span>
          <div className="filter-row">
            <select
              className="select"
              value={regionCityFilter}
              onChange={(e) => {
                setRegionCityFilter(e.target.value);
                setRegionDistrictFilter("all");
              }}
            >
              <option value="all">전체 시</option>
              {regionCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {regionCityFilter !== "all" && (
              <select
                className="select"
                value={regionDistrictFilter}
                onChange={(e) => setRegionDistrictFilter(e.target.value)}
              >
                <option value="all">전체 구</option>
                {regionDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 정렬 */}
        <div className="filter-group">
          <span className="filter-label">정렬</span>
          <select
            className="select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="recent">최신 등록순</option>
            <option value="price_low">1박 기준 가격 낮은순</option>
            <option value="price_high">1박 기준 가격 높은순</option>
          </select>
        </div>

        {/* 고급 필터 안내 */}
        <div className="filter-group filter-group-full">
          <span className="filter-label">고급 필터</span>
          <p className="filter-hint">
            풀윙/윙컷, 놀이시간, 픽업·드랍, 약물관리, 이유식, 앵이 유무 등
            세부 조건은{" "}
            <Link to="/filter" className="filter-link">
              내 앵이에 맞게 찾기
            </Link>{" "}
            에서 설정할 수 있어요.
          </p>
        </div>
      </section>

      {/* 카드 그리드 */}
      {filteredAndSortedCarers.length === 0 ? (
        <p className="list-empty">조건에 맞는 돌보미가 없습니다.</p>
      ) : (
        <div className="card-grid">
          {filteredAndSortedCarers.map((c) => {
            const minPrice = getMinPrice(c);

            return (
              <Link
                key={c.id}
                to={`/detail/${c.id}`}
                className="care-card-link"
              >
                <article className="care-card">
                  <div className="care-card-header">
                    <div className="care-card-title">
                      <h2>{c.name}</h2>
                      <p className="care-location">
                        {c.region_city && c.region_district
                          ? `${c.region_city} ${c.region_district}`
                          : "지역 미등록"}
                      </p>
                    </div>
                    {minPrice != null && (
                      <span className="care-price-badge">
                        1박 {minPrice.toLocaleString()}원~
                      </span>
                    )}
                  </div>

                  {c.photo_url && (
                    <div className="care-photo-wrap">
                      <img
                        src={c.photo_url}
                        alt={`${c.name} 돌보미 이미지`}
                        className="care-photo"
                      />
                    </div>
                  )}

                  {c.experience && (
                    <p className="care-experience">{c.experience}</p>
                  )}

                  {/* 돌봄 가능 동물 태그 */}
                  {Array.isArray(c.animal_type_codes) &&
                    c.animal_type_codes.length > 0 && (
                      <div className="care-animals">
                        {c.animal_type_codes.map((code) => (
                          <span key={code} className="care-tag">
                            {animalTypeMap[code] || code}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* 크기별 요약 / 윙 상태 / 옵션 뱃지 */}
                  <div className="care-tags-row">
                    {/* 크기별 가능 여부 */}
                    {/* <div className="care-size-tags">
                      {c.supports_small && (
                        <span className="care-tag subtle">
                          소형{" "}
                          {typeof c.price_small_per_night === "number"
                            ? `${c.price_small_per_night.toLocaleString()}원`
                            : ""}
                        </span>
                      )}
                      {c.supports_medium && (
                        <span className="care-tag subtle">
                          중형{" "}
                          {typeof c.price_medium_per_night === "number"
                            ? `${c.price_medium_per_night.toLocaleString()}원`
                            : ""}
                        </span>
                      )}
                      {c.supports_large && (
                        <span className="care-tag subtle">
                          대형{" "}
                          {typeof c.price_large_per_night === "number"
                            ? `${c.price_large_per_night.toLocaleString()}원`
                            : ""}
                        </span>
                      )}
                    </div> */}

                    {/* 윙컷/풀윙 */}
                    {/* <div className="care-wing">
                      {c.accepts_fullwing ? (
                        <span className="care-tag highlight">풀윙 가능</span>
                      ) : (
                        <span className="care-tag">윙컷 앵이만</span>
                      )}
                    </div> */}
                  </div>

                  {/* 옵션 (픽업/약물/이유식) */}
                  <div className="care-tags-row">
                    {c.pickup_drop_available && (
                      <span className="care-tag subtle">픽업·드랍</span>
                    )}
                    {c.medication_available && (
                      <span className="care-tag subtle">약물 관리</span>
                    )}
                    {c.handfeeding_available && (
                      <span className="care-tag subtle">이유식 가능</span>
                    )}
                  </div>

                  {/* 환경 요약 */}
                  <div className="care-footer">
                    <p className="care-note">
                      {c.has_parrots === true
                        ? "집에 앵무새 있음"
                        : c.has_parrots === false
                        ? "집에 앵무새 없음"
                        : "앵무새 유무 정보 없음"}
                      {" · "}
                      {c.has_other_pets_non_parrot === true
                        ? "다른 반려동물 있음"
                        : c.has_other_pets_non_parrot === false
                        ? "다른 반려동물 없음"
                        : "다른 반려동물 정보 없음"}
                    </p>
                    <p className="care-note">
                      평일 외출{" "}
                      {typeof c.weekday_away_hours === "number"
                        ? `${c.weekday_away_hours}시간`
                        : "-"}
                      {" · "}
                      주말 외출{" "}
                      {typeof c.weekend_away_hours === "number"
                        ? `${c.weekend_away_hours}시간`
                        : "-"}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ListPage;
