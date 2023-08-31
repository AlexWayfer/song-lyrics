document.addEventListener('DOMContentLoaded', async _event => {
	const
		songArtCheckbox = document.querySelector('input[name="song-art"]')

	document.querySelectorAll('input[name="theme"]').forEach(input => {
		input.addEventListener('change', event => {
			const newValue = event.target.value
			console.debug(`theme input change to ${newValue}`)
			currentSettings.theme = newValue
			chrome.storage.sync.set({ settings: currentSettings })
		})
	})

	songArtCheckbox.addEventListener('change', event => {
		const checked = event.target.checked
		console.debug(`song-art input change to ${checked}`)
		currentSettings.displaySongArt = checked
		chrome.storage.sync.set({ settings: currentSettings })
	})

	//// Initialize current settings
	const currentSettings = (await chrome.storage.sync.get({ settings: {} })).settings

	document.querySelector(`input[name="theme"][value=${currentSettings.theme}]`).checked = true

	songArtCheckbox.checked = currentSettings.displaySongArt
})
