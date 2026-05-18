import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Trophy,
  User,
} from 'lucide-react'

const IS_DEV = import.meta.env.DEV

/**
 * Dev-only catalogue of the app's visual language.
 *
 * Each section mirrors a real UI surface so designers/devs can preview
 * tokens, components, and states in one place. Pure render — no side effects.
 */
export default function DesignSystemPage() {
  if (!IS_DEV) return <Navigate to="/" replace />

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-8 pb-32">
        <ColorsSection />
        <TypographySection />
        <ButtonsSection />
        <PillsAndChipsSection />
        <PlayerItemsSection />
        <SessionItemSection />
        <MatchCardSection />
        <FormInputsSection />
        <ScoreEntrySection />
        <TeamHeadersSection />
        <FabSection />
        <ModalSection />
        <EmptyAndLoadingSection />
      </div>
    </div>
  )
}

/* ---------- Section wrapper ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      {children}
    </div>
  )
}

/* ---------- Colors ---------- */

function Swatch({ name, className, hex }: { name: string; className: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border border-gray-200 ${className}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-400">{hex}</p>
      </div>
    </div>
  )
}

function ColorsSection() {
  return (
    <Section title="Colors">
      <Card>
        <Swatch name="Primary (green-600)" className="bg-green-600" hex="#16a34a" />
        <Swatch name="Primary dark (green-700)" className="bg-green-700" hex="#15803d" />
        <Swatch name="Team A (blue-500)" className="bg-blue-500" hex="#3b82f6" />
        <Swatch name="Team B (red-500)" className="bg-red-500" hex="#ef4444" />
        <Swatch name="Surface" className="bg-white" hex="#ffffff" />
        <Swatch name="Background (gray-50)" className="bg-gray-50" hex="#f9fafb" />
        <Swatch name="Border (gray-100)" className="bg-gray-100" hex="#f3f4f6" />
        <Swatch name="Text (gray-900)" className="bg-gray-900" hex="#111827" />
      </Card>
    </Section>
  )
}

/* ---------- Typography ---------- */

function TypographySection() {
  return (
    <Section title="Typography">
      <Card>
        <p className="text-[17px] font-bold text-gray-900">17px Bold — AppBar title</p>
        <p className="text-[15px] font-bold text-gray-900">15px Bold — Item title</p>
        <p className="text-[15px] font-semibold text-gray-900">15px Semibold — Button label</p>
        <p className="text-sm font-medium text-gray-700">14px Medium — Body</p>
        <p className="text-xs text-gray-400">12px Regular — Caption</p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          10px Bold Uppercase — Tag
        </p>
      </Card>
    </Section>
  )
}

/* ---------- Buttons ---------- */

function ButtonsSection() {
  return (
    <Section title="Buttons">
      <Card>
        <button
          type="button"
          className="w-full py-3.5 rounded-2xl bg-green-600 text-white text-[15px] font-semibold active:bg-green-700"
          style={{ minHeight: 52 }}
        >
          Primary
        </button>
        <button
          type="button"
          className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 text-[15px] font-semibold active:bg-gray-200"
          style={{ minHeight: 52 }}
        >
          Secondary
        </button>
        <button
          type="button"
          className="w-full py-3.5 rounded-2xl bg-red-600 text-white text-[15px] font-semibold active:bg-red-700"
          style={{ minHeight: 52 }}
        >
          Danger
        </button>
        <button
          type="button"
          className="w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-700 text-[15px] font-semibold active:bg-gray-50"
          style={{ minHeight: 52 }}
        >
          Outline
        </button>
        <button
          type="button"
          disabled
          className="w-full py-3.5 rounded-2xl bg-green-600 text-white text-[15px] font-semibold opacity-50"
          style={{ minHeight: 52 }}
        >
          Disabled
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 rounded-xl active:bg-green-100"
          >
            <Plus className="w-3.5 h-3.5" />
            Mini action
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-xl active:bg-red-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Mini danger
          </button>
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Pills, chips, status ---------- */

function PillsAndChipsSection() {
  return (
    <Section title="Pills & Chips">
      <Card>
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            Men's Doubles
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            Active
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
            Dev Only
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-200 text-blue-700">
              A
            </div>
            <span>Alex</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-200">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-200 text-red-700">
              B
            </div>
            <span>Bella</span>
          </div>
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Player items ---------- */

function PlayerItemsSection() {
  return (
    <Section title="Player Items">
      {/* List variant (Players page) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-green-700">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">Alex Nguyen</p>
          <p className="text-xs text-gray-400">12 matches · 7 wins</p>
        </div>
      </div>

      {/* Grid card — selected Team A */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="relative flex items-center gap-2 px-3.5 py-3.5 rounded-2xl border bg-blue-50 border-blue-400 shadow-sm">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-500 text-white">
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold truncate text-blue-900">Alex</p>
            <p className="text-xs font-medium text-blue-500">Team A</p>
          </div>
        </div>
        {/* Grid card — selected Team B */}
        <div className="relative flex items-center gap-2 px-3.5 py-3.5 rounded-2xl border bg-red-50 border-red-400 shadow-sm">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-500 text-white">
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold truncate text-red-900">Bella</p>
            <p className="text-xs font-medium text-red-500">Team B</p>
          </div>
        </div>
        {/* Grid card — unselected */}
        <div className="relative flex items-center gap-2 px-3.5 py-3.5 rounded-2xl border bg-white border-gray-200">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 text-gray-400">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold truncate text-gray-700">Chris</p>
          </div>
        </div>
        {/* Grid card — disabled */}
        <div className="relative flex items-center gap-2 px-3.5 py-3.5 rounded-2xl border bg-gray-50 border-gray-100 opacity-50">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 text-gray-400">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold truncate text-gray-700">Dana</p>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------- Session item ---------- */

function SessionItemSection() {
  return (
    <Section title="Session Item">
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-gray-900">Sunday Night Smash</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              May 18, 7:30 PM
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            Active
          </span>
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div>
          <p className="text-[15px] font-bold text-gray-900">Saturday, May 17, 2026</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            May 17, 6:00 PM
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------- Match card ---------- */

function MatchCardSection() {
  return (
    <Section title="Match Card">
      <div className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            Men's Doubles
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3" />
            May 18
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-right min-w-0 text-blue-700">
            <p className="text-sm truncate font-bold">Alex &amp; Chris</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-bold">
              <Trophy className="w-3 h-3" />
              Winner
            </span>
          </div>
          <div className="text-center px-1.5 shrink-0">
            <p className="text-sm font-bold text-gray-800 tabular-nums">21-15, 21-18</p>
          </div>
          <div className="flex-1 text-left min-w-0 text-gray-600">
            <p className="text-sm truncate font-medium">Bella &amp; Dana</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </div>
      </div>
    </Section>
  )
}

/* ---------- Form inputs ---------- */

function FormInputsSection() {
  return (
    <Section title="Form Inputs">
      <Card>
        <input
          type="text"
          placeholder="Text input"
          className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          style={{ minHeight: 52 }}
        />
        <div className="relative">
          <select
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ minHeight: 52 }}
          >
            <option>Men's Doubles</option>
            <option>Mixed Doubles</option>
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Score entry ---------- */

function ScoreEntrySection() {
  return (
    <Section title="Score Entry">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3">
        <span className="text-xs font-bold text-gray-400 w-10 shrink-0">Set 1</span>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <input
            type="number"
            defaultValue={21}
            className="w-16 h-11 text-center bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <span className="text-sm text-gray-300 font-bold">-</span>
          <input
            type="number"
            defaultValue={15}
            className="w-16 h-11 text-center bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>
        <button className="p-2.5 text-gray-300 rounded-xl">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-semibold border-2 bg-blue-500 text-white border-blue-500 shadow-sm"
          style={{ minHeight: 56 }}
        >
          <Trophy className="w-5 h-5" />
          Team A
        </button>
        <button
          className="flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-semibold border-2 bg-white text-gray-700 border-gray-200"
          style={{ minHeight: 56 }}
        >
          <Trophy className="w-5 h-5" />
          Team B
        </button>
      </div>
    </Section>
  )
}

/* ---------- Team headers ---------- */

function TeamHeadersSection() {
  return (
    <Section title="Team Containers">
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Team A</span>
          <span className="text-xs text-blue-400">2/2</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-200 text-blue-700">
              A
            </div>
            <span>Alex</span>
          </div>
        </div>
      </div>
      <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Team B</span>
          <span className="text-xs text-red-400">2/2</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-200">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-200 text-red-700">
              B
            </div>
            <span>Bella</span>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------- FAB ---------- */

function FabSection() {
  return (
    <Section title="Floating Action Button">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Anchored bottom-right of mobile container.</p>
          <button
            type="button"
            aria-label="Demo FAB"
            className="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg shadow-green-600/25 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Modal ---------- */

function ModalSection() {
  return (
    <Section title="Confirmation Modal">
      <div className="bg-black/40 rounded-2xl p-4">
        <div className="bg-white rounded-2xl p-5 w-full max-w-xs mx-auto space-y-4">
          <p className="text-[15px] font-bold text-gray-900">Delete Player?</p>
          <p className="text-sm text-gray-500">
            This will remove the player permanently.
          </p>
          <div className="flex gap-3">
            <button className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700">
              Cancel
            </button>
            <button className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------- Empty + Loading ---------- */

function EmptyAndLoadingSection() {
  return (
    <Section title="Empty & Loading">
      <Card>
        <div className="text-center py-8">
          <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No players yet.</p>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    </Section>
  )
}
