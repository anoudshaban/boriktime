import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Logo } from '../components/brand/Logo'
import { api } from '../lib/api'
import type { Settings } from '../types'
import { Field, useToast } from './ui'

const WINE = '#5a1214'

function download(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

/**
 * The table QR code. It opens /welcome, where guests choose the menu or booking a table.
 */
export function QrPage() {
  const toast = useToast()
  const [url, setUrl] = useState(`${window.location.origin}/welcome`)
  const [png, setPng] = useState<string | null>(null)
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    api<Settings>('/admin/settings')
      .then((s) => setLogo(s.logo_url))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let live = true
    QRCode.toDataURL(url || ' ', { errorCorrectionLevel: 'M', margin: 1, width: 1024, color: { dark: WINE, light: '#ffffff' } })
      .then((data) => live && setPng(data))
      .catch(() => live && setPng(null))
    return () => {
      live = false
    }
  }, [url])

  const downloadSvg = async () => {
    const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: WINE, light: '#ffffff' } })
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    download(href, 'borektime-qr.svg')
    URL.revokeObjectURL(href)
  }

  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => {})
    toast('Link copied')
  }

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>QR code</h1>
          <p className="a-muted">Put it on the tables. Guests scan it and choose between the menu and booking a table.</p>
        </div>
      </header>

      <div className="a-qr">
        <section className="a-card">
          <h2 className="a-card__title">Where the code leads</h2>
          <Field label="Link" hint="The welcome page with the two choices. Change it only if you want the code to open a different page.">
            <input value={url} onChange={(e) => setUrl(e.target.value.trim())} dir="ltr" />
          </Field>
          <div className="a-qr__actions">
            <button className="a-btn a-btn--primary" disabled={!png} onClick={() => png && download(png, 'borektime-qr.png')}>
              Download PNG
            </button>
            <button className="a-btn a-btn--ghost" onClick={downloadSvg}>
              Download SVG (for print shops)
            </button>
            <button className="a-btn a-btn--ghost" onClick={() => window.print()}>
              Print table card
            </button>
            <button className="a-btn a-btn--ghost" onClick={copy}>
              Copy link
            </button>
            <a className="a-btn a-btn--ghost" href={url} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </div>
          <p className="a-muted">Tip: print it at least 3 × 3 cm. The SVG stays sharp at any size.</p>
        </section>

        <div className="a-qr-card">
          <div className="a-qr-card__logo">{logo ? <img src={logo} alt="Börek Time" /> : <Logo />}</div>
          <p className="a-qr-card__title">Scan for the menu & bookings</p>
          <p className="a-qr-card__title-ar" dir="rtl" lang="ar">
            امسح للقائمة وحجز الطاولات
          </p>
          <div className="a-qr-card__code">{png && <img src={png} alt={`QR code for ${url}`} />}</div>
          <div className="a-qr-card__tabs">
            <span>Menu</span>·<span>Book a table</span>
          </div>
          <p className="a-qr-card__url">{url.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>
    </div>
  )
}
