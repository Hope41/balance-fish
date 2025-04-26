const music = new Audio('src/music.mp3')
const sound_click = new Audio('src/mouse-click-290204.mp3')
const sound_collect = new Audio('src/item-equip-6904.mp3')
const sound_footstep = new Audio('src/st3-footstep-sfx-323056.mp3')
const sound_bubble = new Audio('src/bubble-sound-43207.mp3')
const sound_air_bubble = new Audio('src/loop-air-bubbles-159283.mp3')
const sound_leave_water = new Audio('src/moving-around-in-water-woosh-splash-79922.mp3')
const sound_splash = new Audio('src/splash-water-103984.mp3')
const sound_complete_substation = new Audio('src/076833_magic-sfx-for-games-86023.mp3')
const sound_connect_substation = new Audio('src/lock-the-door-46014.mp3')
const sound_tapping = new Audio('src/computer-keyboard-typing-290582.mp3')
const sound_crash = new Audio('src/large-underwater-explosion-190270.mp3')
const sound_spawn = new Audio('src/intro-sound-180639.mp3')

sound_click.volume = .5
sound_collect.volume = .5
sound_footstep.volume = .5
sound_bubble.volume = .5
sound_air_bubble.volume = 0
sound_leave_water.volume = .3
sound_splash.volume = .4
sound_complete_substation.volume = .6
sound_connect_substation.volume = .6
sound_tapping.volume = 0
sound_crash.volume = .3
sound_spawn.volume = .7

sound_spawn.playbackRate = 2

sound_air_bubble.loop = true

music.loop = true
music.volume = 0

let startedMusic = false

function fadeIn(audio, time = 2000, target = .7) {
    // Update milliseconds
    const stepTime = 50

    const steps = time / stepTime
    const volumeStep = target / steps

    const fadeInterval = setInterval(() => {
        if (audio.volume + volumeStep < target) {
            audio.volume = Math.min(audio.volume + volumeStep, target)
        }
        else {
            audio.volume = target
            clearInterval(fadeInterval)
        }
    }, stepTime)
}

function startAudio() {
    sound_air_bubble.play()
}

function startMusic() {
    if (startedMusic || !music.paused) return

    music.play().
        then(() => {
            fadeIn(music)
            startedMusic = true
        })
        .catch(err => {
            console.warn('Autoplay blocked:', err)
        })

    removeEventListener('touchstart', startMusic)
    removeEventListener('click', startMusic)
}