import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Logo } from '../components/brand/Logo'
import { ArrowUpIcon, ClockIcon, FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import type { Settings } from '../types'

export function Footer({ settings, onTop }: { settings: Settings | null; onTop: () => void }) {
  const { lang, t } = useI18n()
  const s = settings
  const local = (en: string | null | undefined, ar: string | null | undefined) => (lang === 'ar' ? ar || en : en || ar)

  const address = local(s?.address_en, s?.address_ar)
  const hours = local(s?.hours_en, s?.hours_ar)
  const note = local(s?.note_en, s?.note_ar)
  const whatsapp = s?.whatsapp?.replace(/[^\d]/g, '')

  const socials = [
    s?.instagram && { href: s.instagram, label: 'Instagram', icon: <InstagramIcon size={20} /> },
    s?.facebook && { href: s.facebook, label: 'Facebook', icon: <FacebookIcon size={20} /> },
    whatsapp && { href: `https://wa.me/${whatsapp}`, label: 'WhatsApp', icon: <WhatsappIcon size={20} /> },
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode }[]

  return (
    <footer className="footer">
      <svg className="footer__edge" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0v20c240 26 480 40 720 40s480-14 720-40V0H0Z" />
      </svg>

      <div className="container footer__inner">
        <motion.div
          className="footer__logo"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <Logo />
        </motion.div>

        {(address || hours || s?.phone) && (
          <div className="footer__info">
            {address && (
              <div className="footer__block">
                <PinIcon size={20} />
                <div>
                  <p className="footer__label">{t('visitUs')}</p>
                  <p>{address}</p>
                  {s?.map_url && (
                    <a href={s.map_url} target="_blank" rel="noreferrer" className="footer__link">
                      {t('directions')}
                    </a>
                  )}
                </div>
              </div>
            )}
            {hours && (
              <div className="footer__block">
                <ClockIcon size={20} />
                <div>
                  <p className="footer__label">{t('openingHours')}</p>
                  <p className="footer__pre">{hours}</p>
                </div>
              </div>
            )}
            {s?.phone && (
              <div className="footer__block">
                <PhoneIcon size={20} />
                <div>
                  <p className="footer__label">{t('getInTouch')}</p>
                  <a href={`tel:${s.phone.replace(/\s/g, '')}`} dir="ltr" className="footer__link">
                    {s.phone}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {socials.length > 0 && (
          <ul className="footer__socials">
            {socials.map((social) => (
              <li key={social.label}>
                <motion.a href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} whileHover={{ y: -3, rotate: -6 }}>
                  {social.icon}
                </motion.a>
              </li>
            ))}
          </ul>
        )}

        {note && <p className="footer__note">{note}</p>}

        <button className="footer__top" onClick={onTop}>
          <ArrowUpIcon size={16} />
          {t('backToTop')}
        </button>

        <p className="footer__copy">
          © {new Date().getFullYear()} {lang === 'ar' ? s?.name_ar : s?.name_en}
        </p>
      </div>
    </footer>
  )
}
