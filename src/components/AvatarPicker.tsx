import { useRef } from 'react'
import { Camera, ImageIcon, Trash2, X } from 'lucide-react'
import { getMultiavatarSvgUrl } from '../lib/avatar'
import { useI18n } from '../i18n'

interface AvatarPickerProps {
  currentAvatarUrl?: string | null
  onSelect: (file: File) => void
  onSelectDefault: (url: string) => void
  onRemove: () => void
  onClose: () => void
}

const DEFAULT_AVATARS = Array.from(
  { length: 10 },
  (_, i) => `https://multiavatar.com/${i + 1}`,
)

export default function AvatarPicker({
  currentAvatarUrl,
  onSelect,
  onSelectDefault,
  onRemove,
  onClose,
}: AvatarPickerProps) {
  const { t } = useI18n()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const hasAvatar = !!currentAvatarUrl

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSelect(file)
      onClose()
    }
    e.target.value = ''
  }

  const handleSelectDefault = (url: string) => {
    onSelectDefault(url)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl p-4 space-y-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

        {/* Default avatar grid */}
        <div className="pb-2">
          <p className="text-xs font-medium text-gray-500 mb-3 px-1">{t('avatar.chooseDefault')}</p>
          <div className="grid grid-cols-5 gap-3">
            {DEFAULT_AVATARS.map((url) => {
              const isSelected = currentAvatarUrl === url
              const id = url.split('/').pop() ?? '1'
              return (
                <button
                  key={url}
                  onClick={() => handleSelectDefault(url)}
                  className={`relative w-14 h-14 rounded-full overflow-hidden transition-all ${
                    isSelected
                      ? 'ring-2 ring-green-500 ring-offset-2'
                      : 'hover:opacity-80'
                  }`}
                >
                  <img
                    src={getMultiavatarSvgUrl(id)}
                    alt={t('avatar.defaultAlt')}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 my-1" />

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 rounded-xl transition-colors"
        >
          <Camera className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] font-medium text-gray-900">{t('avatar.takePhoto')}</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 rounded-xl transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] font-medium text-gray-900">{t('avatar.chooseGallery')}</span>
        </button>

        {hasAvatar && (
          <button
            onClick={() => { onRemove(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            <span className="text-[15px] font-medium text-red-600">{t('avatar.removePhoto')}</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 mt-2 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
          <span className="text-[15px] font-medium text-gray-600">{t('common.cancel')}</span>
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFile}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
