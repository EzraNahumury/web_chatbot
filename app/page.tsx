import GridScan from "@/components/GridScan";

export default function Home() {
  const botLinks = [
    {
      label: "Bot WhatsApp 1",
      href: "https://ayreschatbot.up.railway.app/",
    },
    {
      label: "Bot WhatsApp 2",
      href: "https://ayreschatbot2.up.railway.app/",
    },
    {
      label: "Bot WhatsApp 3",
      href: "https://ayreschatbot3.up.railway.app/",
    },
  ];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-4 py-8">
      <GridScan
        sensitivity={0.55}
        lineThickness={1}
        linesColor="#d249ff"
        gridScale={0.095}
        scanColor="#ff9ffc"
        scanOpacity={0.45}
        enablePost
        bloomIntensity={0.75}
        chromaticAberration={0.0018}
        noiseIntensity={0.01}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#06031f]/30 via-[#090417]/16 to-black/42" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,127,221,0.14),transparent_42%),radial-gradient(circle_at_bottom,_rgba(77,0,139,0.16),transparent_38%)]" />

      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300/80">
            Gateway Dashboard
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Ayres Parallel Bot Connector
          </h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Pilih bot WhatsApp yang ingin dihubungkan
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-4">
          {botLinks.map((bot) => (
            <a
              key={bot.href}
              href={bot.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-center text-base font-semibold text-white shadow-lg shadow-cyan-900/40 transition-transform duration-300 ease-out hover:scale-[1.03] hover:from-cyan-400 hover:to-blue-500"
            >
              <span className="relative z-10">{bot.label}</span>
              <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
