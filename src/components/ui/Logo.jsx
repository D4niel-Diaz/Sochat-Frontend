import { Link } from "react-router-dom";

export const LogoMark = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path
      fill="#12302F"
      d="M16 3C8.8 3 3 8.2 3 14.6c0 3.6 1.8 6.8 4.7 8.9L6.5 29l6.2-3.3c1 .2 2.1.3 3.3.3 7.2 0 13-5.2 13-11.4S23.2 3 16 3Z"
    />
    <circle cx="10.5" cy="14.8" r="2" fill="#F5C443" />
    <circle cx="16" cy="14.8" r="2" fill="#F5C443" />
    <circle cx="21.5" cy="14.8" r="2" fill="#F5C443" />
  </svg>
);

const Logo = ({ to = "/" }) => (
  <Link to={to} className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full text-ink">
    <LogoMark />
    <span className="st-display text-[22px] font-bold">SoTalk</span>
  </Link>
);

export default Logo;
