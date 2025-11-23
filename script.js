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

// 播放/暂停
playPauseBtn.addEventListener('click', () => {
    if (!audio.src) {
        alert("请先点击左下角'打开文件'上传音乐！");
        return;
    }
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

// 文件上传
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        
        // 读取封面 (需引入 jsmediatags)
        if(window.jsmediatags) {
            jsmediatags.read(file, {
                onSuccess: function(tag) {
                    const tags = tag.tags;
                    // 如果读取到信息则覆盖，否则保持默认《晴る》文本
                    if(tags.title) songTitle.innerText = tags.title;
                    if(tags.artist) artistName.innerText = tags.artist;
                    
                    if (tags.picture) {
                        const { data, format } = tags.picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        const base64 = "data:" + format + ";base64," + window.btoa(base64String);
                        albumArt.style.backgroundImage = `url('${base64}')`;
                    }
                    playSong();
                },
                onError: function(error) {
                    playSong();
                }
            });
        } else {
            playSong();
        }
    }
});

// 进度条更新
audio.addEventListener('timeupdate', (e) => {
    const { duration, currentTime } = e.srcElement;
    if (isNaN(duration)) return;
    const progressPercent = (currentTime / duration) * 100;
    progressBar.value = progressPercent;
    currentTimeEl.innerText = formatTime(currentTime);
    durationEl.innerText = formatTime(duration);
});

progressBar.addEventListener('input', () => {
    const duration = audio.duration;
    audio.currentTime = (progressBar.value / 100) * duration;
});

audio.addEventListener('ended', () => {
    pauseSong();
    audio.currentTime = 0;
    progressBar.value = 0;
    vinyl.style.transform = 'rotate(0deg)';
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}