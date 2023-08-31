chrome.contextMenus.onClicked.addListener(info => {
	switch (info.menuItemId) {
		case 'clear-cache':
			chrome.storage.local.remove('cache')
			break
		default:
			console.error('Unknown context menu clicked', info)
	}
})

chrome.runtime.onInstalled.addListener(async _details => {
	console.debug('context menu create')

	chrome.contextMenus.create({
		title: 'Clear lyrics cache',
		contexts: ['action'],
		id: 'clear-cache'
	})

	const currentSettings = (await chrome.storage.sync.get({ settings: {} })).settings
	currentSettings.theme ??= 'site'
	currentSettings.displaySongArt ??= true
	chrome.storage.sync.set({ settings: currentSettings })
})
