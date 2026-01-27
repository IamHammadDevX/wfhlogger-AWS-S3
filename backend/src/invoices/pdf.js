import fs from 'fs'
import path from 'path'

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

export async function generateInvoicePdf(invoice) {
  const PDFDocument = (await import('pdfkit')).default
  const baseDir = path.resolve(process.cwd(), process.env.DATA_DIR || 'data', 'invoices', String(invoice.company_id))
  ensureDir(baseDir)
  const fname = `${invoice.invoice_id}.pdf`
  const outfile = path.join(baseDir, fname)
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const stream = fs.createWriteStream(outfile)
  doc.pipe(stream)

  if (invoice.company_logo_url) {
    try { doc.image(path.resolve(process.cwd(), invoice.company_logo_url.replace(/^\//,'')), 50, 45, { width: 50 }) } catch {}
  }
  doc.fontSize(20).text(invoice.company_name || 'Company', 110, 50)
  doc.fontSize(10).fillColor('#666').text('Time Tracker SaaS', 110, 72)

  doc.moveDown()
  doc.fillColor('#000').fontSize(14).text('Invoice')
  doc.moveDown(0.5)
  doc.fontSize(10).text(`Invoice Number: ${invoice.invoice_id}`)
  doc.text(`Invoice Date: ${invoice.invoice_date}`)
  doc.text(`Billing Period: ${invoice.billing_period || 'One-time'}`)
  doc.text(`Billing Email: ${invoice.billing_email || ''}`)

  doc.moveDown()
  doc.fontSize(12).text('Items')
  doc.moveDown(0.5)
  let items = invoice.line_items || []
  if (typeof items === 'string') {
    try { items = JSON.parse(items) } catch { items = [] }
  }
  const startY = doc.y
  doc.fontSize(10)
  doc.text('Description', 50, startY)
  doc.text('Qty', 300, startY)
  doc.text('Unit', 350, startY)
  doc.text('Subtotal', 420, startY)
  let y = startY + 18
  items.forEach(it => {
    doc.text(it.description || '', 50, y)
    doc.text(String(it.quantity || 0), 300, y)
    doc.text(`$${Number(it.unit_price || 0).toFixed(2)}`, 350, y)
    doc.text(`$${Number(it.subtotal || 0).toFixed(2)}`, 420, y)
    y += 18
  })

  doc.moveDown()
  doc.text(`Subtotal: $${Number(invoice.subtotal_amount || 0).toFixed(2)}`, { align: 'right' })
  doc.text(`Tax: $${Number(invoice.tax_amount || 0).toFixed(2)}`, { align: 'right' })
  doc.fontSize(12).text(`Total: $${Number(invoice.total_amount || 0).toFixed(2)}`, { align: 'right' })

  doc.moveDown()
  doc.fontSize(10).text(`Payment Provider: ${invoice.payment_provider || ''}`)
  doc.text(`Transaction ID: ${invoice.payment_reference_id || ''}`)
  doc.text(`Payment Status: ${invoice.payment_status || ''}`)

  doc.moveDown()
  doc.fontSize(9).fillColor('#666').text('This is a system-generated invoice.', { align: 'center' })

  doc.end()
  return new Promise((resolve) => {
    stream.on('finish', () => resolve(outfile))
  })
}
