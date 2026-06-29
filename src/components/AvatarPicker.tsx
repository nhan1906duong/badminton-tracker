import { Camera, ImageIcon, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import {
  BottomSheet,
  BottomSheetCancel,
  BottomSheetDivider,
  BottomSheetItem,
} from '../../design-system/components'
import { useI18n } from '../i18n'
import { getMultiavatarSvgUrl } from '../lib/avatar'

interface AvatarPickerProps {
  open: boolean
  currentAvatarUrl?: string | null
  onSelect: (file: File) => void
  onSelectDefault: (url: string) => void
  onRemove: () => void
  onClose: () => void
}

const DEFAULT_AVATARS = Array.from({ length: 10 }, (_, i) => `https://multiavatar.com/${i + 1}`)

export default function AvatarPicker({
  open,
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
    <BottomSheet open={open} onClose={onClose}>
      <p
        className="px-1"
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: 'var(--muted)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {t('avatar.chooseDefault')}
      </p>
      <div className="grid grid-cols-5 gap-3 pb-2">
        {DEFAULT_AVATARS.map(url => {
          const isSelected = currentAvatarUrl === url
          const id = url.split('/').pop() ?? '1'
          return (
            <button
              key={url}
              onClick={() => handleSelectDefault(url)}
              className={`relative w-14 h-14 rounded-full overflow-hidden transition-all ${
                isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2' : 'active:opacity-80'
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

      <BottomSheetDivider />

      <BottomSheetItem
        icon={<Camera size={20} />}
        label={t('avatar.takePhoto')}
        onClick={() => cameraInputRef.current?.click()}
      />
      <BottomSheetItem
        icon={<ImageIcon size={20} />}
        label={t('avatar.chooseGallery')}
        onClick={() => galleryInputRef.current?.click()}
      />
      {hasAvatar && (
        <BottomSheetItem
          icon={<Trash2 size={20} />}
          label={t('avatar.removePhoto')}
          onClick={() => {
            onRemove()
            onClose()
          }}
          danger
        />
      )}

      <BottomSheetCancel onClick={onClose} />

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
    </BottomSheet>
  )
}
