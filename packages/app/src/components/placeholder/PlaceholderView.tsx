type PlaceholderViewProps = {
  title: string
}

export default function PlaceholderView({ title }: PlaceholderViewProps) {
  return (
    <section className="flex min-h-screen flex-1 items-center justify-center bg-black px-6 text-center">
      <h2 className="text-[42px] font-black tracking-[-0.03em] text-on-primary drop-shadow-[0_8px_0_rgba(255,255,255,0.12)]">
        {title}
      </h2>
    </section>
  )
}
