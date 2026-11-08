import { useEffect, useRef, useState } from 'react'
import { uploadExerciseImage } from '../../services/exerciseApi.js'
import { useFavoritesStore } from '../../features/favorites/useFavoritesStore.js'
import { useRecentStore } from '../../features/recent/useRecentStore.js'
import { useWorkoutStore } from '../../features/workout/useWorkoutStore.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = {
  '.jpg': ['image/jpeg', 'image/jpg'],
  '.jpeg': ['image/jpeg', 'image/jpg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
}

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function getValidationError(file) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLocaleLowerCase()
  const acceptedTypes = ALLOWED_TYPES[extension]

  if (!acceptedTypes || (file.type && !acceptedTypes.includes(file.type.toLocaleLowerCase()))) {
    return 'Choose a JPG, JPEG, PNG, GIF, or WEBP image.'
  }
  if (file.size === 0) return 'The selected image is empty. Choose another file.'
  if (file.size > MAX_FILE_SIZE) return 'The image must be 5 MB or smaller.'
  return ''
}

export default function ExerciseImageUpload({ exerciseId, onImageUploaded }) {
  const inputRef = useRef(null)
  const uploadLockRef = useRef(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const updateFavoriteImage = useFavoritesStore((state) => state.updateExerciseImage)
  const updateRecentImage = useRecentStore((state) => state.updateExerciseImage)
  const updateWorkoutImage = useWorkoutStore((state) => state.updateExerciseImage)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function chooseFile(event) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError('')
    setSuccess('')
    setSelectedFile(null)
    setPreviewUrl('')

    if (files.length !== 1) {
      if (files.length > 1) setError('Select one image at a time.')
      return
    }

    const file = files[0]
    const validationError = getValidationError(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function cancelSelection() {
    setSelectedFile(null)
    setPreviewUrl('')
    setError('')
    setSuccess('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function submitUpload(event) {
    event.preventDefault()
    if (!selectedFile || uploadLockRef.current) return

    uploadLockRef.current = true
    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const uploaded = await uploadExerciseImage(exerciseId, selectedFile)
      updateFavoriteImage(exerciseId, uploaded.imageUrl)
      updateRecentImage(exerciseId, uploaded.imageUrl)
      updateWorkoutImage(exerciseId, uploaded.imageUrl)
      onImageUploaded(uploaded.imageUrl)
      setSelectedFile(null)
      setPreviewUrl('')
      setSuccess('Image uploaded successfully.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed. Please try again.')
    } finally {
      uploadLockRef.current = false
      setUploading(false)
    }
  }

  return (
    <section className="exercise-image-upload" aria-labelledby="exercise-image-upload-title">
      <div className="exercise-image-upload__heading">
        <div>
          <p className="eyebrow">PERSONALIZE THIS EXERCISE</p>
          <h2 id="exercise-image-upload-title">Exercise image</h2>
          <p className="muted">Choose a JPG, PNG, GIF, or WEBP image up to 5 MB.</p>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
          onChange={chooseFile}
          aria-label="Choose an exercise image"
          tabIndex={-1}
        />
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {selectedFile ? 'Choose another image' : 'Upload Image'}
        </button>
      </div>

      {selectedFile && (
        <form className="exercise-image-upload__selection" onSubmit={submitUpload}>
          <img className="exercise-image-upload__preview" src={previewUrl} alt="Preview of selected exercise image" />
          <div className="exercise-image-upload__file">
            <strong>{selectedFile.name}</strong>
            <span className="muted">{formatFileSize(selectedFile.size)}</span>
          </div>
          <div className="exercise-image-upload__actions">
            <button type="submit" className="btn btn--primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Confirm upload'}
            </button>
            <button type="button" className="btn" onClick={cancelSelection} disabled={uploading}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="exercise-image-upload__message exercise-image-upload__message--error" role="alert">{error}</p>}
      {success && <p className="exercise-image-upload__message exercise-image-upload__message--success" role="status">{success}</p>}
    </section>
  )
}
