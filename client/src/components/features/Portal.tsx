export function Portal() {
  return (
    <>
      <ellipse cy="15" rx="19" ry="5" fill="#1b1418" opacity=".45" />
      <ellipse cy="6" rx="16" ry="13" fill="#2a2350" />
      <ellipse cy="6" rx="16" ry="13" fill="none" stroke="#8f7bd8" strokeWidth="1.4" />
      <ellipse cy="6" rx="11" ry="9" fill="#4b3a86" />
      <ellipse cy="6" rx="6" ry="5" fill="#171233" />
      <path
        d="M0-9a10 10 0 0 1 9 9M0 21a10 10 0 0 1-9-9"
        fill="none"
        stroke="#c9b7f2"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M-13 6q4-5 8 0t8 0"
        fill="none"
        stroke="#8f7bd8"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M0-16v-5M7-13l3-4M-7-13l-3-4"
        stroke="#c9b7f2"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  )
}
