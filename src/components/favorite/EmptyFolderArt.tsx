// Lucian UX/UI Prompt #088 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#088
export function EmptyFolderArt() {
  return (
    <span className="fg-efold">
      <svg className="fg-efold__svg" viewBox="0 0 168 128">
        <path
          className="fg-efold__back"
          d="M16 26a10 10 0 0 1 10-10h34a8 8 0 0 1 6 2.6l8 8.4h68a10 10 0 0 1 10 10v66a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10z"
        />
        <g className="fg-efold__paper fg-efold__paper--a">
          <rect x="30" y="26" width="92" height="72" rx="6" />
          <path d="M42 40h48M42 50h62M42 60h36" />
        </g>
        <g className="fg-efold__paper fg-efold__paper--b">
          <rect x="50" y="32" width="90" height="68" rx="6" />
          <path d="M62 46h52M62 56h64M62 66h30" />
        </g>
        <g className="fg-efold__front">
          <path d="M10 50a10 10 0 0 1 10-10h128a10 10 0 0 1 10 10.8l-5 52a10 10 0 0 1-10 9.2H25a10 10 0 0 1-10-9.2z" />
          <path className="fg-efold__shine" d="M22 47h124" />
          <rect className="fg-efold__tab" x="66" y="72" width="36" height="8" rx="4" />
        </g>
      </svg>
      <span className="fg-efold__shadow" />
    </span>
  )
}
