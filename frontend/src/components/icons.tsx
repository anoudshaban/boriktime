import type { ReactNode, SVGProps } from 'react'
import type { Tag } from '../types'

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string }

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ---------- Menu section icons (keys match config/menu.php "icon") ---------- */

const CATEGORY_ICONS: Record<string, ReactNode> = {
  cutlery: (
    <>
      <path d="M8 3v7.5M5.5 3v5a2.5 2.5 0 0 0 5 0V3M8 10.5V21" />
      <path d="M17.5 21V3c-2 1.3-3 3.6-3 6.6 0 1.9.8 3.2 3 3.6" />
    </>
  ),
  breakfast: (
    <>
      <path d="M7.5 6.5c2-2.5 6-2.6 8.2-.6 1.6 1.4 3.6 1.6 4.3 3.7.8 2.4-.6 4.3-1.4 6.1-1 2.4-3.3 4.3-6.4 4.3-3.6 0-6.9-1.6-8.1-4.7C3 12.6 5 9.6 7.5 6.5Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M10.6 11.2a1.5 1.5 0 0 1 1.2-.9" />
    </>
  ),
  borek: (
    <>
      <path d="M12 12.5a1 1 0 0 1-1-1 2 2 0 0 1 2-2 3 3 0 0 1 3 3 4 4 0 0 1-4 4 5 5 0 0 1-5-5 6 6 0 0 1 6-6 7 7 0 0 1 7 7" />
      <path d="M4.5 18.5h15" />
      <circle cx="9" cy="7.4" r=".35" fill="currentColor" />
      <circle cx="15.6" cy="15.9" r=".35" fill="currentColor" />
    </>
  ),
  salad: (
    <>
      <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z" />
      <path d="M8 12c-.5-3 1-5.5 3.5-6.5.5 2.6-.6 5-3.5 6.5" />
      <path d="M13 12c.3-2.5 2.2-4.2 4.8-4.4-.2 2.3-2 4-4.8 4.4" />
      <path d="M11.2 12c0-1.4.1-2.5.4-3.4" />
    </>
  ),
  mezze: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12a4 4 0 0 1 4-4 3 3 0 0 1 3 3 2 2 0 0 1-2 2 1 1 0 0 1-1-1" />
      <circle cx="15.5" cy="15.5" r=".8" fill="currentColor" />
    </>
  ),
  pan: (
    <>
      <circle cx="10" cy="14" r="6" />
      <path d="M15.6 11.6 21 8.5" />
      <path d="M7.5 3.5c-.8 1 .8 1.6 0 2.6M11 3.5c-.8 1 .8 1.6 0 2.6" />
    </>
  ),
  bowl: (
    <>
      <path d="M3.5 11h17l-1.2 3.6A6 6 0 0 1 13.6 19h-3.2a6 6 0 0 1-5.7-4.4L3.5 11Z" />
      <path d="M8 8c1.3-1 2.7-1 4 0s2.7 1 4 0" />
      <path d="M9 21.5h6" />
    </>
  ),
  pot: (
    <>
      <path d="M6 9.5h12" />
      <path d="M7 9.5c-1.5 1.5-2 3.5-1.5 6 .6 2.8 3 4.5 6.5 4.5s5.9-1.7 6.5-4.5c.5-2.5 0-4.5-1.5-6" />
      <path d="M7.5 9.5C8 7.8 9.8 6.5 12 6.5s4 1.3 4.5 3" />
      <path d="M12 6.5V4.8M5.6 12.5H4M18.4 12.5H20" />
    </>
  ),
  juice: (
    <>
      <path d="M6.5 7h11l-1.3 12.3a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4L6.5 7Z" />
      <path d="M13 7l1.8-4.5h2.6" />
      <path d="M7.2 11.5h9.6" />
    </>
  ),
  coffee: (
    <>
      <path d="M5.5 9.5h10v3a5 5 0 0 1-10 0v-3Z" />
      <path d="M15.5 10.5h1.2a2 2 0 0 1 0 4h-1.6" />
      <path d="M3.5 20h14" />
      <path d="M8.5 3.5c-.8 1 .8 1.8 0 2.8M12 3.5c-.8 1 .8 1.8 0 2.8" />
    </>
  ),
  dessert: (
    <>
      <path d="M12 4l7 8-7 8-7-8 7-8Z" />
      <path d="M7.6 9h8.8M7.6 15h8.8" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  dish: (
    <>
      <path d="M4 17h16M5 17a7 7 0 0 1 14 0" />
      <path d="M12 10V8.5M10.5 8.5h3M3 20h18" />
    </>
  ),
}

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS)

export function CategoryIcon({ name, ...props }: IconProps & { name: string }) {
  return <Svg {...props}>{CATEGORY_ICONS[name] ?? CATEGORY_ICONS.dish}</Svg>
}

/* ---------- Dietary / highlight tags ---------- */

const TAG_ICONS: Record<Tag, ReactNode> = {
  new: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  popular: <path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.8 3.3-5.5 3.8-9.3 2.4 1.5 3.6 3.8 3.4 6.3 1-.8 1.7-2 1.9-3.3 2.1 1.7 3.9 4 3.9 6.6C18.5 18.6 16 21 12 21Z" />,
  spicy: (
    <>
      <path d="M18 6c-1.5.5-2.5 1.8-2.5 3.5 0 5-4.5 10.5-11 10.5 3.3-2.6 4.4-6.4 5.2-9.4.7-2.7 2.6-4.1 5.3-4.1" />
      <path d="M18 6c0-1.6.8-2.6 2-3" />
    </>
  ),
  vegetarian: (
    <>
      <path d="M5 19c0-8 5-13 14-14-.5 9-6 14-14 14Z" />
      <path d="M5 19 13 11" />
    </>
  ),
  vegan: (
    <>
      <path d="M5 19c0-8 5-13 14-14-.5 9-6 14-14 14Z" />
      <path d="M9 13.5 11 16l4-6" />
    </>
  ),
  sharing: (
    <>
      <circle cx="8.5" cy="9" r="2.5" />
      <circle cx="15.5" cy="9" r="2.5" />
      <path d="M3.5 19c.5-3 2.5-4.6 5-4.6s4.5 1.6 5 4.6M10.5 19c.5-3 2.5-4.6 5-4.6s4.5 1.6 5 4.6" />
    </>
  ),
  gluten_free: (
    <>
      <path d="M12 21V9M12 9c-1.6-.4-2.5-1.8-2.5-3.5 1.6.3 2.5 1.6 2.5 3.5Zm0 0c1.6-.4 2.5-1.8 2.5-3.5-1.6.3-2.5 1.6-2.5 3.5Z" />
      <path d="M4 4l16 16" />
    </>
  ),
  nuts: (
    <>
      <path d="M6 10h12c0 5.5-2.7 10-6 10s-6-4.5-6-10Z" />
      <path d="M5 10c0-2.8 3.1-5 7-5s7 2.2 7 5M12 5V3" />
    </>
  ),
}

export const TAG_KEYS = Object.keys(TAG_ICONS) as Tag[]

export function TagIcon({ tag, ...props }: IconProps & { tag: Tag }) {
  return <Svg {...props}>{TAG_ICONS[tag]}</Svg>
}

/* ---------- UI icons ---------- */

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.4-4.4" />
  </Svg>
)
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Svg>
)
export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.75" cy="6.5" r=".9" fill="currentColor" />
    <circle cx="4.75" cy="12" r=".9" fill="currentColor" />
    <circle cx="4.75" cy="17.5" r=".9" fill="currentColor" />
  </Svg>
)
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)
export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
  </Svg>
)
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.6 3.5h2.2l1.4 4.2-2 1.3a11 11 0 0 0 6.8 6.8l1.3-2 4.2 1.4v2.2A2 2 0 0 1 18.5 19.5 15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2.1-2Z" />
  </Svg>
)
export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
)
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)
export const InstagramIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
  </Svg>
)
export const FacebookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V9a.5.5 0 0 1 .5-.5Z" />
  </Svg>
)
export const WhatsappIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20l1.3-4A8.5 8.5 0 1 1 8.4 19L4 20Z" />
    <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 0 1-2.2-2.2l.8-1-1-2L9 8.5Z" />
  </Svg>
)
export const LanguageIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5S9.6 5.8 12 3.5Z" />
  </Svg>
)
export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
)
export const GuestsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M15.5 5a3 3 0 0 1 0 6M17.5 14.5a5 5 0 0 1 3 5" />
  </Svg>
)
export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6.5C10 5 7.2 4.5 4 4.8v13.5c3.2-.3 6 .2 8 1.7 2-1.5 4.8-2 8-1.7V4.8c-3.2-.3-6 .2-8 1.7ZM12 6.5V20" />
  </Svg>
)
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const MinusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)
export const DeliveryIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
    <path d="M9 17.5h6M15 17.5 13 9h-2.5M13 9h3l1.5 8.5M3 13.5h6.5l1.5 4M4 7h6v6" />
  </Svg>
)
