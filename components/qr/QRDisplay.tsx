// components/qr/QRDisplay.tsx
// Works both in admin (window.location.origin) and generates correct
// /attend/[token] URLs. On Vercel this will be your production domain.
'use client'
import { QRCodeCanvas } from 'qrcode.react'
import { useState } from 'react'
import { Download, QrCode, X } from 'lucide-react'

interface Props {
  token:    string
  label?:   string
  title?:   string
  subtitle?: string
  showDownload?: boolean
}

const FONT = 'Tahoma, Geneva, Verdana, sans-serif'

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight = 'bold'
): number {
  let s = size
  ctx.font = `${weight} ${s}px ${FONT}`
  while (ctx.measureText(text).width > maxWidth && s > 16) {
    s -= 2
    ctx.font = `${weight} ${s}px ${FONT}`
  }
  return s
}

const BRAND = '#0d2346'

export default function QRDisplay({
  token,
  label = 'Scan to attend',
  title,
  subtitle,
  showDownload = true,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url    = `${origin}/attend/${token}`

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadQR() {
    // Both the inline card and the fullscreen overlay render a canvas with
    // this id — take the largest one so we always export the sharpest copy.
    const canvases = Array.from(
      document.querySelectorAll<HTMLCanvasElement>(`canvas[id="qr-${token}"]`)
    )
    const qr = canvases.sort((a, b) => b.width - a.width)[0]
    if (!qr) return

    const W      = 1200
    const pad    = 80
    const inner  = W - pad * 2
    const qrSize = Math.min(inner, 760)

    const probe = document.createElement('canvas').getContext('2d')!
    const titleSize   = title ? fitFont(probe, title, inner, 76) : 0
    const subtitleSize = subtitle ? fitFont(probe, subtitle, inner, 44, 'bold') : 0

    const titleH   = title ? titleSize + 34 : 0
    const subH     = subtitle ? subtitleSize + 26 : 0
    const scanSize = 108
    const scanH    = scanSize + 30
    const H = pad + titleH + subH + (title || subtitle ? 34 : 0) + qrSize + 54 + scanH + pad

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    let y = pad

    if (title) {
      ctx.fillStyle = BRAND
      ctx.font = `bold ${titleSize}px ${FONT}`
      ctx.fillText(title, W / 2, y + titleSize)
      y += titleH
    }

    if (subtitle) {
      ctx.fillStyle = '#546e7a'
      ctx.font = `bold ${subtitleSize}px ${FONT}`
      ctx.fillText(subtitle, W / 2, y + subtitleSize)
      y += subH
    }

    if (title || subtitle) y += 34

    // QR block, framed like the on-screen card
    const x = (W - qrSize) / 2
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 4
    ctx.strokeRect(x - 14, y - 14, qrSize + 28, qrSize + 28)
    ctx.drawImage(qr, x, y, qrSize, qrSize)
    y += qrSize + 54

    ctx.fillStyle = BRAND
    ctx.font = `bold ${scanSize}px ${FONT}`
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px'
    ctx.fillText('SCAN ME!', W / 2, y + scanSize)

    const link = document.createElement('a')
    const name = (title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    link.download = `qr-${name}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <QRCodeCanvas
          id={`qr-${token}`}
          value={url}
          size={200}
          level="H"
          includeMargin
        />
      </div>
      <p className="text-sm text-gray-500 text-center">{label}</p>
      <p className="text-xs text-gray-400 break-all text-center max-w-xs">{url}</p>

      {showDownload && (
        <div className="flex gap-2">
          <button
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <QrCode className="h-3.5 w-3.5" /> Display QR
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
          <button
            onClick={downloadQR}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" /> Download QR
          </button>
        </div>
      )}

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="relative flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFullscreen(false)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <QRCodeCanvas
                id={`qr-${token}`}
                value={url}
                size={320}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-lg font-medium text-white text-center">{label}</p>
            <p className="text-sm text-white/60 text-center max-w-sm break-all">{url}</p>
          </div>
        </div>
      )}
    </div>
  )
}