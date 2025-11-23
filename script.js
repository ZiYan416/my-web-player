const audio = new Audio();
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const vinyl = document.getElementById('vinyl');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const fileInput = document.getElementById('file-input');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const albumArt = document.getElementById('album-art');

let isPlaying = false;

// 1. 播放/暂停控制
playPauseBtn.addEventListener('click', () => {
    if (!audio.src) {
        alert("请先点击左下角上传音乐文件！");
        return;
    }
    
    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
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

// 2. 文件上传与元数据解析
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        
        // 读取 ID3 信息 (封面、歌名、歌手)
        jsmediatags.read(file, {
            onSuccess: function(tag) {
                const tags = tag.tags;
                songTitle.innerText = tags.title || file.name;
                artistName.innerText = tags.artist || "未知艺术家";
                
                if (tags.picture) {
                    const { data, format } = tags.picture;
                    let base64String = "";
                    for (let i = 0; i < data.length; i++) {
                        base64String += String.fromCharCode(data[i]);
                    }
                    const base64 = "data:" + format + ";base64," + window.btoa(base64String);
                    albumArt.style.backgroundImage = `url('${base64}')`;
                } else {
                    albumArt.style.backgroundImage = "url('https://via.placeholder.com/300?text=No+Cover')";
                }
                playSong(); // 上传后自动播放
            },
            onError: function(error) {
                console.log('无法读取标签:', error);
                songTitle.innerText = file.name;
                playSong();
            }
        });
    }
});

// 3. 进度条逻辑
audio.addEventListener('timeupdate', (e) => {
    const { duration, currentTime } = e.srcElement;
    if (isNaN(duration)) return;
    
    const progressPercent = (currentTime / duration) * 100;
    progressBar.value = progressPercent;
    
    // 格式化时间
    currentTimeEl.innerText = formatTime(currentTime);
    durationEl.innerText = formatTime(duration);
});

progressBar.addEventListener('input', () => {
    const duration = audio.duration;
    audio.currentTime = (progressBar.value / 100) * duration;
});

// 4. 自动下一首 (此处为了演示，播放完只重置)
audio.addEventListener('ended', () => {
    pauseSong();
    audio.currentTime = 0;
    progressBar.value = 0;
});

// 辅助函数：时间格式化
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}