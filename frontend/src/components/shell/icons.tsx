
type P = { size?: number };

export function AwsLogo({ height = 22 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 50 30" role="img" aria-label="AWS">
      <text x="1" y="17" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="19" letterSpacing="-0.5">
        aws
      </text>
      <path d="M3 22.5c11 6.5 27 6.5 37 .5" stroke="#f90" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M35.5 20.2l5.3 2.4-2.2 5" stroke="#f90" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Route53Icon({ size = 28 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="r53g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4D27A8" />
          <stop offset="1" stopColor="#A166FF" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" fill="url(#r53g)" />
      <path
        d="M20 8.5c3 2 6.4 2.5 9 2.3.4 6.8-1.1 15.3-9 20.7-7.9-5.4-9.4-13.9-9-20.7 2.6.2 6-.3 9-2.3z"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">
        53
      </text>
    </svg>
  );
}

export function GridIcon({ size = 18 }: P) {
  const dots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) dots.push(<rect key={`${r}${c}`} x={1 + c * 6} y={1 + r * 6} width="4" height="4" rx="0.5" />);
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      {dots}
    </svg>
  );
}

export function SearchIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l4 4" strokeLinecap="round" />
    </svg>
  );
}

export function CloudShellIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="1" y="1" width="16" height="16" rx="1.5" />
      <path d="M4.5 6l3 3-3 3M9 12.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BellIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 13V8a5 5 0 0110 0v5l1.5 1.5h-13L4 13z" strokeLinejoin="round" />
      <path d="M7 16.5h4" strokeLinecap="round" />
    </svg>
  );
}

export function HelpIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="9" cy="9" r="7.5" />
      <path d="M6.8 7a2.3 2.3 0 114 1.5c-.8.6-1.8 1-1.8 2.3" strokeLinecap="round" />
      <circle cx="9" cy="13.4" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function CaretDown({ size = 10, up = false }: P & { up?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" aria-hidden style={up ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M1 3h8L5 8z" />
    </svg>
  );
}

export function ExternalIcon({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M10 2h4v4M14 2L7 9M12 9.5V14H2V4h4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MonitorIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="1.5" y="2" width="13" height="9" rx="1" />
      <path d="M5 14h6M8 11v3" strokeLinecap="round" />
    </svg>
  );
}

export function SunIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" strokeLinecap="round" />
    </svg>
  );
}

export function MoonIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M13.5 10A6 6 0 016 2.5a6 6 0 107.5 7.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function SignOutIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 2H2.5v12H6M10.5 4.5L14 8l-3.5 3.5M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeedbackBoxIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
      <path d="M1.5 5.5h13M4 2.5v3" />
    </svg>
  );
}
