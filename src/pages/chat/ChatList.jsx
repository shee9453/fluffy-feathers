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

  const loadRooms = async () => {
    if (!user) return;

    setLoading(true);

    const { data: roomRows, error: roomError } = await supabase
      .from("chat_rooms")
      .select("*")
      .or(`user_id.eq.${user.id},carer_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (roomError) {
      console.error("chat_rooms 로딩 오류:", roomError);
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomsWithMeta = await Promise.all(
      (roomRows || []).map(async (room) => {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("id, message, sender_id, created_at")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: readInfo } = await supabase
          .from("chat_reads")
          .select("last_read_message_id")
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .maybeSingle();

        // 상대 이름 가져오기
        let counterpartName = "";
        let counterpartRole = "";

        if (room.user_id === user.id) {
          counterpartRole = "돌보미";
          const { data: carerRow } = await supabase
            .from("carers")
            .select("name")
            .eq("user_id", room.carer_id)
            .maybeSingle();
          counterpartName = carerRow?.name || "돌보미";
        } else {
          counterpartRole = "위탁자";
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", room.user_id)
            .maybeSingle();
          counterpartName = profileRow?.name || "위탁자";
        }

        const counterpartLabel = `${counterpartName} (${counterpartRole})와의 대화`;

        return {
          ...room,
          _lastMsg: lastMsg || null,
          _readInfo: readInfo || null,
          _counterLabel: counterpartLabel,
        };
      })
    );

    setRooms(roomsWithMeta);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadRooms();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const newMsg = payload.new;

          const { data: roomData } = await supabase
            .from("chat_rooms")
            .select("user_id, carer_id")
            .eq("id", newMsg.room_id)
            .maybeSingle();

          if (!roomData) return;

          const amIParticipant =
            roomData.user_id === user.id || roomData.carer_id === user.id;

          if (amIParticipant) loadRooms();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const isUnread = (room) => {
    const lastMsg = room._lastMsg;
    const readInfo = room._readInfo;

    if (!lastMsg) return false;
    if (lastMsg.sender_id === user.id) return false;

    const lastReadId = readInfo?.last_read_message_id ?? 0;
    return lastMsg.id > lastReadId;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  if (!user) return <p className="chat-list-state-text">로그인 후 이용해주세요.</p>;
  if (loading) return <p className="chat-list-state-text">채팅방 불러오는 중…</p>;

  return (
    <div className="detail-page chat-list-page">
      <ul className="chat-list">
        {rooms.map((room) => {
          const lastMsg = room._lastMsg;
          const unread = isUnread(room);
          const lastTime = lastMsg ? formatTime(lastMsg.created_at) : "";

          return (
            <li key={room.id}>
              <Link to={`/chat/${room.id}`} className="chat-list-item">
                <div className="chat-avatar">💬</div>

                <div className="chat-list-main">
                  <div className="chat-list-top-row">
                    <span className="chat-list-name">{room._counterLabel}</span>

                    {/* 🔥 마지막 메시지 시간 표시 */}
                    <span className="chat-list-time">{lastTime}</span>

                    {unread && <span className="chat-unread-dot"></span>}
                  </div>

                  <span className="chat-list-preview">
                    {lastMsg?.message || "새 대화를 시작해보세요."}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ChatList;
