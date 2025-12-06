import { Link } from "react-router-dom";
import "../pages/css/Home.css";
import LogoImage from "../assets/logo-main.png"; // ← 새 로고 이미지 추가

function Home() {
  return (
    <div className="home">

      {/* 상단 히어로 섹션 */}
      <section className="hero-section">
        <div className="hero-text">
          <p className="hero-badge">소동물 · 앵무새 전용</p>
          <h1 className="hero-title">
            우리 <span className="highlight">작은 친구들</span>을
            <br />
            믿을 수 있는 돌보미에게.
          </h1>

          <p className="hero-desc">
            햄스터, 토끼, 고슴도치, 앵무새까지.
            <br className="hero-br-mobile" />
            집을 비워야 할 때, 걱정 대신 안심을 맡겨보세요.
          </p>

          <p className="seo-text">
            Fluffy & Feathers는 앵무새 위탁, 햄스터 위탁, 소동물 돌봄 서비스를 제공하는 플랫폼입니다.
            <br className="hero-br-mobile" />
            앵무새, 토끼, 파충류 등 다양한 반려동물 위탁 돌보미를 찾을 수 있습니다.
          </p>

          <div className="hero-actions">
            <Link to="/list" className="primary-btn">돌봄 찾으러 가기</Link>
            <Link to="/apply" className="secondary-btn">돌보미로 참여하기</Link>
          </div>

          <p className="hero-note">
            지금은 데모 버전이에요 · 실제 서비스로 확장 예정 ✨
          </p>
        </div>

        {/* 오른쪽 일러스트 → 로고로 교체 */}
        <div className="hero-illustration">
          <div className="logo-wrapper">
            <img
              src={LogoImage}
              alt="Fluffy & Feathers 로고"
              className="hero-logo-img"
            />
          </div>

          <p className="hero-subtext">
            Fluffy & Feathers와 함께
            <br />
            소중한 친구들을 맡길 수 있는 돌보미를 만나보세요.
          </p>
        </div>
      </section>

      {/* 하단 하이라이트 섹션 */}
      <section className="feature-section">
        <h2>Fluffy & Feathers는 이렇게 달라요</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>소동물 · 앵무새 전문</h3>
            <p>
              강아지, 고양이 중심이 아닌
              <br />
              소동물과 반려조에 특화된 돌봄 매칭 서비스예요.
            </p>
          </div>

          <div className="feature-card">
            <h3>집사 마음을 아는 케어</h3>
            <p>
              실제 집사 경험을 가진 돌보미 중심으로,
              <br />
              습도·온도·먹이까지 꼼꼼한 케어를 지향해요.
            </p>
          </div>

          <div className="feature-card">
            <h3>안심 기반 추천</h3>
            <p>
              후기, 돌봄 이력, 동물종 경험 등을 바탕으로
              <br />
              우리 아이에게 맞는 돌보미를 고를 수 있게 설계할 거예요.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;
