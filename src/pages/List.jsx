// src/pages/List.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../pages/css/List.css";

function ListPage() {
  const [carers, setCarers] = useState([]);
  const [animalTypes, setAnimalTypes] = useState([]);
  const [animalGroups, setAnimalGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 검색 / 필터 / 정렬 상태
  const [searchText, setSearchText] = useState("");

  // 지역 필터: 시 / 구
  const [regionCityFilter, setRegionCityFilter] = useState("all");
  const [regionDistrictFilter, setRegionDistrictFilter] = useState("all");

  // 동물 타입 필터 (대분류 / 소분류)
  const [groupFilter, setGroupFilter] = useState("all"); // animal_groups.id
  const [typeFilter, setTypeFilter] = useState("all"); // animal_types.code

  // 환경/조건 필터
  const [filterNoOtherPets, setFilterNoOtherPets] = useState(false);
  const [filterNeedSeparateCage, setFilterNeedSeparateCage] = useState(false);
  const [filterMaxWeekdayHours, setFilterMaxWeekdayHours] = useState("");
  const [filterMaxWeekendHours, setFilterMaxWeekendHours] = useState("");
  const [filterMaxPricePerNight, setFilterMaxPricePerNight] = useState("");

  // 정렬
  const [sortOption, setSortOption] = useState("recent");

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

      const { data: groupData, error: groupError } = await supabase
        .from("animal_groups")
        .select("*")
        .order("name", { ascending: true });

      if (carersError || typeError || groupError) {
        console.error(carersError || typeError || groupError);
        setLoadError("돌보미 목록을 불러오는 중 오류가 발생했습니다.");
      } else {
        setCarers(carersData || []);
        setAnimalTypes(typeData || []);
        setAnimalGroups(groupData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

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

  // 사용 중인 그룹/타입만 필터 옵션에 노출
  // 🔁 DB에 등록된 모든 동물 그룹/타입을 필터에 노출
const { groupOptions, typeOptions } = useMemo(() => {
  // 대분류는 animal_groups 테이블 전체
  const groups = animalGroups;

  // 소분류는 선택된 groupFilter에 따라 필터링 (all이면 전체)
  let types = animalTypes;
  if (groupFilter !== "all") {
    types = types.filter((t) => t.group_id === groupFilter);
  }

  return {
    groupOptions: groups,
    typeOptions: types,
  };
}, [animalTypes, animalGroups, groupFilter]);

  // 필터 + 정렬
  const filteredAndSortedCarers = useMemo(() => {
    let list = [...carers];

    // 검색
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((c) => {
        const target = `${c.name || ""} ${c.region_city || ""} ${
          c.region_district || ""
        } ${c.experience || ""}`.toLowerCase();
        return target.includes(q);
      });
    }

    // 지역
    if (regionCityFilter !== "all") {
      list = list.filter((c) => c.region_city === regionCityFilter);
    }

    if (regionDistrictFilter !== "all") {
      list = list.filter((c) => c.region_district === regionDistrictFilter);
    }

    // 동물 그룹/타입
    if (groupFilter !== "all") {
      const codesInGroup = new Set(
        animalTypes
          .filter((t) => t.group_id === groupFilter)
          .map((t) => t.code)
      );
      list = list.filter((c) =>
        (c.animal_type_codes || []).some((code) => codesInGroup.has(code))
      );
    }

    if (typeFilter !== "all") {
      list = list.filter((c) =>
        (c.animal_type_codes || []).includes(typeFilter)
      );
    }

    // 환경
    if (filterNoOtherPets) {
      list = list.filter((c) => c.has_other_pets === false);
    }

    if (filterNeedSeparateCage) {
      list = list.filter((c) => c.has_separate_cage === true);
    }

    // 시간/금액 조건
    if (filterMaxWeekdayHours) {
      const maxH = Number(filterMaxWeekdayHours);
      if (!Number.isNaN(maxH)) {
        list = list.filter(
          (c) =>
            typeof c.weekday_away_hours === "number" &&
            c.weekday_away_hours <= maxH
        );
      }
    }

    if (filterMaxWeekendHours) {
      const maxH = Number(filterMaxWeekendHours);
      if (!Number.isNaN(maxH)) {
        list = list.filter(
          (c) =>
            typeof c.weekend_away_hours === "number" &&
            c.weekend_away_hours <= maxH
        );
      }
    }

    if (filterMaxPricePerNight) {
      const maxP = Number(filterMaxPricePerNight);
      if (!Number.isNaN(maxP)) {
        list = list.filter(
          (c) =>
            typeof c.price_per_night === "number" &&
            c.price_per_night <= maxP
        );
      }
    }

    // 정렬
    if (sortOption === "price_low") {
      list.sort((a, b) => {
        const pa = a.price_per_night ?? null;
        const pb = b.price_per_night ?? null;
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      });
    } else if (sortOption === "price_high") {
      list.sort((a, b) => {
        const pa = a.price_per_night ?? null;
        const pb = b.price_per_night ?? null;
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
    animalTypes,
    searchText,
    regionCityFilter,
    regionDistrictFilter,
    groupFilter,
    typeFilter,
    filterNoOtherPets,
    filterNeedSeparateCage,
    filterMaxWeekdayHours,
    filterMaxWeekendHours,
    filterMaxPricePerNight,
    sortOption,
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
            소동물 · 앵무새 전문 돌보미들을 찾아보세요.
            <br />
            상단 검색과 필터를 이용해 원하는 조건으로 좁혀볼 수 있습니다.
          </p>
        </div>
        <div className="list-header-meta">
          <span className="pill">
            현재 활성 돌보미 <strong>{filteredAndSortedCarers.length}</strong>명
          </span>
        </div>
      </header>

      {/* 필터 바 */}
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

        {/* 지역 */}
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

        {/* 동물 타입 */}
        {groupOptions.length > 0 && (
          <div className="filter-group filter-group-full">
            <span className="filter-label">돌봄 가능 동물</span>

            <div className="chip-row">
              <button
                type="button"
                className={`chip chip-outline ${
                  groupFilter === "all" ? "chip-active" : ""
                }`}
                onClick={() => {
                  setGroupFilter("all");
                  setTypeFilter("all");
                }}
              >
                전체
              </button>
              {groupOptions.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`chip chip-outline ${
                    groupFilter === g.id ? "chip-active" : ""
                  }`}
                  onClick={() => {
                    setGroupFilter(g.id);
                    setTypeFilter("all");
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {typeOptions.length > 0 && (
              <div className="chip-row chip-row-sub">
                <button
                  type="button"
                  className={`chip chip-outline ${
                    typeFilter === "all" ? "chip-active" : ""
                  }`}
                  onClick={() => setTypeFilter("all")}
                >
                  전체
                </button>
                {typeOptions.map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    className={`chip chip-outline ${
                      typeFilter === t.code ? "chip-active" : ""
                    }`}
                    onClick={() => setTypeFilter(t.code)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 환경 */}
        <div className="filter-group filter-group-full">
          <span className="filter-label">환경</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip chip-outline ${
                filterNoOtherPets ? "chip-active" : ""
              }`}
              onClick={() => setFilterNoOtherPets((v) => !v)}
            >
              다른 동물 없는 집만
            </button>
            <button
              type="button"
              className={`chip chip-outline ${
                filterNeedSeparateCage ? "chip-active" : ""
              }`}
              onClick={() => setFilterNeedSeparateCage((v) => !v)}
            >
              별도 케이지 있는 집만
            </button>
          </div>
        </div>

        {/* 조건 + 정렬 */}
        <div className="filter-group filter-group-row">
          <div className="filter-subgroup">
            <span className="filter-label">조건</span>
            <div className="filter-row">
              <input
                className="filter-input number-input"
                type="number"
                min="0"
                placeholder="1박 최대 금액"
                value={filterMaxPricePerNight}
                onChange={(e) => setFilterMaxPricePerNight(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-subgroup">
            <span className="filter-label">정렬</span>
            <select
              className="select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="recent">최신 등록순</option>
              <option value="price_low">1박 가격 낮은순</option>
              <option value="price_high">1박 가격 높은순</option>
            </select>
          </div>
        </div>
      </section>

      {/* 카드 그리드 */}
      {filteredAndSortedCarers.length === 0 ? (
        <p className="list-empty">조건에 맞는 돌보미가 없습니다.</p>
      ) : (
        <div className="card-grid">
          {filteredAndSortedCarers.map((c) => (
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
                  {typeof c.price_per_night === "number" && (
                    <span className="care-price-badge">
                      1박 {c.price_per_night.toLocaleString()}원
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

                <div className="care-footer">
                  <p className="care-note">
                    {c.has_other_pets
                      ? "집에 다른 반려동물 있음"
                      : "집에 다른 반려동물 없음"}
                    {" · "}
                    {c.has_separate_cage
                      ? "별도 케이지/새장 있음"
                      : "별도 케이지/새장 없음"}
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
          ))}
        </div>
      )}
    </div>
  );
}

export default ListPage;
