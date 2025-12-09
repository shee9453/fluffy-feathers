// src/pages/chat/ChatList.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import "./css/ChatList.css";

function ChatList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadRooms = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .or(`user_id.eq.${user.id},carer_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoadError("채팅방을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      setRooms(data || []);
      setLoading(false);
    };

    loadRooms();
  }, [user]);

  if (!user) {
    return (
      <div className="detail-page chat-list-page">
        <p className="chat-list-state-text">로그인 후 채팅을 이용할 수 있어요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="detail-page chat-list-page">
        <p className="chat-list-state-text">채팅방을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="detail-page chat-list-page">
        <p className="chat-list-state-text chat-list-state-error">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="detail-page chat-list-page">
      <header className="chat-list-header">
        <h1>메시지</h1>
        <p className="chat-list-sub">
          돌보미와 1:1로 대화할 수 있어요.
        </p>
      </header>

      {rooms.length === 0 ? (
        <div className="detail-box chat-list-empty">
          <p>아직 시작된 대화가 없어요.</p>
          <p className="chat-list-empty-sub">
            돌보미 상세 페이지에서 <strong>채팅하기</strong> 버튼을 눌러
            대화를 시작해보세요.
          </p>
        </div>
      ) : (
        <div className="detail-box chat-list-box">
          <ul className="chat-list">
            {rooms.map((room) => {
              const isUser = room.user_id === user.id;
              const counterpartLabel = isUser
                ? "돌보미와의 대화"
                : "위탁자와의 대화";

              const lastTime = room.last_message_at
                ? new Date(room.last_message_at).toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              const initials = counterpartLabel[0];

              return (
                <li key={room.id}>
                  <Link to={`/chat/${room.id}`} className="chat-list-item">
                    <div className="chat-avatar">
                      <span className="chat-avatar-text">{initials}</span>
                    </div>
                    <div className="chat-list-main">
                      <div className="chat-list-top-row">
                        <span className="chat-list-name">
                          {counterpartLabel}
                        </span>
                        {lastTime && (
                          <span className="chat-list-time">{lastTime}</span>
                        )}
                      </div>
                      <div className="chat-list-bottom-row">
                        <span className="chat-list-preview">
                          {room.last_message || "새 대화를 시작해보세요."}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ChatList;
