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
      className="kt-safe-bottom flex shrink-0 items-stretch"
      style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
    >
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = key === active;
        const badge =
          key === 'trophy' ? trophyBadge : key === 'more' ? moreBadge : 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            <span className="relative">
              <Icon size={19} color={isActive ? 'var(--blue)' : 'var(--muted)'} />
              {badge > 0 && (
                <span
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: 'var(--red)' }}
                >
                  {badge}
                </span>
              )}
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? 'var(--blue)' : 'var(--muted)' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
