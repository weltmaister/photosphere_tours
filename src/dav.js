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
 * @return {{ rootUrl: string, dir: string, path: string }}
 */
export function locate(node) {
	const source = node.source
	const rootUrl = source.slice(0, source.length - node.path.length)
	return { rootUrl, dir: node.dirname, path: node.path }
}

/** URL of an absolute path below the root of the user or share. */
export function urlFor(rootUrl, path) {
	return rootUrl + encodePath(path)
}

/** @return {Promise<{ text: string, etag: string|null }>} */
export async function readText(url) {
	const response = await axios.get(url, {
		responseType: 'text',
		transformResponse: [(data) => data],
		headers: { 'Cache-Control': 'no-cache' },
	})
	return { text: response.data, etag: response.headers.etag ?? null }
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
		return response.headers.etag ?? response.headers['oc-etag'] ?? null
	} catch (e) {
		if (e.response?.status === 412) {
			throw new ConflictError()
		}
		throw e
	}
}

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
	<d:prop><d:resourcetype/><d:getlastmodified/><d:getcontenttype/><oc:fileid/></d:prop>
</d:propfind>`

/**
 * Direct children of a folder. A missing folder yields an empty list.
 *
 * @return {Promise<Array<{ name: string, isFolder: boolean, mtime: Date|null, mime: string, fileid: string|null }>>}
 */
export async function listFolder(url) {
	let response
	try {
		response = await axios.request({
			method: 'PROPFIND',
			url,
			data: PROPFIND_BODY,
			headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
			responseType: 'text',
		})
	} catch (e) {
		if (e.response?.status === 404) {
			return []
		}
		throw e
	}

	const xml = new DOMParser().parseFromString(response.data, 'application/xml')
	const DAV = 'DAV:'
	const OC = 'http://owncloud.org/ns'
	const self = new URL(url, window.location.href).pathname.replace(/\/$/, '')
	const text = (el, ns, name) => el.getElementsByTagNameNS(ns, name)[0]?.textContent ?? ''

	return [...xml.getElementsByTagNameNS(DAV, 'response')]
		.map((el) => {
			const href = decodeURIComponent(text(el, DAV, 'href')).replace(/\/$/, '')
			const modified = text(el, DAV, 'getlastmodified')
			return {
				href,
				name: href.split('/').pop(),
				isFolder: el.getElementsByTagNameNS(DAV, 'collection').length > 0,
				mtime: modified ? new Date(modified) : null,
				mime: text(el, DAV, 'getcontenttype'),
				fileid: text(el, OC, 'fileid') || null,
			}
		})
		.filter((entry) => entry.href !== decodeURIComponent(self))
}
