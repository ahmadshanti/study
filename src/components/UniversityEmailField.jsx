export const EMAIL_PREFIX = "s";
export const EMAIL_DOMAIN = "@stu.najah.edu";

export function buildUniversityEmail(studentId) {
  return `${EMAIL_PREFIX}${studentId}${EMAIL_DOMAIN}`;
}

/**
 * حقل إيميل مبسّط للطالب: بس يكتب رقمه الجامعي، والباقي (s + @stu.najah.edu)
 * ثابت وما بيحتاج يكتبه.
 */
export default function UniversityEmailField({ studentId, onChange }) {
  return (
    <div className="field">
      <label>الإيميل الجامعي</label>
      <div className="email-compound">
        <span className="email-affix">{EMAIL_PREFIX}</span>
        <input
          type="text"
          inputMode="numeric"
          required
          value={studentId}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder="12345678"
          autoFocus
        />
        <span className="email-affix">{EMAIL_DOMAIN}</span>
      </div>
    </div>
  );
}
