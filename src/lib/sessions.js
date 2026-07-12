import { db, MIN_SESSION_MINUTES } from "./firebase.js";
import {
  doc, setDoc, deleteDoc, updateDoc, getDoc,
  collection, addDoc, serverTimestamp, increment,
  writeBatch,
} from "firebase/firestore";

/**
 * بيبلش جلسة: بيسجل الطالب بـ activeUsers (يظهر Live لباقي الطلاب)
 */
export async function startActiveSession({ uid, name, task, subjectId, subjectName, roomId }) {
  const ref = doc(db, "activeUsers", uid);
  await setDoc(ref, {
    name,
    task: task || null,
    subjectId: subjectId || null,
    subjectName: subjectName || null,
    roomId: roomId || null,
    startTime: serverTimestamp(),
    startedAtClient: Date.now(), // نستخدمها لحساب الوقت المحلي بسرعة بدون انتظار السيرفر
  });
}

/**
 * بينهي الجلسة: بيمسحها من activeUsers، وبيحسب الدقايق الفعلية،
 * وبيحدث: users.totalMinutes دايماً، subject leaderboard إذا فيه مادة،
 * room members + room total إذا فيه غرفة، ويحفظ سجل الجلسة بـ sessions.
 */
export async function endActiveSession({ uid, name, task, subjectId, subjectName, roomId, elapsedMinutes }) {
  const minutes = Math.max(0, Math.round(elapsedMinutes));

  // نمسح النشاط الحي دايماً (حتى لو الجلسة قصيرة)
  await deleteDoc(doc(db, "activeUsers", uid));

  if (minutes < MIN_SESSION_MINUTES) return { savedMinutes: 0 };

  const batch = writeBatch(db);

  // 1) المجموع العام للطالب
  const userRef = doc(db, "users", uid);
  batch.update(userRef, { totalMinutes: increment(minutes) });

  // 2) ليدربورد المادة (فقط إذا اختار مادة تنافسية من قائمة الأدمن)
  if (subjectId) {
    const subjLbRef = doc(db, "leaderboard_subject", subjectId, "students", uid);
    batch.set(subjLbRef, {
      name,
      totalMinutes: increment(minutes),
    }, { merge: true });
  }

  // 3) الغرفة (فريق) — مساهمة الطالب + مجموع الفريق الكلي
  if (roomId) {
    const memberRef = doc(db, "rooms", roomId, "members", uid);
    batch.set(memberRef, {
      name,
      totalMinutes: increment(minutes),
    }, { merge: true });

    const roomRef = doc(db, "rooms", roomId);
    batch.update(roomRef, { totalMinutes: increment(minutes) });
  }

  await batch.commit();

  // 4) سجل الجلسة (تاريخ الاستخدام - مفيد لاحقاً لتقارير أسبوعية)
  await addDoc(collection(db, "users", uid, "sessions"), {
    task: task || null,
    subjectId: subjectId || null,
    subjectName: subjectName || null,
    roomId: roomId || null,
    minutes,
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    createdAt: serverTimestamp(),
  });

  // 5) الستريك والبادجز
  await updateStreakAndBadges(uid, minutes);

  return { savedMinutes: minutes };
}

/**
 * يحدث الـ streak (أيام متتالية) والبادجز البسيطة بعد كل جلسة محفوظة.
 */
async function updateStreakAndBadges(uid, minutesJustStudied) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const today = new Date().toISOString().slice(0, 10);
  const last = data.lastStudyDate;

  let newStreak = data.currentStreak || 0;

  if (last === today) {
    // درس اليوم قبل هيك، الستريك ما بتتغير
  } else if (isYesterday(last, today)) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  const updates = {
    lastStudyDate: today,
    currentStreak: newStreak,
  };

  const badges = new Set(data.badges || []);

  if (newStreak >= 7) badges.add("streak_7");
  if (newStreak >= 30) badges.add("streak_30");

  const totalAfter = (data.totalMinutes || 0) + minutesJustStudied;
  if (totalAfter >= 600) badges.add("total_10h"); // 10 ساعات تراكمي
  if (minutesJustStudied >= 120) badges.add("deep_focus_2h"); // جلسة واحدة ≥ ساعتين

  updates.badges = Array.from(badges);

  await updateDoc(userRef, updates);
}

function isYesterday(lastDateStr, todayStr) {
  if (!lastDateStr) return false;
  const last = new Date(lastDateStr);
  const today = new Date(todayStr);
  const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

export const BADGE_LABELS = {
  streak_7: "🔥 أسبوع كامل",
  streak_30: "🏅 شهر كامل",
  total_10h: "📚 10 ساعات تراكمي",
  deep_focus_2h: "🎯 جلسة تركيز ساعتين+",
};
