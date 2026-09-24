export function Forest() {
  return (
    <g className="pointer-events-none">
      <ellipse cy="16" rx="21" ry="6" fill="#1b3429" opacity=".3" />
      {[-12, 11, 0].map((x, i) => (
        <g key={x} transform={'translate(' + x + ' ' + (i === 2 ? 2 : -4) + ')'}>
          <path d="M0 7v10" stroke="#c2b085" strokeWidth="2" />
          <path d="m0-18-10 15h4l-8 13h28L6-3h4Z" fill={i === 2 ? '#344f39' : '#3d5b40'} />
          <path d="M0-18V10h14L6-3h4Z" fill="#254332" opacity=".7" />
          <path d="m0-18-10 15h4l-8 13" fill="none" stroke="#9baf79" strokeOpacity=".4" />
        </g>
      ))}
    </g>
  )
}
