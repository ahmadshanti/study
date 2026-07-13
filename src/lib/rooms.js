import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";

// ملاحظة أمان بسيطة: الباسورد متخزن كنص عادي بمستند الغرفة (مو الأنسب لبيانات حساسة،
// لكن مقبول هون لأنه بس باسورد دخول لغرفة دراسة بين أصحاب، مش بيانات شخصية حرجة.

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^؀-ۿa-z0-9-]/g, "");
}

/**
 * ينشئ غرفة جديدة بباسورد وموضوع دراسة اختياري. لو الاسم مأخوذ رح يرجع خطأ.
 */
export async function createRoom({ name, topic, password, uid, creatorName }) {
  const roomId = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
  const roomRef = doc(db, "rooms", roomId);
  await setDoc(roomRef, {
    name: name.trim(),
    topic: topic ? topic.trim() : null,
    password, // نص عادي — بسيط بقصد
    createdBy: uid,
    createdByName: creatorName || null,
    totalMinutes: 0,
    createdAt: serverTimestamp(),
  });
  return roomId;
}

/**
 * ينضم لغرفة موجودة بالتحقق من الباسورد.
 */
export async function joinRoom({ roomId, password }) {
  const roomRef = doc(db, "rooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("ما في غرفة بهاد الاسم");
  const data = snap.data();
  if (data.password !== password) throw new Error("الباسورد غلط");
  return { roomId, ...data };
}

export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, "rooms", roomId));
  return snap.exists() ? { roomId, ...snap.data() } : null;
}
