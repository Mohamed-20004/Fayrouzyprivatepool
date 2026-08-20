/** Thin-stroke gold icons used across the site (amenities, footer, badges). */

type IconProps = { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export const IconPool = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M2 9c1.7 0 1.7 1.4 3.3 1.4S7 9 8.7 9s1.6 1.4 3.3 1.4S13.7 9 15.3 9s1.7 1.4 3.4 1.4S20.3 9 22 9" />
    <path d="M2 14c1.7 0 1.7 1.4 3.3 1.4S7 14 8.7 14s1.6 1.4 3.3 1.4 1.7-1.4 3.3-1.4 1.7 1.4 3.4 1.4S20.3 14 22 14" />
  </svg>
);

export const IconMountain = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 19 9 7l3 6 2-3.5L21 19H3z" />
  </svg>
);

export const IconKitchen = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M7 3v7M5 3v4c0 1.1.9 2 2 2s2-.9 2-2V3M7 12v9" />
    <path d="M16 3c-1.7 0-3 2-3 5 0 2 1 3 2 3v10M15 11h2" />
  </svg>
);

export const IconBed = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M3 18v1M21 18v1" />
    <path d="M6.5 8V6.5A1.5 1.5 0 0 1 8 5h3v3M13 8V5h3a1.5 1.5 0 0 1 1.5 1.5V8" />
  </svg>
);

export const IconLeaf = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 19c0-8 4-13 14-14-.5 10-5 14-11 14-1 0-2-.3-3 0z" />
    <path d="M5 19c3-5 6-8 10-10" />
  </svg>
);

export const IconBath = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM7 19l-1 2M17 19l1 2" />
    <path d="M6 12V5a2 2 0 0 1 4 0" />
  </svg>
);

export const IconSofa = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
    <path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3zM6 18v2M18 18v2" />
  </svg>
);

export const IconWifi = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 9.5a13 13 0 0 1 18 0M6.5 13a8 8 0 0 1 11 0M10 16.5a3.5 3.5 0 0 1 4 0" />
    <circle cx="12" cy="19" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSun = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);

export const IconMoon = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
  </svg>
);

export const IconPhone = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 4h4l1.5 4.5-2.2 1.6a12 12 0 0 0 5.6 5.6l1.6-2.2L20 15v4a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
  </svg>
);

export const IconMail = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="5.5" width="18" height="13" rx="1" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

export const IconPin = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const IconInstagram = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="16.8" cy="7.2" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

export const IconFacebook = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M14.5 8H16V5h-2a3.5 3.5 0 0 0-3.5 3.5V11H8v3h2.5v7h3v-7H16l.5-3h-3v-2a1 1 0 0 1 1-1z" />
  </svg>
);

export const IconYoutube = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="6.5" width="18" height="11" rx="3" />
    <path d="m10.5 10 4 2-4 2v-4z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconClock = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
