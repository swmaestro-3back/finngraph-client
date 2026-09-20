import { useEffect, useState } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 1초마다 갱신되는 현재 시각 (브라우저 로컬) */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 브라우저 로컬 기준 "YYYY-MM-DD (요일)" */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`
}

/** 브라우저 로컬 기준 "HH:mm:ss" */
export function formatLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 한국 정규장(평일 09:00–15:30 KST) 개장 여부. 사용자 시간대와 무관하게 KST로 판정 */
export function isKrxOpen(d: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = get('weekday')
  if (weekday === 'Sat' || weekday === 'Sun') return false
  const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'))
  return minutes >= 9 * 60 && minutes < 15 * 60 + 30
}
