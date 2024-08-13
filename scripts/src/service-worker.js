chrome.contextMenus.onClicked.addListener(async info => {
	switch (info.menuItemId) {
		case 'open-changelog': {
			chrome.tabs.create({
				url: 'https://github.com/AlexWayfer/song-lyrics/blob/main/CHANGELOG.md'
			})

			break
		}

		case 'clear-cache': {
			chrome.storage.local.remove('cache')

			break
		}

		case 'clear-iframe-settings': {
			const
				currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]

			//// https://stackoverflow.com/a/73586624/2630849
			chrome.scripting.executeScript(
				{
					target: { tabId: currentTab.id },
					files: ['./scripts/compiled/popup_container.js']
				},
				() => {
					// console.debug('popup container script injected')
					// console.debug('currentTab = ', currentTab)

					chrome.scripting.executeScript({
						target: { tabId: currentTab.id },
						func: async () => {
							// console.debug('chrome.scripting PopupContainer = ', PopupContainer)

							const popupContainer = new window.PopupContainer()

							if (popupContainer.alreadyExist) {
								popupContainer.remove()
							}

							popupContainer.clearSettingsPerHost()
						}
					})
				}
			)

			break
		}

		default: {
			console.error('Unknown context menu clicked', info)
		}
	}
})

chrome.runtime.onInstalled.addListener(async _details => {
	chrome.storage.local.remove('cache')

	chrome.contextMenus.create({
		title: `Installed version: ${chrome.runtime.getManifest().version}`,
		contexts: ['action'],
		id: 'open-changelog'
	})

	chrome.contextMenus.create({
		title: 'Clear lyrics cache',
		contexts: ['action'],
		id: 'clear-cache'
	})

	chrome.contextMenus.create({
		title: 'Clear iframe settings',
		contexts: ['action'],
		id: 'clear-iframe-settings'
	})

	const currentSettings = (await chrome.storage.sync.get({ settings: {} })).settings
	currentSettings.theme ??= 'site'
	currentSettings.displaySongArt ??= true
	chrome.storage.sync.set({ settings: currentSettings })
})
