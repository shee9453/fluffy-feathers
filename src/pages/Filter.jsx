// src/pages/Filter.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./css/Filter.css";

function FilterPage() {
  const navigate = useNavigate();

  // 지역
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [regionCity, setRegionCity] = useState("");
  const [regionDistrict, setRegionDistrict] = useState("");

  // 내 앵이 정보
  const [size, setSize] = useState(""); // small / medium / large
  const [wing, setWing] = useState(""); // wingcut / fullwing

  // 환경 선호
  const [otherPetsPref, setOtherPetsPref] = useState("any"); // any / no_other_pets
  const [minPlayHours, setMinPlayHours] = useState("any"); // any / 1+ / 3+ / 6+
  const [parrotPresence, setParrotPresence] = useState("any"); // any / has_parrots / no_parrots

  // 옵션 필요 여부
  const [needPickupDrop, setNeedPickupDrop] = useState(false);
  const [needMedication, setNeedMedication] = useState(false);
  const [needHandfeeding, setNeedHandfeeding] = useState(false);

  // 예산
  const [maxPricePerNight, setMaxPricePerNight] = useState("");

  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      setLoadError("");

      const { data: cityData, error: cityError } = await supabase
        .from("regions_city")
        .select("*")
        .order("name", { ascending: true });

      if (cityError) {
        console.error(cityError);
        setLoadError("지역 정보를 불러오는 중 오류가 발생했습니다.");
      } else {
        setCities(cityData || []);
      }

      setLoadingRegions(false);
    };

    fetchRegions();
  }, []);

  const handleCityChange = async (e) => {
    const code = e.target.value;
    setSelectedCityCode(code);
    setRegionDistrict("");
    setDistricts([]);

    const selected = cities.find((c) => c.code === code);
    setRegionCity(selected?.name || "");

    if (!code) return;

    const { data, error } = await supabase
      .from("regions_district")
      .select("*")
      .eq("city_code", code)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setDistricts(data || []);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 쿼리스트링 구성
    const params = new URLSearchParams();

    // 지역
    if (regionCity) params.set("city", regionCity);
    if (regionDistrict) params.set("district", regionDistrict);

    // 내 앵이 정보
    if (size) params.set("size", size); // small / medium / large
    if (wing) params.set("wing", wing); // wingcut / fullwing

    // 환경
    if (otherPetsPref !== "any") {
      params.set("noOtherPets", otherPetsPref === "no_other_pets" ? "1" : "0");
    }
    if (minPlayHours !== "any") {
      params.set("minPlay", minPlayHours); // 1+ / 3+ / 6+
    }

    // 앵무새 보유 여부
    if (parrotPresence !== "any") {
    if (parrotPresence === "has_parrots") params.set("hasParrots", "1");
    if (parrotPresence === "no_parrots") params.set("hasParrots", "0");
    }

    // 옵션
    if (needPickupDrop) params.set("pickup", "1");
    if (needMedication) params.set("medication", "1");
    if (needHandfeeding) params.set("handfeeding", "1");

    // 예산
    if (maxPricePerNight) {
      params.set("maxPrice", maxPricePerNight);
    }

    // ✅ 리스트 페이지로 이동하면서 조건 전달
    //   라우터에서 ListPage가 "/" 또는 "/list"에 연결되어 있으면 거기에 맞춰 바꿔도 됨.
    navigate("/list" + (params.toString() ? `?${params.toString()}` : ""));

  };

  const handleReset = () => {
    setSelectedCityCode("");
    setRegionCity("");
    setRegionDistrict("");
    setDistricts([]);

    setSize("");
    setWing("");

    setOtherPetsPref("any");
    setMinPlayHours("any");
    setParrotPresence("any");


    setNeedPickupDrop(false);
    setNeedMedication(false);
    setNeedHandfeeding(false);

    setMaxPricePerNight("");
  };

  return (
    <div className="filter-page">
      <header className="filter-header">
        <div>
          <h1>내 앵이에 맞게 돌보미 찾기</h1>
          <p>
            우리 집 앵이의 크기, 날개 상태, 환경, 필요한 옵션을 선택하면
            <br />
            조건에 맞는 돌보미만 골라서 보여드릴게요.
          </p>
        </div>
        <div className="filter-header-actions">
          <Link to="/list" className="pill">
            ← 돌보미 목록으로 돌아가기
          </Link>
        </div>
      </header>

      <form className="filter-form" onSubmit={handleSubmit}>
        <div className="filter-grid">
          {/* 1. 기본 조건 */}
          <section className="filter-section">
            <h2 className="filter-section-title">1. 기본 조건</h2>

            {/* 지역 */}
            <div className="form-group">
              <label>희망 지역 (시 / 구)</label>
              {loadingRegions ? (
                <p className="filter-hint">지역 정보를 불러오는 중...</p>
              ) : loadError ? (
                <p className="filter-hint error">{loadError}</p>
              ) : (
                <>
                  <div className="filter-row">
                    <select
                      className="filter-select"
                      value={selectedCityCode}
                      onChange={handleCityChange}
                    >
                      <option value="">전체 시</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {selectedCityCode && (
                      <select
                        className="filter-select"
                        value={regionDistrict}
                        onChange={(e) => setRegionDistrict(e.target.value)}
                      >
                        <option value="">전체 구</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="filter-hint">
                    지역을 비워두면 전체 지역의 돌보미를 함께 보여줍니다.
                  </p>
                </>
              )}
            </div>

            {/* 앵이 크기 */}
            <div className="form-group">
              <label>내 앵이 크기</label>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip chip-outline ${
                    size === "small" ? "chip-active" : ""
                  }`}
                  onClick={() => setSize("small")}
                >
                  소형 (모란, 잉꼬 등)
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    size === "medium" ? "chip-active" : ""
                  }`}
                  onClick={() => setSize("medium")}
                >
                  중형 (코뉴어, 퀘이커 등)
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    size === "large" ? "chip-active" : ""
                  }`}
                  onClick={() => setSize("large")}
                >
                  대형 (회색앵무, 아마존 등)
                </button>
              </div>
              <p className="filter-hint">
                우리 앵이 크기에 맞는 요금과 환경을 제공하는 돌보미만 볼 수
                있어요.
              </p>
            </div>

            {/* 날개 상태 */}
            <div className="form-group">
              <label>내 앵이 날개 상태</label>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip chip-outline ${
                    wing === "wingcut" ? "chip-active" : ""
                  }`}
                  onClick={() => setWing("wingcut")}
                >
                  윙컷되어 있어요
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    wing === "fullwing" ? "chip-active" : ""
                  }`}
                  onClick={() => setWing("fullwing")}
                >
                  풀윙(날 수 있는 상태)에요
                </button>
              </div>
              <p className="filter-hint">
                풀윙이라면 <b>풀윙 수용 가능</b> 돌보미만 걸러줄 수 있어요.
              </p>
            </div>
          </section>

          {/* 2. 환경 선호 */}
          <section className="filter-section">
            <h2 className="filter-section-title">2. 환경 선호</h2>
            {/* 돌보미 집에 앵무새가 있는지 여부 */}
            <div className="form-group">
            <label>돌보미 집에 앵무새가 있는지</label>
            <div className="chip-row">
                <button
                type="button"
                className={`chip chip-outline ${parrotPresence === "any" ? "chip-active" : ""}`}
                onClick={() => setParrotPresence("any")}
                >
                상관 없어요
                </button>

                <button
                type="button"
                className={`chip chip-outline ${parrotPresence === "has_parrots" ? "chip-active" : ""}`}
                onClick={() => setParrotPresence("has_parrots")}
                >
                앵무새 키우는 집만
                </button>

                <button
                type="button"
                className={`chip chip-outline ${parrotPresence === "no_parrots" ? "chip-active" : ""}`}
                onClick={() => setParrotPresence("no_parrots")}
                >
                앵무새 없는 집만
                </button>
            </div>
            <p className="filter-hint">
                우리 앵이가 적응하기 좋은 환경을 선택해주세요.
            </p>
            </div>

            {/* 다른 반려동물 */}
            <div className="form-group">
              <label>다른 반려동물에 대한 선호</label>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip chip-outline ${
                    otherPetsPref === "any" ? "chip-active" : ""
                  }`}
                  onClick={() => setOtherPetsPref("any")}
                >
                  상관 없어요
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    otherPetsPref === "no_other_pets" ? "chip-active" : ""
                  }`}
                  onClick={() => setOtherPetsPref("no_other_pets")}
                >
                  앵무새 외 다른 반려동물 없는 집만
                </button>
              </div>
            </div>

            {/* 놀이/비행 시간 */}
            <div className="form-group">
              <label>하루 최소 놀이/비행 시간</label>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip chip-outline ${
                    minPlayHours === "any" ? "chip-active" : ""
                  }`}
                  onClick={() => setMinPlayHours("any")}
                >
                  상관 없어요
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    minPlayHours === "1+" ? "chip-active" : ""
                  }`}
                  onClick={() => setMinPlayHours("1+")}
                >
                  1시간 이상이면 좋아요
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    minPlayHours === "3+" ? "chip-active" : ""
                  }`}
                  onClick={() => setMinPlayHours("3+")}
                >
                  3시간 이상
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    minPlayHours === "6+" ? "chip-active" : ""
                  }`}
                  onClick={() => setMinPlayHours("6+")}
                >
                  6시간 이상이면 좋겠어요
                </button>
              </div>
              <p className="filter-hint">
                등록된 돌보미의 <b>하루 놀이 시간 정보</b>와 매칭해서 필터링할
                수 있어요.
              </p>
            </div>
          </section>

          {/* 3. 돌봄 옵션 */}
          <section className="filter-section">
            <h2 className="filter-section-title">3. 돌봄 옵션</h2>

            <div className="form-group">
              <label>필요한 추가 돌봄</label>
              <div className="chip-row chip-row-wrap">
                <button
                  type="button"
                  className={`chip chip-outline ${
                    needPickupDrop ? "chip-active" : ""
                  }`}
                  onClick={() => setNeedPickupDrop((v) => !v)}
                >
                  픽업·드랍 필요
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    needMedication ? "chip-active" : ""
                  }`}
                  onClick={() => setNeedMedication((v) => !v)}
                >
                  약물 관리 필요
                </button>
                <button
                  type="button"
                  className={`chip chip-outline ${
                    needHandfeeding ? "chip-active" : ""
                  }`}
                  onClick={() => setNeedHandfeeding((v) => !v)}
                >
                  이유식 급여 필요
                </button>
              </div>
              <p className="filter-hint">
                선택한 옵션을 제공할 수 있는 돌보미만 걸러서 보여줄 수 있어요.
              </p>
            </div>
          </section>

          {/* 4. 예산 */}
          <section className="filter-section">
            <h2 className="filter-section-title">4. 예산</h2>

            <div className="form-group">
              <label>1박 기준 최대 예산</label>
              <input
                type="number"
                min="0"
                className="filter-input"
                placeholder="예: 8000 (원)"
                value={maxPricePerNight}
                onChange={(e) => setMaxPricePerNight(e.target.value)}
              />
              <p className="filter-hint">
                소형/중형/대형 중 내가 선택한 크기에 맞춰
                <br />
                <b>1박 요금이 이 금액 이하인 돌보미만</b> 보여주도록 사용할 수
                있어요.
              </p>
            </div>
          </section>
        </div>

        {/* 버튼 영역 */}
        <div className="filter-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
          >
            초기화
          </button>
          <button type="submit" className="btn-primary">
            이 조건으로 돌보미 찾기
          </button>
        </div>
      </form>
    </div>
  );
}

export default FilterPage;
