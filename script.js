const audio = new Audio();
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const vinyl = document.getElementById('vinyl');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const albumArt = document.getElementById('album-art');
const root = document.documentElement; // 用于修改CSS变量

let isPlaying = false;
let currentSongIndex = 0;

// --- 1. 预设歌单 (数据中心) ---
// 你可以在这里添加更多歌曲。注意：为了GitHub预览，请使用外链或将mp3放入仓库
const playlist = [
    {
        title: "晴る (Sunny)",
        artist: "Yorushika",
        cover: "https://i.scdn.co/image/ab67616d0000b273a30233241437270d7e8f9f09",
        // 由于没有真实音频外链，这里使用示例音频，请自行替换
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
        // 专属配色：清新奶绿
        theme: {
            start: "#f2fce2",
            end: "#fffdf2",
            primary: "#8ccf5e",
            halo: "rgba(140, 207, 94, 0.25)"
        }
    },
    {
        title: "Midnight City",
        artist: "M83",
        cover: "https://upload.wikimedia.org/wikipedia/en/7/75/M83_-_Midnight_City.jpg",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        // 专属配色：午夜紫蓝
        theme: {
            start: "#a18cd1",
            end: "#fbc2eb",
            primary: "#9b59b6",
            halo: "rgba(155, 89, 182, 0.25)"
        }
    },
    {
        title: "Orange Ocean",
        artist: "Summer Vibes",
        cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        // 专属配色：落日橙
        theme: {
            start: "#f6d365",
            end: "#fda085",
            primary: "#ff9f43",
            halo: "rgba(255, 159, 67, 0.25)"
        }
    }
];

// --- 2. 随机配色池 (用于本地上传文件) ---
const randomThemes = [
    { start: "#a1c4fd", end: "#c2e9fb", primary: "#3498db", halo: "rgba(52, 152, 219, 0.25)" }, // 蓝
    { start: "#ff9a9e", end: "#fecfef", primary: "#ff6b81", halo: "rgba(255, 107, 129, 0.25)" }, // 粉
    { start: "#cfd9df", end: "#e2ebf0", primary: "#95a5a6", halo: "rgba(149, 165, 166, 0.25)" }, // 灰冷
    { start: "#84fab0", end: "#8fd3f4", primary: "#00b894", halo: "rgba(0, 184, 148, 0.25)" }  // 青
];

// 初始化加载第一首
loadSong(currentSongIndex);

// --- 3. 核心功能函数 ---

function loadSong(index) {
    const song = playlist[index];
    
    // 更新信息
    songTitle.innerText = song.title;
    artistName.innerText = song.artist;
    albumArt.style.backgroundImage = `url('${song.cover}')`;
    audio.src = song.src;
    
    // 应用主题色
    applyTheme(song.theme);
    
    // 重置进度
    resetPlayerUI();
}

function applyTheme(theme) {
    root.style.setProperty('--bg-gradient-start', theme.start);
    root.style.setProperty('--bg-gradient-end', theme.end);
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--halo-color', theme.halo);
}

function resetPlayerUI() {
    progressBar.value = 0;
    currentTimeEl.innerText = "00:00";
    vinyl.style.transform = "rotate(0deg)";
    if (isPlaying) playSong();
}

// 播放/暂停控制
playPauseBtn.addEventListener('click', () => {
    isPlaying ? pauseSong() : playSong();
});

function playSong() {
    audio.play();
    isPlaying = true;
    playIcon.classList.remove('fa-play');
    playIcon.classList.add('fa-pause');
    vinyl.style.animationPlayState = 'running';
}

function pauseSong() {
    audio.pause();
    isPlaying = false;
    playIcon.classList.remove('fa-pause');
    playIcon.classList.add('fa-play');
    vinyl.style.animationPlayState = 'paused';
}

// 上一首
document.getElementById('prev-btn').addEventListener('click', () => {
    currentSongIndex--;
    if (currentSongIndex < 0) currentSongIndex = playlist.length - 1;
    loadSong(currentSongIndex);
    playSong();
});

// 下一首
document.getElementById('next-btn').addEventListener('click', () => {
    currentSongIndex++;
    if (currentSongIndex > playlist.length - 1) currentSongIndex = 0;
    loadSong(currentSongIndex);
    playSong();
});

// --- 4. 本地文件上传 (保留功能并增强) ---
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        
        // 读取ID3
        if(window.jsmediatags) {
            jsmediatags.read(file, {
                onSuccess: function(tag) {
                    const tags = tag.tags;
                    songTitle.innerText = tags.title || file.name;
                    artistName.innerText = tags.artist || "本地音乐";
                    
                    if (tags.picture) {
                        const { data, format } = tags.picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        const base64 = "data:" + format + ";base64," + window.btoa(base64String);
                        albumArt.style.backgroundImage = `url('${base64}')`;
                    }
                },
                onError: () => {
                    songTitle.innerText = file.name;
                }
            });
        }
        
        // 上传文件时，随机切换一个背景主题
        const randomTheme = randomThemes[Math.floor(Math.random() * randomThemes.length)];
        applyTheme(randomTheme);
        
        playSong();
    }
});

// 进度条逻辑保持不变...
audio.addEventListener('timeupdate', (e) => {
    const { duration, currentTime } = e.srcElement;
    if (isNaN(duration)) return;
    progressBar.value = (currentTime / duration) * 100;
    currentTimeEl.innerText = formatTime(currentTime);
    durationEl.innerText = formatTime(duration);
});

progressBar.addEventListener('input', () => {
    audio.currentTime = (progressBar.value / 100) * audio.duration;
});

// 自动播放下一首
audio.addEventListener('ended', () => {
    document.getElementById('next-btn').click();
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}