import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountRow } from '@/components/account/AccountRow'
import { NicknameRow } from '@/components/account/NicknameRow'
import { PasswordChangeForm } from '@/components/account/PasswordChangeForm'
import type { MeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'

const PROVIDER_LABEL: Record<MeRes['provider'], string> = {
  EMAIL: '이메일',
  KAKAO: '카카오',
}

export default function AccountSettingsPage() {
  const { user } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)

  if (!user) return null

  return (
    <div className="fg-acct">
      <section aria-labelledby="account-profile" className="fg-section fg-acct-sec">
        <h2 id="account-profile" className="fg-acct__h">
          프로필
        </h2>
        <dl>
          <NicknameRow />
        </dl>
      </section>

      <section aria-labelledby="account-login" className="fg-section fg-acct-sec">
        <h2 id="account-login" className="fg-acct__h">
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
                <div className="fg-acct__line">
                  <span className="fg-acct__dots">••••••••</span>
                  <button
                    type="button"
                    className="fg-btn fg-btn--tertiary fg-btn--sm"
                    aria-label="비밀번호 변경"
                    onClick={() => setChangingPassword(true)}
                  >
                    변경
                  </button>
                </div>
              )
            ) : (
              <span className="fg-acct__muted">카카오 계정으로 로그인해요</span>
            )}
          </AccountRow>
        </dl>
      </section>

      <section aria-labelledby="account-delete" className="fg-section fg-acct-sec">
        <h2 id="account-delete" className="fg-acct__h">
          계정 삭제
        </h2>
        <div className="fg-acct__del">
          <p>탈퇴하면 계정과 관심 목록이 모두 삭제돼요.</p>
          <Link to="/me/account/withdraw" className="fg-btn fg-btn--tertiary fg-btn--sm fg-acct__danger">
            회원 탈퇴
          </Link>
        </div>
      </section>
    </div>
  )
}
