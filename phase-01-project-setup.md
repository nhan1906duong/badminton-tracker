# Phase 1 — Project Setup

## Overview
- **Priority**: P0
- **Status**: Pending
- **Description**: Initialize Vite React project with TypeScript, Tailwind, PWA support, and Supabase client.

## Requirements
- [ ] Vite + React 19 + TypeScript scaffold
- [ ] Tailwind CSS v4 with PostCSS
- [ ] shadcn/ui initialization (optional but recommended)
- [ ] `vite-plugin-pwa` configured with basic manifest
- [ ] Supabase JS client installed
- [ ] Folder structure established
- [ ] ESLint + Prettier config
- [ ] Environment variables template (`.env.example`)

## Files to Create
```
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── manifest.json (auto via plugin)
├── package.json
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client init
│   │   └── utils.ts          # cn() helper
│   ├── types/
│   │   └── database.ts       # Generated Supabase types
│   ├── components/
│   │   └── ui/               # shadcn components
│   ├── pages/
│   ├── hooks/
│   └── stores/
├── public/
│   └── icons/                # PWA icons (placeholder)
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Implementation Steps

1. **Scaffold project**:
   ```bash
   npm create vite@latest . -- --template react-ts
   npm install
   ```

2. **Install dependencies**:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npm install @supabase/supabase-js
   npm install -D @types/node
   npm install -D vite-plugin-pwa
   npm install zustand
   npm install @tanstack/react-query
   npm install lucide-react
   npm install recharts
   npm install clsx tailwind-merge
   ```

3. **Configure Tailwind**:
   - Init `tailwind.config.ts` with content paths
   - Add Tailwind directives to `src/index.css`

4. **Configure `vite-plugin-pwa`** in `vite.config.ts`:
   ```ts
   import { VitePWA } from 'vite-plugin-pwa'
   // manifest: name, short_name, theme_color, icons, start_url
   // workbox: basic runtime caching for static assets
   ```

5. **Supabase client** (`src/lib/supabase.ts`):
   ```ts
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   ```

6. **`.env.example`**:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Success Criteria
- [ ] `npm run dev` starts dev server
- [ ] `npm run build` produces production build with service worker
- [ ] PWA manifest is generated in build output
- [ ] Supabase client connects without errors
- [ ] Tailwind classes work in components

## Next Steps
- Proceed to [Phase 2 — Supabase Schema](phase-02-supabase-schema.md)
