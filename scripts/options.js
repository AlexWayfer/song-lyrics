document.addEventListener('DOMContentLoaded', async _event => {
	document.querySelectorAll('input[name="theme"]').forEach(input => {
		input.addEventListener('change', event => {
			const newValue = event.target.value
			console.debug(`input change to ${newValue}`)
			currentSettings.theme = newValue
			chrome.storage.sync.set({ settings: currentSettings })
		})
	})

	//// Initialize current settings
	const currentSettings = (await chrome.storage.sync.get({ settings: {} })).settings

	document.querySelector(`input[name="theme"][value=${currentSettings.theme}]`).checked = true
})
