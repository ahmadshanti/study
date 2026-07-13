import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { getRoom } from "../lib/rooms.js";
import LeaderboardRows from "../components/LeaderboardRows.jsx";
import LiveList from "../components/LiveList.jsx";
import { UsersIcon, TrophyIcon, BookIcon } from "../components/icons.jsx";

export default function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(undefined); // undefined = لسا عم يحمّل، null = مش موجودة
  const [members, setMembers] = useState([]);
  const [liveDocs, setLiveDocs] = useState([]);

  useEffect(() => {
    (async () => setRoom(await getRoom(roomId)))();
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomId, "members"), orderBy("totalMinutes", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "activeUsers"), where("roomId", "==", roomId));
    const unsub = onSnapshot(q, (snap) => {
      setLiveDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  if (room === undefined) return null;

  if (room === null) {
    return (
      <div className="container">
        <div className="card">
          <h3>ما لقينا هاي الغرفة</h3>
          <p className="muted">تأكد من الكود، أو ارجع للتايمر.</p>
          <Link to="/" className="btn btn-primary">رجوع للتايمر</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="grid-2">
        <div>
          <div className="card">
            <h2>{room.name}</h2>
            {room.topic && (
              <p className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BookIcon width={13} height={13} /> {room.topic}
              </p>
            )}
            <div className="status-chip">
              <UsersIcon /> ليدر الغرفة: {room.createdByName || "غير معروف"}
            </div>
            <Link to="/" className="btn">رجوع للتايمر</Link>
          </div>

          <div className="card">
            <div className="section-title">
              <h3 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="dot"></span> شغالين هلق بالغرفة
              </h3>
            </div>
            <LiveList docs={liveDocs} />
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
              <TrophyIcon width={18} height={18} style={{ color: "var(--accent)" }} /> مين أنجز أكتر بالغرفة
            </h3>
            <LeaderboardRows items={members} />
          </div>
        </div>
      </div>
    </div>
  );
}
