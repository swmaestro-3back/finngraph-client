import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountRow } from '@/components/account/AccountRow'
import { NicknameRow } from '@/components/account/NicknameRow'
import { PasswordChangeForm } from '@/components/account/PasswordChangeForm'
import { Button } from '@/components/ui/button'
import type { MeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'

const PROVIDER_LABEL: Record<MeRes['provider'], string> = {
  EMAIL: '이메일',
  KAKAO: '카카오',
}

const SECTION_TITLE = 'mb-4 text-lg font-medium tracking-[-0.4px] text-foreground'

export default function AccountSettingsPage() {
  const { user } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="account-profile" className="card-surface p-5">
        <h2 id="account-profile" className={SECTION_TITLE}>
          프로필
        </h2>
        <dl>
          <NicknameRow />
        </dl>
      </section>

      <section aria-labelledby="account-login" className="card-surface p-5">
        <h2 id="account-login" className={SECTION_TITLE}>
          로그인 정보
        </h2>
        <dl>
          <AccountRow label="로그인 방식">{PROVIDER_LABEL[user.provider]}</AccountRow>
          <AccountRow label="이메일">
            <span className="block truncate">{user.email ?? '—'}</span>
          </AccountRow>
          <AccountRow label="가입일">
            <time dateTime={user.joinedAt}>{user.joinedAt.slice(0, 10)}</time>
          </AccountRow>
          <AccountRow label="비밀번호">
            {user.provider === 'EMAIL' ? (
              changingPassword ? (
                <PasswordChangeForm onClose={() => setChangingPassword(false)} />
              ) : (
                <div className="flex min-h-7 items-center justify-between gap-3">
                  <span className="font-mono tracking-[2px] text-foreground-secondary">••••••••</span>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="비밀번호 변경"
                    onClick={() => setChangingPassword(true)}
                  >
                    변경
                  </Button>
                </div>
              )
            ) : (
              <span className="text-muted-foreground">카카오 계정으로 로그인해요</span>
            )}
          </AccountRow>
        </dl>
      </section>

      <section aria-labelledby="account-delete" className="card-surface p-5">
        <h2 id="account-delete" className={SECTION_TITLE}>
          계정 삭제
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-muted-foreground">
            탈퇴하면 계정과 관심 목록이 모두 삭제돼요.
          </p>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/me/account/withdraw">회원 탈퇴</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
