import { Compass } from 'lucide-react';

interface RahnamoLogoProps { className?: string; variant?: 'full' | 'monogram'; light?: boolean; }

export default function RahnamoLogo({ className = 'h-10', light = false, variant = 'full' }: RahnamoLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${light ? 'text-[#fff8eb]' : 'text-[#713614]'} ${className}`}>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${light ? 'border-white/30' : 'border-[#cbb391]'}`}>
        <Compass size={23} strokeWidth={1.5} aria-hidden="true" />
      </span>
      {variant === 'full' ? <span className="font-serif text-[25px] font-semibold tracking-[-.04em]">Rahnamo</span> : <span className="sr-only">Rahnamo</span>}
    </span>
  );
}

export function RahnamoMonogram({ className = 'h-9 w-9', light = false }: { className?: string; light?: boolean }) {
  return <RahnamoLogo variant="monogram" className={className} light={light} />;
}
