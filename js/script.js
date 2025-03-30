console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs = []; // Initialize as array
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function getSongs(folder) {
    try {
        currFolder = folder;
        let response = await fetch(`songs/${folder}/`);
        if (!response.ok) throw new Error("Failed to fetch songs");
        
        let html = await response.text();
        let div = document.createElement("div");
        div.innerHTML = html;
        
        songs = Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.endsWith(".mp3"))
            .map(a => {
                // Extract filename safely
                let parts = a.href.split(`songs/${folder}/`);
                return parts.length > 1 ? parts[1] : a.href.split('/').pop();
            });

        // Update song list UI
        let songUL = document.querySelector(".songList ul");
        songUL.innerHTML = songs.map(song => `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="">
                <div class="info">
                    <div>${decodeURI(song).replaceAll("%20", " ")}</div>
                    <div>Artist</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>
        `).join('');

        // Add click handlers
        Array.from(songUL.children).forEach(li => {
            li.addEventListener("click", () => {
                let songName = li.querySelector(".info div").textContent.trim();
                playMusic(songName);
            });
        });

        return songs;
    } catch (error) {
        console.error("Error loading songs:", error);
        return [];
    }
}

const playMusic = (track, pause = false) => {
    try {
        currentSong.src = `songs/${currFolder}/${encodeURI(track)}`;
        document.querySelector(".songinfo").textContent = decodeURI(track);
        document.querySelector(".songtime").textContent = "00:00 / 00:00";
        
        if (!pause) {
            currentSong.play().catch(e => console.error("Playback failed:", e));
            document.getElementById("play").src = "img/pause.svg";
        }
    } catch (error) {
        console.error("Error playing music:", error);
    }
};

async function displayAlbums() {
    try {
        let response = await fetch('songs/');
        if (!response.ok) throw new Error("Failed to fetch albums");
        
        let html = await response.text();
        let div = document.createElement("div");
        div.innerHTML = html;
        
        let cardContainer = document.querySelector(".cardContainer");
        cardContainer.innerHTML = ""; // Clear existing
        
        let albums = Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.includes('/songs/') && 
                        !a.href.endsWith('/') && 
                        !a.href.includes('.htaccess'));
        
        for (let a of albums) {
            let folder = a.href.split('/').filter(Boolean).pop();
            if (!folder) continue;
            
            try {
                let infoRes = await fetch(`songs/${folder}/info.json`);
                if (!infoRes.ok) continue;
                
                let info = await infoRes.json();
                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <img src="songs/${folder}/cover.jpg" alt="${info.title}" onerror="this.src='img/music.svg'">
                        <h2>${info.title}</h2>
                        <p>${info.description}</p>
                    </div>
                `;
            } catch (error) {
                console.warn(`Skipping ${folder}:`, error.message);
            }
        }

        // Add album click handlers
        document.querySelectorAll(".card").forEach(card => {
            card.addEventListener("click", async () => {
                let folder = card.dataset.folder;
                songs = await getSongs(folder);
                if (songs.length > 0) playMusic(songs[0]);
            });
        });
    } catch (error) {
        console.error("Error displaying albums:", error);
    }
}

async function main() {
    try {
        // Initialize with first album
        songs = await getSongs("ncs");
        if (songs.length > 0) playMusic(songs[0], true);
        
        await displayAlbums();
        
        // Player controls
        document.getElementById("play").addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play().catch(e => console.error("Play failed:", e));
                document.getElementById("play").src = "img/pause.svg";
            } else {
                currentSong.pause();
                document.getElementById("play").src = "img/play.svg";
            }
        });

        // Time updates
        currentSong.addEventListener("timeupdate", () => {
            document.querySelector(".songtime").textContent = 
                `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            document.querySelector(".circle").style.left = 
                `${(currentSong.currentTime / currentSong.duration) * 100}%`;
        });

        // Seekbar
        document.querySelector(".seekbar").addEventListener("click", e => {
            let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
            currentSong.currentTime = (currentSong.duration * percent) / 100;
        });

        // Navigation controls
        document.querySelector(".hamburger").addEventListener("click", () => {
            document.querySelector(".left").style.left = "0";
        });

        document.querySelector(".close").addEventListener("click", () => {
            document.querySelector(".left").style.left = "-120%";
        });

        document.getElementById("previous").addEventListener("click", () => {
            let index = songs.indexOf(currentSong.src.split('/').pop());
            if (index > 0) playMusic(songs[index - 1]);
        });

        document.getElementById("next").addEventListener("click", () => {
            let index = songs.indexOf(currentSong.src.split('/').pop());
            if (index < songs.length - 1) playMusic(songs[index + 1]);
        });

        // Volume control
        let volumeInput = document.querySelector(".range input");
        volumeInput.addEventListener("input", (e) => {
            currentSong.volume = e.target.value / 100;
            document.querySelector(".volume img").src = 
                currentSong.volume > 0 ? "img/volume.svg" : "img/mute.svg";
        });

        document.querySelector(".volume img").addEventListener("click", (e) => {
            if (currentSong.volume > 0) {
                currentSong.volume = 0;
                volumeInput.value = 0;
                e.target.src = "img/mute.svg";
            } else {
                currentSong.volume = 0.1;
                volumeInput.value = 10;
                e.target.src = "img/volume.svg";
            }
        });

    } catch (error) {
        console.error("Initialization error:", error);
    }
}

// Start the app
document.addEventListener("DOMContentLoaded", main);