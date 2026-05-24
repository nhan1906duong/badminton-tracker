import { useState } from 'react'
import { useCreatePlayer } from '../hooks/usePlayers'
import { X, UserPlus } from 'lucide-react'
import { useI18n } from '../i18n'

interface PlayerFormProps {
  onClose: () => void
}

export default function PlayerForm({ onClose }: PlayerFormProps) {
  const { t } = useI18n()
  const createPlayer = useCreatePlayer()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError(t('playerForm.nameRequired'))
      return
    }
    if (name.trim().length > 100) {
      setError(t('playerForm.nameTooLong'))
      return
    }
    try {
      await createPlayer.mutateAsync({ name: name.trim(), email: email.trim() || undefined })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('playerForm.failedCreate'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{t('playerForm.addPlayer')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('playerForm.name')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('playerForm.namePlaceholder')}
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('playerForm.emailOptional')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={createPlayer.isPending}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {createPlayer.isPending ? t('common.creating') : t('playerForm.addPlayer')}
          </button>
        </form>
      </div>
    </div>
  )
}
