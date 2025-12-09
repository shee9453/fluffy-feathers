// src/pages/EditCarer.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/Apply.css";
import "./css/EditCarer.css";

function EditCarer() {
  const { id } = useParams(); // carers.id
  const navigate = useNavigate();
  const { user } = useAuth();

  const [carer, setCarer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 동물 그룹/타입, 지역
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);

  // 이미지 파일 (새로 올릴 것)
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [parrotPhotoFiles, setParrotPhotoFiles] = useState([]);
  const [spacePhotoFiles, setSpacePhotoFiles] = useState([]);

  // 기존 이미지 URL 유지용
  const [existingProfileUrl, setExistingProfileUrl] = useState(null);
  const [existingParrotPhotoUrls, setExistingParrotPhotoUrls] = useState([]);
  const [existingSpacePhotoUrls, setExistingSpacePhotoUrls] = useState([]);

  // 기존 이미지 삭제 여부
  const [deleteProfileImage, setDeleteProfileImage] = useState(false);
  const [deleteParrotImages, setDeleteParrotImages] = useState(false);
  const [deleteSpaceImages, setDeleteSpaceImages] = useState(false);

  // 기본 프로필 정보
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // 지역: 시 / 구
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [regionCity, setRegionCity] = useState("");
  const [regionDistrict, setRegionDistrict] = useState("");

  const [experience, setExperience] = useState("");

  // 동물 대/소분류
  const [selectedTypeCodes, setSelectedTypeCodes] = useState([]);

  // 앵무새/다른 반려동물
  const [hasParrots, setHasParrots] = useState(null);
  const [hasOtherPets, setHasOtherPets] = useState(null);
  const [otherPetTypes, setOtherPetTypes] = useState("");

  // 날개 상태 수용 방식
  const [wingPreference, setWingPreference] = useState(""); // 'wingcut_only' | 'fullwing_ok'

  // 환경/시간
  const [hasSeparateCage, setHasSeparateCage] = useState(null);
  const [mainSpace, setMainSpace] = useState("");
  const [mainSpaceOther, setMainSpaceOther] = useState("");
  const [playAreas, setPlayAreas] = useState([]);
  const [dailyPlayHours, setDailyPlayHours] = useState("");

  const [weekdayAwayHours, setWeekdayAwayHours] = useState("");
  const [weekendAwayHours, setWeekendAwayHours] = useState("");

  // 추가 서비스/비용
  const [pickupDropAvailable, setPickupDropAvailable] = useState(null);
  const [pickupDropFee, setPickupDropFee] = useState("");

  const [medicationAvailable, setMedicationAvailable] = useState(null);
  const [medicationExtraFee, setMedicationExtraFee] = useState("");

  const [handfeedingAvailable, setHandfeedingAvailable] = useState(null);
  const [handfeedingExtraFee, setHandfeedingExtraFee] = useState("");

  // 크기별 돌봄 가능 여부 + 1박 요금
  const [supportsSmall, setSupportsSmall] = useState(false);
  const [supportsMedium, setSupportsMedium] = useState(false);
  const [supportsLarge, setSupportsLarge] = useState(false);

  const [priceSmall, setPriceSmall] = useState("");
  const [priceMedium, setPriceMedium] = useState("");
  const [priceLarge, setPriceLarge] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  const togglePlayArea = (value) => {
    setPlayAreas((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

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

  // 여러 파일 업로드 helper
  const uploadMultipleImages = async (files, prefix) => {
    const urls = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const filePath = `carers/${prefix}/${user.id}-${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        throw new Error("이미지 업로드 중 오류가 발생했습니다.");
      }

      const { data } = supabase.storage.from("images").getPublicUrl(filePath);
      if (data?.publicUrl) {
        urls.push(data.publicUrl);
      }
    }

    return urls;
  };

  // 메타 데이터(동물 그룹/타입, 시 리스트) 로딩
  useEffect(() => {
    const fetchMeta = async () => {
      try {
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
      } catch (e) {
        console.error(e);
      }
    };

    fetchMeta();
  }, []);

  // 돌보미 데이터 로딩
  useEffect(() => {
    const loadCarer = async () => {
      if (!user || !id) return;

      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("carers")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.error(error);
        setErrorMsg("돌보미 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      setCarer(data);

      // 기본 정보
      setName(data.name || "");
      setPhone(data.phone || "");

      setRegionCity(data.region_city || "");
      setRegionDistrict(data.region_district || "");

      setExperience(data.experience || "");
      setSelectedTypeCodes(data.animal_type_codes || []);

      setExistingProfileUrl(data.photo_url || null);
      setExistingParrotPhotoUrls(data.parrot_photo_urls || []);
      setExistingSpacePhotoUrls(data.space_photo_urls || []);

      // 삭제 체크 상태 초기화
      setDeleteProfileImage(false);
      setDeleteParrotImages(false);
      setDeleteSpaceImages(false);

      // 앵무새/다른 반려동물
      setHasParrots(
        data.has_parrots === true ? true : data.has_parrots === false ? false : null
      );
      setHasOtherPets(
        data.has_other_pets_non_parrot === true
          ? true
          : data.has_other_pets_non_parrot === false
          ? false
          : null
      );
      setOtherPetTypes(data.other_pet_types || "");

      // 날개 상태 수용 방식
      if (data.accepts_fullwing) {
        setWingPreference("fullwing_ok");
      } else {
        // 풀윙 X 이면 윙컷만
        setWingPreference("wingcut_only");
      }

      // 환경/시간
      setHasSeparateCage(
        data.has_separate_cage === true
          ? true
          : data.has_separate_cage === false
          ? false
          : null
      );
      setMainSpace(data.main_space || "");
      setMainSpaceOther(data.main_space_other || "");
      setPlayAreas(data.play_areas || []);
      setDailyPlayHours(data.daily_play_hours || "");

      setWeekdayAwayHours(
        typeof data.weekday_away_hours === "number"
          ? data.weekday_away_hours.toString()
          : ""
      );
      setWeekendAwayHours(
        typeof data.weekend_away_hours === "number"
          ? data.weekend_away_hours.toString()
          : ""
      );

      // 추가 서비스/비용
      setPickupDropAvailable(
        data.pickup_drop_available === true
          ? true
          : data.pickup_drop_available === false
          ? false
          : null
      );
      setPickupDropFee(
        typeof data.pickup_drop_fee === "number"
          ? data.pickup_drop_fee.toString()
          : ""
      );

      setMedicationAvailable(
        data.medication_available === true
          ? true
          : data.medication_available === false
          ? false
          : null
      );
      setMedicationExtraFee(
        typeof data.medication_extra_fee === "number"
          ? data.medication_extra_fee.toString()
          : ""
      );

      setHandfeedingAvailable(
        data.handfeeding_available === true
          ? true
          : data.handfeeding_available === false
          ? false
          : null
      );
      setHandfeedingExtraFee(
        typeof data.handfeeding_extra_fee === "number"
          ? data.handfeeding_extra_fee.toString()
          : ""
      );

      // 크기별 요금
      setSupportsSmall(!!data.supports_small);
      setSupportsMedium(!!data.supports_medium);
      setSupportsLarge(!!data.supports_large);

      setPriceSmall(
        typeof data.price_small_per_night === "number"
          ? data.price_small_per_night.toString()
          : ""
      );
      setPriceMedium(
        typeof data.price_medium_per_night === "number"
          ? data.price_medium_per_night.toString()
          : ""
      );
      setPriceLarge(
        typeof data.price_large_per_night === "number"
          ? data.price_large_per_night.toString()
          : ""
      );

      setLoading(false);
    };

    loadCarer();
  }, [id, user]);

  // carer + cities 로부터 selectedCityCode 세팅 & 기존 구 목록 로딩
  useEffect(() => {
    const syncCityFromCarer = async () => {
      if (!carer || !carer.region_city || cities.length === 0) return;

      const matchedCity = cities.find((c) => c.name === carer.region_city);
      if (!matchedCity) return;

      setSelectedCityCode(matchedCity.code);

      const { data, error } = await supabase
        .from("regions_district")
        .select("*")
        .eq("city_code", matchedCity.code)
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setDistricts(data || []);
    };

    syncCityFromCarer();
  }, [carer, cities]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!carer || !user) return;

    setSaveError("");
    setSaving(true);

    try {
      // === 검증 (Apply 와 동일한 기준, 단 이미지 필수 X지만 '삭제 체크 시 새 업로드는 필수') ===
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

      if (!phone.trim()) {
        setSaveError("연락처를 입력해주세요.");
        setSaving(false);
        return;
      }

      if (hasParrots === null) {
        setSaveError("현재 앵무새를 키우고 있는지 선택해주세요.");
        setSaving(false);
        return;
      }

      if (hasOtherPets === null) {
        setSaveError("앵무새 외 다른 반려동물 유무를 선택해주세요.");
        setSaving(false);
        return;
      }

      if (hasOtherPets === true && otherPetTypes.trim() === "") {
        setSaveError("키우고 있는 다른 반려동물 종류를 적어주세요.");
        setSaving(false);
        return;
      }

      if (wingPreference === "") {
        setSaveError("받을 수 있는 앵무새 날개 상태를 선택해주세요.");
        setSaving(false);
        return;
      }

      if (hasSeparateCage === null) {
        setSaveError("별도 케이지/새장 준비 여부를 선택해주세요.");
        setSaving(false);
        return;
      }

      if (!mainSpace) {
        setSaveError("위탁 앵이들이 주로 지낼 공간을 선택해주세요.");
        setSaving(false);
        return;
      }

      if (mainSpace === "other" && mainSpaceOther.trim() === "") {
        setSaveError("기타 공간에 대해 간단히 적어주세요.");
        setSaving(false);
        return;
      }

      if (playAreas.length === 0) {
        setSaveError("앵이들이 어디서 놀 수 있는지 최소 1개 이상 선택해주세요.");
        setSaving(false);
        return;
      }

      if (!dailyPlayHours) {
        setSaveError("하루에 얼마나 놀 수 있는지 선택해주세요.");
        setSaving(false);
        return;
      }

      if (weekdayAwayHours === "" || weekendAwayHours === "") {
        setSaveError("평일/주말 외출 시간을 입력해주세요.");
        setSaving(false);
        return;
      }

      const weekdayHoursNumber = Number(weekdayAwayHours);
      const weekendHoursNumber = Number(weekendAwayHours);

      if (
        Number.isNaN(weekdayHoursNumber) ||
        Number.isNaN(weekendHoursNumber)
      ) {
        setSaveError("외출 시간은 숫자로 입력해주세요.");
        setSaving(false);
        return;
      }

      // 크기별 돌봄 가능 체크 최소 1개
      if (!supportsSmall && !supportsMedium && !supportsLarge) {
        setSaveError("돌봄 가능한 앵무새 크기를 최소 1개 이상 선택해주세요.");
        setSaving(false);
        return;
      }

      let priceSmallNumber = null;
      let priceMediumNumber = null;
      let priceLargeNumber = null;

      if (supportsSmall) {
        if (priceSmall === "") {
          setSaveError("소형 앵무새 1박 요금을 입력해주세요.");
          setSaving(false);
          return;
        }
        priceSmallNumber = Number(priceSmall);
        if (Number.isNaN(priceSmallNumber)) {
          setSaveError("소형 앵무새 요금은 숫자로 입력해주세요.");
          setSaving(false);
          return;
        }
      }

      if (supportsMedium) {
        if (priceMedium === "") {
          setSaveError("중형 앵무새 1박 요금을 입력해주세요.");
          setSaving(false);
          return;
        }
        priceMediumNumber = Number(priceMedium);
        if (Number.isNaN(priceMediumNumber)) {
          setSaveError("중형 앵무새 요금은 숫자로 입력해주세요.");
          setSaving(false);
          return;
        }
      }

      if (supportsLarge) {
        if (priceLarge === "") {
          setSaveError("대형 앵무새 1박 요금을 입력해주세요.");
          setSaving(false);
          return;
        }
        priceLargeNumber = Number(priceLarge);
        if (Number.isNaN(priceLargeNumber)) {
          setSaveError("대형 앵무새 요금은 숫자로 입력해주세요.");
          setSaving(false);
          return;
        }
      }

      // 추가 옵션들 숫자 검증
      let pickupDropFeeNumber = null;
      if (pickupDropAvailable === true) {
        if (pickupDropFee === "") {
          setSaveError("픽업·드랍 요금을 입력해주세요.");
          setSaving(false);
          return;
        }
        pickupDropFeeNumber = Number(pickupDropFee);
        if (Number.isNaN(pickupDropFeeNumber)) {
          setSaveError("픽업·드랍 요금은 숫자로 입력해주세요.");
          setSaving(false);
          return;
        }
      }

      let medicationExtraFeeNumber = null;
      if (medicationAvailable === true) {
        if (medicationExtraFee === "") {
          setSaveError("약물 관리 추가 요금을 입력해주세요.");
          setSaving(false);
          return;
        }
        medicationExtraFeeNumber = Number(medicationExtraFee);
        if (Number.isNaN(medicationExtraFeeNumber)) {
          setSaveError("약물 관리 추가 요금은 숫자로 입력해주세요.");
          setSaving(false);
          return;
        }
      }

      let handfeedingExtraFeeNumber = null;
      if (handfeedingAvailable === true) {
        if (handfeedingExtraFee === "") {
          setSaveError("이유식 추가 요금을 입력해주세요.");
          setSaving(false);
          return;
        }
        handfeedingExtraFeeNumber = Number(handfeedingExtraFee);
        if (Number.isNaN(handfeedingExtraFeeNumber)) {
          setSaveError("이유식 추가 요금은 숫자로 입력해주세요.");
          setSaving(false);
          return;
        }
      }

      // === 이미지 관련 추가 검증 ===
      // 등록 페이지 기준으로 세 종류 모두 필수이므로,
      // '삭제 체크 + 새 업로드 없음'은 허용하지 않음.
      if (deleteProfileImage && !profilePhotoFile) {
        setSaveError(
          "대표 이미지를 삭제하려면 새 대표 이미지를 반드시 업로드해주세요."
        );
        setSaving(false);
        return;
      }

      if (deleteParrotImages && parrotPhotoFiles.length === 0) {
        setSaveError(
          "현재 키우는 앵무새 사진을 삭제하려면 새 앵무새 사진을 최소 1장 이상 업로드해주세요."
        );
        setSaving(false);
        return;
      }

      if (deleteSpaceImages && spacePhotoFiles.length === 0) {
        setSaveError(
          "위탁 공간 사진을 삭제하려면 새 공간 사진을 최소 1장 이상 업로드해주세요."
        );
        setSaving(false);
        return;
      }

      // === 이미지 처리 ===
      let profilePhotoUrl = existingProfileUrl || null;
      let parrotPhotoUrls = existingParrotPhotoUrls || [];
      let spacePhotoUrls = existingSpacePhotoUrls || [];

      // 삭제 체크된 경우 기존 값 비우기
      if (deleteProfileImage) {
        profilePhotoUrl = null;
      }
      if (deleteParrotImages) {
        parrotPhotoUrls = [];
      }
      if (deleteSpaceImages) {
        spacePhotoUrls = [];
      }

      // 1) 대표 이미지 - 새 파일 업로드 시 새 URL로 교체
      if (profilePhotoFile) {
        const extProfile = profilePhotoFile.name.split(".").pop();
        const profilePath = `carers/profile/${user.id}-${Date.now()}.${extProfile}`;

        const { error: profileUploadError } = await supabase.storage
          .from("images")
          .upload(profilePath, profilePhotoFile, { upsert: true });

        if (profileUploadError) {
          console.error(profileUploadError);
          setSaveError("대표 이미지 업로드 중 오류가 발생했습니다.");
          setSaving(false);
          return;
        }

        const { data } = supabase.storage
          .from("images")
          .getPublicUrl(profilePath);
        profilePhotoUrl = data?.publicUrl ?? profilePhotoUrl;
      }

      // 2) 현재 키우는 앵무새 사진
      if (parrotPhotoFiles.length > 0) {
        try {
          parrotPhotoUrls = await uploadMultipleImages(
            parrotPhotoFiles,
            "parrots"
          );
        } catch (err) {
          console.error(err);
          setSaveError(
            err.message || "앵무새 사진 업로드 중 오류가 발생했습니다."
          );
          setSaving(false);
          return;
        }
      }

      // 3) 위탁 공간 사진
      if (spacePhotoFiles.length > 0) {
        try {
          spacePhotoUrls = await uploadMultipleImages(
            spacePhotoFiles,
            "spaces"
          );
        } catch (err) {
          console.error(err);
          setSaveError(
            err.message || "공간 사진 업로드 중 오류가 발생했습니다."
          );
          setSaving(false);
          return;
        }
      }

      // === UPDATE ===
      const { error } = await supabase
        .from("carers")
        .update({
          name,
          phone,
          region_city: regionCity,
          region_district: regionDistrict,
          experience,
          animal_type_codes: selectedTypeCodes,

          photo_url: profilePhotoUrl,
          parrot_photo_urls: parrotPhotoUrls.length ? parrotPhotoUrls : null,
          space_photo_urls: spacePhotoUrls.length ? spacePhotoUrls : null,

          has_parrots: hasParrots,
          has_other_pets_non_parrot: hasOtherPets,
          other_pet_types: hasOtherPets ? otherPetTypes : null,

          has_separate_cage: hasSeparateCage,

          main_space: mainSpace,
          main_space_other:
            mainSpace === "other" ? mainSpaceOther.trim() : null,

          play_areas: playAreas,
          daily_play_hours: dailyPlayHours,

          weekday_away_hours: weekdayHoursNumber,
          weekend_away_hours: weekendHoursNumber,

          accepts_wingcut: true,
          accepts_fullwing: wingPreference === "fullwing_ok",

          pickup_drop_available: pickupDropAvailable,
          pickup_drop_fee: pickupDropFeeNumber,

          medication_available: medicationAvailable,
          medication_extra_fee: medicationExtraFeeNumber,

          handfeeding_available: handfeedingAvailable,
          handfeeding_extra_fee: handfeedingExtraFeeNumber,

          supports_small: supportsSmall,
          supports_medium: supportsMedium,
          supports_large: supportsLarge,
          price_small_per_night: priceSmallNumber,
          price_medium_per_night: priceMediumNumber,
          price_large_per_night: priceLargeNumber,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setSaveError("수정 중 오류가 발생했습니다.");
        setSaving(false);
        return;
      }

      alert("돌보미 프로필이 수정되었습니다!");
      navigate("/mypage");
    } finally {
      setSaving(false);
    }
  };

  // 상태별 UI
  if (!user) {
    return (
      <div className="apply-page apply-state">
        <h1 className="apply-title">돌보미 프로필 수정</h1>
        <p className="apply-sub">로그인 후 이용해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="apply-page apply-state">
        <p className="apply-sub">돌보미 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="apply-page apply-state">
        <p className="apply-sub apply-error">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="apply-page">
      <header className="apply-header">
        <h1>돌보미 프로필 수정</h1>
        <p className="apply-sub">
          기존에 등록한 정보를 수정할 수 있어요. 변경하지 않은 항목은 그대로
          유지됩니다.
        </p>
      </header>

      <form className="apply-form" onSubmit={handleUpdate}>
        <div className="apply-form-grid">
          {/* 섹션 1: 기본 프로필 */}
          <section className="apply-section">
            <h2 className="apply-section-title">1. 기본 프로필</h2>

            {/* 현재/변경 프로필 이미지 */}
            {existingProfileUrl && (
              <div className="form-group">
                <label>현재 대표 이미지</label>
                <img
                  src={existingProfileUrl}
                  alt="현재 대표 이미지"
                  className="edit-carer-current-photo"
                />
                {/* <div style={{ marginTop: "0.35rem" }}>
                  <label className="apply-hint small">
                    <input
                      type="checkbox"
                      checked={deleteProfileImage}
                      onChange={(e) =>
                        setDeleteProfileImage(e.target.checked)
                      }
                      style={{ marginRight: "0.35rem" }}
                    />
                    현재 대표 이미지를 삭제하고 새 이미지를 등록할게요.
                  </label>
                </div> */}
              </div>
            )}

            <div className="form-group">
              <label>대표 이미지 변경</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProfilePhotoFile(e.target.files?.[0] ?? null)
                }
              />
              <p className="apply-hint">
                대표 이미지는 필수입니다.{" "}
                {/* <b>
                  삭제에 체크한 경우, 반드시 새 대표 이미지를 업로드해야 저장할
                  수 있어요.
                </b> */}
              </p>
            </div>

            {/* 현재 키우는 앵무새 사진 */}
            {existingParrotPhotoUrls?.length > 0 && (
              <div className="form-group">
                <label>현재 앵무새 사진</label>
                <div className="edit-carer-photo-grid">
                  {existingParrotPhotoUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="현재 앵무새 사진"
                      className="edit-carer-sub-photo"
                    />
                  ))}
                </div>
                {/* <div style={{ marginTop: "0.35rem" }}>
                  <label className="apply-hint small">
                    <input
                      type="checkbox"
                      checked={deleteParrotImages}
                      onChange={(e) =>
                        setDeleteParrotImages(e.target.checked)
                      }
                      style={{ marginRight: "0.35rem" }}
                    />
                    현재 앵무새 사진을 모두 삭제하고 새 사진으로 교체할게요.
                  </label>
                </div> */}
              </div>
            )}

            <div className="form-group">
              <label>현재 키우는 앵무새 사진 변경 (최대 3장)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 3);
                  setParrotPhotoFiles(files);
                }}
              />
              <p className="apply-hint">
                앵무새 사진은 필수입니다.{" "}
                {/* <b>
                  삭제에 체크한 경우, 새 앵무새 사진을 최소 1장 이상 업로드해야
                  저장할 수 있어요.
                </b> */}
              </p>
            </div>

            {/* 위탁 공간 사진 */}
            {existingSpacePhotoUrls?.length > 0 && (
              <div className="form-group">
                <label>현재 위탁 공간 사진</label>
                <div className="edit-carer-photo-grid">
                  {existingSpacePhotoUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="현재 공간 사진"
                      className="edit-carer-sub-photo"
                    />
                  ))}
                </div>
                {/* <div style={{ marginTop: "0.35rem" }}>
                  <label className="apply-hint small">
                    <input
                      type="checkbox"
                      checked={deleteSpaceImages}
                      onChange={(e) =>
                        setDeleteSpaceImages(e.target.checked)
                      }
                      style={{ marginRight: "0.35rem" }}
                    />
                    현재 위탁 공간 사진을 모두 삭제하고 새 사진으로 교체할게요.
                  </label>
                </div> */}
              </div>
            )}

            <div className="form-group">
              <label>위탁 공간 사진 변경 (최대 3장)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 3);
                  setSpacePhotoFiles(files);
                }}
              />
              <p className="apply-hint">
                위탁 공간 사진도 필수입니다.{" "}
                {/* <b>
                  삭제에 체크한 경우, 새 공간 사진을 최소 1장 이상 업로드해야
                  저장할 수 있어요.
                </b> */}
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

          {/* 섹션 2: 돌봄 가능 동물 & 소개 */}
          <section className="apply-section">
            <h2 className="apply-section-title">2. 돌봄 가능 동물 & 소개</h2>

            {/* 돌봄 가능 동물 */}
            <div className="form-group">
              <label>돌봄 가능 동물 (대분류 / 소분류)</label>

              {groups.length === 0 ? (
                <p className="apply-hint">
                  동물 분류 데이터를 불러오지 못했습니다. (animal_groups /
                  animal_types 확인 필요)
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

            {/* 현재 앵무새 사육 여부 */}
            <div className="form-group">
              <label>현재 앵무새를 키우고 있나요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    hasParrots === false ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="hasParrots"
                    value="no"
                    checked={hasParrots === false}
                    onChange={() => setHasParrots(false)}
                    style={{ display: "none" }}
                  />
                  아니요
                </label>

                <label
                  className={`chip chip-outline ${
                    hasParrots === true ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="hasParrots"
                    value="yes"
                    checked={hasParrots === true}
                    onChange={() => setHasParrots(true)}
                    style={{ display: "none" }}
                  />
                  네, 키우고 있어요
                </label>
              </div>
              <p className="apply-hint small">
                (종/마리 수는 &quot;경력 및 돌봄 내용&quot;에 함께 적어주세요.)
              </p>
            </div>

            {/* 날개 상태 수용 여부 */}
            <div className="form-group">
              <label>받을 수 있는 앵무새 날개 상태(윙컷 여부)</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    wingPreference === "wingcut_only" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="wingPreference"
                    value="wingcut_only"
                    checked={wingPreference === "wingcut_only"}
                    onChange={() => setWingPreference("wingcut_only")}
                    style={{ display: "none" }}
                  />
                  윙컷된 앵이만 받을게요
                </label>
                <label
                  className={`chip chip-outline ${
                    wingPreference === "fullwing_ok" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="wingPreference"
                    value="fullwing_ok"
                    checked={wingPreference === "fullwing_ok"}
                    onChange={() => setWingPreference("fullwing_ok")}
                    style={{ display: "none" }}
                  />
                  풀윙(날 수 있는 상태)도 가능해요
                </label>
              </div>
            </div>

            {/* 경력/소개 */}
            <div className="form-group">
              <label>경력 및 돌봄 가능 내용</label>
              <textarea
                rows={5}
                className="apply-textarea"
                placeholder="반려 경험, 호텔/분양샵 근무 경험, 현재 키우는 앵무새(종/마리 수), 케어 가능 내용을 적어주세요."
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
              />
            </div>
          </section>

          {/* 섹션 3: 환경 · 시간 */}
          <section className="apply-section">
            <h2 className="apply-section-title">3. 환경 · 시간</h2>

            {/* 다른 반려동물 */}
            <div className="form-group">
              <label>집에 앵무새 외 다른 반려동물을 키우고 있나요?</label>
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
              {hasOtherPets === true && (
                <div style={{ marginTop: "0.4rem" }}>
                  <input
                    type="text"
                    className="apply-input"
                    placeholder="예: 고양이 1마리(실내), 말티즈 1마리(거실 위주)"
                    value={otherPetTypes}
                    onChange={(e) => setOtherPetTypes(e.target.value)}
                  />
                  <p className="apply-hint small">
                    어떤 동물을 키우는지 간단히 적어주세요.
                  </p>
                </div>
              )}
            </div>

            {/* 별도 케이지/새장 */}
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

            {/* 주 공간 */}
            <div className="form-group">
              <label>위탁 온 앵이들이 주로 지낼 곳은 어디인가요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    mainSpace === "room" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="mainSpace"
                    value="room"
                    checked={mainSpace === "room"}
                    onChange={() => setMainSpace("room")}
                    style={{ display: "none" }}
                  />
                  방(룸)
                </label>
                <label
                  className={`chip chip-outline ${
                    mainSpace === "living_room" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="mainSpace"
                    value="living_room"
                    checked={mainSpace === "living_room"}
                    onChange={() => setMainSpace("living_room")}
                    style={{ display: "none" }}
                  />
                  거실
                </label>
                <label
                  className={`chip chip-outline ${
                    mainSpace === "balcony" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="mainSpace"
                    value="balcony"
                    checked={mainSpace === "balcony"}
                    onChange={() => setMainSpace("balcony")}
                    style={{ display: "none" }}
                  />
                  베란다
                </label>
                <label
                  className={`chip chip-outline ${
                    mainSpace === "other" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="mainSpace"
                    value="other"
                    checked={mainSpace === "other"}
                    onChange={() => setMainSpace("other")}
                    style={{ display: "none" }}
                  />
                  기타
                </label>
              </div>
              {mainSpace === "other" && (
                <div style={{ marginTop: "0.4rem" }}>
                  <input
                    type="text"
                    className="apply-input"
                    placeholder="예: 서재, 작업실 등"
                    value={mainSpaceOther}
                    onChange={(e) => setMainSpaceOther(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 놀이/비행 공간 */}
            <div className="form-group">
              <label>앵이들이 어디서 놀 수 있나요? (복수 선택 가능)</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    playAreas.includes("cage_only") ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={playAreas.includes("cage_only")}
                    onChange={() => togglePlayArea("cage_only")}
                    style={{ display: "none" }}
                  />
                  새장 안에서만
                </label>
                <label
                  className={`chip chip-outline ${
                    playAreas.includes("playground") ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={playAreas.includes("playground")}
                    onChange={() => togglePlayArea("playground")}
                    style={{ display: "none" }}
                  />
                  새장 근처 놀이터/스탠드
                </label>
                <label
                  className={`chip chip-outline ${
                    playAreas.includes("room") ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={playAreas.includes("room")}
                    onChange={() => togglePlayArea("room")}
                    style={{ display: "none" }}
                  />
                  방 하나 자유롭게
                </label>
                <label
                  className={`chip chip-outline ${
                    playAreas.includes("living_room") ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={playAreas.includes("living_room")}
                    onChange={() => togglePlayArea("living_room")}
                    style={{ display: "none" }}
                  />
                  거실 자유롭게
                </label>
                <label
                  className={`chip chip-outline ${
                    playAreas.includes("whole_house") ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={playAreas.includes("whole_house")}
                    onChange={() => togglePlayArea("whole_house")}
                    style={{ display: "none" }}
                  />
                  집 전체 자유롭게
                </label>
              </div>
            </div>

            {/* 놀이/비행 시간 */}
            <div className="form-group">
              <label>하루에 얼마나 놀거나(비행) 할 수 있나요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    dailyPlayHours === "0-2" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="dailyPlayHours"
                    value="0-2"
                    checked={dailyPlayHours === "0-2"}
                    onChange={() => setDailyPlayHours("0-2")}
                    style={{ display: "none" }}
                  />
                  0~2시간
                </label>
                <label
                  className={`chip chip-outline ${
                    dailyPlayHours === "3-5" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="dailyPlayHours"
                    value="3-5"
                    checked={dailyPlayHours === "3-5"}
                    onChange={() => setDailyPlayHours("3-5")}
                    style={{ display: "none" }}
                  />
                  3~5시간
                </label>
                <label
                  className={`chip chip-outline ${
                    dailyPlayHours === "6-8" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="dailyPlayHours"
                    value="6-8"
                    checked={dailyPlayHours === "6-8"}
                    onChange={() => setDailyPlayHours("6-8")}
                    style={{ display: "none" }}
                  />
                  6~8시간
                </label>
                <label
                  className={`chip chip-outline ${
                    dailyPlayHours === "8+" ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="dailyPlayHours"
                    value="8+"
                    checked={dailyPlayHours === "8+"}
                    onChange={() => setDailyPlayHours("8+")}
                    style={{ display: "none" }}
                  />
                  8시간 이상
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
          </section>

          {/* 섹션 4: 비용 */}
          <section className="apply-section">
            <h2 className="apply-section-title">4. 비용</h2>

            {/* 픽업/드랍 */}
            <div className="form-group">
              <label>픽업·드랍(데려오기/데려다주기) 서비스를 제공하시나요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    pickupDropAvailable === false ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pickupDropAvailable"
                    value="no"
                    checked={pickupDropAvailable === false}
                    onChange={() => setPickupDropAvailable(false)}
                    style={{ display: "none" }}
                  />
                  아니요
                </label>
                <label
                  className={`chip chip-outline ${
                    pickupDropAvailable === true ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pickupDropAvailable"
                    value="yes"
                    checked={pickupDropAvailable === true}
                    onChange={() => setPickupDropAvailable(true)}
                    style={{ display: "none" }}
                  />
                  네, 가능해요
                </label>
              </div>
              {pickupDropAvailable === true && (
                <div style={{ marginTop: "0.4rem" }}>
                  <input
                    type="number"
                    min="0"
                    className="apply-input"
                    placeholder="예: 10000 (5km 이내 왕복 기준)"
                    value={pickupDropFee}
                    onChange={(e) => setPickupDropFee(e.target.value)}
                  />
                  <p className="apply-hint small">
                    예: 5km 이내 왕복 10,000원 정도로 설정하는 분들이 많아요.
                  </p>
                </div>
              )}
            </div>

            {/* 약물 관리 */}
            <div className="form-group">
              <label>약물 관리(투약, 연고 바르기 등)를 도와주실 수 있나요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    medicationAvailable === false ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="medicationAvailable"
                    value="no"
                    checked={medicationAvailable === false}
                    onChange={() => setMedicationAvailable(false)}
                    style={{ display: "none" }}
                  />
                  아니요
                </label>
                <label
                  className={`chip chip-outline ${
                    medicationAvailable === true ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="medicationAvailable"
                    value="yes"
                    checked={medicationAvailable === true}
                    onChange={() => setMedicationAvailable(true)}
                    style={{ display: "none" }}
                  />
                  네, 가능해요
                </label>
              </div>
              {medicationAvailable === true && (
                <div style={{ marginTop: "0.4rem" }}>
                  <input
                    type="number"
                    min="0"
                    className="apply-input"
                    placeholder="예: 5000 (1박 기준 추가 요금)"
                    value={medicationExtraFee}
                    onChange={(e) => setMedicationExtraFee(e.target.value)}
                  />
                  <p className="apply-hint small">
                    예: 약물 관리가 필요한 경우 1일 5,000원 정도 추가로
                    책정하는 경우가 많아요.
                  </p>
                </div>
              )}
            </div>

            {/* 이유식 */}
            <div className="form-group">
              <label>이유식 급여가 가능한가요?</label>
              <div className="apply-chip-row">
                <label
                  className={`chip chip-outline ${
                    handfeedingAvailable === false ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="handfeedingAvailable"
                    value="no"
                    checked={handfeedingAvailable === false}
                    onChange={() => setHandfeedingAvailable(false)}
                    style={{ display: "none" }}
                  />
                  아니요
                </label>
                <label
                  className={`chip chip-outline ${
                    handfeedingAvailable === true ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="handfeedingAvailable"
                    value="yes"
                    checked={handfeedingAvailable === true}
                    onChange={() => setHandfeedingAvailable(true)}
                    style={{ display: "none" }}
                  />
                  네, 가능해요
                </label>
              </div>
              {handfeedingAvailable === true && (
                <div style={{ marginTop: "0.4rem" }}>
                  <input
                    type="number"
                    min="0"
                    className="apply-input"
                    placeholder="예: 10000 (1박 기준 추가 요금)"
                    value={handfeedingExtraFee}
                    onChange={(e) => setHandfeedingExtraFee(e.target.value)}
                  />
                  <p className="apply-hint small">
                    예: 이유식이 필요한 어린 앵이의 경우 1일 10,000원 정도
                    추가로 받는 편이에요.
                  </p>
                </div>
              )}
            </div>

            {/* 크기별 1박 요금 */}
            <div className="form-group">
              <label>돌봄 가능한 앵무새 크기 &amp; 1박 요금</label>
              <p className="apply-hint small">
                소형/중형/대형 중 돌봄 가능한 크기를 선택하고, 1박 기준
                금액을 입력해주세요.
              </p>

              {/* 크기 선택 칩 */}
              <div className="apply-chip-row" style={{ marginTop: "0.35rem" }}>
                <label
                  className={`chip chip-outline ${
                    supportsSmall ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={supportsSmall}
                    onChange={() => setSupportsSmall((prev) => !prev)}
                    style={{ display: "none" }}
                  />
                  소형 앵무새(모란, 잉꼬 등)
                </label>
                <label
                  className={`chip chip-outline ${
                    supportsMedium ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={supportsMedium}
                    onChange={() => setSupportsMedium((prev) => !prev)}
                    style={{ display: "none" }}
                  />
                  중형 앵무새(코뉴어 등)
                </label>
                <label
                  className={`chip chip-outline ${
                    supportsLarge ? "chip-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={supportsLarge}
                    onChange={() => setSupportsLarge((prev) => !prev)}
                    style={{ display: "none" }}
                  />
                  대형 앵무새(회색앵무, 아마존 등)
                </label>
              </div>

              {supportsSmall && (
                <div style={{ marginTop: "0.4rem" }}>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    소형 앵무새 1박 요금
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="apply-input"
                    placeholder="예: 4000"
                    value={priceSmall}
                    onChange={(e) => setPriceSmall(e.target.value)}
                  />
                  <p className="apply-hint small">
                    예: 소형(모란, 잉꼬 등)은 3,000~5,000원/일 선에서 형성돼요.
                  </p>
                </div>
              )}

              {supportsMedium && (
                <div style={{ marginTop: "0.4rem" }}>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    중형 앵무새 1박 요금
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="apply-input"
                    placeholder="예: 6000"
                    value={priceMedium}
                    onChange={(e) => setPriceMedium(e.target.value)}
                  />
                  <p className="apply-hint small">
                    예: 중형(코뉴어, 퀘이커 등)은 5,000~8,000원/일 정도예요.
                  </p>
                </div>
              )}

              {supportsLarge && (
                <div style={{ marginTop: "0.4rem" }}>
                  <label style={{ fontSize: "0.8rem", display: "block" }}>
                    대형 앵무새 1박 요금
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="apply-input"
                    placeholder="예: 12000"
                    value={priceLarge}
                    onChange={(e) => setPriceLarge(e.target.value)}
                  />
                  <p className="apply-hint small">
                    예: 대형(회색앵무, 아마존 등)은 10,000원 이상/일인 경우가
                    많아요.
                  </p>
                </div>
              )}
            </div>

            {saveError && <p className="apply-error">{saveError}</p>}

            <button
              type="submit"
              className="reserve-btn full-width"
              disabled={saving}
            >
              {saving ? "수정 중..." : "수정 내용 저장하기"}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}

export default EditCarer;
