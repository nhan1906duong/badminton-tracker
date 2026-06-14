/**
 * Curated mascot registry. `mascot_id` on a racket (`player_rackets`) is a
 * key into this list, not a file path — lets us move/rename .lottie assets
 * without a migration.
 *
 * `lottiePath` points at a looping idle .lottie animation under
 * public/mascots/. A mascot can be a single animation (string) or a
 * collection of animations (string[]) — use `getMascotPreviewPath` for a
 * stable preview (e.g. in the picker) and `getMascotDisplayPath` to pick a
 * random animation from a collection each time the mascot is shown.
 * Until real assets are dropped in, `<PlayerMascot>` falls back to `emoji`
 * if the .lottie file fails to load.
 */
export interface Mascot {
  id: string
  name: string
  /** Fallback glyph shown if the .lottie asset fails to load. */
  emoji: string
  lottiePath: string | string[]
}

export const MASCOTS: Mascot[] = [
  { id: 'bird-knife', name: 'Bird Knife', emoji: '🐦', lottiePath: '/mascots/bird-knife.lottie' },
  { id: 'owl', name: 'Owl', emoji: '🦉', lottiePath: '/mascots/owl.lottie' },
  { id: 'clap', name: 'Clap', emoji: '👏', lottiePath: '/mascots/clap.lottie' },
  { id: 'kitty', name: 'Kitty', emoji: '🐱', lottiePath: '/mascots/kitty.lottie' },
  { id: 'chan', name: 'Chan', emoji: '🐼', lottiePath: '/mascots/chan.lottie' },
  { id: 'hamster', name: 'Hamster', emoji: '🐹', lottiePath: '/mascots/hamster.lottie' },
  { id: 'monster', name: 'Monster', emoji: '👹', lottiePath: '/mascots/monster.lottie' },
  { id: 'ai', name: 'ai', emoji: '🤖', lottiePath: '/mascots/ai.lottie' },
  { id: 'rabit', name: 'Rabit', emoji: '🐰', lottiePath: '/mascots/rabit.lottie' },
  { id: 'fox1', name: 'Fox1', emoji: '🦊', lottiePath: '/mascots/fox.lottie' },
  { id: 'jellyfish1', name: 'Jellyfish1', emoji: '🪼', lottiePath: '/mascots/jellyfish.lottie' },
  {
    id: 'pigeon',
    name: 'Pigeon',
    emoji: '🐦',
    lottiePath: ['/mascots/pigeon/pigeon01.lottie', '/mascots/pigeon/pigeon02.lottie'],
  },
  { id: 'peacock', name: 'Peacock', emoji: '🦚', lottiePath: '/mascots/peacock.lottie' },
  { id: 'sea-star', name: 'Sea-star', emoji: '⭐', lottiePath: '/mascots/sea-star.lottie' },
  {
    id: 'jellyfish',
    name: 'Jellyfish',
    emoji: '🪼',
    lottiePath: [
      '/mascots/jellyfish/jellyfish01.lottie',
      '/mascots/jellyfish/jellyfish02.lottie',
      '/mascots/jellyfish/jellyfish03.lottie',
    ],
  },
  { id: 'black-cat', name: 'Black Cat', emoji: '🐈‍⬛', lottiePath: '/mascots/black-cat.lottie' },
  { id: 'chameleon', name: 'Chameleon', emoji: '🦎', lottiePath: '/mascots/chameleon.lottie' },
  { id: 'dino', name: 'Dino', emoji: '🦖', lottiePath: '/mascots/dino.lottie' },
  { id: 'sloth', name: 'Sloth', emoji: '🦥', lottiePath: '/mascots/sloth.lottie' },
  { id: 'turkey', name: 'Turkey', emoji: '🦃', lottiePath: '/mascots/turkey.lottie' },
  { id: 'virus', name: 'Virus', emoji: '🦠', lottiePath: '/mascots/virus.lottie' },
  {
    id: 'fox',
    name: 'Fox',
    emoji: '🦊',
    lottiePath: [
      '/mascots/fox/fox01.lottie',
      '/mascots/fox/fox02.lottie',
      '/mascots/fox/fox03.lottie',
      '/mascots/fox/fox04.lottie',
      '/mascots/fox/fox05.lottie',
    ],
  },
  {
    id: 'koala',
    name: 'Koala',
    emoji: '🐨',
    lottiePath: [
      '/mascots/koala/koala01.lottie',
      '/mascots/koala/koala02.lottie',
      '/mascots/koala/koala03.lottie',
      '/mascots/koala/koala04.lottie',
      '/mascots/koala/koala05.lottie',
      '/mascots/koala/koala06.lottie',
      '/mascots/koala/koala07.lottie',
      '/mascots/koala/koala08.lottie',
      '/mascots/koala/koala09.lottie',
      '/mascots/koala/koala10.lottie',
      '/mascots/koala/koala11.lottie',
    ],
  },
  {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    lottiePath: [
      '/mascots/dragon/dragon01.lottie',
      '/mascots/dragon/dragon02.lottie',
      '/mascots/dragon/dragon03.lottie',
      '/mascots/dragon/dragon04.lottie',
    ],
  },
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    lottiePath: [
      '/mascots/cat/cat-haha.lottie',
      '/mascots/cat/cat-in-love.lottie',
      '/mascots/cat/cat-sleep.lottie',
    ],
  },
  {
    id: 'fluffy',
    name: 'Fluffy',
    emoji: '🐶',
    lottiePath: [
      '/mascots/fluffy/iddle.lottie',
      '/mascots/fluffy/hi.lottie',
      '/mascots/fluffy/huh.lottie',
      '/mascots/fluffy/walk.lottie',
      '/mascots/fluffy/yay.lottie',
      '/mascots/fluffy/yay-star.lottie',
    ],
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '❤️',
    lottiePath: [
      '/mascots/heart/heart-hi.lottie',
      '/mascots/heart/heart-express.lottie',
      '/mascots/heart/heart-gift.lottie',
      '/mascots/heart/heart-give.lottie',
      '/mascots/heart/heart-kiss.lottie',
      '/mascots/heart/heart-sleep.lottie',
      '/mascots/heart/heart-cry.lottie',
      '/mascots/heart/heart-broken.lottie',
    ],
  },
  {
    id: 'kawaii',
    name: 'Kawaii',
    emoji: '🥰',
    lottiePath: [
      '/mascots/kawaii/kawaii-hi.lottie',
      '/mascots/kawaii/kawaii-love.lottie',
      '/mascots/kawaii/kawaii-wow.lottie',
      '/mascots/kawaii/kawaii-cry.lottie',
      '/mascots/kawaii/kawaii-cry2.lottie',
    ],
  },
]

export function getMascot(mascotId?: string | null): Mascot | null {
  if (!mascotId) return null
  return MASCOTS.find((m) => m.id === mascotId) ?? null
}

/** A stable animation to represent the mascot, e.g. in the picker grid. */
export function getMascotPreviewPath(mascot: Mascot): string {
  return Array.isArray(mascot.lottiePath) ? mascot.lottiePath[0] : mascot.lottiePath
}

/** A random animation from the mascot's collection, or its single animation. */
export function getMascotDisplayPath(mascot: Mascot): string {
  if (!Array.isArray(mascot.lottiePath)) return mascot.lottiePath
  const index = Math.floor(Math.random() * mascot.lottiePath.length)
  return mascot.lottiePath[index]
}
