export const SPECIALTY_CONFIG: {
  [key: string]: { label: string; activeClass: string; inactiveClass: string; icon: string };
} = {
  All: {
    label: 'Barcha sohalar',
    activeClass: 'bg-amber-900 text-amber-50 border-amber-950 shadow-md ring-2 ring-amber-900/30 scale-105',
    inactiveClass: 'bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200/80',
    icon: '✨',
  },
  'Medicine & Healthcare': {
    label: 'Tibbiyot & Salomatlik',
    activeClass: 'bg-emerald-700 text-emerald-50 border-emerald-800 shadow-md ring-2 ring-emerald-600/30 scale-105',
    inactiveClass: 'bg-emerald-100/90 text-emerald-950 border-emerald-300/80 hover:bg-emerald-200/80',
    icon: '🩺',
  },
  'Architecture & Design': {
    label: 'Arxitektura & Dizayn',
    activeClass: 'bg-rose-700 text-rose-50 border-rose-800 shadow-md ring-2 ring-rose-600/30 scale-105',
    inactiveClass: 'bg-rose-100/90 text-rose-950 border-rose-300/80 hover:bg-rose-200/80',
    icon: '🏛️',
  },
  'Law & Legal Practice': {
    label: 'Huquq & Korporativ',
    activeClass: 'bg-indigo-800 text-indigo-50 border-indigo-900 shadow-md ring-2 ring-indigo-600/30 scale-105',
    inactiveClass: 'bg-indigo-100/90 text-indigo-950 border-indigo-300/80 hover:bg-indigo-200/80',
    icon: '⚖️',
  },
  'Study Abroad': {
    label: 'Xalqaro Grantlar',
    activeClass: 'bg-purple-800 text-purple-50 border-purple-900 shadow-md ring-2 ring-purple-600/30 scale-105',
    inactiveClass: 'bg-purple-100/90 text-purple-950 border-purple-300/80 hover:bg-purple-200/80',
    icon: '🎓',
  },
  'Agriculture & Trade': {
    label: "Qishloq xo'jaligi & Eksport",
    activeClass: 'bg-amber-800 text-amber-50 border-amber-900 shadow-md ring-2 ring-amber-600/30 scale-105',
    inactiveClass: 'bg-amber-100/90 text-amber-950 border-amber-300/80 hover:bg-amber-200/80',
    icon: '🌾',
  },
  'Engineering & Tech': {
    label: 'Dasturlash & IT',
    activeClass: 'bg-sky-700 text-sky-50 border-sky-800 shadow-md ring-2 ring-sky-600/30 scale-105',
    inactiveClass: 'bg-sky-100/90 text-sky-950 border-sky-300/80 hover:bg-sky-200/80',
    icon: '💻',
  },
};
