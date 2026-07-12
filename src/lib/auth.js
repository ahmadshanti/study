import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// تسجيل دخول حقيقي بإيميل + باسورد (بدل الـ Anonymous Auth القديم).
// بينشئ مستند users/{uid} أول مرة بنفس الشكل يلي بتعتمد عليه sessions.js
// وصفحات الليدربورد.

export async function signUp({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    totalMinutes: 0,
    currentStreak: 0,
    lastStudyDate: null,
    badges: [],
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function logIn({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export function logOut() {
  return signOut(auth);
}
