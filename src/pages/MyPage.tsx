// 마이페이지 — Design Ref: §5.3 MyPage
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, deleteData, patchData } from '@/lib/api'
import type { MeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'

const PROVIDER_LABEL: Record<MeRes['provider'], string> = {
  EMAIL: '이메일',
  KAKAO: '카카오',
}

export default function MyPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)

  // 가드(App)가 anonymous를 /login으로 보내지만, 로딩 틈의 null도 방어한다
  if (!user) return null

  const startEdit = () => {
    setNickname(user.nickname)
    setError(null)
    setEditing(true)
  }

  const saveNickname = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await patchData<MeRes>('/v1/me/nickname', { nickname })
      updateUser(updated)
      setEditing(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_PARAMETER') {
        const fields = err.details?.fieldErrors as Record<string, string> | undefined
        setError(fields?.nickname ?? '닉네임을 확인해 주세요')
      } else {
        setError('저장에 실패했습니다. 다시 시도해 주세요')
      }
    } finally {
      setSaving(false)
    }
  }

  const withdraw = async () => {
    setWithdrawing(true)
    try {
      await deleteData('/v1/me')
      await logout()
      navigate('/', { replace: true })
    } catch {
      setWithdrawing(false)
    }
  }

  return (
    <div className="page-container flex justify-center pt-12 pb-24">
      <div className="w-full max-w-md">
        <h1 className="mb-5 text-xl font-semibold tracking-[-0.4px] text-foreground">내 정보</h1>

        <div className="card-surface flex flex-col gap-4 p-5">
          <div>
            <div className="text-caption text-muted-foreground">닉네임</div>
            {editing ? (
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
                <Button size="sm" onClick={saveNickname} disabled={saving}>
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  취소
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-body font-medium text-foreground">{user.nickname}</span>
                <Button size="sm" variant="ghost" onClick={startEdit}>
                  수정
                </Button>
              </div>
            )}
            {error && <p className="mt-1 text-caption text-destructive">{error}</p>}
          </div>

          <div>
            <div className="text-caption text-muted-foreground">이메일</div>
            <div className="mt-1 text-body text-foreground">{user.email ?? '—'}</div>
          </div>

          <div>
            <div className="text-caption text-muted-foreground">가입 방식</div>
            <div className="mt-1 text-body text-foreground">{PROVIDER_LABEL[user.provider]}</div>
          </div>

          <div>
            <div className="text-caption text-muted-foreground">가입일</div>
            <div className="mt-1 text-body text-foreground">{user.joinedAt.slice(0, 10)}</div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                회원 탈퇴
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>정말 탈퇴할까요?</DialogTitle>
                <DialogDescription>
                  계정과 로그인 정보가 삭제되며 되돌릴 수 없습니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive" onClick={withdraw} disabled={withdrawing}>
                  {withdrawing ? '처리 중…' : '탈퇴하기'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
