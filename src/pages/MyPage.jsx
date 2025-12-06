// src/pages/MyPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import "./css/MyPage.css";

function MyPage() {
  const { user, authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [myCarers, setMyCarers] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [carerMap, setCarerMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      setLoadError("");

      // 1) profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("profiles 불러오기 실패:", profileError);
        setLoadError("프로필 정보를 불러오는 중 오류가 발생했어요.");
        setLoading(false);
        return;
      }

      // 2) 내가 등록한 carers
      const { data: carersData, error: carersError } = await supabase
        .from("carers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (carersError) {
        console.error("carers 불러오기 실패:", carersError);
        setLoadError("돌보미 정보를 불러오는 중 오류가 발생했어요.");
        setLoading(false);
        return;
      }

      // 3) 내가 보낸 bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookingsError) {
        console.error("bookings 불러오기 실패:", bookingsError);
        setLoadError("예약 정보를 불러오는 중 오류가 발생했어요.");
        setLoading(false);
        return;
      }

      // 4) 예약에 등장하는 carer_id 들만 모아서 이름 매핑
      const carerIds = [
        ...new Set((bookingsData || []).map((b) => b.carer_id)),
      ].filter(Boolean);

      let carerMapObj = {};
      if (carerIds.length > 0) {
        const { data: relatedCarers, error: relatedError } = await supabase
          .from("carers")
          .select("id, name, region, region_city, region_district")
          .in("id", carerIds);

        if (!relatedError && relatedCarers) {
          relatedCarers.forEach((c) => {
            carerMapObj[c.id] = c;
          });
        }
      }

      setProfile(profileData || null);
      setMyCarers(carersData || []);
      setMyBookings(bookingsData || []);
      setCarerMap(carerMapObj);
      setLoading(false);
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const ext = file.name.split(".").pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        alert("이미지 업로드 중 오류가 발생했습니다.");
        return;
      }

      const { data } = supabase.storage.from("images").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        alert("이미지 URL을 가져오지 못했습니다.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) {
        console.error(updateError);
        alert("프로필 업데이트 중 오류가 발생했습니다.");
        return;
      }

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: publicUrl } : prev
      );
    } catch (err) {
      console.error(err);
      alert("이미지 업로드 중 알 수 없는 오류가 발생했습니다.");
    }
  };

  const formatRegion = (c) => {
    if (!c) return "지역 미입력";
    if (c.region_city && c.region_district) {
      return `${c.region_city} ${c.region_district}`;
    }
    if (c.region_city) return c.region_city;
    return c.region || "지역 미입력";
  };

  const makePeriodText = (b) => {
    if (b.end_date) return `${b.booking_date} ~ ${b.end_date}`;
    return b.booking_date;
  };

  if (authLoading) {
    return (
      <div className="mypage-page mypage-state">
        <p className="mypage-state-text">
          로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mypage-page mypage-state">
        <h1 className="mypage-title">마이페이지</h1>
        <p className="mypage-sub">
          마이페이지를 이용하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mypage-page mypage-state">
        <p className="mypage-state-text">
          내 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mypage-page mypage-state">
        <p className="mypage-state-text mypage-state-error">{loadError}</p>
      </div>
    );
  }

  const handleDeleteCarer = async (carerId) => {
    if (!window.confirm("정말 삭제하시겠어요?")) return;

    const { error } = await supabase
      .from("carers")
      .update({ is_active: false })
      .eq("id", carerId);

    if (error) {
      alert("삭제 중 오류가 발생했습니다.");
      return;
    }

    alert("삭제되었습니다.");
    setMyCarers((prev) => prev.filter((c) => c.id !== carerId));
  };

  return (
    <div className="mypage-page">
      {/* 1) 프로필 요약 */}
      <header className="mypage-header">
        <div className="mypage-header-main">
          <h1>마이페이지</h1>
          <p className="mypage-sub">
            <span className="mypage-name">
              {profile?.name || user.email}
            </span>{" "}
            님의 계정 정보입니다.
          </p>
        </div>

        <div className="mypage-avatar-row">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="프로필 이미지"
              className="mypage-avatar"
            />
          ) : (
            <div className="mypage-avatar-empty">이미지 없음</div>
          )}

          <div className="mypage-avatar-meta">
            <label className="small-btn mypage-avatar-btn">
              프로필 이미지 변경
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleProfileImageChange}
              />
            </label>
            <p className="mypage-hint">
              정사각형(1:1) 비율 이미지를 사용하는 것을 추천합니다.
            </p>
          </div>
        </div>

        {/* ✅ 계정 관리 영역 - 비밀번호 변경 버튼 */}
        <div className="mypage-account-actions">
          <div className="mypage-account-email">
            <span className="mypage-account-label">이메일</span>
            <span className="mypage-account-value">{user.email}</span>
          </div>
          <Link to="/change-password">
            <button
              type="button"
              className="small-btn mypage-password-btn"
            >
              비밀번호 변경
            </button>
          </Link>
        </div>
      </header>

      {/* 2) 내 돌보미 프로필 */}
      <section className="mypage-section">
        <div className="mypage-section-header">
          <h3>내 돌보미 프로필</h3>
        </div>

        {myCarers.length === 0 ? (
          <p className="mypage-notice">
            아직 등록한 돌보미 프로필이 없습니다.
            <br />
            상단 메뉴의 <b>돌보미로 참여하기</b>에서 첫 프로필을 만들어보세요.
          </p>
        ) : (
          <div className="card-grid">
            {myCarers.map((c) => (
              <article key={c.id} className="care-card">
                <div className="care-card-header">
                  <div>
                    <h2>{c.name}</h2>
                    <p className="care-location">{formatRegion(c)}</p>
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

                <div className="mypage-carer-actions">
                  <Link to={`/carer/edit/${c.id}`}>
                    <button className="small-btn">프로필 수정</button>
                  </Link>
                  <button
                    className="small-btn small-btn-danger"
                    type="button"
                    onClick={() => handleDeleteCarer(c.id)}
                  >
                    삭제하기
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 3) 내가 보낸 예약 목록 */}
      <section className="mypage-section">
        <div className="mypage-section-header">
          <h3>내 예약 내역</h3>
        </div>

        {myBookings.length === 0 ? (
          <p className="mypage-notice">
            아직 보낸 예약 요청이 없습니다.
            <br />
            돌보미 상세 페이지에서 예약을 요청해보세요.
          </p>
        ) : (
          <div className="mypage-booking-list">
            {myBookings.map((b) => {
              const carerInfo = carerMap[b.carer_id];
              const status =
                b.status === "cancelled_by_user"
                  ? "cancelled"
                  : b.status === "requested"
                  ? "requested"
                  : b.status === "accepted"
                  ? "accepted"
                  : b.status || "other";

              const statusLabel =
                status === "cancelled"
                  ? "취소됨"
                  : status === "requested"
                  ? "요청됨"
                  : status === "accepted"
                  ? "수락됨"
                  : b.status || "알 수 없음";

              return (
                <article key={b.id} className="mypage-booking-item">
                  <div className="mypage-booking-header">
                    <div>
                      <div className="mypage-booking-title">
                        {carerInfo?.name || "알 수 없는 돌보미"}
                      </div>
                      <div className="mypage-booking-sub">
                        {formatRegion(carerInfo)}
                      </div>
                    </div>

                    <span
                      className={`mypage-status-badge mypage-status-${status}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mypage-booking-body">
                    <div className="mypage-booking-row">
                      <span className="label">돌봄 기간</span>
                      <span>{makePeriodText(b)}</span>
                    </div>
                    {/* <div className="mypage-booking-row">
                      <span className="label">시작 시간</span>
                      <span>{b.booking_time}</span>
                    </div> */}
                    <div className="mypage-booking-row">
                      <span className="label">반려동물</span>
                      <span>{b.pet_info}</span>
                    </div>
                  </div>

                  <div className="mypage-booking-footer">
                    <Link to={`/mybooking/${b.id}`}>
                      <button className="small-btn" type="button">
                        상세 보기
                      </button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default MyPage;
