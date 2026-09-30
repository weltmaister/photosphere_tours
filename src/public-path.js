/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Chunks are loaded from wherever the app is installed (apps/ or custom_apps/).
 */
import { generateFilePath } from '@nextcloud/router'

// eslint-disable-next-line no-undef, camelcase
__webpack_public_path__ = generateFilePath('photosphere_tours', '', 'js/')
