import type { Pawn } from '../lib/engine'
import * as m from '../i18n/game'
import { Icon } from './Icon'

function StatMeter({
  name,
  note,
  value,
  max,
  filledClass,
}: {
  name: string
  note?: string
  value: number
  max: number
  filledClass: string
}) {
  return (
    <div className="w-[60px] min-w-[60px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[49px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px]">
      <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px] max-[601px]:text-[8px]">
        {name}
        {note ? ' ' + note : ''}{' '}
        <b className="text-[9px] font-medium text-[#d9dfc9] max-[601px]:text-[8px]">
          {value}/{max}
        </b>
      </span>
      <div
        className="mt-[7px] flex w-full gap-[3px]"
        role="meter"
        aria-label={name}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {Array.from({ length: max }, (_, i) => (
          <i
            key={i}
            data-filled={i < value}
            className={
              'h-[5px] min-w-0 flex-1 rounded-[1px] bg-[#34483a] max-[601px]:h-1 ' + filledClass
            }
          />
        ))}
      </div>
    </div>
  )
}

export function UnitStats({ pawn }: { pawn: Pawn }) {
  return (
    <div
      className="flex items-center gap-[18px] min-[900px]:gap-7 max-[601px]:gap-2.5 max-[360px]:gap-2 [@media(min-width:600px)_and_(max-height:480px)]:gap-2.5"
      data-testid="unit-stats"
    >
      <StatMeter
        name={m.health}
        value={pawn.hp}
        max={pawn.maxHp}
        filledClass="data-[filled=true]:bg-[#b7c9a0]"
      />
      <StatMeter
        name={m.energy}
        note={pawn.bonusEnergy ? '+' + pawn.bonusEnergy : undefined}
        value={pawn.energy}
        max={pawn.maxEnergy}
        filledClass="data-[filled=true]:bg-[#d4bb7b]"
      />
      <div className="w-[60px] min-w-[43px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[41px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px] border-l border-line pl-3.5 [&_svg]:size-[15px] [&_small]:-ml-[3px] [&_small]:text-[10px] max-[601px]:pl-2 max-[601px]:[&_svg]:hidden [@media(min-width:600px)_and_(max-height:480px)]:pl-2">
        <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px] max-[601px]:text-[8px]">
          {m.escape}
        </span>
        <strong className="mt-0.5 flex items-center gap-1 text-[18px] leading-none font-medium text-[#bad0bb] max-[601px]:text-[17px]">
          <Icon name="escape" />
          {pawn.escapeChance}
          <small>%</small>
        </strong>
      </div>
    </div>
  )
}
