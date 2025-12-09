// src/pages/chat/ChatRoom.jsx
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import "./css/ChatRoom.css";

function ChatRoom() {
  // 라우트 파라미터 이름이 id / roomId / chatRoomId 중 무엇이든 대응
  const params = useParams();
  const roomId = params.id || params.roomId || params.chatRoomId;

  const { user, authLoading } = useAuth();

  const [room, setRoom] = useState(null);       // chat_rooms 정보
  const [messages, setMessages] = useState([]); // chat_messages 목록
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef(null);

  // 1) 채팅방 정보 + 초기 메시지 로딩
  useEffect(() => {
    // 아직 로그인 상태 파악 중이면 아무 것도 하지 않음
    if (authLoading) return;

    // roomId나 user가 아예 없으면 로딩만 계속 돌지 않도록 종료
    if (!roomId || !user) {
      setLoading(false);
      return;
    }

    const loadRoomAndMessages = async () => {
      setLoading(true);
      setErrorMsg("");

      // 1-1. 채팅방 정보 조회
      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (roomError) {
        console.error("채팅방 불러오기 오류:", roomError);
        setErrorMsg("채팅방 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (!roomData) {
        setErrorMsg("존재하지 않는 채팅방입니다.");
        setLoading(false);
        return;
      }

      // 1-2. 권한 체크: 이 방의 user_id 또는 carer_id 인 경우만 입장 가능
      if (roomData.user_id !== user.id && roomData.carer_id !== user.id) {
        setErrorMsg("이 채팅방에 참여할 권한이 없습니다.");
        setLoading(false);
        return;
      }

      setRoom(roomData);

      // 1-3. 메시지 로딩 (room_id 기준)
      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomData.id)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("메시지 불러오기 오류:", msgError);
        setErrorMsg("채팅 메시지를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      setMessages(msgData || []);
      setLoading(false);
    };

    loadRoomAndMessages();
  }, [roomId, user, authLoading]);

  // 2) Supabase Realtime 구독 (room_id 기준)
  useEffect(() => {
    if (!room || !user) return;

    const channel = supabase
      .channel(`chat_messages-room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, user]);

  // 3) 스크롤 항상 아래로
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // 4) 메시지 전송
  const handleSend = async () => {
    if (!input.trim()) return;
    if (!user) {
      alert("로그인 후 이용해주세요.");
      return;
    }
    if (!room) {
      alert("채팅방 정보를 불러오지 못했습니다.");
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender_id: user.id,
      message: input.trim(),
    });

    if (error) {
      console.error(error);
      alert("메시지 전송 중 오류가 발생했습니다.");
      return;
    }

    // ❌ setMessages(...) 절대 넣지 않기 (중복 발생 원인)
    setInput(""); 
  };



  // 5) 화면 분기 처리

  // 아직 로그인 상태 파악 중
  if (authLoading) {
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  // 로그인 안 된 경우
  if (!user) {
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text">채팅은 로그인 후 이용할 수 있어요.</p>
      </div>
    );
  }

  // URL이 잘못된 경우 (roomId 없음)
  if (!roomId) {
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text chat-state-error">
          유효하지 않은 채팅방 주소입니다.
        </p>
      </div>
    );
  }

  // 방/메시지 로딩 중
  if (loading) {
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text">채팅을 불러오는 중입니다...</p>
      </div>
    );
  }

  // 로딩은 끝났는데 에러가 있는 경우
  if (errorMsg) {
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text chat-state-error">{errorMsg}</p>
      </div>
    );
  }

  // 정상 렌더링
  return (
    <div className="chat-page">
      {/* 상단 헤더 */}
      <header className="chat-header">
        <h1>채팅</h1>
        <p className="chat-sub">예약에 대해 돌보미와 대화해보세요.</p>
      </header>

      {/* 메시지 영역 */}
      <div className="chat-body">
        {messages.length === 0 && (
          <div className="chat-empty">
            아직 메시지가 없습니다. 첫 메시지를 보내보세요!
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.sender_id === user.id;
          return (
            <div
              key={m.id}
              className={`chat-message-row ${isMe ? "me" : "other"}`}
            >
              <div className="chat-bubble">
                <p className="chat-text">{m.message}</p>
                <span className="chat-time">
                  {new Date(m.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <footer className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button className="chat-send-btn" type="button" onClick={handleSend}>
          보내기
        </button>
      </footer>
    </div>
  );
}

export default ChatRoom;
