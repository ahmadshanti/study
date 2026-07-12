# Study Pulse — مؤقت الدراسة الجماعي

موقع React (Vite) لطلاب كلية تكنولوجيا المعلومات والذكاء الاصطناعي، يخليهم يدرسوا
مع بعض بشكل Live وقت الميدترمات. تسجيل الدخول بإيميل + باسورد حقيقي (Firebase Auth).

## الفيتشرز
- تايمر دراسة شخصي، يظهر Live لباقي الطلاب وقت ما يكون شغال
- ليدربورد عام (كل الطلاب)
- ليدربورد لكل مادة تنافسية لحالها (الأدمن بيحدد المواد المتاحة)
- غرف دراسة (Teams) بباسورد بسيط — سكور خاص بالفريق + مساهمة كل عضو
- Streaks (أيام متتالية) وبادجز بسيطة
- Anti-cheat بسيط: تأكيد دوري + رصد تبديل التاب

## خطوات الإعداد

### 1. أنشئ مشروع Firebase
1. روح [console.firebase.google.com](https://console.firebase.google.com) وأنشئ مشروع جديد
2. من القائمة الجانبية: **Build → Firestore Database** → أنشئ قاعدة بيانات (ابدأ بـ production mode)
3. من **Build → Authentication → Sign-in method** → فعّل **Email/Password**
4. من **Project settings → Your apps** → أضف تطبيق ويب (</> icon) وانسخ الـ config

### 2. حط الإعدادات
افتح `src/lib/firebase.js` وبدّل قيم `firebaseConfig` بالقيم يلي نسختها.

### 3. ارفع قواعد الأمان
من Firebase Console → Firestore Database → Rules، انسخ محتوى ملف
`firestore.rules` والصقه، ثم Publish.

(القواعد فيها ملاحظة عن `subjects` — مبسطة الآن، تقدر تحسنها لاحقاً بـ custom claims
لو بدك تمنع أي حدا غير الأدمن من التعديل من الـ console مباشرة.)

### 4. حط اللوجو
حط ملف اللوجو (PNG) بالمسار `public/assets/img/logo.png` — رح يظهر تلقائياً بالـ Topbar.

### 5. شغّل الموقع
```bash
npm install
npm run dev
```
بعدها افتح الرابط يلي بيظهر (عادة `http://localhost:5173`).

### 6. انشره
```bash
npm run build      # بينتج فولدر dist/
```
انشر فولدر `dist/` (مش المشروع كامل) على **Firebase Hosting** أو **Vercel**. بما إنه
صار SPA (React Router)، لازم rewrite rule يوجّه كل المسارات لـ `index.html` — موجود
جاهز بملف `firebase.json` لو استخدمت Firebase Hosting (`firebase deploy` بعد
`firebase init hosting`). لو Vercel، الإعداد التلقائي بيتعرف على Vite عادةً.

### 7. غيّر باسورد الأدمن
افتح `src/pages/AdminPage.jsx` وبدّل `ADMIN_PASSWORD` لباسورد خاص فيك قبل ما تنشر.

## هيكلية الملفات
```
index.html                        → Vite entry (شل فاضي + <div id="root">)
public/assets/img/logo.png        → لوجو حركة الشبيبة الطلابية
src/main.jsx                      → نقطة الدخول (Router + AuthProvider)
src/App.jsx                       → تعريف الراوتس
src/style.css                     → كل التصميم
src/lib/firebase.js               → إعدادات Firebase
src/lib/auth.js                   → signUp / logIn / logOut (إيميل + باسورد)
src/lib/sessions.js               → بدء/إنهاء الجلسات + الستريك والبادجز
src/lib/rooms.js                  → إنشاء/الانضمام للغرف
src/context/AuthContext.jsx       → useAuth() (المستخدم الحالي + مستنده بـ Firestore)
src/components/                   → Topbar, RoomModal, AntiCheatOverlay, Dial, LiveList...
src/pages/                        → LoginPage, SignupPage, TimerPage, LeaderboardPage, AdminPage
firestore.rules
firebase.json                     → SPA rewrite لو نشرت بـ Firebase Hosting
```

## ملاحظات مهمة قبل الإطلاق
- التايمر بيحسب محلياً بالمتصفح، وبيكتب لـ Firestore بس عند البداية والنهاية —
  هيك ما منستهلك الكوتا المجانية بسرعة حتى لو كان عدد الطلاب كبير.
- الحد الأدنى للجلسة حتى تنحسب هو دقيقة وحدة (`MIN_SESSION_MINUTES` بملف
  `src/lib/firebase.js`)، غيّرها إذا بدك.
- تسجيل الدخول صار بإيميل + باسورد حقيقي (Firebase Auth) — كل طالب بعمل حساب مرة
  وحدة وبيرجع يسجل دخول من أي جهاز/متصفح، بدون الاعتماد على localStorage زي قبل.
