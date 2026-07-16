// ==========================================================================
// إعدادات Firebase
// روح على console.firebase.google.com > مشروعك > Project settings
// > Your apps > SDK setup and configuration، وانسخ القيم هون
// ==========================================================================

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVKGeIGbxJ1DqDyqdsDvLnYG43foRuRgc",
  authDomain: "stud-55b5d.firebaseapp.com",
  projectId: "stud-55b5d",
  storageBucket: "stud-55b5d.firebasestorage.app",
  messagingSenderId: "702248675410",
  appId: "1:702248675410:web:11dd9223ab1f79a8cbd78b",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// حد أدنى للجلسة حتى تنحسب (بالدقائق) — أي جلسة أقصر من هيك ما بتنضاف للمجاميع
export const MIN_SESSION_MINUTES = 1;

// كل قديه (بالثواني) لازم الطالب يثبت إنه لسا موجود (anti-cheat prompt)
export const ANTI_CHEAT_INTERVAL_SECONDS = 600; // كل 10 دقايق
export const ANTI_CHEAT_RESPONSE_WINDOW_SECONDS = 45; // عنده 45 ثانية يجاوب

// كل قديه (بالثواني) بنرفع الدقايق المنجزة للليدربورد أثناء الجلسة —
// عشان تقدم الطالب يظهر قدام الكل أول بأول مش بس بآخر الشوط
export const LEADERBOARD_FLUSH_SECONDS = 300; // كل 5 دقايق
