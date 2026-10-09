
const BLUE = "#4f7cff";

export function Shield53({ x = 0, y = 0, size = 64 }: { x?: number; y?: number; size?: number }) {
  const k = size / 64;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path
        d="M32 3c6 4 13 5 19 4 1 3 2 6 6 7-3 19-9 33-25 45C16 47 10 33 7 14c4-1 5-4 6-7 6 1 13 0 19-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 9c5 3 10 4 15 3 1 2 2 4 4 5-2 15-7 26-19 35C20 43 15 32 13 17c2-1 3-3 4-5 5 1 10 0 15-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <text x="32" y="38" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="19" fill="currentColor">
        53
      </text>
    </g>
  );
}

const dash = { stroke: BLUE, strokeWidth: 2, strokeDasharray: "4 4", fill: "none" } as const;

export function DomainNamesArt() {
  return (
    <svg viewBox="0 0 240 90" width="240" height="90" aria-hidden>
      <Shield53 x={10} y={8} size={70} />
      <path d="M78 34c20-14 40 0 60 6M78 46c20 10 40 0 60-4M78 58c20 12 40 4 60-14" {...dash} />
      <rect x="138" y="12" width="84" height="56" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="146" y="20" width="68" height="40" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M152 28h14M152 36h14M152 44h14" stroke="currentColor" strokeWidth="3" />
      <rect x="174" y="26" width="34" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="198" cy="34" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M130 72h100" stroke="currentColor" strokeWidth="3" />
      <path d="M206 54l18 16-8 1 5 9-4 2-5-9-6 5z" fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function HostedZonesArt() {
  return (
    <svg viewBox="0 0 260 100" width="250" height="96" aria-hidden>
      <path d="M20 24h220" {...dash} />
      <Shield53 x={2} y={8} size={30} />
      <Shield53 x={36} y={14} size={44} />
      <Shield53 x={92} y={20} size={72} />
      <Shield53 x={174} y={14} size={44} />
      <Shield53 x={222} y={8} size={30} />
    </svg>
  );
}

export function HealthChecksArt() {
  const pulse = "M0 50h22l6-22 8 44 8-50 8 38 6-10h20";
  return (
    <svg viewBox="0 0 240 90" width="230" height="88" aria-hidden>
      <path d={pulse} transform="translate(8 0)" stroke={BLUE} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <Shield53 x={86} y={10} size={68} />
      <path d={pulse} transform="translate(150 0)" stroke={BLUE} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function TrafficFlowArt() {
  const nodes = [
    [120, 30],
    [120, 70],
  ];
  const leaves = [16, 30, 44, 58, 72, 86];
  return (
    <svg viewBox="0 0 240 104" width="230" height="100" aria-hidden>
      <Shield53 x={8} y={16} size={72} />
      {nodes.map(([x, y]) => (
        <g key={y}>
          <path d={`M80 52C96 52 100 ${y} ${x - 6} ${y}`} {...dash} />
          <circle cx={x} cy={y} r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </g>
      ))}
      {[22, 44, 64, 84].map((y, i) => (
        <g key={y}>
          <path d={`M126 ${nodes[i < 2 ? 0 : 1][1]}C150 ${nodes[i < 2 ? 0 : 1][1]} 152 ${y} 168 ${y}`} {...dash} />
          <circle cx={174} cy={y} r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d={`M180 ${y}C196 ${y} 200 ${leaves[i]} 212 ${leaves[i]}`} {...dash} />
        </g>
      ))}
      {leaves.map((y) => (
        <circle key={y} cx={218} cy={y} r="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      ))}
    </svg>
  );
}

export function ResolverArt() {
  return (
    <svg viewBox="0 0 250 90" width="240" height="88" aria-hidden>
      <ellipse cx="30" cy="16" rx="18" ry="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 16v20c0 4 8 6 18 6M48 16v10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {[30, 50, 70].map((y) => (
        <g key={y}>
          <rect x="22" y={y} width="50" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="30" y={y + 5} width="6" height="6" fill={BLUE} />
          <rect x="40" y={y + 5} width="6" height="6" fill={BLUE} />
        </g>
      ))}
      <path d="M74 40h22M96 52H74" stroke={BLUE} strokeWidth="2.4" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0l10 5-10 5z" fill={BLUE} />
        </marker>
      </defs>
      <Shield53 x={96} y={8} size={70} />
      <path d="M166 44h20" stroke={BLUE} strokeWidth="2.4" markerEnd="url(#arrow)" />
      <path
        d="M190 56h44a12 12 0 000-24 18 18 0 00-34-6 12 12 0 00-10 30z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M222 48c4 2 8 2 12 0v10c0 6-6 10-6 10s-6-4-6-10z" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export function VideoArt() {
  return (
    <svg viewBox="0 0 640 260" width="100%" aria-hidden style={{ display: "block" }}>
      <defs>
        <linearGradient id="vbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0e13" />
          <stop offset="1" stopColor="#232f3e" />
        </linearGradient>
      </defs>
      <rect width="640" height="260" fill="url(#vbg)" />
      <circle cx="58" cy="44" r="20" fill="#232f3e" stroke="#545b64" />
      <text x="58" y="49" textAnchor="middle" fill="#fff" fontFamily="Arial" fontWeight="700" fontSize="12">
        aws
      </text>
      <text x="90" y="42" fill="#fff" fontFamily="Arial" fontWeight="700" fontSize="22">
        Amazon Route 53
      </text>
      <text x="90" y="62" fill="#d1d5db" fontFamily="Arial" fontSize="13">
        Amazon Web Services
      </text>
      <path d="M210 120l84 70M430 110L346 190" stroke="#f90" strokeWidth="2" strokeDasharray="5 6" />
      <rect x="168" y="84" width="40" height="40" rx="3" fill="none" stroke="#7aa2ff" strokeWidth="3" />
      <rect x="160" y="96" width="40" height="40" rx="3" fill="none" stroke="#fff" strokeWidth="3" />
      <circle cx="455" cy="98" r="30" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M430 85c20 4 34 18 40 38M440 72c-2 20 4 40 20 52" fill="none" stroke="#fff" strokeWidth="3" />
      <g color="#fff">
        <Shield53 x={284} y={168} size={72} />
      </g>
      <rect x="278" y="92" width="84" height="56" rx="14" fill="#ff0000" />
      <path d="M310 106l26 14-26 14z" fill="#fff" />
    </svg>
  );
}
