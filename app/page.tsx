import GridScan from "@/components/GridScan";

export default function Home() {
  const botLinks = [
    {
      label: "Bot WhatsApp 1",
      href: "/chatbot01",
      note: "Endpoint utama untuk koneksi QR Bot 1.",
      buttonClass:
        "from-fuchsia-500 to-rose-500 hover:from-fuchsia-400 hover:to-rose-400 shadow-fuchsia-900/45",
    },
    {
      label: "Bot WhatsApp 2",
      href: "/chatbot02",
      note: "Endpoint paralel kedua untuk koneksi QR Bot 2.",
      buttonClass:
        "from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 shadow-rose-900/45",
    },
    {
      label: "Bot WhatsApp 3",
      href: "/chatbot03",
      note: "Endpoint paralel ketiga untuk koneksi QR Bot 3.",
      buttonClass:
        "from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-orange-900/45",
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
            Ayres Apparel Bot Connector
          </h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Pilih bot WhatsApp yang ingin dihubungkan
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-4 text-slate-200 sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-fuchsia-200/90">
            Keterangan Lengkap
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Halaman ini hanya berfungsi sebagai gateway connector, bukan mesin
            chatbot. Klik salah satu tombol bot di bawah untuk membuka halaman
            QR pada tab baru, lalu scan QR menggunakan aplikasi WhatsApp Anda.
          </p>
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            <p>1. Pilih bot yang ingin dihubungkan.</p>
            <p>2. Halaman QR bot akan terbuka di tab baru.</p>
            <p>3. Scan QR menggunakan WhatsApp di perangkat Anda.</p>
            <p>4. Kembali ke halaman ini jika ingin ganti bot.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {botLinks.map((bot) => (
            <a
              key={bot.href}
              href={bot.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r px-5 py-4 text-center text-white shadow-lg transition-transform duration-300 ease-out hover:scale-[1.03] ${bot.buttonClass}`}
            >
              <span className="relative z-10 block text-base font-semibold">
                {bot.label}
              </span>
              <span className="relative z-10 mt-1 block text-xs text-white/90">
                {bot.note}
              </span>
              <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
