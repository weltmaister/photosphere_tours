<?php

declare(strict_types=1);

/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Based on files_photospheres:
 * @author Robin Windey <ro.windey@gmail.com>
 * @copyright Robin Windey 2019
 */

namespace OCA\PhotosphereTours\AppInfo;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Files_Sharing\Event\BeforeTemplateRenderedEvent;
use OCA\PhotosphereTours\Listener\AddScriptsListener;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

/**
 * The app has no backend of its own: the tour lives in a JSON file that the
 * frontend reads and writes through WebDAV. PHP only loads the script into the
 * Files app and into public share pages.
 */
class Application extends App implements IBootstrap {
	public const APP_ID = 'photosphere_tours';

	public function __construct(array $urlParams = []) {
		parent::__construct(self::APP_ID, $urlParams);
	}

	public function register(IRegistrationContext $context): void {
		$context->registerEventListener(LoadAdditionalScriptsEvent::class, AddScriptsListener::class);
		$context->registerEventListener(BeforeTemplateRenderedEvent::class, AddScriptsListener::class);
	}

	public function boot(IBootContext $context): void {
	}
}
