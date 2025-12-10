// src/pages/chat/ChatRoom.jsx
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import "./css/ChatRoom.css";

function ChatRoom() {
  const params = useParams();
  const roomId = params.id || params.roomId || params.chatRoomId;

  const { user, authLoading } = useAuth();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [counterpart, setCounterpart] = useState({
    name: "",
    role: "",
    avatarUrl: null,
  });
  const [counterpartLastReadId, setCounterpartLastReadId] = useState(null);

  const bottomRef = useRef(null);

  // 1) 채팅방 정보 + 메시지 + 상대 정보 + 상대 읽음 정보 로딩
  useEffect(() => {
    if (authLoading) return;

    if (!roomId || !user) {
      setLoading(false);
      return;
    }

    const loadRoom = async () => {
      setLoading(true);

      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (roomError || !roomData) {
        console.error(roomError);
        setErrorMsg("채팅방 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      // 권한 체크
      if (roomData.user_id !== user.id && roomData.carer_id !== user.id) {
        setErrorMsg("이 채팅방에 참여할 권한이 없습니다.");
        setLoading(false);
        return;
      }

      setRoom(roomData);

      // ✅ 나와 상대 구분 공통 로직
      const amApplicant = roomData.user_id === user.id; // 내가 위탁자?
      const counterpartUserId = amApplicant ? roomData.carer_id : roomData.user_id;
      const counterpartRole = amApplicant ? "돌보미" : "위탁자";

      try {
        // carers, profiles 둘 다 한 번에 조회
        const [{ data: carerRow, error: carerError }, { data: profileRow, error: profileError }] =
          await Promise.all([
            supabase
              .from("carers")
              .select("name, avatar_url")
              .eq("user_id", counterpartUserId)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("user_id", counterpartUserId)
              .maybeSingle(),
          ]);

        if (carerError) console.error("carer 정보 로딩 오류:", carerError);
        if (profileError) console.error("profile 정보 로딩 오류:", profileError);

        const name =
          carerRow?.name ||
          profileRow?.name ||
          (counterpartRole === "돌보미" ? "돌보미" : "위탁자");

        const avatarUrl = carerRow?.avatar_url || profileRow?.avatar_url || null;

        setCounterpart({
          name,
          role: counterpartRole,
          avatarUrl,
        });

        // 🔹 상대방의 읽음 정보 (chat_reads) 로딩
        if (counterpartUserId) {
          const { data: readRow, error: readError } = await supabase
            .from("chat_reads")
            .select("last_read_message_id")
            .eq("room_id", roomData.id)
            .eq("user_id", counterpartUserId)
            .maybeSingle();

          if (readError) {
            console.error("상대 읽음 정보 로딩 오류:", readError);
          } else if (readRow) {
            setCounterpartLastReadId(readRow.last_read_message_id ?? null);
          }
        }
      } catch (e) {
        console.error("상대 정보/읽음 정보 로딩 중 예외:", e);
      }

      // 🔹 메시지 로딩
      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomData.id)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error(msgError);
        setErrorMsg("메시지를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      setMessages(msgData || []);
      setLoading(false);
    };

    loadRoom();
  }, [roomId, user, authLoading]);

  // 2) 실시간 메시지 구독
  useEffect(() => {
    if (!room || !user) return;

    const channel = supabase
      .channel(`chat-room-${room.id}`)
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

  // 2-1) 실시간 읽음 정보 구독 (상대가 이 방에서 읽음 업데이트할 때)
  useEffect(() => {
    if (!room || !user) return;

    const counterpartUserId =
      room.user_id === user.id ? room.carer_id : room.user_id;

    const channel = supabase
      .channel(`chat-reads-${room.id}-${counterpartUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_reads",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newRow = payload.new;
          if (newRow.user_id === counterpartUserId) {
            setCounterpartLastReadId(newRow.last_read_message_id ?? null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, user]);

  // 3) 내가 이 방을 보고 있다는 읽음 처리 (내 user_id 기준)
  useEffect(() => {
    if (!room || !user) return;
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.id) return;

    supabase
      .from("chat_reads")
      .upsert(
        {
          room_id: room.id,
          user_id: user.id,
          last_read_message_id: lastMsg.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_id,user_id" }
      )
      .then(({ error }) => {
        if (error) console.error("읽음 처리 실패:", error);
        else console.log("읽음 처리 성공:", lastMsg.id);
      });
  }, [messages, room, user]);

  // 4) 스크롤 최신 메시지로 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // 5) 메시지 전송
  const handleSend = async () => {
    if (!input.trim()) return;

    if (!room || !user) {
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

    setInput("");
  };

  // 👀 상대가 읽은 "내 마지막 메시지" id 계산
  let myLastReadMessageId = null;
  if (counterpartLastReadId && messages.length > 0 && user) {
    const myReadMessages = messages.filter(
      (m) => m.sender_id === user.id && m.id <= counterpartLastReadId
    );
    if (myReadMessages.length > 0) {
      myLastReadMessageId = myReadMessages[myReadMessages.length - 1].id;
    }
  }

  // --- 화면 분기 ---
  if (authLoading)
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text">로그인 상태 확인 중…</p>
      </div>
    );

  if (!user)
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text">로그인 후 채팅 이용 가능</p>
      </div>
    );

  if (loading)
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text">채팅을 불러오는 중...</p>
      </div>
    );

  if (errorMsg)
    return (
      <div className="chat-page chat-state">
        <p className="chat-state-text chat-state-error">{errorMsg}</p>
      </div>
    );

  return (
    <div className="chat-page">
      {/* 🔹 상단 상대 정보 헤더 */}
      <header className="chat-header">
        <div className="chat-header-avatar">
          {counterpart.avatarUrl ? (
            <img
              src={counterpart.avatarUrl}
              alt={counterpart.name}
              className="chat-header-avatar-img"
            />
          ) : (
            <span className="chat-header-avatar-text">
              {counterpart.name ? counterpart.name[0] : "?"}
            </span>
          )}
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">
            {counterpart.name || "알 수 없는 사용자"}
          </div>
          <div className="chat-header-role">
            {counterpart.role || ""}
          </div>
        </div>
      </header>

      <div className="chat-body">
        {messages.map((m) => {
          const isMe = m.sender_id === user.id;
          const isLastReadByCounterpart =
            isMe && myLastReadMessageId === m.id;

          return (
            <div
              key={m.id}
              className={`chat-message-row ${isMe ? "me" : "other"}`}
            >
              <div className="chat-bubble">
                <p className="chat-text">{m.message}</p>
                <div className="chat-meta">
                  <span className="chat-time">
                    {new Date(m.created_at).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isLastReadByCounterpart && (
                    <span className="chat-read">읽음</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <footer className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="메시지 입력..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="chat-send-btn" onClick={handleSend}>
          보내기
        </button>
      </footer>
    </div>
  );
}

export default ChatRoom;
