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

namespace OCA\PhotosphereTours\Listener;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Files_Sharing\Event\BeforeTemplateRenderedEvent;
use OCA\PhotosphereTours\AppInfo\Application;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

/** @template-implements IEventListener<Event> */
class AddScriptsListener implements IEventListener {
	public function handle(Event $event): void {
		if (!$event instanceof LoadAdditionalScriptsEvent && !$event instanceof BeforeTemplateRenderedEvent) {
			return;
		}

		// Registered after the files app so our action for 360-Rundgang.json
		// wins over the text editor's default action.
		Util::addTranslations(Application::APP_ID);
		Util::addScript(Application::APP_ID, Application::APP_ID . '-main', 'files');
	}
}
