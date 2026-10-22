// Lucian UX/UI Prompt #033 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#033
import { useState } from 'react'
import { AccountRow } from '@/components/account/AccountRow'
import { ApiError, patchData } from '@/lib/api'
import type { MeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function NicknameRow() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(0)

  if (!user) return null

  const startEdit = () => {
    setNickname(user.nickname)
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await patchData<MeRes>('/v1/me/nickname', { nickname })
      updateUser(updated)
      setEditing(false)
      setSaved((count) => count + 1)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_PARAMETER') {
        const fields = err.details?.fieldErrors as Record<string, string> | undefined
        setError(fields?.nickname ?? '닉네임은 2~20자로 입력해 주세요')
      } else {
        setError('저장하지 못했습니다. 다시 시도해 주세요')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountRow label="닉네임" labelId="nickname-label">
      {editing ? (
        <form
          className={cn('fg-nick', error && 'is-bad')}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <span className="fg-nick__field">
            <input
              id="nickname"
              className="fg-nick__in"
              aria-labelledby="nickname-label"
              aria-invalid={error !== null}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
              disabled={saving}
              maxLength={20}
              autoFocus
            />
            <span aria-hidden className="fg-nick__line" />
          </span>
          <span className="fg-nick__count">{nickname.trim().length}/20</span>
          <button
            type="submit"
            className="fg-nick__act fg-nick__act--ok"
            disabled={saving || nickname.trim().length < 2}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            className="fg-nick__act"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            취소
          </button>
        </form>
      ) : (
        <div className="fg-nick__view">
          <span aria-hidden className="fg-nick__av">
            {Array.from(user.nickname)[0]}
          </span>
          <span key={saved} className={cn('fg-nick__name', saved > 0 && 'is-flash')}>
            {user.nickname}
          </span>
          <button
            type="button"
            className="fg-btn fg-btn--tertiary fg-btn--sm"
            aria-label="닉네임 변경"
            onClick={startEdit}
          >
            변경
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="fg-acct__err">
          {error}
        </p>
      )}
    </AccountRow>
  )
}
