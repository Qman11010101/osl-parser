function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function mergeAndGeneratePlayerData(htmlTechnical, htmlRating, musicRecord) {
    // プレミアムユーザのみが利用可能
    // Parse HTML
    const parser = new DOMParser()
    const docTechnical = parser.parseFromString(htmlTechnical, "text/html")
    const docRating = parser.parseFromString(htmlRating, "text/html")

    if (docTechnical.title === "OngekiScoreLog - 404 Not Found") {
        throw new Error("User not found")
    }

    const playerProfile = parseProfileFromTechnical(docTechnical)
    const modifiedMusicRecord = parseTechnical(docTechnical, musicRecord)
    const playerRatingData = parseRating(docRating, musicRecord)

    const playerData = {
        profile: playerProfile,
        rating: playerRatingData,
        record: modifiedMusicRecord,
    }

    return playerData
}

function parseProfileFromTechnical(doc) {
    const profileArticleElement = doc.querySelectorAll("article.box")[0]

    const profile = {
        name: "",
        trophy: "",
        player_level: 0,
        is_premium: false,
        battle_point: 0,
        rating: 0,
        money: 0,
        total_money: 0,
        total_play: 0,
    }

    profile.is_premium = doc.querySelector(".net-premium") !== null
    const profTable = profileArticleElement.querySelector("tbody").querySelectorAll("tr")
    for (const tr of profTable) {
        const th = tr.querySelector("th")
        const td = tr.querySelector("td")
        const key = th.textContent
        switch (key) {
            case "プレイヤーネーム":
                profile.name = td.textContent
                break
            case "トロフィー":
                profile.trophy = td.textContent
                break
            case "レベル":
                profile.player_level = Number.parseInt(td.textContent)
                break
            case "バトルポイント":
                profile.battle_point = Number.parseInt(td.textContent)
                break
            case "レーティング":
                profile.rating = Number.parseFloat(td.textContent.split()[0].trim())
                break
            case "マニー":
                profile.money = Number.parseInt(td.textContent.split()[0].trim())
                profile.total_money = Number.parseInt(td.textContent.split(" ")[2].replace(")", "").trim())
                break
            case "トータルプレイ":
                profile.total_play = Number.parseInt(td.textContent)
                break
        }
    }

    return profile
}

function parseTechnical(doc, musicRecord) {
    const modifiedMusicRecord = deepCopy(musicRecord)

    for (const music of modifiedMusicRecord) {
        music.score = 0
        music.rank = "D"
        music.update = "1970-01-01"
        music.lamps = {
            is_fullcombo: false,
            is_allbreak: false,
            is_fullbell: false,
        }
    }

    const scoreTableRows = doc.querySelector("#sort_table").querySelector("tbody").querySelectorAll("tr")
    for (const row of scoreTableRows) {
        const titleElement = row.querySelector(".sort_title").querySelector("a")
        const hrefSplited = titleElement.href.split("/")

        const diff = hrefSplited[hrefSplited.length - 1].slice(0, 3).toUpperCase()
        const songID = Number.parseInt(hrefSplited[hrefSplited.length - 2])
        const score = Number.parseInt(row.querySelector(".sort_ts").querySelector(".sort-key").textContent)
        const rankElm = row.querySelector(".sort_rank1")
        rankElm.querySelector("span").remove() // ソート用に付与されたやつを消す
        const rank = rankElm.textContent.replace("AB+", "SSS+") // AB+ (1,010,000) = SSS+であるため

        const lamps = row.querySelector(".sort_lamp").querySelector(".lamp").classList[1]
        const is_fullcombo = lamps.includes("fc")
        const is_allbreak = lamps.includes("ab")
        const is_fullbell = lamps.includes("fb")

        const update = row.querySelector(".sort_update").textContent

        const songdt = modifiedMusicRecord.find(song => song.id === songID && song.diff === diff)
        if (!songdt) {
            console.warn(`Song ${songID} ${diff} not found`)
            continue
        }
        songdt.score = score
        songdt.rank = rank
        songdt.update = update
        songdt.lamps.is_fullcombo = is_fullcombo
        songdt.lamps.is_allbreak = is_allbreak
        songdt.lamps.is_fullbell = is_fullbell
    }

    return modifiedMusicRecord
}

function parseRating(doc, musicRecord) {
    const ratingData = {
        best: [],
        new: [],
        pscore: [],
    }

    // ベスト枠
    const bestTableRows = doc.querySelector("#rating_old").querySelector("tbody").querySelectorAll("tr")
    for (const row of bestTableRows) {
        const tds = row.querySelectorAll("td")

        const titleElement = tds[1].querySelector("a")
        const hrefSplited = titleElement.href.split("/")

        const diff = hrefSplited[hrefSplited.length - 1].slice(0, 3).toUpperCase()
        const songID = Number.parseInt(hrefSplited[hrefSplited.length - 2])
        const score = Number.parseInt(tds[4].textContent.replaceAll(",", ""))
        if (score === 0) break

        // AB+ (=理論値) は自明であるため省略する
        const lamps = tds[5].textContent
        const is_fullcombo = lamps.includes("FC")
        const is_allbreak = lamps.includes("AB")
        const is_fullbell = lamps.includes("FB")

        const rating = Number.parseFloat(tds[6].textContent)

        const songdt = musicRecord.find(song => song.id === songID && song.diff === diff)
        if (!songdt) {
            console.warn(`Song ${songID} ${diff} not found`)
            continue
        }

        const cSongdt = deepCopy(songdt)
        cSongdt.score = score
        cSongdt.rating = rating
        cSongdt.lamps = {
            is_fullcombo: is_fullcombo,
            is_allbreak: is_allbreak,
            is_fullbell: is_fullbell,
        }

        ratingData.best.push(cSongdt)
    }

    // 新曲枠（ベスト枠と処理共通）
    const newTableRows = doc.querySelector("#rating_new").querySelector("tbody").querySelectorAll("tr")
    for (const row of newTableRows) {
        const tds = row.querySelectorAll("td")

        const titleElement = tds[1].querySelector("a")
        const hrefSplited = titleElement.href.split("/")

        const diff = hrefSplited[hrefSplited.length - 1].slice(0, 3).toUpperCase()
        const songID = Number.parseInt(hrefSplited[hrefSplited.length - 2])
        const score = Number.parseInt(tds[4].textContent.replaceAll(",", ""))
        if (score === 0) break

        // AB+ (=理論値) は自明であるため省略する
        const lamps = tds[5].textContent
        const is_fullcombo = lamps.includes("FC")
        const is_allbreak = lamps.includes("AB")
        const is_fullbell = lamps.includes("FB")

        const rating = Number.parseFloat(tds[6].textContent)

        const songdt = musicRecord.find(song => song.id === songID && song.diff === diff)
        if (!songdt) {
            console.warn(`Song ${songID} ${diff} not found`)
            continue
        }

        const cSongdt = deepCopy(songdt)
        cSongdt.score = score
        cSongdt.rating = rating
        cSongdt.lamps = {
            is_fullcombo: is_fullcombo,
            is_allbreak: is_allbreak,
            is_fullbell: is_fullbell,
        }

        ratingData.new.push(cSongdt)
    }

    // P-SCORE枠
    const pscoreTableRows = doc.querySelector("#rating_platinum").querySelector("tbody").querySelectorAll("tr")
    for (const row of pscoreTableRows) {
        const tds = row.querySelectorAll("td")

        const titleElement = tds[1].querySelector("a")
        const hrefSplited = titleElement.href.split("/")

        const diff = hrefSplited[hrefSplited.length - 1].slice(0, 3).toUpperCase()
        const songID = Number.parseInt(hrefSplited[hrefSplited.length - 2])
        const pscore = Number.parseInt(tds[4].textContent.replaceAll(",", ""))
        const stars = Number.parseInt(tds[5].textContent)
        if (stars === 0) break

        const rating = Number.parseFloat(tds[6].textContent)

        const songdt = musicRecord.find(song => song.id === songID && song.diff === diff)
        if (!songdt) {
            console.warn(`Song ${songID} ${diff} not found`)
            continue
        }

        const cSongdt = deepCopy(songdt)
        cSongdt.pscore = pscore
        cSongdt.stars = stars
        cSongdt.rating = rating

        ratingData.pscore.push(cSongdt)
    }

    return ratingData
}
