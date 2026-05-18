import { useRef } from 'react'
import { Camera, ImageIcon, Trash2, X } from 'lucide-react'

interface AvatarPickerProps {
  onSelect: (file: File) => void
  onRemove: () => void
  onClose: () => void
  hasAvatar: boolean
}

export default function AvatarPicker({ onSelect, onRemove, onClose, hasAvatar }: AvatarPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSelect(file)
      onClose()
    }
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl p-4 space-y-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 rounded-xl transition-colors"
        >
          <Camera className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] font-medium text-gray-900">Take Photo</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 rounded-xl transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] font-medium text-gray-900">Choose from Gallery</span>
        </button>

        {hasAvatar && (
          <button
            onClick={() => { onRemove(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            <span className="text-[15px] font-medium text-red-600">Remove Photo</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 mt-2 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
          <span className="text-[15px] font-medium text-gray-600">Cancel</span>
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
