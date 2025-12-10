import { Link } from "react-router-dom";
import "../pages/css/Home.css";
// import LogoImage from "../assets/logo-main.png";

function Home() {
  return (
    <div className="home">
      {/* 상단 히어로 섹션 */}
      <section className="hero-section">
        <div className="hero-text">
          <p className="hero-badge">앵무새전용 위탁 플랫폼</p>

          <h1 className="hero-title">
            잠시 떨어져도,
            <br />
            <span className="highlight">마음은 안심할 수 있게.</span>
          </h1>

          <p className="hero-desc">
            {/* 앵무새, 토끼, 햄스터, 고슴도치까지. */}
            <br className="hero-br-mobile" />
            믿을 수 있는 돌보미와 1:1로 매칭해 드려요.
          </p>

          {/* 좌측 버튼들 */}
          <div className="hero-actions">
            <Link to="/list" className="primary-btn">
              돌봄 맡길 곳 찾기
            </Link>
            <Link to="/apply" className="secondary-btn">
              돌보미로 참여하기
            </Link>
          </div>

          {/* <p className="hero-note">
            지금은 데모 버전이에요 · 실제 서비스로 확장 예정 ✨
          </p> */}
        </div>

        {/* 오른쪽 영역 — 버튼만 정갈하게 배치한 CTA 구역 */}
        {/* <div className="hero-illustration">
          <div className="cta-box">
            <h2 className="cta-title">지금 바로 시작해보세요</h2>

            <div className="cta-actions">
              <Link to="/list" className="primary-btn cta-btn">
                돌봄 찾기
              </Link>
              <Link to="/apply" className="secondary-btn cta-btn">
                돌보미 참여
              </Link>
            </div>
          </div>
        </div> */}
      </section>

      {/* 3단계 이용 섹션 */}
      <section className="feature-section">
        <h2>Fluffy & Feathers, 이렇게 이용해요</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>1. 우리 아이 정보 입력</h3>
            <p>
              동물 종류, 성격, 특이사항을 간단히 알려주면
              <br />
              맞는 돌보미를 찾기 쉬워져요.
            </p>
          </div>

          <div className="feature-card">
            <h3>2. 돌보미 프로필 비교</h3>
            <p>
              돌봄 환경, 경험, 케어 가능 범위를 확인하고
              <br />
              집사 마음에 드는 돌보미를 고를 수 있어요.
            </p>
          </div>

          <div className="feature-card">
            <h3>3. 예약 · 위탁 시작</h3>
            <p>
              일정과 요금만 확인하면 바로 예약 가능,
              <br />
              약속한 날에 우리 아이를 맡기면 끝이에요.
            </p>
          </div>
        </div>
      </section>

      {/* 서비스 강점 섹션 */}
      <section className="feature-section">
        <h2>Fluffy & Feathers가 신경쓰는 것</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>앵무새 특화</h3>
            <p>
              강아지·고양이 중심이 아닌,
              <br />
              반려조 위주로 설계한 위탁 플랫폼이에요.
            </p>
          </div>

          <div className="feature-card">
            <h3>집사 경험 기반 케어</h3>
            <p>
              실제 반려 경험이 있는 돌보미 중심으로 구성하여,
              <br />
              온도·습도·급여 루틴까지 신경 써요.
            </p>
          </div>

          <div className="feature-card">
            <h3>후기·이력 기반 안심 매칭</h3>
            <p>
              돌봄 후기와 위탁 경험을 토대로,
              <br />
              우리 아이에게 맞는 돌보미를 선택할 수 있어요.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
