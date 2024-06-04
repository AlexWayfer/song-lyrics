import { FastAverageColor } from 'fast-average-color'

document.addEventListener('DOMContentLoaded', async _event => {
	const
		FAC = new FastAverageColor(),
		currentSettings = (await chrome.storage.sync.get('settings')).settings

	document.body.classList.add(`${currentSettings.theme}-theme`)

	const
		currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
		currentTabHostname = new URL(currentTab.url).hostname

	const
		loadingNotice = document.querySelector('body > .loading'),
		loadingQueryText = loadingNotice.querySelector('.query'),
		captchaNotice = document.querySelector('body > .captcha'),
		lyricsContainer = document.querySelector('body > .lyrics'),
		otherSearchResultsLink = lyricsContainer.querySelector('.other-search-results'),
		notFoundNotice = document.querySelector('body > .not-found'),
		notSupportedNotice = document.querySelector('body > .not-supported'),
		otherSearchResultsContainer = document.querySelector('body > .other-search-results'),
		otherSearchResultsList = otherSearchResultsContainer.querySelector('ul'),
		otherSearchResultTemplate = otherSearchResultsList.querySelector('template'),
		searchPageLink = document.querySelector('a.search-page'),
		breakdownNotice = document.querySelector('body > .breakdown'),
		loadForm = document.querySelector('body > form.load'),
		queryInput = loadForm.querySelector('input[name="query"]')

	document.addEventListener('mousemove', event => {
		// console.debug('popup mousemove event = ', event)

		window.parent.postMessage(
			{ name: 'mousemove', coordinates: { screenX: event.screenX, screenY: event.screenY } },
			currentTab.url
		)
	})

	loadForm.addEventListener('submit', event => {
		event.preventDefault()

		captchaNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')
		lyricsContainer.classList.add('hidden')
		otherSearchResultsContainer.classList.add('hidden')
		searchPageLink.classList.add('hidden')
		breakdownNotice.classList.add('hidden')

		loadForm.classList.remove('hidden')
		loadingNotice.classList.remove('hidden')

		searchLyrics(queryInput.value)
	})

	const passColorsToParentWindow = () => {
		// console.debug('window.parent = ', window.parent)

		const
			bodyStyle = getComputedStyle(document.body),
			colors = {
				background: bodyStyle.getPropertyValue('--background-color'),
				text: bodyStyle.getPropertyValue('--text-color'),
				link: bodyStyle.getPropertyValue('--link-color'),
				border: bodyStyle.getPropertyValue('--border-color')
			}

		// console.debug('bodyStyle = ', bodyStyle)
		// console.debug('colors = ', colors)

		window.parent.postMessage({ name: 'setColors', colors: colors }, currentTab.url)
	}

	const switchToSystemTheme = () => {
		document.body.classList.remove('site-theme')
		document.body.classList.add(
			window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme'
		)
	}

	const setColors = colors => {
		document.documentElement.style.setProperty('--site-background-color', colors.background)
		document.documentElement.style.setProperty('--site-text-color', colors.text)
		document.documentElement.style.setProperty('--site-link-color', colors.link)
		document.documentElement.style.setProperty('--site-border-color', colors.border)

		// console.debug('document.documentElement.style = ', document.documentElement.style)
		// console.debug(
		// 	"document.documentElement.style.getProperty('--site-background-color') = ",
		// 	document.documentElement.style.getProperty('--site-background-color')
		// )
		// console.debug(
		// 	"document.documentElement.style.getProperty('--background-color') = ",
		// 	document.documentElement.style.getProperty('--background-color')
		// )

		passColorsToParentWindow()
	}

	const buildGitHubNewIssueURI = (title, body) => {
		return `https://github.com/AlexWayfer/song-lyrics/issues/new?title=${title}&body=${body}`
	}

	const displayBreakdown = () => {
		//// Display elements
		loadingNotice.classList.add('hidden')
		captchaNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')
		lyricsContainer.classList.add('hidden')
		otherSearchResultsContainer.classList.add('hidden')

		switchToSystemTheme()

		passColorsToParentWindow()

		breakdownNotice.querySelector('a.report').href = buildGitHubNewIssueURI(
			`Please fix support of \`${currentTabHostname}\``,
			"There was an unexpected error. Thank you."
		)

		breakdownNotice.classList.remove('hidden')
		loadForm.classList.remove('hidden')
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
		breakdownNotice.classList.add('hidden')

		lyricsContainer.classList.remove('hidden')
		otherSearchResultsContainer.classList.remove('hidden')
		loadForm.classList.remove('hidden')
	}

	const getCache = async () => {
		const cache = (await chrome.storage.local.get({ cache: { searches: {}, songs: {} } })).cache

		// console.debug('cache = ', cache)

		return cache
	}

	const readCache = async type => {
		const
			cache = await getCache(),
			cachedType = cache[type],
			cacheTTL = 24 * 60 * 60 * 1000 //// 24 hours

		for (const key in cachedType) {
			//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
			if (new Date(new Date(cachedType[key].createdAt).getTime() + cacheTTL) < new Date()) {
				delete cachedType[key]
			}
		}

		chrome.storage.local.set({ cache })

		return cachedType
	}

	const writeCache = async (type, key, value) => {
		const cache = await getCache()

		// console.debug('cache = ', cache)
		// console.debug('type = ', type)
		// console.debug('cache[type] = ', cache[type])
		// console.debug('key = ', key)
		// console.debug('cache[type][key] = ', cache[type][key])
		// console.debug('value = ', value)

		//// Write to cache
		//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
		cache[type][key] = { ...value, createdAt: new Date().toString() }

		chrome.storage.local.set({ cache })
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

	const loadLyrics = async songId => {
		loadingNotice.classList.remove('hidden')

		const
			songsCache = await readCache('songs'),
			cachedSong = songsCache[songId]

		// console.debug('songsCache = ', songsCache)
		// console.debug('cachedSong = ', cachedSong)

		if (cachedSong) {
			return displayLyrics(cachedSong.data, cachedSong.lyricsHTML)
		}

		const
			songData =
				(
					await (
						await fetch(`https://genius.com/api/songs/${songId}`, { credentials: 'omit' })
					).json()
				)
					.response.song,
			lyricsPage =
				await (
					await fetch(songData.description_annotation.url, { credentials: 'omit' })
				)
					.text(),
			lyricsHTML = parseLyricsPage(lyricsPage)

		await writeCache('songs', songId, { data: songData, lyricsHTML })

		displayLyrics(songData, lyricsHTML)
	}

	const displaySearchResults = async songHits => {
		if (songHits.length > 0) {
			await loadLyrics(songHits[0].result.id)

			if (songHits.length > 1) {
				const otherSearchResultsElements = songHits.slice(0, 5).map((songHit, index) => {
					const otherSearchElement =
						otherSearchResultTemplate.content.firstElementChild.cloneNode(true)

					if (index == 0) otherSearchElement.classList.add('hidden')

					otherSearchElement.querySelector('.title').innerText = songHit.result.title
					otherSearchElement.querySelector('.artist').innerText = songHit.result.artist_names
					otherSearchElement.querySelector('img.song-art').src =
						songHit.result.song_art_image_thumbnail_url

					otherSearchElement.addEventListener('click', async _event => {
						lyricsContainer.classList.add('hidden')
						otherSearchResultsContainer.classList.add('hidden')
						loadForm.classList.add('hidden')

						otherSearchResultsList.querySelector('li.hidden').classList.remove('hidden')
						otherSearchElement.classList.add('hidden')

						loadingQueryText.innerText = songHit.result.full_title

						await loadLyrics(songHit.result.id)
					})

					return otherSearchElement
				})

				otherSearchResultsList.replaceChildren(...otherSearchResultsElements)

				otherSearchResultsContainer.classList.remove('hidden')

				otherSearchResultsLink.classList.remove('hidden')
			} else {
				otherSearchResultsContainer.classList.add('hidden')
				otherSearchResultsLink.classList.add('hidden')
			}
		} else {
			loadingNotice.classList.add('hidden')
			captchaNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			otherSearchResultsContainer.classList.add('hidden')
			notSupportedNotice.classList.add('hidden')
			breakdownNotice.classList.add('hidden')

			notFoundNotice.classList.remove('hidden')
			loadForm.classList.remove('hidden')
		}

		searchPageLink.classList.remove('hidden')
	}

	const searchLyrics = async query => {
		query = query.trim()

		const encodedQuery = encodeURIComponent(query)

		queryInput.value = query
		loadingQueryText.innerText = query
		searchPageLink.href = `https://genius.com/search?q=${encodedQuery.replace(/[()]/g, '')}`

		const
			searchesCache = await readCache('searches'),
			cachedSearch = searchesCache[query]

		// console.debug('searchesCache = ', searchesCache)
		// console.debug('cachedSearch = ', cachedSearch)

		if (cachedSearch) {
			return displaySearchResults(cachedSearch.songHits)
		}

		const
			searchURL = `https://genius.com/api/search?q=${encodedQuery}`,
			searchResponse = await fetch(searchURL, { credentials: 'omit' })

		if (searchResponse.ok) {
			const songHits = (await searchResponse.json()).response.hits.filter(hit => hit.type == 'song')

			await writeCache('searches', query, { songHits })

			displaySearchResults(songHits)
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
			// 	searchLyrics(query)
			// })
		}
	}

	const clearFeaturing = text => {
		return text.replace(/ [([]?(?:f(ea)?t|prod)\.? [^()[\]]+[)\]]?/, ' ')
	}

	switch (currentTabHostname) {
		case 'deezer.com':
		case 'www.deezer.com': {
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
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtists, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtists = ', songArtists)

					songTitle = clearFeaturing(songTitle)
					//// Take only the first artist, second can be from the featuring
					let songArtist = songArtists.split(', ', 2)[0]

					const query = `${songTitle} ${songArtist}`
					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'music.yandex.ru': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						decoPaneStyle = getComputedStyle(document.querySelector('.deco-pane')),
						playerControls = document.querySelector('.player-controls__track-container')

					return {
						songTitle: playerControls.querySelector('.track__title').innerText,
						songArtists: playerControls.querySelector('.track__artists').innerText,
						colors: {
							background: decoPaneStyle.backgroundColor,
							text: decoPaneStyle.color,
							link: getComputedStyle(document.querySelector('.deco-link_muted')).color,
							border: decoPaneStyle.borderColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtists, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtists = ', songArtists)

					songTitle = clearFeaturing(songTitle)

					const query = `${songTitle} ${songArtists}`
					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'soundcloud.com': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						playbackTitleContainer =
							document.querySelector('.playbackSoundBadge__titleContextContainer')

					return {
						songTitle:
							playbackTitleContainer
								.querySelector('.playbackSoundBadge__title > a > span:not(.sc-visuallyhidden)')
								.innerText,
						songArtists:
							playbackTitleContainer
								.querySelector(':scope > a')
								.innerText,
						colors: {
							background: getComputedStyle(document.querySelector('body')).backgroundColor,
							text: getComputedStyle(document.querySelector('.sc-text')).color,
							link: getComputedStyle(document.querySelector('.playButton')).backgroundColor,
							border: getComputedStyle(document.querySelector('.sc-border-light-top')).borderColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtists, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtists = ', songArtists)

					songTitle = clearFeaturing(songTitle)

					const query = `${songTitle} ${songArtists}`
					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'open.spotify.com': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						nowPlayingWidget = document.querySelector('[data-testid="now-playing-widget"]'),
						documentStyle = getComputedStyle(document.body)

					return {
						songTitle:
							nowPlayingWidget
								.querySelector('[data-testid="context-item-link"]')
								.innerText,
						songArtists:
							nowPlayingWidget
								.querySelector('[data-testid="context-item-info-subtitles"]')
								.innerText,
						colors: {
							background: documentStyle.getPropertyValue('--background-base'),
							text: documentStyle.getPropertyValue('--text-base'),
							link: documentStyle.getPropertyValue('--text-bright-accent'),
							border: documentStyle.getPropertyValue('--decorative-subdued')
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtists, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtists = ', songArtists)

					songTitle = clearFeaturing(songTitle)

					const query = `${songTitle} ${songArtists}`
					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'music.apple.com': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						playerBar = document.querySelector('.player-bar amp-lcd').shadowRoot,
						documentStyle = getComputedStyle(document.documentElement)

					return {
						songTitle:
							playerBar.querySelector('.lcd-meta__primary').innerText,
						songArtists:
							//// There is album title after `—` in a separate element
							playerBar.querySelector('.lcd-meta__secondary').innerText.split('\n—\n')[0],
						colors: {
							background: documentStyle.getPropertyValue('--pageBG'),
							text: documentStyle.getPropertyValue('--systemPrimary'),
							link: documentStyle.getPropertyValue('--linkColor'),
							border: documentStyle.getPropertyValue('--labelDivider')
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtists, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtists = ', songArtists)

					songTitle = clearFeaturing(songTitle)

					const query = `${songTitle} ${songArtists}`
					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'youtube.com':
		case 'www.youtube.com': {
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
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let
						{ videoTitle, channelName, chapterTitle, colors } = result,
						songTitile = chapterTitle || videoTitle

					console.debug('videoTitle = ', videoTitle)
					console.debug('channelName = ', channelName)
					console.debug('chapterTitle = ', chapterTitle)
					console.debug('songTitile = ', songTitile)

					//// Remove additional notes from song title
					songTitile = songTitile.replace(
						new RegExp(
							'(?:' +
								'[([](?:' +
									'(?:\\w+ )*(?:Video(?: (?:HD|- Official))?|Soundtrack)|' +
									'From [^)]*|' +
									'Lyrics|' +
									'OUT NOW|' +
									'Single(?: \\d+)?|' +
									'Премьера (?:клипа|песни|трека)[^)]*' +
								')[\\])]|' +
								'\\| (?:' +
									'Реакция и разбор' +
								')' +
							')',
							'i'
						),
						''
					)

					songTitile = clearFeaturing(songTitile)

					let query = songTitile.includes(' - ') ? songTitile : `${songTitile} ${channelName}`

					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'music.youtube.com': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						playerBar = document.querySelector('ytmusic-player-bar'),
						documentStyle = getComputedStyle(document.documentElement)

					return {
						songTitle:
							playerBar.querySelector('.title').innerText,
						songArtists:
							//// There is album title after ` • ` in a separate element, and then even a year
							playerBar.querySelector('.subtitle').innerText.split('\n • \n')[0],
						colors: {
							background: getComputedStyle(document.querySelector('body')).backgroundColor,
							text: documentStyle.getPropertyValue('--yt-spec-text-primary'),
							link: documentStyle.getPropertyValue('--yt-spec-brand-link-text'),
							border: getComputedStyle(document.querySelector('#divider')).borderTopColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtists, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtists = ', songArtists)

					songTitle = clearFeaturing(songTitle)

					const query = `${songTitle} ${songArtists}`
					console.debug('query = ', query)

					setColors(colors)

					searchLyrics(query)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'genius.com':
		case 'www.genius.com': {
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
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtist, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtist = ', songArtist)

					setColors(colors)

					searchLyrics(`${songTitle} ${songArtist}`)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'shazam.com':
		case 'www.shazam.com': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const header = document.querySelector('[class*=" TrackPageHeader_songDetail_"]')

					return {
						songTitle: header.querySelector('h1').innerText,
						songArtist: header.querySelector('h2').innerText,
						colors: {
							background:
								getComputedStyle(
									document.querySelector('body')
								).backgroundColor,
							text:
								getComputedStyle(
									document.querySelector(
										'[class^="pages_container__"] [class*="Text-module_text-black-100"]'
									)
								).color,
							link:
								getComputedStyle(
									document.querySelector('[class^="FloatingShazamButton_buttonContainer__"] svg')
								).fill,
							border:
								getComputedStyle(
									document.querySelector('[class*="SongItem-module_container"]'),
									':after'
								).backgroundColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtist, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtist = ', songArtist)

					songTitle = clearFeaturing(songTitle)
					songArtist = songArtist.trim()

					setColors(colors)

					searchLyrics(`${songTitle} ${songArtist}`)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'last.fm':
		case 'www.last.fm': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					//// There is also a dynamic player at the top of a page (from YouTube or Spotify),
					//// but we parse only track pages for now.
					const header = document.querySelector('header')

					return {
						songTitle: header.querySelector('h1[itemprop="name"]').innerText,
						songArtist: header.querySelector('[itemprop="byArtist"]').innerText,
						colors: {
							background:
								getComputedStyle(document.querySelector('.page-content')).backgroundColor,
							text:
								getComputedStyle(document.querySelector('.page-content')).color,
							link:
								getComputedStyle(document.querySelector('.about-artist a')).color,
							border:
								getComputedStyle(
									document.querySelector('.play-this-track-playlink'),
									':after'
								).borderBottomColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtist, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtist = ', songArtist)

					songTitle = clearFeaturing(songTitle)
					songArtist = songArtist.trim()

					setColors(colors)

					searchLyrics(`${songTitle} ${songArtist}`)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		case 'song.link': {
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => ({
					songTitle: document.querySelector('.e12n0mv61').innerText,
					songArtist: document.querySelector('.e12n0mv60').innerText,
					colors: {
						background: getComputedStyle(document.querySelector('.css-1lcypyy')).backgroundColor,
						text: getComputedStyle(document.querySelector('.css-1lcypyy')).color,
						link: getComputedStyle(document.querySelector('.css-12zt9a8')).color,
						border: getComputedStyle(document.querySelector('.css-1lcypyy')).borderColor
					}
				})
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const result = injectionResult[0].result

				// console.debug('result = ', result)

				if (result) {
					let { songTitle, songArtist, colors } = result

					console.debug('songTitle = ', songTitle)
					console.debug('songArtist = ', songArtist)

					songTitle = clearFeaturing(songTitle)

					setColors(colors)

					searchLyrics(`${songTitle} ${songArtist}`)
				} else {
					displayBreakdown()
				}
			})

			break
		}

		default: {
			loadingNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			otherSearchResultsContainer.classList.add('hidden')
			notFoundNotice.classList.add('hidden')
			searchPageLink.classList.add('hidden')
			breakdownNotice.classList.add('hidden')

			switchToSystemTheme()

			passColorsToParentWindow()

			notSupportedNotice.querySelector('a.request').href = buildGitHubNewIssueURI(
				`Please add support of \`${currentTabHostname}\` as a music platform`,
				"I think it's appropriate for this extension. Thank you."
			)

			notSupportedNotice.classList.remove('hidden')
			loadForm.classList.remove('hidden')
		}
	}
})
