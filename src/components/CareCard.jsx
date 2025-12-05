import { Link } from "react-router-dom";

function CareCard({ carer }) {
  return (
    <article className="care-card">
      {/* 헤더 */}
      <div className="care-card-header">
        <div>
          <h2>{carer.name}</h2>
          <p className="care-location">{carer.location}</p>
        </div>
        <span className="care-badge">{carer.badge}</span>
      </div>

      {/* 동물 태그 */}
      <div className="care-animals">
        {carer.animals.map((a) => (
          <span className="care-tag" key={a}>
            {a}
          </span>
        ))}
      </div>

      {/* 소개 */}
      <p className="care-experience">{carer.experience}</p>
      <p className="care-note">{carer.note}</p>

      {/* 푸터 */}
      <div className="care-footer">
        <span className="care-price">{carer.price}</span>

        <Link to={`/detail/${carer.id}`}>
          <button className="small-btn">상세 보기</button>
        </Link>
      </div>
    </article>
  );
}

export default CareCard;
