import {
  BarChart3,
  HelpCircle,
  MoreHorizontal,
  Trophy,
  User,
} from 'lucide-react';

export type TabKey = 'chart' | 'help' | 'profile' | 'trophy' | 'more';

const ITEMS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: 'chart', label: 'Chart', icon: BarChart3 },
  { key: 'help', label: 'Help', icon: HelpCircle },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'trophy', label: 'Trophy', icon: Trophy },
  { key: 'more', label: 'More', icon: MoreHorizontal },
];

// Explicit dark-theme colours so the bar never falls back to a light
// browser default when the CSS variables are out of scope.
const BAR_BG = '#151a2e';
const BAR_BORDER = '#262c48';
const MUTED = '#8a90a8';
const ACTIVE = '#2b8cff'; // terminal accent colour

/** Height of the bar's content (icon + label + padding), excluding safe area. */
export const TAB_BAR_HEIGHT = 52;

interface BottomTabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  trophyBadge?: number;
  moreBadge?: number;
}

export default function BottomTabBar({
  active,
  onChange,
  trophyBadge = 0,
  moreBadge = 0,
}: BottomTabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[100] flex items-stretch"
      style={{
        backgroundColor: BAR_BG,
        borderTop: `1px solid ${BAR_BORDER}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = key === active;
        const badge =
          key === 'trophy' ? trophyBadge : key === 'more' ? moreBadge : 0;
        const color = isActive ? ACTIVE : MUTED;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
            style={{ height: TAB_BAR_HEIGHT }}
          >
            <span className="relative">
              <Icon size={19} color={color} />
              {badge > 0 && (
                <span
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: 'var(--red, #ef4b3a)' }}
                >
                  {badge}
                </span>
              )}
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
