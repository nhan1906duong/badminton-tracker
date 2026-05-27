const SVG_PATHS = (
  <>
    {/* Feathers — white */}
    <path fill="white" d="M 354 84 L 346 82 L 341 83 L 337 85 L 331 91 L 141 322 L 140 325 L 186 371 L 189 370 L 426 174 L 429 165 L 428 160 L 425 154 L 419 148 L 410 144 L 396 144 L 386 142 L 379 138 L 373 132 L 368 122 L 366 98 L 363 92 Z" />
    <path fill="white" d="M 426 188 L 195 380 L 204 389 L 207 395 L 207 403 L 212 402 L 224 396 L 231 394 L 243 388 L 250 386 L 262 380 L 269 378 L 281 372 L 288 370 L 300 364 L 307 362 L 319 356 L 326 354 L 338 348 L 345 346 L 357 340 L 364 338 L 376 332 L 383 330 L 395 324 L 459 298 L 472 291 L 479 281 L 480 277 L 479 263 L 476 257 L 470 251 L 438 238 L 432 234 L 426 227 L 422 217 L 422 206 Z" />
    <path fill="white" d="M 248 32 L 233 31 L 223 36 L 218 42 L 176 140 L 174 147 L 168 159 L 166 166 L 160 178 L 158 185 L 152 197 L 150 204 L 144 216 L 142 223 L 136 235 L 134 242 L 128 254 L 126 261 L 120 273 L 118 280 L 112 292 L 108 304 L 116 304 L 122 307 L 131 316 L 323 85 L 305 89 L 294 89 L 284 85 L 277 79 L 273 73 L 260 41 L 254 35 Z" />
    {/* Cork — accent color */}
    <path fill="var(--accent)" d="M 107 320 L 101 323 L 66 351 L 54 363 L 50 369 L 43 385 L 41 394 L 41 413 L 43 422 L 48 435 L 57 448 L 68 458 L 83 466 L 93 469 L 117 470 L 132 466 L 142 461 L 149 456 L 160 445 L 190 407 L 191 395 L 188 389 L 122 323 L 116 320 Z" />
  </>
)

function ShuttleAnimation() {
  return (
    <div className="relative w-[352px] h-[172px]">
      <div className="absolute top-0 left-0 shuttle-flight">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="56"
          height="56"
          aria-hidden="true"
          className="shuttle-icon"
        >
          {SVG_PATHS}
        </svg>
      </div>
      <div
        className="absolute bottom-0 left-0 w-14 h-2 rounded-full shuttle-shadow"
        style={{ background: 'black', filter: 'blur(5px)' }}
      />
    </div>
  )
}

interface Props {
  compact?: boolean
  small?: boolean
  tiny?: boolean
}

export function ShuttleLoading({ compact = false, small = false, tiny = false }: Props) {
  if (tiny) {
    return (
      // 352×172 animation scaled to 22% → 77×38 visual footprint
      <div style={{ width: 77, height: 38, overflow: 'hidden' }}>
        <div style={{ transform: 'scale(0.22)', transformOrigin: 'top left' }}>
          <ShuttleAnimation />
        </div>
      </div>
    )
  }

  if (small) {
    return (
      // 352×172 animation scaled to 33% — extra width prevents right-edge clipping from rotation + shadow
      <div style={{ width: 130, height: 57, overflow: 'hidden' }}>
        <div style={{ transform: 'scale(0.33)', transformOrigin: 'top left' }}>
          <ShuttleAnimation />
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex justify-center py-8">
        {/* 352×172 animation scaled to 45% → 158×77 visual footprint */}
        <div style={{ width: 158, height: 77, overflow: 'hidden' }}>
          <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left' }}>
            <ShuttleAnimation />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <ShuttleAnimation />
    </div>
  )
}
