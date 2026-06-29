import type { Locale } from '../i18n'

export type MascotMood = 'idle' | 'win' | 'lose'

const QUOTES: Record<Locale, Record<MascotMood, string[]>> = {
  en: {
    idle: [
      "You've got this!",
      'Smash it!',
      "Let's go!",
      'Eyes on the shuttle!',
      'Footwork first!',
      'Warm up those legs!',
    ],
    win: [
      'Yes! Nailed it!',
      'GG, well played!',
      "That's how it's done!",
      'Victory dance time!',
      'On fire today!',
    ],
    lose: [
      "Next one's ours!",
      'Shake it off!',
      'Good game — learn and grow!',
      '5000 VND well spent 😅',
      "We'll get 'em next time!",
    ],
  },
  vi: {
    idle: [
      'Cố lên nha!',
      'Đập mạnh vào!',
      'Tập trung nè!',
      'Di chuyển nhanh lên!',
      'Khởi động kỹ vào!',
    ],
    win: ['Quá đỉnh!', 'Thắng rồi, ngon!', 'Cứ thế phát huy nha!', 'Đỉnh của chóp!'],
    lose: [
      'Ván sau gỡ lại nè!',
      'Không sao, cố lên!',
      'Mất 5000 rồi 😅',
      'Chơi hay lắm, ván sau thắng!',
    ],
  },
}

/**
 * Picks a random encouragement/reaction quote for the given mood and locale.
 * For `idle`, `extraQuotes` (e.g. a player's own custom quotes) are mixed into the pool.
 */
export function pickMascotQuote(
  mood: MascotMood,
  locale: Locale,
  extraQuotes: string[] = [],
): string {
  const pool = mood === 'idle' ? [...QUOTES[locale].idle, ...extraQuotes] : QUOTES[locale][mood]
  return pool[Math.floor(Math.random() * pool.length)]
}
