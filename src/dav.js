/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * File access through WebDAV. The Files app hands us nodes whose `source` is
 * the WebDAV URL – `remote.php/dav/files/<user>/…` when logged in and
 * `public.php/dav/files/<token>/…` on a public share page – so the same code
 * serves both cases.
 */
import axios from '@nextcloud/axios'

export class ConflictError extends Error {
	constructor() {
		super('The file was changed in the meantime')
		this.name = 'ConflictError'
	}
}

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/')

/**
 * WebDAV location of a node, split into the root URL of the user or share and
 * the path below it.
 *
 * @param {import('@nextcloud/files').INode} node
 * @return {{ rootUrl: string, dir: string }}
 */
export function locate(node) {
	const source = node.source
	return { rootUrl: source.slice(0, source.length - node.path.length), dir: node.dirname }
}

/** URL of an absolute path below the root of the user or share. */
export function urlFor(rootUrl, path) {
	return rootUrl + encodePath(path)
}

const DAV = 'DAV:'
const OC = 'http://owncloud.org/ns'
const NC = 'http://nextcloud.org/ns'

/** PROPFIND for the given `<d:prop>` content; resolves with the parsed XML. */
async function propfind(url, props, depth = 0) {
	const response = await axios.request({
		method: 'PROPFIND',
		url,
		data: `<?xml version="1.0"?><d:propfind xmlns:d="${DAV}" xmlns:oc="${OC}" xmlns:nc="${NC}"><d:prop>${props}</d:prop></d:propfind>`,
		headers: { Depth: String(depth), 'Content-Type': 'application/xml; charset=utf-8' },
		responseType: 'text',
	})
	return new DOMParser().parseFromString(response.data, 'application/xml')
}

const text = (el, ns, name) => el.getElementsByTagNameNS(ns, name)[0]?.textContent ?? ''

/**
 * The file's ETag as WebDAV knows it. The ETag header of a GET cannot be used
 * for If-Match: servers that compress responses append a suffix to it
 * (e.g. `"…-zstd"`), and the conditional PUT then always fails with 412.
 */
export async function getEtag(url) {
	return text(await propfind(url, '<d:getetag/>'), DAV, 'getetag') || null
}

/**
 * The Nextcloud file id, which the Files app needs for nodes announced with
 * `files:node:created`.
 *
 * @return {Promise<number|null>}
 */
export async function getFileId(url) {
	const id = Number(text(await propfind(url, '<oc:fileid/>'), OC, 'fileid'))
	return Number.isFinite(id) && id > 0 ? id : null
}

/** @return {Promise<{ text: string, etag: string|null }>} */
export async function readText(url) {
	// ETag first: if the file changes in between, the older ETag makes the
	// next save fail instead of silently overwriting the newer content
	const etag = await getEtag(url)
	const response = await axios.get(url, {
		responseType: 'text',
		transformResponse: [(data) => data],
		headers: { 'Cache-Control': 'no-cache' },
	})
	return { text: response.data, etag }
}

/**
 * Write a text file. With an ETag the write only succeeds if nobody changed
 * the file since it was read; with `etag === null` it only creates a new file.
 *
 * @return {Promise<string|null>} the new ETag
 */
export async function writeText(url, text, etag) {
	const headers = { 'Content-Type': 'application/json; charset=utf-8' }
	if (etag === null) {
		headers['If-None-Match'] = '*'
	} else if (etag !== undefined) {
		headers['If-Match'] = etag
	}
	try {
		const response = await axios.put(url, text, { headers })
		return response.headers['oc-etag'] ?? response.headers.etag ?? await getEtag(url)
	} catch (e) {
		if (e.response?.status === 412) {
			throw new ConflictError()
		}
		throw e
	}
}

function panoramaFlag(xmp) {
	if (!xmp) {
		return null
	}
	try {
		const data = JSON.parse(xmp)
		return data.usePanoramaViewer === true || data.usePanoramaViewer === 1
	} catch {
		return null
	}
}

/**
 * Direct children of a folder. A missing folder yields an empty list.
 * `panorama` comes from the files_photospheres app when it is installed: it
 * tells whether a JPEG is a 360° image without downloading it (null: unknown).
 *
 * @return {Promise<Array<{ name: string, isFolder: boolean, mtime: Date|null, fileid: string|null, panorama: boolean|null }>>}
 */
export async function listFolder(url) {
	let xml
	try {
		xml = await propfind(url, '<d:resourcetype/><d:getlastmodified/><oc:fileid/><nc:files-photospheres-xmp-metadata/>', 1)
	} catch (e) {
		if (e.response?.status === 404) {
			return []
		}
		throw e
	}
	const self = decodeURIComponent(new URL(url, window.location.href).pathname.replace(/\/$/, ''))
	return [...xml.getElementsByTagNameNS(DAV, 'response')]
		.map((el) => {
			const href = decodeURIComponent(text(el, DAV, 'href')).replace(/\/$/, '')
			const modified = text(el, DAV, 'getlastmodified')
			return {
				href,
				name: href.split('/').pop(),
				isFolder: el.getElementsByTagNameNS(DAV, 'collection').length > 0,
				mtime: modified ? new Date(modified) : null,
				fileid: text(el, OC, 'fileid') || null,
				panorama: panoramaFlag(text(el, NC, 'files-photospheres-xmp-metadata')),
			}
		})
		.filter((entry) => entry.href !== self)
}

/** The first bytes of a file, e.g. for its EXIF block. */
export async function readStart(url, bytes = 65536) {
	const response = await axios.get(url, {
		responseType: 'arraybuffer',
		headers: { Range: `bytes=0-${bytes - 1}` },
	})
	return response.data
}

/** Upload binary data, e.g. a floor plan converted from PDF. */
export async function writeBlob(url, blob) {
	await axios.put(url, blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } })
}

/**
 * Rename or move a file without overwriting anything.
 *
 * @return {Promise<boolean>} false if the target already exists
 */
export async function moveFile(fromUrl, toUrl) {
	try {
		await axios.request({
			method: 'MOVE',
			url: fromUrl,
			headers: { Destination: new URL(toUrl, window.location.href).href, Overwrite: 'F' },
		})
		return true
	} catch (e) {
		if (e.response?.status === 412) {
			return false
		}
		throw e
	}
}
