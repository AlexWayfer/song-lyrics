document.addEventListener('DOMContentLoaded', async event => {
	const
		loadingNotice = document.querySelector('.loading'),
		lyricsContainer = document.querySelector('.lyrics'),
		notFoundNotice = document.querySelector('.not-found'),
		notSupportedNotice = document.querySelector('.not-supported')

	const
		currentTabTitle = (await chrome.tabs.query({ active: true, currentWindow: true }))[0].title,
		songTitleMatch = currentTabTitle.match(/^(?<songTitle>.+) - Deezer$/)

	if (songTitleMatch) {
		const
			query = songTitleMatch.groups.songTitle,
			json = await (await fetch(`https://genius.com/api/search?q=${query}`)).json(),
			firstHit = json.response.hits[0]

		if (firstHit && firstHit.type == 'song') {
			const
				songData =
					(await (await fetch(`https://genius.com/api/songs/${firstHit.result.id}`)).json())
						.response.song,
				lyricsPage = await (await fetch(songData.description_annotation.url)).text(),
				parser = new DOMParser(),
				lyricsDocument = parser.parseFromString(lyricsPage, 'text/html')

			lyricsContainer.querySelector('.title').innerText = songData.full_title
			lyricsContainer.querySelector('.text').replaceChildren(
				lyricsDocument.querySelector('[data-lyrics-container="true"]')
			)

			loadingNotice.classList.add('hidden')
			notFoundNotice.classList.add('hidden')
			notSupportedNotice.classList.add('hidden')

			lyricsContainer.classList.remove('hidden')
		} else {
			loadingNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			notSupportedNotice.classList.add('hidden')

			notFoundNotice.classList.remove('hidden')
		}
	} else {
		loadingNotice.classList.add('hidden')
		lyricsContainer.classList.add('hidden')
		notFoundNotice.classList.add('hidden')

		notSupportedNotice.classList.remove('hidden')
	}
})
