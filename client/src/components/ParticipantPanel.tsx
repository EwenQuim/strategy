import { BOTS, type BotName } from '../bots/catalog'
import { participantBot, type Participant } from '../bots/participants'
import * as m from '../i18n/menus'
import * as bots from '../i18n/bots'
import * as optionMessages from '../i18n/bot-options'
import { menuCardClassName, menuInputClassName } from './styles'

export function ParticipantPanel({
  side,
  participant,
  onChange,
  developerPreview,
  collapsed = false,
}: {
  side: 0 | 1
  participant: Participant
  onChange: (participant: Participant) => void
  developerPreview: boolean
  collapsed?: boolean
}) {
  const id = 'custom-player-' + side
  const selectedBot = BOTS[participant.name]
  const presets = Object.entries(selectedBot.presets)
  const preset =
    presets.find(
      ([, options]) => JSON.stringify(options) === JSON.stringify(participant.options),
    )?.[0] ?? 'custom'
  let valid = true
  try {
    participantBot(participant)
  } catch {
    valid = false
  }

  return (
    <details className={menuCardClassName + ' shrink-0 p-3 min-[900px]:p-5'} open={!collapsed}>
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-gold">
        {m.localSides[side]}
        <span className="ml-3 text-sm font-normal text-muted">
          {participant.human ? m.human : m.aiStrategies[participant.name]}
        </span>
      </summary>
      <div className="grid gap-3 pt-3">
        <div className="grid gap-1.5 text-sm text-muted">
          <label htmlFor={id + '-controller'}>{m.controller}</label>
          <select
            id={id + '-controller'}
            className={menuInputClassName}
            value={participant.human ? 'human' : 'ai'}
            onChange={(event) =>
              onChange({ ...participant, human: event.target.value === 'human' })
            }
          >
            <option value="human">{m.human}</option>
            <option value="ai">{m.ai}</option>
          </select>
        </div>
        {!participant.human && (
          <>
            <div className="grid gap-1.5 text-sm text-muted">
              <label htmlFor={id + '-strategy'}>{m.aiStrategy}</label>
              <select
                id={id + '-strategy'}
                className={menuInputClassName}
                aria-describedby={id + '-hint'}
                value={participant.name}
                onChange={(event) => {
                  const name = event.target.value as BotName
                  const registration = BOTS[name]
                  onChange({
                    ...participant,
                    name,
                    options: {
                      ...(registration.presets[preset] ?? registration.defaultConfig.options),
                    },
                  })
                }}
              >
                {Object.keys(BOTS)
                  .filter((name) => developerPreview || (name !== 'mistral' && name !== 'jev'))
                  .map((name) => (
                    <option key={name} value={name}>
                      {m.aiStrategies[name as BotName]}
                    </option>
                  ))}
              </select>
              <p id={id + '-hint'} className="text-xs leading-relaxed">
                {bots.strategyHints[participant.name]}
              </p>
            </div>
            {presets.length > 0 && (
              <div className="grid gap-1.5 text-sm text-muted">
                <label htmlFor={id + '-difficulty'}>{m.difficulty}</label>
                <select
                  id={id + '-difficulty'}
                  className={menuInputClassName}
                  value={preset}
                  onChange={(event) => {
                    const options = selectedBot.presets[event.target.value]
                    if (options) onChange({ ...participant, options: { ...options } })
                  }}
                >
                  {presets.map(([level]) => (
                    <option key={level} value={level}>
                      {m.difficulties[level as keyof typeof m.difficulties]}
                    </option>
                  ))}
                  <option value="custom" disabled>
                    {m.customOptions}
                  </option>
                </select>
              </div>
            )}
            {Object.keys(participant.options).length > 0 && (
              <details>
                <summary className="min-h-11 cursor-pointer content-center text-sm text-gold">
                  {m.aiOptions}
                </summary>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {Object.entries(participant.options).map(([name, value]) => (
                    <div key={name} className="grid gap-1.5 text-sm text-muted">
                      <label htmlFor={id + '-option-' + name}>
                        {optionMessages.names[name]}
                      </label>
                      <input
                        id={id + '-option-' + name}
                        className={menuInputClassName}
                        type={typeof value === 'number' ? 'number' : 'text'}
                        step="any"
                        value={String(value)}
                        onChange={(event) =>
                          onChange({
                            ...participant,
                            options: {
                              ...participant.options,
                              [name]:
                                typeof value === 'number'
                                  ? Number(event.target.value)
                                  : event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </details>
            )}
            {!valid && (
              <p role="alert" className="text-sm text-red-300">
                {m.invalidBotOptions}
              </p>
            )}
          </>
        )}
      </div>
    </details>
  )
}
