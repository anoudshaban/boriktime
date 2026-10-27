import { useId, type CSSProperties } from 'react'
import { CategoryIcon } from '../components/icons'

type Size = 'g' | 'm' | 'xl'

type Props = {
  /** Section icon drawn in the centre of the plate. */
  icon: string
  /** Seed so neighbouring dishes get different rims and spin speeds. */
  seed: number
  size?: Size
  spin?: boolean
}

/**
 * Stand-in for dishes without a photo: a porcelain plate tilted in 3D and
 * slowly turning, with a burgundy rim and the section's motif in the well.
 */
export function Plate({ icon, seed, size = 'm', spin = false }: Props) {
  const id = useId().replace(/:/g, '')
  const variant = seed % 3
  const style = {
    '--dur': `${18 + (seed % 5) * 3}s`,
    '--dir': seed % 2 ? 'reverse' : 'normal',
  } as CSSProperties

  return (
    <div className={`plate plate--${size}`} style={style} aria-hidden="true">
      <span className="plate__shadow" />
      <div className="plate__tilt">
        <div className={spin ? 'plate__spin' : undefined}>
          <svg viewBox="0 0 200 200">
            <defs>
              <radialGradient id={`${id}-face`} cx="42%" cy="38%" r="70%">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.55" stopColor="#f7f1e7" />
                <stop offset="1" stopColor="#e2d6c4" />
              </radialGradient>
              <radialGradient id={`${id}-well`} cx="50%" cy="45%" r="60%">
                <stop offset="0" stopColor="#fdfbf7" />
                <stop offset="1" stopColor="#eee5d6" />
              </radialGradient>
            </defs>

            <circle cx="100" cy="100" r="97" fill={`url(#${id}-face)`} stroke="#d6c9b5" strokeWidth="1" />
            <circle cx="100" cy="100" r="89" fill="none" stroke="#7b1416" strokeOpacity=".6" strokeWidth="1.4" />

            {variant === 0 && (
              <circle cx="100" cy="100" r="80" fill="none" stroke="#a67c33" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.1 7.2" />
            )}
            {variant === 1 && (
              <circle cx="100" cy="100" r="80" fill="none" stroke="#7b1416" strokeOpacity=".55" strokeWidth="5" strokeDasharray="1.2 6.6" />
            )}
            {variant === 2 && (
              <>
                <circle cx="100" cy="100" r="82.5" fill="none" stroke="#a67c33" strokeWidth=".9" />
                <circle cx="100" cy="100" r="77.5" fill="none" stroke="#a67c33" strokeWidth=".9" />
              </>
            )}

            <circle cx="100" cy="100" r="68" fill={`url(#${id}-well)`} stroke="#e0d3c0" strokeWidth="1" />
            <CategoryIcon name={icon} x={64} y={64} width={72} height={72} size={72} strokeWidth={1.15} color="#7b1416" />
          </svg>
        </div>
      </div>
    </div>
  )
}
