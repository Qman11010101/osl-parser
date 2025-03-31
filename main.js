const BASE_URL = "https://oslcap.qmc.workers.dev/"

document.querySelector("#exec").addEventListener("click", async () => {
    const OSL_USER_ID = document.querySelector("#osl-id").value
    const URL_TECHNICAL = `${BASE_URL}?id=${OSL_USER_ID}&type=technical`
    const URL_RATING = `${BASE_URL}?id=${OSL_USER_ID}&type=rating`

    const responseTechnical = await (await fetch(URL_TECHNICAL)).text()
    const responseRating = await (await fetch(URL_RATING)).text()
    const musicRecord = await (await fetch("https://reiwa.f5.si/ongeki_record.json")).json()

    const playerData = mergeAndGeneratePlayerData(responseTechnical, responseRating, musicRecord)
    console.log(playerData)
})