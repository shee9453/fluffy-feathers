// src/pages/EditCarer.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/EditCarer.css";

function EditCarer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [carer, setCarer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 폼 필드
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    const loadCarer = async () => {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("carers")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        setErrorMsg("돌보미 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      setCarer(data);
      setName(data.name || "");
      setRegion(data.region || "");
      setExperience(data.experience || "");
      // 👉 DB 스키마와 맞추기: price_per_night 사용
      setPrice(
        typeof data.price_per_night === "number"
          ? data.price_per_night.toString()
          : ""
      );
      setPhone(data.phone || "");
      setLoading(false);
    };

    if (user) {
      loadCarer();
    }
  }, [id, user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!carer) return;

    let photoUrl = carer.photo_url || null;

    // 금액 숫자 체크
    let priceNumber = null;
    if (price) {
      priceNumber = Number(price);
      if (Number.isNaN(priceNumber)) {
        alert("요금은 숫자로 입력해주세요.");
        return;
      }
    }

    // 새로 선택한 파일이 있다면 업로드
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const filePath = `carers/${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        alert("이미지 업로드 중 오류가 발생했습니다.");
        return;
      }

      const { data } = supabase.storage.from("images").getPublicUrl(filePath);
      photoUrl = data?.publicUrl ?? photoUrl;
    }

    const { error } = await supabase
      .from("carers")
      .update({
        name,
        region,
        experience,
        price_per_night: priceNumber,
        phone,
        photo_url: photoUrl,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert("수정 중 오류가 발생했습니다.");
      return;
    }

    alert("수정되었습니다!");
    navigate("/mypage");
  };

  // 상태별 UI
  if (!user) {
    return (
      <div className="booking-page">
        <p className="edit-carer-state-text">로그인 후 이용해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="booking-page">
        <p className="edit-carer-state-text">돌보미 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="booking-page">
        <p className="edit-carer-state-text edit-carer-state-error">
          {errorMsg}
        </p>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <header className="booking-header">
        <h1>돌보미 프로필 수정</h1>
        <p className="edit-carer-sub">
          기존에 등록한 정보를 수정할 수 있어요.
        </p>
      </header>

      <form className="booking-form" onSubmit={handleUpdate}>
        {/* 현재 이미지 */}
        {carer.photo_url && (
          <div className="form-group">
            <label>현재 프로필 이미지</label>
            <img
              src={carer.photo_url}
              alt="돌보미 이미지"
              className="edit-carer-current-photo"
            />
          </div>
        )}

        {/* 이미지 변경 */}
        <div className="form-group">
          <label>프로필 이미지 변경 (선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="form-group">
          <label>이름 / 닉네임</label>
          <input
            placeholder="예: 코코 집사"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>지역</label>
          <input
            placeholder="예: 서울 은평구"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>경험 소개</label>
          <textarea
            className="apply-textarea"
            rows={5}
            placeholder="반려 경험, 돌봄 가능 내용 등을 자유롭게 적어주세요."
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>요금 (1박 기준)</label>
          <input
            type="number"
            min="0"
            placeholder="예: 30000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>연락처</label>
          <input
            placeholder="예: 010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
        />
        </div>

        <button className="reserve-btn full-width" type="submit">
          수정 완료
        </button>
      </form>
    </div>
  );
}

export default EditCarer;
