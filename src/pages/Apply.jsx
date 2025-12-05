// src/pages/Apply.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/Apply.css"; // ⬅️ pages/css 폴더 사용

function Apply() {
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);

  const [photoFile, setPhotoFile] = useState(null);
  const [selectedTypeCodes, setSelectedTypeCodes] = useState([]);

  // 기본 프로필 정보
  const [name, setName] = useState("");

  // 지역: 시 / 구
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [regionCity, setRegionCity] = useState("");
  const [regionDistrict, setRegionDistrict] = useState("");

  const [experience, setExperience] = useState("");
  const [phone, setPhone] = useState("");

  // 환경/시간/요금
  const [hasOtherPets, setHasOtherPets] = useState(null); // true/false
  const [hasSeparateCage, setHasSeparateCage] = useState(null); // true/false
  const [weekdayAwayHours, setWeekdayAwayHours] = useState("");
  const [weekendAwayHours, setWeekendAwayHours] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 폼 submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);

    try {
      if (selectedTypeCodes.length === 0) {
        setSaveError("돌봄 가능 동물을 최소 1개 이상 선택해주세요.");
        setSaving(false);
        return;
      }

      if (!regionCity || !regionDistrict) {
        setSaveError("활동 지역(시/구)을 선택해주세요.");
        setSaving(false);
        return;
      }

      if (hasOtherPets === null || hasSeparateCage === null) {
        setSaveError(
          "환경 정보(다른 반려동물 여부, 별도 케이지 여부)를 선택해주세요."
        );
        setSaving(false);
        return;
      }

      if (weekdayAwayHours === "" || weekendAwayHours === "") {
        setSaveError("평일/주말 외출 시간을 입력해주세요.");
        setSaving(false);
        return;
      }

      if (!pricePerNight) {
        setSaveError("위탁 비용(1박 기준)을 입력해주세요.");
        setSaving(false);
        return;
      }

      const weekdayHoursNumber = Number(weekdayAwayHours);
      const weekendHoursNumber = Number(weekendAwayHours);
      const pricePerNightNumber = Number(pricePerNight);

      if (
        Number.isNaN(weekdayHoursNumber) ||
        Number.isNaN(weekendHoursNumber)
      ) {
        setSaveError("외출 시간은 숫자로 입력해주세요.");
        setSaving(false);
        return;
      }

      if (Number.isNaN(pricePerNightNumber)) {
        setSaveError("위탁 비용은 숫자로 입력해주세요.");
        setSaving(false);
        return;
      }

      let photoUrl = null;

      // 1) 이미지 업로드
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const filePath = `carers/${user.id}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) {
          console.error(uploadError);
          setSaveError("이미지 업로드 중 오류가 발생했습니다.");
          setSaving(false);
          return;
        }

        const { data } = supabase.storage.from("images").getPublicUrl(filePath);
        photoUrl = data?.publicUrl ?? null;
      }

      // 2) 돌보미 정보 저장
      const { error } = await supabase.from("carers").insert([
        {
          user_id: user.id,
          name,
          region_city: regionCity,
          region_district: regionDistrict,
          region: `${regionCity} ${regionDistrict}`,
          experience,
          phone,
          animal_type_codes: selectedTypeCodes,
          photo_url: photoUrl,
          has_other_pets: hasOtherPets,
          has_separate_cage: hasSeparateCage,
          weekday_away_hours: weekdayHoursNumber,
          weekend_away_hours: weekendHoursNumber,
          price_per_night: pricePerNightNumber,
        },
      ]);

      if (error) {
        console.error("carers insert 실패:", error);
        setSaveError("저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
      } else {
        alert("돌보미 신청이 저장되었습니다!");

        // 폼 리셋
        setName("");
        setSelectedCityCode("");
        setRegionCity("");
        setRegionDistrict("");
        setDistricts([]);

        setExperience("");
        setPhone("");
        setSelectedTypeCodes([]);
        setPhotoFile(null);

        setHasOtherPets(null);
        setHasSeparateCage(null);
        setWeekdayAwayHours("");
        setWeekendAwayHours("");
        setPricePerNight("");
      }
    } finally {
      setSaving(false);
    }
  };

  // 데이터 로딩 (동물 대/소분류 + 시 리스트)
  useEffect(() => {
    const fetchData = async () => {
      const { data: groupData, error: groupError } = await supabase
        .from("animal_groups")
        .select("*")
        .order("name", { ascending: true });

      const { data: typeData, error: typeError } = await supabase
        .from("animal_types")
        .select("*")
        .order("name", { ascending: true });

      const { data: cityData, error: cityError } = await supabase
        .from("regions_city")
        .select("*")
        .order("name", { ascending: true });

      if (groupError || typeError || cityError) {
        console.error(groupError || typeError || cityError);
        return;
      }

      setGroups(groupData || []);
      setTypes(typeData || []);
      setCities(cityData || []);
    };

    fetchData();
  }, []);

  // 시 선택 시 구 목록 로딩
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

  // 대분류별 소분류 묶기
  const groupedTypes = groups.map((g) => ({
    ...g,
    types: types.filter((t) => t.group_id === g.id),
  }));

  const toggleTypeCode = (code) => {
    setSelectedTypeCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  if (!user) {
    return (
      <div className="apply-page apply-state">
        <h1 className="apply-title">돌보미로 참여하기</h1>
        <p className="apply-sub">
          돌보미로 참여하려면 먼저 로그인이 필요합니다.
        </p>
        <p className="apply-notice">
          상단 메뉴에서 <b>로그인/회원가입</b>으로 이동한 뒤,
          <br />
          다시 이 페이지로 돌아와 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="apply-page">
      <header className="apply-header">
        <h1>돌보미로 참여하기</h1>
        <p className="apply-sub">
          Fluffy & Feathers에서 소동물·앵무새 돌봄을 제공하고 싶은 집사님
          정보를 남겨주세요.
        </p>
      </header>

      <form className="apply-form" onSubmit={handleSubmit}>
        <div className="apply-form-grid">
          {/* 섹션 1: 기본 정보 */}
          <section className="apply-section">
            <h2 className="apply-section-title">1. 기본 프로필</h2>

            {/* 프로필 이미지 */}
            <div className="form-group">
              <label>프로필 이미지 (선택)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              <p className="apply-hint">
                돌봄 리스트와 상세 페이지에서 보여질 대표 이미지입니다.
              </p>
            </div>

            {/* 이름/닉네임 */}
            <div className="form-group">
              <label>이름 또는 닉네임</label>
              <input
                type="text"
                className="apply-input"
                placeholder="예: 코코 집사"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* 지역: 시 / 구 */}
            <div className="form-group">
              <label>활동 지역 (시 / 구)</label>
              <div className="apply-region-row">
                <select
                  className="apply-select"
                  value={selectedCityCode}
                  onChange={handleCityChange}
                >
                  <option value="">시 선택</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  className="apply-select"
                  value={regionDistrict}
                  onChange={(e) => setRegionDistrict(e.target.value)}
                  disabled={!selectedCityCode}
                >
                  <option value="">구 선택</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="apply-hint">
                예: 서울특별시 은평구, 경기도 성남시 분당구 등
              </p>
            </div>
          </section>

          {/* 섹션 2: 돌봄 가능 동물 / 소개 */}
          <section className="apply-section">
            <h2 className="apply-section-title">2. 돌봄 가능 동물 & 소개</h2>

            <div className="form-group">
              <label>돌봄 가능 동물 (대분류 / 소분류)</label>

              {groups.length === 0 ? (
                <p className="apply-hint">
                  아직 동물 분류 데이터를 불러오지 못했어요.
                  (Supabase에 animal_groups / animal_types가 있는지 확인해주세요)
                </p>
              ) : (
                <div className="apply-type-groups">
                  {groupedTypes.map((group) => (
                    <div key={group.id} className="apply-type-group">
                      <div className="apply-type-group-title">
                        {group.name}
                      </div>
                      <div className="apply-type-chips">
                        {group.types.length === 0 ? (
                          <span className="apply-hint small">
                            (등록된 소분류 없음)
                          </span>
                        ) : (
                          group.types.map((type) => (
                            <label
                              key={type.id}
                              className={`chip chip-outline apply-type-chip ${
                                selectedTypeCodes.includes(type.code)
                                  ? "chip-active"
                                  : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTypeCodes.includes(type.code)}
                                onChange={() => toggleTypeCode(type.code)}
                                style={{ display: "none" }}
                              />
                              <span>{type.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 경력/소개 */}
            <div className="form-group">
              <label>경력 및 돌봄 가능 내용</label>
              <textarea
                rows={5}
                className="apply-textarea"
                placeholder="반려 경험, 호텔/분양샵 근무 경험, 케어 가능 내용 등을 적어주세요."
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
              />
            </div>
          </section>

          {/* 섹션 3: 환경 / 시간 / 비용 / 연락처 */}
          <section className="apply-section">
            <h2 className="apply-section-title">3. 환경 · 시간 · 비용</h2>

            {/* 환경 정보 */}
            <div className="form-group">
              <label>집에 다른 반려동물을 키우고 있나요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    hasOtherPets === false ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="hasOtherPets"
                    value="no"
                    checked={hasOtherPets === false}
                    onChange={() => setHasOtherPets(false)}
                    style={{ display: "none" }}
                  />
                  아니요
                </label>

                <label
                  className={`chip chip-outline ${
                    hasOtherPets === true ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="hasOtherPets"
                    value="yes"
                    checked={hasOtherPets === true}
                    onChange={() => setHasOtherPets(true)}
                    style={{ display: "none" }}
                  />
                  네, 있어요
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>위탁 기간 동안 머물 별도의 케이지/새장이 있나요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    hasSeparateCage === true ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="hasSeparateCage"
                    value="yes"
                    checked={hasSeparateCage === true}
                    onChange={() => setHasSeparateCage(true)}
                    style={{ display: "none" }}
                  />
                  네, 준비되어 있어요
                </label>

                <label
                  className={`chip chip-outline ${
                    hasSeparateCage === false ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="hasSeparateCage"
                    value="no"
                    checked={hasSeparateCage === false}
                    onChange={() => setHasSeparateCage(false)}
                    style={{ display: "none" }}
                  />
                  아니요
                </label>
              </div>
            </div>

            {/* 시간 정보 */}
            <div className="form-group">
              <label>평일에는 집을 얼마나 비우나요? (하루 기준)</label>
              <input
                type="number"
                min="0"
                max="24"
                className="apply-input"
                placeholder="예: 8 (시간)"
                value={weekdayAwayHours}
                onChange={(e) => setWeekdayAwayHours(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>주말에는 집을 얼마나 비우나요? (하루 기준)</label>
              <input
                type="number"
                min="0"
                max="24"
                className="apply-input"
                placeholder="예: 4 (시간)"
                value={weekendAwayHours}
                onChange={(e) => setWeekendAwayHours(e.target.value)}
              />
            </div>

            {/* 위탁 비용 */}
            <div className="form-group">
              <label>위탁 비용 (1박 기준)</label>
              <input
                type="number"
                min="0"
                className="apply-input"
                placeholder="예: 30000"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
              />
              <p className="apply-hint">
                모든 비용은 <b>1박 기준 금액</b>으로 입력해주세요. (추가 옵션은
                추후 협의)
              </p>
            </div>

            {/* 연락처 */}
            <div className="form-group">
              <label>연락처</label>
              <input
                type="tel"
                className="apply-input"
                placeholder="예: 010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            {saveError && <p className="apply-error">{saveError}</p>}

            <button
              type="submit"
              className="reserve-btn full-width"
              disabled={saving}
            >
              {saving ? "저장 중..." : "돌보미 신청 보내기"}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}

export default Apply;
