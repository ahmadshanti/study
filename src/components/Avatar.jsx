// أفاتار ملون — كل اسم بيطلعله لون ثابت خاص فيه (مشتق من حروف الاسم)
// عشان القوائم تصير أحيَى وأسهل تمييز بدل ما الكل نفس الدائرة الذهبية.

const PALETTE = [
  ["#c9973f", "#8f6420"], // ذهبي
  ["#3f9c6b", "#256844"], // أخضر
  ["#c0603c", "#8a3f24"], // طوبي
  ["#5f74c2", "#3d4f92"], // أزرق بنفسجي
  ["#3f8fb0", "#276381"], // أزرق بترولي
  ["#b0527f", "#7e3459"], // وردي غامق
  ["#7d9440", "#566a28"], // زيتوني
  ["#8a62b5", "#5f4088"], // بنفسجي
];

function paletteFor(name) {
  let hash = 0;
  for (const ch of String(name || "؟")) {
    hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({ name, size = 36, className = "" }) {
  const [from, to] = paletteFor(name);
  const initial = (name || "؟").trim().slice(0, 1);
  return (
    <div
      className={`avatar-circle ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(155deg, ${from}, ${to})`,
      }}
    >
      {initial}
    </div>
  );
}
