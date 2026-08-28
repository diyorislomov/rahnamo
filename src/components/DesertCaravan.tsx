'use client';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF3E6] to-[#F5E6CC] border border-amber-900/15 shadow-sm p-6 sm:p-10 my-6 select-none">
      {/* Background Desert Sun / Moon */}
      <div className="absolute top-4 right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600/30 opacity-70 blur-xs animate-pulse" />
      
      {/* Starry Night particles */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#9C4221_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <span>Ipak Yo'li Karyera Karvoni</span>
        </div>
        <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-950 leading-tight">
          Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
        </h2>
        <p className="text-xs sm:text-sm text-stone-700 mt-2 leading-relaxed">
          Tibbiyot, Huquq, Arxitektura, Dasturlash va Biznes sohasidagi tajribali Rahnamolardan 1-ga-1 shaxsiy yo'l-yo'riq oling.
        </p>
      </div>

      {/* Animated Dunes SVG */}
      <div className="relative mt-8 sm:mt-12 h-24 sm:h-32 w-full">
        {/* Distant Dune Layer */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-200/60"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,40 Q300,120 600,30 Q900,-20 1200,50 L1200,120 L0,120 Z"
          />
        </svg>

        {/* Foreground Dune Layer */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-300/40"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,60 Q400,10 800,80 Q1050,30 1200,70 L1200,120 L0,120 Z"
          />
        </svg>

        {/* Animated Camel Caravan Silhouette */}
        <div className="absolute bottom-2 left-4 sm:left-12 flex items-end gap-3 sm:gap-5 animate-caravan">
          {/* Camel 1 (Leader) */}
          <div className="flex flex-col items-center">
            <svg className="w-8 h-8 sm:w-11 sm:h-11 text-amber-950 fill-current drop-shadow-xs" viewBox="0 0 24 24">
              <path d="M19 13c.5 0 1-.5 1-1s-.5-1-1-1h-1v-2c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v1h-1c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-3h1zM7 9c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v1H3c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V9h1zm6-4c-.6 0-1 .4-1 1v1h-2c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V9h1c.6 0 1-.4 1-1V6c0-.6-.4-1-1-1h-2z" />
            </svg>
            <span className="w-1.5 h-0.5 bg-amber-950/40 rounded-full mt-0.5" />
          </div>

          {/* Camel 2 */}
          <div className="flex flex-col items-center">
            <svg className="w-7 h-7 sm:w-9 sm:h-9 text-amber-900 fill-current drop-shadow-xs opacity-90" viewBox="0 0 24 24">
              <path d="M19 13c.5 0 1-.5 1-1s-.5-1-1-1h-1v-2c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v1h-1c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-3h1zM7 9c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v1H3c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V9h1z" />
            </svg>
          </div>

          {/* Camel 3 (Follower) */}
          <div className="flex flex-col items-center">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-amber-900/80 fill-current drop-shadow-xs opacity-80" viewBox="0 0 24 24">
              <path d="M19 13c.5 0 1-.5 1-1s-.5-1-1-1h-1v-2c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v1h-1c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-3h1zM7 9c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v1H3c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V9h1z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
