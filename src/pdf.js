/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Renders the first page of a PDF floor plan into a PNG, once, when the plan
 * is chosen. The walkthrough then only ever shows images.
 */
import axios from '@nextcloud/axios'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

// long side of the image; enough to zoom into a 1:100 plan, small enough
// for canvas limits on phones
const LONG_SIDE = 6000

/**
 * @param {string} url WebDAV URL of the PDF
 * @return {Promise<Blob>} PNG of page 1 on white
 */
export async function pdfToPng(url) {
	const { data } = await axios.get(url, { responseType: 'arraybuffer' })
	const doc = await getDocument({ data }).promise
	try {
		const page = await doc.getPage(1)
		const base = page.getViewport({ scale: 1 })
		const scale = LONG_SIDE / Math.max(base.width, base.height)
		const viewport = page.getViewport({ scale })
		const canvas = document.createElement('canvas')
		canvas.width = Math.round(viewport.width)
		canvas.height = Math.round(viewport.height)
		const context = canvas.getContext('2d')
		context.fillStyle = '#ffffff'
		context.fillRect(0, 0, canvas.width, canvas.height)
		await page.render({ canvas, canvasContext: context, viewport }).promise
		return await new Promise((resolve, reject) => canvas.toBlob(
			(blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')),
			'image/png',
		))
	} finally {
		doc.destroy()
	}
}
