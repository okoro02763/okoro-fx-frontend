import { X } from 'lucide-react';

interface PromoStripProps {
  onClose: () => void;
}

export default function PromoStrip({ onClose }: PromoStripProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 px-3 py-2"
      style={{
        background: 'linear-gradient(90deg, #0fb360 0%, #0b8f4d 55%, #0a7a42 100%)',
      }}
    >
      <span className="flex-1 text-[12px] font-medium text-white">
        Practice risk-free with your demo balance — payouts up to 95%.
      </span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0">
        <X size={16} color="#fff" />
      </button>
    </div>
  );
}
