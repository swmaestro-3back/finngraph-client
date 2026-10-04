import { useState } from 'react'
import { AccountRow } from '@/components/account/AccountRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, patchData } from '@/lib/api'
import type { MeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'

export function NicknameRow() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          className="flex max-w-sm items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <Input
            id="nickname"
            aria-labelledby="nickname-label"
            aria-invalid={error !== null}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            disabled={saving}
            maxLength={20}
            autoFocus
          />
          <Button type="submit" size="sm" disabled={saving || nickname.trim().length < 2}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            취소
          </Button>
        </form>
      ) : (
        <div className="flex min-h-7 items-center justify-between gap-3">
          <span className="font-medium">{user.nickname}</span>
          <Button size="sm" variant="outline" aria-label="닉네임 변경" onClick={startEdit}>
            변경
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-caption text-destructive">
          {error}
        </p>
      )}
    </AccountRow>
  )
}
