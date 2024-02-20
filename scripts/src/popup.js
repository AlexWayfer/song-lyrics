import { FastAverageColor } from 'fast-average-color'

document.addEventListener('DOMContentLoaded', async _event => {
	const
		FAC = new FastAverageColor(),
		currentSettings = (await chrome.storage.sync.get('settings')).settings

	document.body.classList.add(`${currentSettings.theme}-theme`)

	const
		loadingNotice = document.querySelector('.loading'),
		captchaNotice = document.querySelector('.captcha'),
		lyricsContainer = document.querySelector('.lyrics'),
		notFoundNotice = document.querySelector('.not-found'),
		notSupportedNotice = document.querySelector('.not-supported'),
		loadForm = document.querySelector('form.load'),
		queryInput = loadForm.querySelector('input[name="query"]')

	loadForm.addEventListener('submit', event => {
		event.preventDefault()

		captchaNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')
		lyricsContainer.classList.add('hidden')

		loadForm.classList.remove('hidden')
		loadingNotice.classList.remove('hidden')

		loadLyrics(queryInput.value)
	})

	const setColors = colors => {
		document.documentElement.style.setProperty('--site-background-color', colors.background)
		document.documentElement.style.setProperty('--site-text-color', colors.text)
		document.documentElement.style.setProperty('--site-link-color', colors.link)
		document.documentElement.style.setProperty('--site-border-color', colors.border)
	}

	const displayLyrics = (songData, lyricsHTML) => {
		lyricsContainer.querySelector('.title').innerText = songData.full_title
		lyricsContainer.querySelector('.link').href = songData.url

		const songArtImage = lyricsContainer.querySelector('img.song-art')

		if (currentSettings.displaySongArt) {
			songArtImage.src = songData.song_art_image_thumbnail_url
			songArtImage.classList.remove('hidden')

			FAC.getColorAsync(songArtImage)
				.then(color => {
					document.documentElement.style.setProperty('--song-art-color', color.rgb)
				})
		} else {
			songArtImage.classList.add('hidden')
		}

		//// Fill with lyrics
		lyricsContainer.querySelector('.text').innerHTML = lyricsHTML

		//// Display elements
		loadingNotice.classList.add('hidden')
		captchaNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')

		lyricsContainer.classList.remove('hidden')
		loadForm.classList.remove('hidden')
	}

	const loadCache = async () => {
		const
			cache = (await chrome.storage.local.get({ cache: {} })).cache,
			cacheTTL = 24 * 60 * 60 * 1000 //// 24 hours

		for (const key in cache) {
			//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
			if (new Date(new Date(cache[key].createdAt).getTime() + cacheTTL) < new Date()) {
				delete cache[key]
			}
		}

		return cache
	}

	const parseLyricsPage = lyricsPage => {
		const
			parser = new DOMParser(),
			lyricsDocument = parser.parseFromString(lyricsPage, 'text/html')

		// console.debug(lyricsDocument)
		// console.debug(lyricsDocument.querySelectorAll('[class^="LyricsPlaceholder__Message"]'))

		let
			lyricsElements = Array.from(lyricsDocument.querySelectorAll('[data-lyrics-container="true"]'))

		if (lyricsElements.length == 0) {
			lyricsElements =
				Array.from(lyricsDocument.querySelectorAll('[class^="LyricsPlaceholder__Message"]'))
		}

		// console.debug(lyricsElements)

		//// Remove links, they're not working.
		//// I've tried `.innerText`, it returns value with `\n` in console of a regular page,
		//// but it returns without `\n` from `DOMParser`.
		lyricsElements.forEach(lyricsElement => {
			lyricsElement.childNodes.forEach(childNode => {
				if (childNode.tagName == 'A') {
					childNode.replaceWith(...childNode.childNodes)
				}
			})
		})

		//// Split different lyrics containers by newlines
		if (lyricsElements.length > 1) {
			lyricsElements =
				lyricsElements.reduce((acc, val) => [].concat(acc, document.createElement('br'), val))
		}

		const lyricsHTML = lyricsElements.reduce((acc, val) => `${acc}${val.outerHTML}`, '')

		// console.debug('lyricsHTML = ', lyricsHTML)

		return lyricsHTML
	}

	const loadLyrics = async query => {
		query = query.trim()

		queryInput.value = query

		const
			cache = await loadCache(),
			cached = cache[query]

		console.debug('cache = ', cache)
		console.debug('cached = ', cached)

		if (cached) {
			return displayLyrics(cached.songData, cached.lyricsHTML)
		}

		const
			searchURL = `https://genius.com/api/search?q=${encodeURIComponent(query)}`,
			searchResponse = await fetch(searchURL)

		if (searchResponse.ok) {
			const firstHit = (await searchResponse.json()).response.hits[0]

			if (firstHit && firstHit.type == 'song') {
				const
					songData =
						(await (await fetch(`https://genius.com/api/songs/${firstHit.result.id}`)).json())
							.response.song,
					lyricsPage = await (await fetch(songData.description_annotation.url)).text(),
					lyricsHTML = parseLyricsPage(lyricsPage)

				//// Write to cache
				//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
				cache[query] = { songData, lyricsHTML, createdAt: (new Date()).toString() }
				chrome.storage.local.set({ cache })

				displayLyrics(songData, lyricsHTML)
			} else {
				loadingNotice.classList.add('hidden')
				captchaNotice.classList.add('hidden')
				lyricsContainer.classList.add('hidden')
				notSupportedNotice.classList.add('hidden')

				notFoundNotice.classList.remove('hidden')
				loadForm.classList.remove('hidden')
			}
		} else {
			const searchResponseText = await searchResponse.text()

			// console.debug(searchResponse.status)
			// console.debug(searchResponseText)

			if (
				searchResponse.status == 403 &&
				searchResponseText.includes("we have to make sure you're a human")
			) {
				loadingNotice.classList.add('hidden')
				captchaNotice.classList.remove('hidden')
			}

			// const problemWindow =
			window.open('https://genius.com/', '_blank', 'popup=true')

			// console.debug('problemWindow = ', problemWindow)

			//// It will not work due to security policies (CORS).
			//// Even via Facebook's `setInterval` hack (`.open` always returns `true`).
			//
			// problemWindow.addEventListener('beforeunload', event => {
			// 	console.debug('problemWindow before unload', event)
			// 	loadLyrics(query)
			// })
		}
	}

	const
		currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
		currentTabHostname = (new URL(currentTab.url)).hostname,
		featuringRegexp = / \(?f(ea)?t\.? .+\)?/

	switch (currentTabHostname) {
		case 'deezer.com':
		case 'www.deezer.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						documentStyle = getComputedStyle(document.documentElement),
						pagePlayer = document.querySelector('#page_player')

					return {
						songTitle: pagePlayer.querySelector('[data-testid="item_title"]').innerText,
						songArtists: pagePlayer.querySelector('[data-testid="item_subtitle"]').innerText,
						colors: {
							background: documentStyle.getPropertyValue('--tempo-colors-bg-main'),
							text: documentStyle.getPropertyValue('--tempo-colors-text-main'),
							link: documentStyle.getPropertyValue('--tempo-colors-text-secondary'),
							border: documentStyle.getPropertyValue('--tempo-colors-divider-main')
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let
					{ songTitle, songArtists, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtists = ', songArtists)

				songTitle = songTitle.replace(featuringRegexp, '')
				//// Take only the first artist, second can be from the featuring
				let songArtist = songArtists.split(', ', 2)[0]

				const query = `${songTitle} ${songArtist}`
				console.debug('query = ', query)

				setColors(colors)

				loadLyrics(query)
			})

			break
		case 'youtube.com':
		case 'www.youtube.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const documentStyle = getComputedStyle(document.documentElement)

					return {
						videoTitle: document.querySelector('#below #title h1').innerText,
						channelName: document.querySelector('#below #channel-name').innerText,
						chapterTitle: document.querySelector('.ytp-chapter-title-content').innerText,
						colors: {
							background: documentStyle.getPropertyValue('--yt-spec-base-background'),
							text: documentStyle.getPropertyValue('--yt-spec-text-primary'),
							link: documentStyle.getPropertyValue('--yt-spec-call-to-action'),
							border: documentStyle.getPropertyValue('--yt-spec-10-percent-layer')
						}
					}
				}
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { videoTitle, channelName, chapterTitle, colors } = injectionResult[0].result
				let query

				console.debug('videoTitle = ', videoTitle)
				console.debug('channelName = ', channelName)
				console.debug('chapterTitle = ', chapterTitle)

				if (chapterTitle) {
					query = chapterTitle.includes(' - ') ? chapterTitle : `${chapterTitle} ${channelName}`
				} else {
					query = videoTitle
				}

				//// Remove additional notes from song title
				query = query.replace(/\((?:\w+ )*Video\)/i, '').replace(featuringRegexp, '')

				console.debug('query = ', query)

				setColors(colors)

				loadLyrics(query)
			})

			break
		case 'genius.com':
		case 'www.genius.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						lyricsStyle = getComputedStyle(
							document.querySelector(
								// Regular lyrics
								'[data-lyrics-container="true"],' +
								// Lyrics for this song have yet to be released
								'[class^="LyricsPlaceholder__Container-"]'
							)
						),
						contributorsCreditStyle = getComputedStyle(
							document.querySelector('[class^="ContributorsCreditSong__Label"]')
						),
						stickyContributorToolbarStyle = getComputedStyle(
							document.querySelector('[class*=" StickyContributorToolbar__Container"]')
						)

					return {
						songTitle:
							document.querySelector('[class^="SongHeaderdesktop__Title"]')
								.innerText,
						songArtist:
							document.querySelector('[class*="HeaderArtistAndTracklistdesktop__Artist"]')
								.innerText,
						colors: {
							background: lyricsStyle.backgroundColor,
							text: lyricsStyle.color,
							link: contributorsCreditStyle.color,
							border: stickyContributorToolbarStyle.borderBottomColor
						}
					}
				}
			}, injectionResult => {
				console.debug('injectionResult = ', injectionResult)

				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { songTitle, songArtist, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtist = ', songArtist)

				setColors(colors)

				loadLyrics(`${songTitle} ${songArtist}`)
			})

			break
		case 'shazam.com':
		case 'www.shazam.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => ({
					songTitle: document.querySelector('h1.title').innerText,
					songArtist: document.querySelector('h2.artist').innerText,
					colors: {
						background: getComputedStyle(document.querySelector('body')).backgroundColor,
						text: getComputedStyle(document.querySelector('h2.section-title')).color,
						link: getComputedStyle(document.querySelector('.shz-text-btn')).backgroundColor,
						border: getComputedStyle(document.querySelector('.shz-partial-tracklist')).borderColor
					}
				})
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { songTitle, songArtist, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtist = ', songArtist)

				songTitle = songTitle.replace(featuringRegexp, '')
				songArtist = songArtist.trim()

				setColors(colors)

				loadLyrics(`${songTitle} ${songArtist}`)
			})

			break
		default:
			loadingNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			notFoundNotice.classList.add('hidden')
			loadForm.classList.add('hidden')

			notSupportedNotice.classList.remove('hidden')
	}
})
