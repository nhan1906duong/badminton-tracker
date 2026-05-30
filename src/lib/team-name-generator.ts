export type TeamNameOptions = {
  style?: 'sport' | 'fun' | 'power' | 'location'
  location?: string
}

const vietnameseAdjectives = [
  'Tốc Độ',
  'Bất Bại',
  'Rực Lửa',
  'Thần Tốc',
  'Mạnh Mẽ',
  'Máu Lửa',
  'Kiên Cường',
  'Bùng Nổ',
  'Tinh Nhuệ',
  'Quyết Chiến',
]

const vietnameseAnimals = [
  'Rồng',
  'Hổ',
  'Đại Bàng',
  'Sói',
  'Phượng Hoàng',
  'Báo Đen',
  'Chim Ưng',
  'Sư Tử',
]

const badmintonWords = [
  'Smash',
  'Cầu Bay',
  'Vợt Lửa',
  'Lông Vũ',
  'Chiến Cầu',
  'Cú Đập',
  'Cầu Lông',
  'Vợt Thần',
]

const vietnameseSymbols = [
  'Sấm Sét',
  'Bão Lửa',
  'Ánh Chớp',
  'Ngọn Gió',
  'Mặt Trời',
  'Lửa Đỏ',
  'Sao Vàng',
  'Hào Quang',
]

const funWords = [
  'Không Ngán',
  'Đánh Là Cháy',
  'Cầu Tới Bến',
  'Gãy Vợt',
  'Hết Pin',
  'Mồ Hôi Rơi',
  'Nhẹ Tay Thôi',
  'Xin Một Set',
]

const locations = [
  'Sài Gòn',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Thủ Đức',
  'Tân Bình',
  'Bình Dương',
  'Đồng Nai',
  'An Giang',
  'Miền Tây',
]

type WordType = 'adjective' | 'animal' | 'badminton' | 'symbol' | 'fun' | 'location'
type Pattern = readonly WordType[]

const patterns: readonly Pattern[] = [
  ['adjective', 'animal'],
  ['animal', 'location'],
  ['badminton', 'location'],
  ['symbol', 'location'],
  ['adjective', 'badminton'],
  ['fun'],
  ['fun', 'location'],
  ['symbol', 'badminton'],
]

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function getWord(type: WordType, options?: TeamNameOptions): string {
  switch (type) {
    case 'adjective':
      return randomItem(vietnameseAdjectives)
    case 'animal':
      return randomItem(vietnameseAnimals)
    case 'badminton':
      return randomItem(badmintonWords)
    case 'symbol':
      return randomItem(vietnameseSymbols)
    case 'fun':
      return randomItem(funWords)
    case 'location':
      return options?.location || randomItem(locations)
  }
}

export function generateVietnameseTeamName(options?: TeamNameOptions): string {
  let availablePatterns: readonly Pattern[] = patterns

  if (options?.style === 'sport') {
    availablePatterns = [
      ['badminton', 'location'],
      ['badminton', 'adjective'],
      ['badminton', 'symbol'],
    ]
  }

  if (options?.style === 'fun') {
    availablePatterns = [
      ['fun'],
      ['fun', 'location'],
    ]
  }

  if (options?.style === 'power') {
    availablePatterns = [
      ['adjective', 'animal'],
      ['symbol', 'location'],
      ['animal', 'location'],
    ]
  }

  if (options?.style === 'location') {
    availablePatterns = [
      ['badminton', 'location'],
      ['animal', 'location'],
      ['symbol', 'location'],
    ]
  }

  return randomItem(availablePatterns)
    .map((type) => getWord(type, options))
    .filter(Boolean)
    .join(' ')
}
