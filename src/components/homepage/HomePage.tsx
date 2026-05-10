import { FolderX, Info, PlusCircle } from 'lucide-react'

const ORBIT_DOTS = [
  "left-[8%] top-[28%] h-14 w-14",
  "left-[27%] top-[28%] h-16 w-16",
  "right-[27%] top-[28%] h-16 w-16",
  "right-[8%] top-[28%] h-14 w-14",
  "left-[2%] top-[76%] h-8 w-8",
  "left-[18%] top-[68%] h-14 w-14",
  "left-[34%] top-[74%] h-10 w-10",
  "right-[34%] top-[74%] h-10 w-10",
  "right-[18%] top-[68%] h-14 w-14",
  "right-[2%] top-[76%] h-8 w-8",
]

export default function HomePage() {
  return (
    <div className="relative flex h-screen flex-1 flex-col items-center justify-center overflow-hidden border border-white/[0.035] bg-[#010102] px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage:
            'radial-gradient(var(--color-on-primary) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[660px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
        style={{
          background:
            'radial-gradient(circle, rgba(167,139,250,0.055) 0%, rgba(25,28,31,0.035) 34%, rgba(0,0,0,0) 68%)',
        }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[430px] w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-45"
        aria-hidden="true"
      >
        {ORBIT_DOTS.map((className) => (
          <span
            key={className}
            className={`absolute rounded-full bg-surface-container-high/70 ${className}`}
          />
        ))}
      </div>

      <section className="relative z-10 mt-4 flex w-full max-w-[760px] flex-col items-center">
        <div className="relative mb-12 flex h-[124px] w-[124px] items-center justify-center">
          <span className="absolute bottom-4 h-20 w-20 rounded-2xl bg-surface-container-high/80 blur-[1px]" />
          <span className="absolute h-[124px] w-[124px] rounded-full bg-black/20" />
          <div className="relative flex h-[116px] w-[116px] items-center justify-center rounded-[16px] border border-white/[0.14] bg-surface-container/95 shadow-[0_22px_0_-16px_rgba(255,255,255,0.05),0_24px_42px_rgba(0,0,0,0.42)]">
            <span className="absolute inset-0 rounded-[16px] border border-black/30 bg-linear-to-br from-white/[0.045] to-transparent" />
            <FolderX
              size={62}
              strokeWidth={1.7}
              className="relative text-primary-fixed-dim"
            />
          </div>
        </div>

        <h2 className="mb-6 text-[clamp(42px,4vw,60px)] font-black leading-[0.95] tracking-[-0.03em] text-on-primary drop-shadow-[0_9px_0_rgba(255,255,255,0.12)]">
          Welcome to the Void
        </h2>

        <p className="mb-[66px] max-w-[690px] text-[clamp(16px,1.3vw,21px)] font-medium leading-[1.55] text-[#aaa3b1]">
          Your cinematic canvas is empty. VOID indexes and previews
          high-definition local media assets with precision. Configure your
          library root to begin populating the explorer grid.
        </p>

        <button
          id="btn-configure-library"
          className="group flex h-[74px] min-w-[375px] cursor-pointer items-center justify-center gap-4 border border-white/[0.23] bg-surface-container-high/95 px-10 text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:border-primary-fixed-dim/70 hover:bg-surface-bright"
        >
          <PlusCircle
            size={25}
            strokeWidth={2.2}
            className="text-primary-fixed-dim transition-all duration-300 group-hover:text-on-primary"
          />
          <span className="mt-0.5 text-[15px] font-black uppercase tracking-[0.16em]">
            Configure Library Route
          </span>
        </button>

        <div className="mt-16 flex items-center gap-3 text-on-secondary/70">
          <Info size={17} strokeWidth={2} />
          <span className="mt-0.5 text-[14px] font-bold tracking-[0.02em]">
            Supports .mp4, .mov, .mxf, and .r3d formats
          </span>
        </div>
      </section>
    </div>
  )
}
