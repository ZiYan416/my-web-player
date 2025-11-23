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

// 列表与控制
const playlistBtn = document.getElementById('playlist-btn');
const playlistModal = document.getElementById('playlist-modal');
const closePlaylistBtn = document.getElementById('close-playlist');
const playlistItems = document.getElementById('playlist-items');
const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const fileInput = document.getElementById('file-input');

// 新增控制按钮
const shuffleBtn = document.getElementById('shuffle-btn');
const loopBtn = document.getElementById('loop-btn');

const colorThief = new ColorThief();

// --- 状态变量 ---
let playlist = []; 
let isPlaying = false;
let currentSongIndex = 0;
let hasLoadedSong = false;
let isMuted = false;
let previousVolume = 1;

// 播放模式状态
let isShuffle = false; 
// loopMode: 'list' (列表循环), 'single' (单曲循环), 'none' (顺序播放，播完停止)
let loopMode = 'list'; 

// --- 1. 初始化 ---
async function initPlayer() {
    try {
        const response = await fetch('./music/playlist.json');
        if (!response.ok) throw new Error("无法读取播放列表");
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            playlist = data;
            renderPlaylist();
            loadSong(0, false); 
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.warn("读取预设歌单失败:", error);
        showEmptyState();
    }
}
initPlayer();

function showEmptyState() {
    songTitle.innerText = "播放列表为空";
    artistName.innerText = "请上传本地音乐文件";
    playlistItems.innerHTML = '<li style="justify-content:center; color:#999; cursor:default;">暂无歌曲</li>';
    albumArt.style.backgroundImage = "url('https://via.placeholder.com/300?text=Empty')";
    audio.src = "";
    hasLoadedSong = false;
}

// --- 2. 播放核心逻辑 ---

function loadSong(index, autoPlay = true) {
    if (playlist.length === 0) return;
    // 边界检查
    if (index < 0) index = playlist.length - 1;
    if (index >= playlist.length) index = 0;

    currentSongIndex = index;
    const song = playlist[index];
    
    songTitle.innerText = song.title;
    artistName.innerText = song.artist;
    
    const coverUrl = song.cover || 'https://via.placeholder.com/300?text=Music';
    albumArt.style.backgroundImage = `url('${coverUrl}')`;
    
    audio.src = song.src;
    
    if (song.theme) {
        applyTheme(song.theme);
    } else {
        extractColorFromCover(coverUrl);
    }

    updatePlaylistHighlight();
    hasLoadedSong = true;

    if (autoPlay) {
        playSong();
    } else {
        pauseSong();
        // 重置黑胶角度
        vinyl.style.transform = 'rotate(0deg)';
    }
}

function applyTheme(theme) {
    root.style.setProperty('--theme-color', theme.primary);
    root.style.setProperty('--theme-border', theme.border);
    root.style.setProperty('--halo-color', theme.halo);
}

// 播放/暂停
playPauseBtn.addEventListener('click', () => {
    if (playlist.length === 0) return alert("请先添加歌曲！");
    if (!hasLoadedSong) {
        loadSong(0, true);
    } else {
        isPlaying ? pauseSong() : playSong();
    }
});

function playSong() {
    audio.play().catch(e => console.error("播放失败", e));
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

// --- 3. 切歌逻辑 (核心修改) ---

// 计算下一首的索引
function getNextIndex() {
    // 如果是随机播放
    if (isShuffle) {
        if (playlist.length <= 1) return 0;
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * playlist.length);
        } while (randomIndex === currentSongIndex); // 避免随机到同一首
        return randomIndex;
    }
    
    // 正常逻辑
    let nextIndex = currentSongIndex + 1;
    
    // 如果到了最后一首
    if (nextIndex >= playlist.length) {
        if (loopMode === 'list') {
            return 0; // 列表循环：回到开头
        } else {
            return -1; // 顺序播放：停止，返回 -1
        }
    }
    return nextIndex;
}

// 上一首 (通常上一首逻辑比较简单：列表循环或随机)
document.getElementById('prev-btn').addEventListener('click', () => {
    if (playlist.length === 0) return;
    
    if (audio.currentTime > 3) {
        // 如果播放超过3秒，点上一首通常是重播当前
        audio.currentTime = 0;
    } else {
        // 简单处理：上一首不随机，方便用户找回刚听过的歌
        let prevIndex = currentSongIndex - 1;
        if (prevIndex < 0) prevIndex = playlist.length - 1;
        loadSong(prevIndex);
    }
});

// 下一首按钮点击
document.getElementById('next-btn').addEventListener('click', () => {
    if (playlist.length === 0) return;
    
    // 点击下一首时，如果是单曲循环，通常用户希望强制切到下一首
    // 所以这里暂时忽略 loopMode === 'single' 的逻辑
    let index = getNextIndex();
    if (index === -1) index = 0; // 手动切歌到了末尾，强制回到第一首
    loadSong(index);
});

// 自动播放结束监听
audio.addEventListener('ended', () => {
    if (loopMode === 'single') {
        // 单曲循环：重播
        audio.currentTime = 0;
        playSong();
    } else {
        const index = getNextIndex();
        if (index !== -1) {
            loadSong(index, true);
        } else {
            // 顺序播放结束，停止
            pauseSong();
            audio.currentTime = 0;
            isPlaying = false; // 确保状态重置
        }
    }
});

// --- 4. 播放模式切换 ---

// 随机播放切换
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    if (isShuffle) {
        shuffleBtn.classList.add('active');
        shuffleBtn.title = "随机播放：开";
    } else {
        shuffleBtn.classList.remove('active');
        shuffleBtn.title = "随机播放：关";
    }
});

// 循环模式切换 (列表 -> 单曲 -> 顺序 -> 列表)
loopBtn.addEventListener('click', () => {
    if (loopMode === 'list') {
        // 切换到单曲循环
        loopMode = 'single';
        loopBtn.classList.add('active'); // 激活色
        loopBtn.classList.remove('fa-repeat');
        loopBtn.classList.add('fa-1');   // 变成数字1图标
        loopBtn.title = "单曲循环";
    } else if (loopMode === 'single') {
        // 切换到顺序播放 (播完停止)
        loopMode = 'none';
        loopBtn.classList.remove('active'); // 灰色
        loopBtn.classList.remove('fa-1');
        loopBtn.classList.add('fa-repeat'); // 换回循环图标但灰色
        loopBtn.style.opacity = "0.5"; // 视觉上变暗表示不循环
        loopBtn.title = "顺序播放 (播完停止)";
    } else {
        // 切换回列表循环
        loopMode = 'list';
        loopBtn.classList.add('active'); // 激活色
        loopBtn.style.opacity = "1";
        loopBtn.title = "列表循环";
    }
});

// --- 5. 播放列表与删除功能 ---

function renderPlaylist() {
    playlistItems.innerHTML = "";
    if (playlist.length === 0) return showEmptyState();

    playlist.forEach((song, index) => {
        const li = document.createElement('li');
        
        // 生成列表项 HTML
        li.innerHTML = `
            <div class="song-info-wrapper">
                <span style="font-weight:500;">${song.title}</span>
                <span style="font-size:0.8rem; opacity:0.7;">${song.artist}</span>
            </div>
            <div class="delete-btn" title="从列表中移除">
                <i class="fa-solid fa-trash"></i>
            </div>
        `;

        // 点击播放
        li.addEventListener('click', (e) => {
            loadSong(index);
            // playlistModal.classList.remove('show'); // 可选：点歌后是否关闭弹窗
        });

        // 删除按钮点击事件
        const delBtn = li.querySelector('.delete-btn');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡，防止触发播放
            deleteSong(index);
        });

        playlistItems.appendChild(li);
    });
    
    updatePlaylistHighlight();
}

function deleteSong(index) {
    // 1. 从数组移除
    playlist.splice(index, 1);
    
    // 2. 逻辑修正
    if (playlist.length === 0) {
        // 删光了
        audio.pause();
        audio.src = "";
        showEmptyState();
        return;
    }

    // 如果删除的是当前正在放的歌
    if (index === currentSongIndex) {
        // 如果是最后一首被删了，currentSongIndex 会自动指向新的长度（越界），需要修正
        if (currentSongIndex >= playlist.length) {
            currentSongIndex = 0;
        }
        // 重新加载当前索引（因为数组变了，当前索引对应的是原来的下一首）
        loadSong(currentSongIndex, isPlaying); 
    } 
    // 如果删除的是当前歌曲之前的歌，当前索引需要 -1 才能对应上原来的歌
    else if (index < currentSongIndex) {
        currentSongIndex--;
    }
    
    // 3. 重新渲染
    renderPlaylist();
}

function updatePlaylistHighlight() {
    const items = playlistItems.querySelectorAll('li');
    items.forEach(item => item.classList.remove('active'));
    if (playlist.length > 0 && items[currentSongIndex]) {
        items[currentSongIndex].classList.add('active');
        // 滚动可视区域
        // items[currentSongIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 列表开关
playlistBtn.addEventListener('click', () => {
    playlistModal.classList.add('show');
    updatePlaylistHighlight();
});
closePlaylistBtn.addEventListener('click', () => playlistModal.classList.remove('show'));

// --- 6. 上传与颜色提取 (保持不变) ---
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        const file = files[0];
        const objectUrl = URL.createObjectURL(file);
        const newSong = {
            title: file.name,
            artist: "本地上传",
            cover: null,
            src: objectUrl,
            theme: null
        };
        
        // 如果是第一次上传（列表为空），需要先清空空状态
        const wasEmpty = playlist.length === 0;

        // 异步读取 ID3
        if(window.jsmediatags) {
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
                    addSongAndPlay(newSong, wasEmpty);
                },
                onError: () => addSongAndPlay(newSong, wasEmpty)
            });
        } else {
            addSongAndPlay(newSong, wasEmpty);
        }
    }
    fileInput.value = '';
});

function addSongAndPlay(song, wasEmpty) {
    playlist.push(song);
    renderPlaylist();
    // 播放新加的这首
    const newIndex = playlist.length - 1;
    loadSong(newIndex, true);
}

function extractColorFromCover(imageSrc) {
    if (!imageSrc || imageSrc.includes('placeholder')) return applyRandomTheme();
    const tempImg = new Image();
    tempImg.crossOrigin = "Anonymous";
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
            playlist[currentSongIndex].theme = newTheme; 
            applyTheme(newTheme);
        } catch (e) { applyRandomTheme(); }
    };
    tempImg.onerror = () => applyRandomTheme();
}

function applyRandomTheme() {
    const theme = { primary: "#627d98", border: "rgba(98, 125, 152, 0.4)", halo: "rgba(98, 125, 152, 0.2)" };
    applyTheme(theme);
}

// 进度条与音量 (保持不变)
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
    muteBtn.className = audio.volume === 0 ? 'fa-solid fa-volume-xmark icon-btn' : 'fa-solid fa-volume-high icon-btn';
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
    muteBtn.className = isMuted ? 'fa-solid fa-volume-xmark icon-btn' : 'fa-solid fa-volume-high icon-btn';
});
function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
}