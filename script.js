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
const root = document.documentElement;

// 列表相关元素
const playlistBtn = document.getElementById('playlist-btn');
const playlistModal = document.getElementById('playlist-modal');
const closePlaylistBtn = document.getElementById('close-playlist');
const playlistItems = document.getElementById('playlist-items');
const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const fileInput = document.getElementById('file-input');

// 工具库
const colorThief = new ColorThief();

let playlist = []; // 初始为空，等待读取 JSON
let isPlaying = false;
let currentSongIndex = 0;
let hasLoadedSong = false;
let isMuted = false;
let previousVolume = 1;

// --- 1. 初始化：读取 music 文件夹下的配置文件 ---
async function initPlayer() {
    try {
        // 请求同目录下的 music/playlist.json
        const response = await fetch('./music/playlist.json');
        if (!response.ok) throw new Error("无法读取播放列表");
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            playlist = data;
            // 渲染列表但不播放
            renderPlaylist();
            // 预加载第一首的信息（但不播放）
            loadSong(0, false); 
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.warn("读取预设歌单失败或文件不存在:", error);
        showEmptyState();
    }
}

function showEmptyState() {
    songTitle.innerText = "播放列表为空";
    artistName.innerText = "请上传本地音乐文件";
    playlistItems.innerHTML = '<li style="text-align:center; color:#999; cursor:default;">暂无歌曲</li>';
}

// 执行初始化
initPlayer();

// --- 2. 核心功能 ---

// 加载歌曲
// autoPlay: 是否自动播放（初始化时为false，切歌时为true）
function loadSong(index, autoPlay = true) {
    if (index < 0 || index >= playlist.length) return;

    const song = playlist[index];
    currentSongIndex = index;
    
    songTitle.innerText = song.title;
    artistName.innerText = song.artist;
    
    // 处理封面：如果是本地上传的Blob URL，或者是网络链接
    const coverUrl = song.cover || 'https://via.placeholder.com/300?text=Music';
    albumArt.style.backgroundImage = `url('${coverUrl}')`;
    
    audio.src = song.src;
    
    // 应用主题
    if (song.theme) {
        applyTheme(song.theme);
    } else {
        // 如果这首歌没有预设颜色（比如新上传的），尝试提取
        extractColorFromCover(coverUrl);
    }

    updatePlaylistHighlight(index);
    hasLoadedSong = true;

    if (autoPlay) {
        playSong();
    } else {
        // 仅仅是预加载，不播放，也不转动
        pauseSong(); 
    }
}

function applyTheme(theme) {
    root.style.setProperty('--theme-color', theme.primary);
    root.style.setProperty('--theme-border', theme.border);
    root.style.setProperty('--halo-color', theme.halo);
}

// 播放/暂停
playPauseBtn.addEventListener('click', () => {
    if (playlist.length === 0) {
        alert("播放列表为空，请先打开文件！");
        return;
    }
    // 如果是刚打开网页还没加载过
    if (!hasLoadedSong) {
        loadSong(0, true);
    } else {
        isPlaying ? pauseSong() : playSong();
    }
});

function playSong() {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("播放失败:", error);
        });
    }
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

// 切歌
document.getElementById('prev-btn').addEventListener('click', () => {
    if (playlist.length === 0) return;
    currentSongIndex--;
    if (currentSongIndex < 0) currentSongIndex = playlist.length - 1;
    loadSong(currentSongIndex);
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (playlist.length === 0) return;
    currentSongIndex++;
    if (currentSongIndex > playlist.length - 1) currentSongIndex = 0;
    loadSong(currentSongIndex);
});

audio.addEventListener('ended', () => {
    document.getElementById('next-btn').click();
});

// --- 3. 播放列表 UI ---
function renderPlaylist() {
    playlistItems.innerHTML = "";
    if (playlist.length === 0) {
        showEmptyState();
        return;
    }
    
    playlist.forEach((song, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 180px;">${song.title}</span> 
            <span style="font-size:0.8rem; opacity:0.7; margin-left:10px;">${song.artist}</span>
        `;
        li.addEventListener('click', () => {
            loadSong(index);
            playlistModal.classList.remove('show');
        });
        playlistItems.appendChild(li);
    });
}

function updatePlaylistHighlight(index) {
    const items = playlistItems.querySelectorAll('li');
    items.forEach(item => item.classList.remove('active'));
    // 注意：如果有“暂无歌曲”的占位符，这里可能会报错，所以加个判断
    if(items[index] && playlist.length > 0) items[index].classList.add('active');
}

playlistBtn.addEventListener('click', () => {
    playlistModal.classList.add('show');
    // 滚动到当前播放的歌曲
    const activeItem = playlistItems.querySelector('.active');
    if(activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

closePlaylistBtn.addEventListener('click', () => {
    playlistModal.classList.remove('show');
});

// --- 4. 上传文件：自动添加到列表 ---
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        const file = files[0]; // 这里只处理单选，如果想支持多选需遍历
        const objectUrl = URL.createObjectURL(file);
        
        // 1. 创建新歌曲对象
        const newSong = {
            title: file.name, // 默认先用文件名
            artist: "本地上传",
            cover: null,      // 稍后读取
            src: objectUrl,
            theme: null       // 稍后生成
        };

        // 2. 读取 ID3 信息
        if(window.jsmediatags) {
            songTitle.innerText = "解析中..."; // 临时状态
            
            jsmediatags.read(file, {
                onSuccess: function(tag) {
                    const tags = tag.tags;
                    newSong.title = tags.title || file.name;
                    newSong.artist = tags.artist || "未知艺术家";

                    if (tags.picture) {
                        const { data, format } = tags.picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        newSong.cover = `data:${format};base64,${window.btoa(base64String)}`;
                    }

                    // 添加到列表
                    addSongToPlaylistAndPlay(newSong);
                },
                onError: function(error) {
                    // 读取失败也照样添加
                    addSongToPlaylistAndPlay(newSong);
                }
            });
        } else {
            // 没有库的情况下直接添加
            addSongToPlaylistAndPlay(newSong);
        }
    }
    // 清空 input 使得同一个文件可以再次被选择
    fileInput.value = ''; 
});

function addSongToPlaylistAndPlay(song) {
    // 推入数组
    playlist.push(song);
    
    // 重新渲染列表
    renderPlaylist();
    
    // 立即播放这首新歌 (它是数组最后一个)
    const newIndex = playlist.length - 1;
    loadSong(newIndex, true);
}

// 辅助：从图片提取颜色并应用
function extractColorFromCover(imageSrc) {
    if (!imageSrc || imageSrc.includes('placeholder')) {
        applyRandomTheme();
        return;
    }

    const tempImg = new Image();
    tempImg.crossOrigin = "Anonymous"; // 防止跨域报错
    tempImg.src = imageSrc;
    
    tempImg.onload = function() {
        try {
            const color = colorThief.getColor(tempImg);
            const [r, g, b] = color;
            const newTheme = {
                primary: `rgb(${r}, ${g}, ${b})`,
                border: `rgba(${r}, ${g}, ${b}, 0.4)`,
                halo: `rgba(${r}, ${g}, ${b}, 0.2)`
            };
            // 将提取到的颜色保存回 current song，这样切回来不用重新计算
            playlist[currentSongIndex].theme = newTheme; 
            applyTheme(newTheme);
        } catch (e) {
            applyRandomTheme();
        }
    };
    tempImg.onerror = () => applyRandomTheme();
}

function applyRandomTheme() {
    // 默认备用颜色
    const theme = { primary: "#627d98", border: "rgba(98, 125, 152, 0.4)", halo: "rgba(98, 125, 152, 0.2)" };
    applyTheme(theme);
}

// --- 5. 其他控制 (进度条/音量) 保持不变 ---
audio.addEventListener('timeupdate', (e) => {
    const { duration, currentTime } = e.srcElement;
    if (isNaN(duration)) return;
    progressBar.value = (currentTime / duration) * 100;
    currentTimeEl.innerText = formatTime(currentTime);
    durationEl.innerText = formatTime(duration);
});

progressBar.addEventListener('input', () => {
    if (!audio.src) return;
    audio.currentTime = (progressBar.value / 100) * audio.duration;
});

volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
    updateMuteIcon();
});

muteBtn.addEventListener('click', () => {
    if (isMuted) {
        audio.volume = previousVolume;
        isMuted = false;
    } else {
        previousVolume = audio.volume;
        audio.volume = 0;
        isMuted = true;
    }
    volumeSlider.value = audio.volume;
    updateMuteIcon();
});

function updateMuteIcon() {
    if (audio.volume === 0) {
        muteBtn.className = 'fa-solid fa-volume-xmark icon-btn hover-effect';
    } else {
        muteBtn.className = 'fa-solid fa-volume-high icon-btn hover-effect';
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}