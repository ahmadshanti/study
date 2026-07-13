import { db, MIN_SESSION_MINUTES } from "./firebase.js";
import {
  doc, setDoc, deleteDoc, updateDoc, getDoc,
  collection, addDoc, serverTimestamp, increment,
  writeBatch,
} from "firebase/firestore";

function pad(n) { return String(n).padStart(2, "0"); }

export function getDayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function getWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(weekNo)}`;
}

/**
 * بيبلش جلسة: بيسجل الطالب بـ activeUsers (يظهر Live لباقي الطلاب).
 * بتنعمل مرة وحدة بداية كل جلسة بومودورو (مش كل شوط عمل).
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
    startedAtClient: Date.now(),
  });
}

export async function clearActiveSession(uid) {
  await deleteDoc(doc(db, "activeUsers", uid));
}

/**
 * بتسجل دقايق درس فعلية (شوط عمل خلص أو انوقف بنص الطريق) وبتحدث:
 * users.totalMinutes، ليدربورد المادة/الغرفة إذا فيها، ليدربورد اليوم/الأسبوع/الشهر،
 * سجل الجلسة، والستريك والبادجز. بتنعاد استدعاءها كل ما يخلص شوط عمل (work segment)
 * وليس بس مرة وحدة بآخر الجلسة، عشان الوقت "يتجدد" على الليدربورد أول بأول.
 */
export async function recordStudyMinutes({ uid, name, task, subjectId, subjectName, roomId, minutes }) {
  const mins = Math.max(0, Math.round(minutes));
  if (mins < MIN_SESSION_MINUTES) return { savedMinutes: 0 };

  const batch = writeBatch(db);

  const userRef = doc(db, "users", uid);
  batch.update(userRef, { totalMinutes: increment(mins) });

  if (subjectId) {
    const subjLbRef = doc(db, "leaderboard_subject", subjectId, "students", uid);
    batch.set(subjLbRef, { name, totalMinutes: increment(mins) }, { merge: true });
  }

  if (roomId) {
    const memberRef = doc(db, "rooms", roomId, "members", uid);
    batch.set(memberRef, { name, totalMinutes: increment(mins) }, { merge: true });

    const roomRef = doc(db, "rooms", roomId);
    batch.update(roomRef, { totalMinutes: increment(mins) });
  }

  const dayRef = doc(db, "leaderboard_daily", getDayKey(), "students", uid);
  batch.set(dayRef, { name, totalMinutes: increment(mins) }, { merge: true });

  const weekRef = doc(db, "leaderboard_weekly", getWeekKey(), "students", uid);
  batch.set(weekRef, { name, totalMinutes: increment(mins) }, { merge: true });

  const monthRef = doc(db, "leaderboard_monthly", getMonthKey(), "students", uid);
  batch.set(monthRef, { name, totalMinutes: increment(mins) }, { merge: true });

  await batch.commit();

  await addDoc(collection(db, "users", uid, "sessions"), {
    task: task || null,
    subjectId: subjectId || null,
    subjectName: subjectName || null,
    roomId: roomId || null,
    minutes: mins,
    date: getDayKey(),
    createdAt: serverTimestamp(),
  });

  await updateStreakAndBadges(uid, mins);

  return { savedMinutes: mins };
}

/**
 * يحدث الـ streak (أيام متتالية) والبادجز البسيطة بعد كل شوط درس محسوب.
 */
async function updateStreakAndBadges(uid, minutesJustStudied) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const today = getDayKey();
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
  if (totalAfter >= 600) badges.add("total_10h");
  if (minutesJustStudied >= 120) badges.add("deep_focus_2h");

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
