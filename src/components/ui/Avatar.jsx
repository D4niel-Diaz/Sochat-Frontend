const FILL = { me: "#F5C443", stranger: "#F29E7D", plain: "#FFFFFF" };

/** Rounded-square face. `tone`: me (pili) | stranger (coral) | plain. */
const Avatar = ({ tone = "stranger", size = 40, online = false, faded = false, className = "" }) => (
  <span
    className={`relative inline-flex shrink-0 ${faded ? "opacity-45" : ""} ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg width={size} height={size} viewBox="0 0 40 40" focusable="false">
      <rect width="40" height="40" rx="13" fill={FILL[tone]} />
      <circle cx="14.5" cy="17" r="2.4" fill="#12302F" />
      <circle cx="25.5" cy="17" r="2.4" fill="#12302F" />
      <path d="M15.5 24.5c2.6 2.4 6.4 2.4 9 0" fill="none" stroke="#12302F" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
    {online && (
      <span
        className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white bg-online"
        style={{ width: 12, height: 12 }}
      />
    )}
  </span>
);

export default Avatar;
