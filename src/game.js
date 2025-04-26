'use strict'
class Game {
    constructor() {
        // Canvas
        this.cvs = document.getElementById('canvas')
        this.ctx = this.cvs.getContext('2d')

        // Timing
        this.dt = 0
        this.realTime = 0
        this.time = -1

        // Game scales
        this.box = 0
        this.scale = 0
        this.zoom = 0

        // Mouse
        this.mouseX = 0
        this.mouseY = 0
        this.mouseDown = false
        this.mouseUp = false
        this.mouseClick = false
        this.mouseRelease = false

        // Keys
        this.key = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            press: 0,
            confirm: 0,
            danger: 0,
            r: 0
        }

        // Map
        this.level = 'reactor'
        this.map = new Map()

        // Camera
        this.cam = new Camera()
        this.cam.goal = hero

        // Particles
        this.particles = []

        // Event listeners
        addEventListener('resize', () => this.resize())
        addEventListener('mousemove', e => this.onMouseMove(e))
        addEventListener('mousedown', e => this.onMouseDown(e))
        addEventListener('mouseup', e => this.onMouseUp(e))
        addEventListener('wheel', e => e.preventDefault(), {passive: false})

        // Initialize
        this.resize()

        // Trivia
        this.scanlines = new Image()
        this.scanlines.src = 'src/scanlines.png'

        this.water = new Image()
        this.water.src = 'src/water.png'

        this.presentImage = new Image()
        this.presentImage.src = 'src/presents-dark.png'

        this.plainImage = new Image()
        this.plainImage.src = 'src/plain.png'

        this.plainDarkImage = new Image()
        this.plainDarkImage.src = 'src/plain-dark.png'

        this.glowImage = new Image()
        this.glowImage.src = 'src/glow.png'

        this.presents = true

        this.frozenShapes = {}
        this.frozenExceptions = {hasExceptions: false}
        this.freezeState = 0
        this.smoothFreezing = 0
        this.alerts = []
        this.frames = []
        this.over = []
        this.overlay = []

        this.restarting = 0
        this.restarted = 0

        this.mainCable = 0

        this.glows = []
        this.glowTime = 0

        this.finishedGame = false
        this.finishedGameTime = 0

        this.colors = {
            dark1: rgb(.3,.3,.2),
            dark2: rgb(.1,.1,.1),
            dark3: rgb(.3,.3,.3),
            dark4: rgb(.2,.2,.1),
            dim_green: rgb(0,.4,.2),
            darkcave: rgb(.2,.2,.1)
        }

        this.substations = []
        this.completed = false
        this.cableGoal = 0
        this.smoothComplete = 0

        this.lastStationActivated = 0

        this.displayingText = true
        this.displayTextTime = 0
        this.fadeDir = 0
        this.fade = 0

        this.write = 0
        this.maxWrite = 50
        this.writeTime = this.maxWrite

        this.start = true
        this.startTime = 0

        this.soundEnabled = true

        // For the first level, when you break the reactor
        this.evil = false
        this.evilTime = 0
        this.nuclearRotate = 0
    }

    touchStart(e) {
        e.preventDefault()

        this.mouseDown = true
        this.touchMove(e)

        for (let i = 0; i < e.changedTouches.length; i ++) {
            const touch = e.changedTouches[i]
            const m = {
                x: touch.clientX * devicePixelRatio,
                y: touch.clientY * devicePixelRatio,
                w: 0, h: 0}

            if (collide(m, {
                x:xDetachButtonPAD - xDetachButtonRAD,
                y:xDetachButtonPAD - xDetachButtonRAD,
                w:xDetachButtonRAD * 2,
                h:xDetachButtonRAD * 2}))
                this.key.danger = touch

            if (collide(m, {
                x:(this.cvs.width - restartButtonPAD) - restartButtonRAD,
                y:restartButtonPAD - restartButtonRAD,
                w:restartButtonRAD * 2,
                h:restartButtonRAD * 2}))
                this.key.r = touch

            if (collide(m, {x:x1PAD-PADRAD,y:yPAD-PADRAD,w:PADRAD,h:PADRAD*2}))
                this.key.left = touch
            if (collide(m, {x:x1PAD,y:yPAD-PADRAD,w:PADRAD,h:PADRAD*2}))
                this.key.right = touch
            if (collide(m, {x:x2PAD-PADRAD,y:yPAD-PADRAD,w:PADRAD*2,h:PADRAD*2}))
                this.key.up = touch

            this.onMouseDown(touch)
        }
    }

    touchMove(e) {
        if (e.originalEvent) e = e.originalEvent
        const touch = e.touches[0] || e.changedTouches[0]
        this.onMouseMove(touch.pageX, touch.pageY)
    }

    cancelTouches(e) {
        for (let i = 0; i < e.changedTouches.length; i ++) {
            const touch = e.changedTouches[i]

            const release = key => {
                if (key && key.identifier == e.changedTouches[i].identifier)
                    return false
                return key
            }

            this.key.danger = release(this.key.danger)
            this.key.r = release(this.key.r)

            this.key.up = release(this.key.up)
            this.key.down = release(this.key.down)
            this.key.left = release(this.key.left)
            this.key.right = release(this.key.right)

            this.onMouseUp(touch)
        }
    }

    alertMe(text, life) {
        this.alerts.push({text, life, time: 0})
    }

    freezeThese(arr) {
        this.freezeState = 1
        this.frozenExceptions = {hasExceptions: false}

        for (let i = 0; i < arr.length; i ++) {
            const item = arr[i]
            this.frozenShapes[item.id] = true
        }
    }

    freezeExceptThese(arr) {
        this.freezeState = 1
        this.frozenShapes = {}
        this.frozenExceptions.hasExceptions = true

        for (let i = 0; i < arr.length; i ++) {
            const item = arr[i]
            this.frozenExceptions[item.id] = true
        }
    }

    unfreezeAll() {
        this.freezeState = 0
        this.frozenShapes = {}
        this.frozenExceptions = {hasExceptions: false}
    }

    formatDT(item) {
        const isNotAnException = (this.frozenExceptions.hasExceptions && !this.frozenExceptions[item.id])
        const isFrozen = this.frozenShapes[item.id] == true
        if (isFrozen || isNotAnException)
            item.dt = Math.max(0, this.dt * (1 - this.smoothFreezing))
        else item.dt = this.dt
    }

    explosion(d) {
        for (let i = 0; i < d.amt; i ++) {
            const life = Math.random() * (d.maxLifetime - d.minLifetime) + d.minLifetime
            const particle = {
                x: d.x + Math.random() * d.w,
                y: d.y + Math.random() * d.h,
                color: d.colors[Math.floor(Math.random() * d.colors.length)],
                size: Math.random() * (d.maxSize - d.minSize) + d.minSize,
                lifetime: life,
                life: life,
                vx: Math.random() * d.force - d.force / 2 + (d.vx || 0),
                vy: Math.random() * d.force - d.force / 2 + (d.vy || 0),
                momentumX: d.momentumX,
                momentumY: d.momentumY,
            }

            this.particles.push(particle)
        }
    }

    onMouseMove(e) {
        this.mouseX = e.clientX * devicePixelRatio
        this.mouseY = e.clientY * devicePixelRatio
    }

    onMouseDown(e) {
        this.onMouseMove(e)
        this.mouseUp = false

        this.mouseClick = true
        this.mouseDown = true
    }

    onMouseUp(e) {
        this.onMouseMove(e)
        this.mouseDown = false

        this.mouseRelease = true
        this.mouseUp = true
    }

    resize() {
        const SCALE = .01

        this.cvs.width = innerWidth * devicePixelRatio
        this.cvs.height = innerHeight * devicePixelRatio + 1

        this.box = Math.min(innerWidth, innerHeight) * SCALE
        this.scale = (this.cvs.width + this.cvs.height) * SCALE
    }

    worldPos(x, y) {
        return {
            x: (x - this.cvs.width / 2) / this.zoom + this.cam.x,
            y: (y - this.cvs.height / 2) / this.zoom + this.cam.y
        }
    }

    pixelPos(x, y) {
        return {
            x: (x - this.cam.x) * this.zoom + this.cvs.width / 2,
            y: (y - this.cam.y) * this.zoom + this.cvs.height / 2
        }
    }
    
    arc(x, y, r, start, end) {
        const pixel = this.pixelPos(x, y)
        this.ctx.arc(pixel.x, pixel.y, r * this.zoom, start, end)
    }

    moveTo(x, y) {
        const pixel = this.pixelPos(x, y)
        this.ctx.moveTo(pixel.x, pixel.y)
    }

    lineTo(x, y) {
        const pixel = this.pixelPos(x, y)
        this.ctx.lineTo(pixel.x, pixel.y)
    }

    rect(x, y, w, h) {
        const pixel = this.pixelPos(x, y)
        this.ctx.fillRect(pixel.x, pixel.y, w * this.zoom, h * this.zoom)
    }

    strokeRect(x, y, w, h) {
        const pixel = this.pixelPos(x, y)
        this.ctx.strokeRect(pixel.x, pixel.y, w * this.zoom, h * this.zoom)
    }

    rectZoom(x, y, w, h) {
        this.ctx.fillRect(x * this.zoom, y * this.zoom, w * this.zoom, h * this.zoom)
    }

    arc(x, y, r, start = 0, end = Math.PI * 2, counter = false) {
        const pixel = this.pixelPos(x, y)
        this.ctx.arc(pixel.x, pixel.y, r * this.zoom, start, end, counter)
    }

    ellipse(x, y, rx, ry, a, start = 0, end = Math.PI * 2, counter = false) {
        const pixel = this.pixelPos(x, y)
        this.ctx.ellipse(pixel.x, pixel.y, rx * this.zoom, ry * this.zoom, a, start, end, counter)
    }

    draw_poly(array) {
        this.moveTo(array[0], array[1])
        for (let i = 2; i < array.length; i += 2) {
            const x = array[i]
            const y = array[i + 1]
            this.lineTo(x, y)
        }
    }

    draw_ground(shape) {
        this.ctx.beginPath()

        // Default vars
        this.ctx.lineWidth = this.zoom * 5
        this.ctx.fillStyle = rgb(0,0,0)
        this.ctx.strokeStyle = rgb(.3,.8,.2)

        if (this.map.level > 2) {
            this.ctx.fillStyle = rgb(0,0,.1)
            this.ctx.strokeStyle = rgb(.7,.1,.5)
        }

        // Custom vars
        const fill = shape.data.color
        const stroke = shape.data.stroke
        if (stroke) {
            if (shape.data.strokew)
                this.ctx.lineWidth = this.zoom * shape.data.strokew
            this.ctx.strokeStyle = this.colors[stroke]
        }
        if (fill) this.ctx.fillStyle = this.colors[fill]

        // Draw
        this.draw_poly(shape.content)

        this.ctx.fill()
        this.ctx.stroke()
    }

    draw_deco(shape) {
        if (shape.data.form == 'nuclear') {
            const bad = easeInOutExpo(this.evilTime - .1)

            if (this.evilTime > .6) {
                this.explosion({
                    x: shape.x,
                    y: shape.y,
                    w: 0,
                    h: 0,
                    amt: 1,
                    momentumX: .9,
                    momentumY: .9,
                    colors: [[.7,0,0,.3],[1,.3,0,.1],[0,0,0,.1],[0,0,0,.3]],
                    minLifetime: 20,
                    maxLifetime: 40,
                    force: 20,
                    minSize: 50,
                    maxSize: 70
                })
            }

            this.ctx.beginPath()
            this.ctx.fillStyle = rgb(0,0,0,.3)
            this.arc(shape.x + 10,shape.y + 10,50,0,Math.PI*2)
            this.ctx.fill()

            this.ctx.lineWidth = this.zoom * 5
            this.ctx.strokeStyle = rgb(.1,.1,.1)

            this.ctx.beginPath()
            this.ctx.fillStyle = rgb(.7,.7-bad/2,.1)
            this.arc(shape.x,shape.y,50,0,Math.PI*2)
            this.ctx.fill()
            this.ctx.stroke()

            this.ctx.fillStyle = rgb(.1,.1,.1)

            this.ctx.beginPath()
            this.arc(shape.x,shape.y,8,0,Math.PI*2)
            this.ctx.fill()

            const triOff = 28
            const triSpread = .5

            this.ctx.strokeStyle = rgb(.1,.1,.1)
            this.ctx.lineWidth = this.zoom * 30

            const third = (Math.PI * 2) / 3

            this.nuclearRotate += (1 + bad * 20) * this.dt
            const turn = this.nuclearRotate / 100

            this.ctx.beginPath()
            this.arc(shape.x, shape.y, triOff, turn + -triSpread, turn + triSpread)
            this.ctx.stroke()

            this.ctx.beginPath()
            this.arc(shape.x, shape.y, triOff, turn + third - triSpread, turn + third + triSpread)
            this.ctx.stroke()

            this.ctx.beginPath()
            this.arc(shape.x, shape.y, triOff, turn + third * 2 - triSpread, turn + third * 2 + triSpread)
            this.ctx.stroke()

            return
        }

        this.ctx.beginPath()

        const fill = shape.data.color
        const stroke = shape.data.stroke

        if (stroke) {
            this.ctx.lineWidth = this.zoom * (shape.data.strokew || 5)
            this.ctx.strokeStyle = this.colors[stroke]
        }

        if (fill) this.ctx.fillStyle = this.colors[fill]

        this.draw_poly(shape.content)

        if (fill) this.ctx.fill()
        if (stroke) this.ctx.stroke()
    }

    draw_water(shape) {
        const deep = -(this.map.level - 1) / 7
        const dark1 = -shape.y / 40000
        const dark2 = -(shape.y + shape.h / 2) / 40000

        let r = .3
        let g = .6
        let b = .7

        if (this.map.level > 2) {
            r = .6
            g = .9
            b = .9
        }

        if (this.level == 'city') {
            r = 0
            g = 0
            b = 0
        }

        this.ctx.fillStyle = rgb(r-.2,g-.2,b-.2)
        this.rect(shape.x, shape.y - 5, shape.w, 5)

        this.ctx.fillStyle = rgb(r+deep+dark1,g+deep+dark1,b+deep+dark1)
        this.rect(shape.x, shape.y, shape.w, shape.h / 2)

        this.ctx.fillStyle = rgb(r+deep+dark2,g+deep+dark2,b+deep+dark2)
        this.rect(shape.x, shape.y + shape.h / 2, shape.w, shape.h / 2)
    }

    draw_barrier(shape) {
        shape.update()
        shape.draw()
    }

    draw_ugly_fish(shape) {
        shape.update()
        shape.draw()
    }

    draw_shark(shape) {
        if (this.level == 'city' && !this.finishedGame) return

        shape.update()
        shape.draw()
    }

    draw_shrimp(shape) {
        if (this.level == 'city' && !this.finishedGame) return

        shape.update()
        shape.draw()
    }

    draw_cable(shape) {
        shape.update()
        shape.draw()
    }

    draw_goal(shape) {
        if (this.completed) {
            if (!shape.data.time)
                shape.originalY = shape.y
            shape.data.time += .006 * this.dt

            shape.y = shape.originalY + Math.min(1, easeInOutExpo(shape.data.time) * 2) *
                shape.data.height
        }
    }

    draw_resistor(shape) {
        shape.update()
        shape.draw()
    }

    draw_power(shape) {
        shape.update()
        shape.draw()
    }

    draw_text(shape) {
        const textSize = 70

        this.ctx.fillStyle = rgb(0,0,0)
        this.text(shape.data.text, shape.x, shape.y + 5, textSize)

        this.ctx.fillStyle = rgb(1,1,1)
        this.text(shape.data.text, shape.x, shape.y, textSize)
    }

    draw_giant_plug(shape) {
        shape.update()
        shape.draw()
    }

    draw_building(shape) {
        const w = shape.h / 2
        const h = shape.h

        const j = shape.x+999

        const pos = this.pixelPos(shape.x, shape.y + h)

        this.ctx.save()
        this.ctx.translate(pos.x, pos.y)
        this.ctx.rotate(Math.sin(j*9)*.1)

        const gray = .1 - shape.h / 10000
        this.ctx.fillStyle = rgb(gray,gray,gray)
        this.rectZoom(-w / 2, -h, w, h)

        const amt = 3
        const wSize = shape.h / 15
        const whole = (w - wSize) / amt

        for (let i = 0; i < 20; i ++) {
            const x = i % amt
            const y = Math.floor(i / amt)

            const k = this.finishedGameTime * 8 + Math.sin(shape.x * 9 + i / 2)
            const randYellow = .5 + Math.sin(i*i+9) * .1
            const rand = Math.min(randYellow, k > 1 ? .1 + (k - 1) * 4 : .1)

            this.ctx.fillStyle = rgb(rand,rand,.1)

            this.rectZoom(
                whole / 2 + x * whole - w / 2,
                whole / 2 + y * whole - h,
                wSize, wSize)
        }

        this.ctx.restore()
    }

    draw_bunting(shape) {
        if (!this.finishedGame) return

        this.ctx.beginPath()
        this.ctx.strokeStyle = rgb(.2,.6,.4)
        this.ctx.lineWidth = this.zoom * 5

        this.moveTo(shape.content[0], shape.content[1])
        for (let i = 2; i < shape.content.length; i += 2) {
            const x = shape.content[i]
            const y = shape.content[i + 1]
            this.lineTo(x, y)
        }

        this.ctx.stroke()

        for (let i = 2; i < shape.content.length; i += 2) {
            const px = shape.content[i - 2]
            const py = shape.content[i - 1]
            const x = shape.content[i]
            const y = shape.content[i + 1]

            const w = (Math.PI * 2) / 3
            const l = easeInOutExpo(this.finishedGameTime*10-(.5+Math.sin(shape.x)))

            const I = i / 2
            const gray = .4
            const sat = .2

            const strength = .3
            const biasG = Math.sin(shape.x+w)*strength
            const biasB = Math.sin(shape.x+w*2)*strength

            this.ctx.beginPath()
            this.ctx.fillStyle = rgb(
                gray,
                gray+Math.sin(I+w)*sat+biasG,
                gray+Math.sin(I+w*2)*sat+biasB)
            this.moveTo(px, py)
            this.lineTo(x, y)
            this.lineTo((x+px)/2 + l * (py-y)/2, (py+y)/2 + l * Math.abs(px-x)/2)
            this.ctx.fill()
        }
    }

    text(text, x, y, size) {
        const pos = this.pixelPos(x, y)
        this.ctx.textAlign = 'center'
        this.ctx.font = (size*this.zoom) + 'px font, sans-serif'
        this.ctx.fillText(text, pos.x, pos.y)
    }

    drawImage(image, x, y, w, h) {
        const pixel = this.pixelPos(x, y)
        this.ctx.drawImage(image, pixel.x, pixel.y, w * this.zoom, h * this.zoom)
    }

    update(oldPerf) {
        // Control time for devices with a high refresh rate
        const DT = (performance.now() - oldPerf) / 16
        const DT_ = (performance.now() - oldPerf) / 14
        this.dt = Math.min(1.5, DT)
        this.time += this.dt

        document.body.style.cursor = 'default'

        this.over = []
        this.overlay = []

        // Change freeze speed
        this.smoothFreezing += (this.freezeState - this.smoothFreezing) / 2 * this.dt

        // Camera
        this.cam.update(this)

        // Finish
        if (this.finishedGame) {
            this.finishedGameTime += .001 * this.dt
        }
        else this.realTime += DT_

        // Set scale
        this.zoom = this.scale * this.cam.zoom

        // Initialize off screen followers
        const offScreen = []
        for (let i = 0; i < hero.followers.length; i ++)
            offScreen.push(hero.followers[i].id)

        // Update
        hero.update(this)

        if (this.start && this.time > 1) {
            this.startTime += .01 * this.dt

            // Background
            this.ctx.fillStyle = rgb(0,0,0)
            this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)

            const size = this.box * 130
            const ang = Math.sin(this.time / 50) * .3
            const ang2 = Math.sin(this.time / 50 + 2) * .3

            // Main
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width / 2, this.cvs.height / 2, size, 0, Math.PI * 2)
            this.ctx.fillStyle = rgb(0,.02,.02)
            this.ctx.fill()

            // Inner main
            this.ctx.fillStyle = rgb(0,.05,.05)
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width / 2, this.cvs.height / 2, size - this.box * 30, 0, Math.PI * 2)
            this.ctx.fill()

            // Bright inner main
            this.ctx.fillStyle = rgb(.05,.1,.1)
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width / 2, this.cvs.height / 2, size - this.box * 30, Math.PI - ang2, Math.PI * 2 - ang2)
            this.ctx.fill()

            // Electricity
            const itr = 10
            const s = size - this.box * 10
            const oft = random(-1, 1) * this.box

            this.ctx.beginPath()
            for (let i = -1; i < itr; i ++) {
                const amt = ((i + 1) / itr) * s * 2 - s

                const I = i + 99
                const a = ang
                const am = this.box * 10 * Math.sin(I * 9 + Math.floor(this.time / 7) * I * 9)

                this.ctx.lineTo(
                    this.cvs.width / 2 + Math.cos(a) * amt + Math.sin(a) * am,
                    this.cvs.height / 2 + oft + Math.sin(a) * amt - Math.cos(a) * am)
            }

            this.ctx.strokeStyle = rgb(.3,.2,.4)
            this.ctx.lineWidth = this.box * 5
            this.ctx.stroke()

            this.ctx.strokeStyle = rgb(.95,.9,1)
            this.ctx.lineWidth = this.box * 1.5
            this.ctx.stroke()

            // Gray outline
            this.ctx.lineWidth = this.box * 20
            this.ctx.strokeStyle = rgb(.05,.05,.05)
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width / 2, this.cvs.height / 2, size, 0, Math.PI * 2)
            this.ctx.stroke()

            // Green outline
            this.ctx.strokeStyle = rgb(.02,.05,.02)
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width / 2, this.cvs.height / 2, size, Math.PI + ang, Math.PI * 2 + ang)
            this.ctx.stroke()

            // Purple outline
            this.ctx.lineWidth = this.box

            this.ctx.strokeStyle = rgb(.2,0,.4)
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width / 2, this.cvs.height / 2, size - this.box * 10, 0, Math.PI * 2)
            this.ctx.stroke()

            // Fade
            this.ctx.fillStyle = rgb(0,0,0,1-easeInOutExpo(this.startTime/2))
            this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)

            // Write text
            const squish = (1 - easeInOutExpo(this.startTime * 2 - 1.5) * .4)
            const rise = -easeInOutExpo(this.startTime * 2 - 2) * this.box * 50

            const str = 'Balance FISH'
            const write = Math.min(str.length, Math.floor(this.startTime * 20))

            let textSize = this.box * 50

            if (this.box * 50 > this.cvs.width / 4.2) {
                textSize = this.box * 20
            }
            else if (this.box * 50 > this.cvs.width / 5.5) {
                textSize = this.box * 30
            }
            else {
                textSize *= squish
            }

            this.ctx.textAlign = 'center'
            this.ctx.font = textSize + 'px font, monospace, sans-serif'

            const x = this.cvs.width / 2
            const y = this.cvs.height / 2 + textSize * FONT_OFT + rise

            let yellow = false

            for (let i = 0; i < write; i ++) {
                const inc = textSize / 2.2
                const oftX = (i - (write - 1) / 2) * inc
                const char = str.charAt(i)

                this.ctx.fillStyle = rgb(0,0,0)
                this.ctx.fillText(char, x + oftX, y + this.box * 2)

                this.ctx.fillStyle = rgb(1,1,1)
                if (char == ' ') yellow = true
                if (yellow) this.ctx.fillStyle = rgb(1,1,.5)

                this.ctx.fillText(char, x + oftX, y)
            }

            const buttonW = this.box * 120
            const buttonH = this.box * 17
            const buttonYOft = this.box * 20
            const buttonGap = this.box * 10
            const buttonZH = this.box * 3

            let buttonY = buttonYOft
            let idx = 0

            const drawButton = (text, hover, click) => {
                const slide = (1 - easeInOutExpo(
                    Math.min(1, this.startTime * 2 - 2 - idx / 5) -
                    Math.max(0, this.fade - idx / 5)
                ))

                const slideAmt = slide * this.box * 100
                const w = buttonW - idx * this.box * 10

                this.ctx.fillStyle = (hover ? rgb(.1,.3,.4,1-slide) : rgb(0,.1,.2,1-slide))
                this.ctx.fillRect(x - w / 2 - slideAmt, y + buttonY + buttonH, w, buttonZH)

                this.ctx.fillStyle = (hover ? rgb(.1,.5,.6,1-slide) : rgb(0,.2,.3,1-slide))
                this.ctx.fillRect(x - w / 2 - slideAmt, y + buttonY + (click ? buttonZH : 0), w, buttonH)

                const textSize = this.box * 13

                this.ctx.fillStyle = rgb(.85,.95,1,1-slide)
                this.ctx.font = textSize + 'px font, monospace, sans-serif'
                this.ctx.textAlign = 'center'
                this.ctx.fillText(
                    text,
                    x - slideAmt,
                    y + buttonY + (click ? buttonZH : 0) + buttonH / 2 + textSize * FONT_OFT)

                buttonY += buttonH + buttonGap
                idx ++
            }

            const makeButton = (action, draw) => {
                const slide = (1 - easeInOutExpo(
                    Math.min(1, this.startTime * 2 - 2 - idx / 5) -
                    Math.max(0, this.fade - idx / 5)
                ))
                const slideAmt = slide * this.box * 100
                const w = buttonW - idx * this.box * 10

                const item = {
                    action,
                    draw,
                    x: x - w / 2 - slideAmt,
                    y: y + buttonY,
                    w,
                    h: buttonH + buttonZH
                }

                const mouse = {x: this.mouseX, y: this.mouseY, w: 0, h: 0}

                let hover = false
                let click = false

                if ((collide(mouse, item) || this.key.confirm) && slide < .5) {
                    hover = true
                    document.body.style.cursor = 'pointer'

                    if (this.mouseDown || this.key.confirm) {
                        click = true
                        sound_click.play()
                    }
                    if (this.mouseRelease || this.key.confirm) {
                        action()
                    }

                    this.key.confirm = false
                }

                draw(hover, click)
            }

            makeButton(
                () => {
                    if (this.fade) return
                    this.fade = 0
                    this.fadeDir = 1

                    startAudio()

                    if (this.soundEnabled)
                        startMusic()
                },
                (hover = false, click = false) => {
                    drawButton('Quick Play', hover, click)
                }
            )
            makeButton(
                () => {
                    this.soundEnabled = !this.soundEnabled
                },
                (hover = false, click = false) => {
                    drawButton('Music: ' + (this.soundEnabled ? 'ON' : 'OFF'), hover, click)
                }
            )
            makeButton(
                () => {
                    window.location = 'https://joachimford.uk'
                },
                (hover = false, click = false) => {
                    drawButton('More Games', hover, click)
                }
            )

            // Draw fade
            this.fade += this.fadeDir * .01 * this.dt

            if (this.fade < 0) {
                this.fade = 0
                this.fadeDir = 0
            }
            if (this.fade > 1) {
                this.fade = 1
                this.start = false
                this.startTime = 0
                this.fadeDir = 0
            }
            if (this.fade) {
                this.ctx.fillStyle = rgb(0,0,0,this.fade)
                this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)
            }
        }

        else {
            // Background
            if (this.map.level > 2) {
                this.ctx.fillStyle = rgb(.225,.2,.175)
                this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)
            }
            else {
                const rays = 4

                for (let i = 0; i < rays; i ++) {
                    const unit = this.cvs.height / rays
                    const k = i / 10
        
                    this.ctx.fillStyle = rgb(.5+k,.6+k,.3+k)
                    this.ctx.fillRect(0, i * unit, this.cvs.width, unit)
                }
            }

            // Camera sectors
            const hor = this.cvs.width / this.zoom
            const vrt = this.cvs.height / this.zoom
            const top = Math.floor((this.cam.y - vrt / 2) / this.map.cellSize)
            const lef = Math.floor((this.cam.x - hor / 2) / this.map.cellSize)
            const bot = Math.floor((this.cam.y + vrt / 2) / this.map.cellSize) + 1
            const rig = Math.floor((this.cam.x + hor / 2) / this.map.cellSize) + 1

            // --- Background map ---
            const hasBeenFound = []
            const drawMoreInFront = []
            const drawInFront = []
            const drawInFarFront = []

            // Iterate through cells
            for (let x = lef; x < rig; x ++) {
                for (let y = top; y < bot; y ++) {
                    const cell = this.map.levels[this.level].back[
                        posToIndex(x, y, this.map.levels[this.level].sortWidth)]
                    if (!cell) continue

                    for (let i = 0; i < cell.length; i ++) {
                        const shape = cell[i]

                        if (hasBeenFound.includes(shape)) continue

                        if (shape.position.status == 'back') drawMoreInFront.push(shape)
                        else if (shape.position.status == 'fore') drawInFront.push(shape)
                        else if (shape.position.status == 'far-fore') drawInFarFront.push(shape)
                        else this['draw_'+shape.data.type](shape)

                        if (hero.hasFollower(shape))
                            offScreen.splice(offScreen.indexOf(shape.id), 1)

                        hasBeenFound.push(shape)
                    }

                    // Draw water image
                    if (this.level != 'city')
                        this.drawImage(
                            this.water,
                            x * this.map.cellSize,
                            y * this.map.cellSize,
                            this.map.cellSize,
                            this.map.cellSize)
                }
            }

            if (this.level == 'city' && this.finishedGame) {
                this.ctx.drawImage(this.glowImage, 0, 0, this.cvs.width, this.cvs.height)
            }

            // Draw background shapes in order
            for (let i = 0; i < drawMoreInFront.length; i ++) {
                const shape = drawMoreInFront[i]
                this['draw_'+shape.data.type](shape)
            }

            for (let i = 0; i < drawInFront.length; i ++) {
                const shape = drawInFront[i]
                this['draw_'+shape.data.type](shape)
            }

            for (let i = 0; i < drawInFarFront.length; i ++) {
                const shape = drawInFarFront[i]
                this['draw_'+shape.data.type](shape)
            }

            if (this.completed && this.cableGoal) {
                // Update cable goal
                this.draw_goal(this.cableGoal)

                // Move cables
                const reset = this.cableGoal.data.time > .8
                const limit = this.cableGoal.originalY + this.cableGoal.data.height / 2

                this.cam.capY = limit

                if (hero.y >= limit + hero.r) {
                    hero.y = limit + 100
                    this.map.nextLevel()
                }

                for (let i = 0; i < this.substations.length; i ++) {
                    const item = this.substations[i].cable

                    if (!reset) {
                        if (limit > item.y && this.lastStationActivated.id == this.substations[i].id)
                            this.cam.goal = item
                    }

                    item.update()
                    item.draw()
                }

                if (reset) this.cam.goal = hero
            }

            // Hero
            hero.draw(this)

            // Foreground map
            const drawnFore = []
            const drawForeInFront = []

            for (let x = lef; x < rig; x ++) {
                for (let y = top; y < bot; y ++) {
                    const cell = this.map.levels[this.level].fore[
                        posToIndex(x, y, this.map.levels[this.level].sortWidth)]
                    if (!cell) continue

                    for (let i = 0; i < cell.length; i ++) {
                        const shape = cell[i]

                        if (drawnFore.includes(shape)) continue

                        else if (shape.position.status == 'fore') drawForeInFront.push(shape)
                        else this['draw_'+shape.data.type](shape)

                        drawnFore.push(shape)

                        if (hero.hasFollower(shape))
                            offScreen.splice(offScreen.indexOf(shape.id), 1)
                    }

                    // Draw water image
                    if (x % 2 == 1 && y % 2 == 1) {
                        this.drawImage(
                            this.water,
                            x * this.map.cellSize,
                            y * this.map.cellSize,
                            this.map.cellSize * 2,
                            this.map.cellSize * 2)
                    }
                }
            }

            for (let i = 0; i < drawForeInFront.length; i ++) {
                const shape = drawForeInFront[i]
                this['draw_'+shape.data.type](shape)
            }

            // Update off screen followers
            for (let i = 0; i < offScreen.length; i ++) {
                const item = hero.currentFollows[offScreen[i]]
                if (!item) continue
                item.update()
            }

            // Finish flash
            if (this.finishedGame) {
                this.ctx.fillStyle = rgb(1,1,1,1 - this.finishedGameTime * 50)
                this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)
            }

            // Check if hero completed the level
            this.completed = true
            let amountCompleted = 0
            for (let i = 0; i < this.substations.length; i ++) {
                const item = this.substations[i]
                if (!item.cable.on) this.completed = false
                else amountCompleted ++
            }
            const completedDec = (this.substations.length ? amountCompleted / this.substations.length : 0)
            this.smoothComplete += (completedDec - this.smoothComplete) / 6 * this.dt

            // Draw reminder
            if (this.time > 1) {
                const remindW = this.box * 140
                const remindH = this.box * 15
                const remindY = this.box * 5
                const remindTextSize = this.box * 8

                // Box
                this.ctx.fillStyle = rgb(0,0,0,.5)
                this.ctx.lineWidth = .5 * this.box
                this.ctx.strokeStyle = rgb(1,1,1,.5)
                this.ctx.fillRect(
                    this.cvs.width / 2 - remindW / 2,
                    this.cvs.height - remindH - remindY,
                    remindW, remindH)

                this.ctx.strokeRect(
                    this.cvs.width / 2 - remindW / 2,
                    this.cvs.height - remindH - remindY,
                    remindW, remindH)

                // Text
                this.ctx.fillStyle = rgb(1,1,1)
                this.ctx.textAlign = 'center'
                this.ctx.font = remindTextSize + 'px font, monospace, sans-serif'
                this.ctx.fillText(
                    this.map.levels[this.level].advice,
                    this.cvs.width / 2,
                    this.cvs.height - remindY - remindH / 2 + remindTextSize * FONT_OFT)
            }

            // Particles
            for (let i = 0; i < this.particles.length; i ++) {
                const item = this.particles[i]

                item.life -= this.dt

                if (item.life < 0) {
                    this.particles.splice(i, 1)
                    i --
                    continue
                }

                item.vx *= Math.pow(item.momentumX, this.dt)
                item.vy *= Math.pow(item.momentumY, this.dt)

                item.x += item.vx * this.dt
                item.y += item.vy * this.dt

                const life = Math.pow(item.life, 5)
                const lifetime = Math.pow(item.lifetime, 5)
                const progress = (lifetime - life) / lifetime
                const size = sharpSin(progress * Math.PI) * item.size

                this.ctx.fillStyle = rgb(item.color[0],item.color[1],item.color[2],item.color[3])
                this.rect(item.x - size / 2, item.y - size / 2, size, size)
            }

            // Over
            for (let i = 0; i < this.over.length; i ++)
                this.over[i]()

            // Draw progress bar
            if (this.level != 'city') {
                const progressW = this.box * 140
                const progressH = this.box * 7
                const progressY = this.box * 5

                const progressPad = this.box * 1.5

                const progressChannel = this.smoothComplete * (progressW - progressPad * 2)

                this.ctx.fillStyle = rgb(.1,.1,.1)
                this.ctx.fillRect(
                    this.cvs.width / 2 - progressW / 2,
                    progressY + this.box, progressW, progressH)

                this.ctx.fillStyle = rgb(.3,.3,.3)
                this.ctx.fillRect(
                    this.cvs.width / 2 - progressW / 2,
                    progressY, progressW, progressH)

                this.ctx.fillStyle = rgb(.3,.8,.3)
                this.ctx.fillRect(
                    this.cvs.width / 2 - progressW / 2 + progressPad,
                    progressY + progressPad,
                    progressChannel,
                    progressH - progressPad * 2)
            }

            // Overlay
            for (let i = 0; i < this.overlay.length; i ++)
                this.overlay[i]()

            // Alert texts
            for (let i = 0; i < this.alerts.length; i ++) {
                const item = this.alerts[i]
                item.time += this.dt

                if (item.time > item.life) {
                    this.alerts.splice(i, 1)
                    i --
                }

                const progress = item.time / item.life
                const dec = 1 - Math.pow(Math.max(0, Math.abs(progress - .5) * 2 - .6), 2) / .16

                const slide = easeInOutExpo(dec)
                const fade = easeInOutExpo(dec*2-1)

                const xOft = -this.box * 5 * (1 - slide)
                const messageW = this.box * 130 * slide
                const messageH = this.box * 10
                const messagePad = this.box * 10
                const textSize = this.box * 8

                this.ctx.fillStyle = rgb(1,1,1,.9)
                this.ctx.fillRect(messagePad + xOft, messagePad, messageW, messageH)

                this.ctx.fillStyle = rgb(0,0,0,fade)
                this.ctx.textAlign = 'center'
                this.ctx.font = textSize + 'px font, monospace, sans-serif'
                this.ctx.fillText(
                    item.text, messagePad + messageW / 2 + xOft,
                    messagePad + messageH / 2 + textSize * FONT_OFT)
            }

            // --- RESTART ---
            if (this.key.r && !this.restarted && this.level != 'city') {
                this.restarting += .01 * this.dt

                if (this.restarting > 1) {
                    this.map.formatLevel(this.level)
                }
            }
            else this.restarting -= .01 * this.dt

            // Increase restarted to close overlay
            if (this.restarting > 1 || this.restarted) {
                this.restarting = 0
                this.unfreezeAll()
                this.restarted += .01 * this.dt
                this.key.r = false

                if (this.restarted > 1) {
                    this.restarted = 0
                }
            }

            // Cap restart overlay timer
            this.restarting = Math.max(0, Math.min(1, this.restarting))

            // Draw restart overlay
            if (this.restarting || this.restarted) {
                const snap = (this.restarted ? 0 : .3)
                const restartedDec = (this.restarted ? 1 - this.restarted : 0)
                const dec_1 = easeInOutExpo(this.restarting + restartedDec) * (1 + snap)
                const dec = Math.min(1, dec_1)
                const decA = 1
                const barW = 10 * this.zoom
                const shakeAmt = (this.restarted ? 0 : 40)
                const fontSize = this.box * 20

                const contact = Math.max(0,dec_1-1)
                const shake = shakeAmt - ((contact * shakeAmt) / (snap || 1))
                const xOft = contact * random(-shake, shake) * this.zoom

                const pos = (this.cvs.width / 2) * dec

                this.ctx.fillStyle = rgb(.1,.1,.1,decA)
                this.ctx.fillRect(0, 0, pos, this.cvs.height)
                this.ctx.fillRect(this.cvs.width, 0, -pos, this.cvs.height)

                this.ctx.fillStyle = rgb(1,.9,.2,decA)
                this.ctx.fillRect(pos + xOft, 0, -barW, this.cvs.height)
                this.ctx.fillRect(this.cvs.width - pos + xOft, 0, barW, this.cvs.height)

                this.ctx.fillStyle = rgb(1,1,1,decA)
                this.ctx.font = fontSize + 'px font, monospace, sans-serif'
                this.ctx.textAlign = 'center'

                this.ctx.fillStyle = rgb(0,0,0,decA)
                this.ctx.fillText(
                    'RESTART',
                    pos + xOft - this.cvs.width / 4,
                    this.cvs.height / 2 + fontSize * FONT_OFT + fontSize * .1)

                this.ctx.fillText(
                    'LEVEL',
                    this.cvs.width - pos + xOft + this.cvs.width / 4,
                    this.cvs.height / 2 + fontSize * FONT_OFT + fontSize * .1)

                this.ctx.fillStyle = rgb(1,1,1,decA)
                this.ctx.fillText(
                    'RESTART',
                    pos + xOft - this.cvs.width / 4,
                    this.cvs.height / 2 + fontSize * FONT_OFT)

                this.ctx.fillText(
                    'LEVEL',
                    this.cvs.width - pos + xOft + this.cvs.width / 4,
                    this.cvs.height / 2 + fontSize * FONT_OFT)
            }

            // Draw fade
            this.fade += this.fadeDir * .01 * this.dt

            if (this.fade < 0) {
                this.fade = 0
                this.fadeDir = 0
            }
            if (this.fade > 1) {
                this.fade = 1
                this.fadeDir = 0
            }
            if (this.fade) {
                this.ctx.fillStyle = rgb(0,0,0,this.fade)
                this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)
            }

            // Draw init level text
            if (this.presents && this.time > 1) {
                this.displayTextTime += .002 * this.dt

                const a = this.displayTextTime < 1 ? easeInOutExpo(Math.sin(this.displayTextTime * Math.PI)) : 0

                this.ctx.fillStyle = rgb(0,0,0)
                this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height)

                // Image
                const textSize = this.box * 10
                const imageSize = this.box * .2

                const imgW = 460 * imageSize
                const imgH = 409 * imageSize

                const oft = this.box * 5

                this.ctx.globalAlpha = a / 3
                this.ctx.imageSmoothingEnabled = false
                this.ctx.drawImage(
                    this.plainDarkImage,
                    this.cvs.width / 2 - imgW / 2,
                    this.cvs.height / 2 - imgH / 2 - oft,
                    imgW,
                    imgH)
                this.ctx.imageSmoothingEnabled = true
                this.ctx.globalAlpha = 1

                // Details
                const fontSize = 10 * this.box

                this.ctx.fillStyle = rgb(1,1,1,a)
                this.ctx.textAlign = 'center'
                this.ctx.font = fontSize + 'px font, monospace, sans-serif'

                this.ctx.fillText(
                    'No part of this game was generated',
                    this.cvs.width / 2,
                    this.cvs.height / 2 + fontSize * FONT_OFT - this.box * 30)

                this.ctx.fillText(
                    'using artificial intelligence',
                    this.cvs.width / 2,
                    this.cvs.height / 2 + fontSize * FONT_OFT * 4.5 - this.box * 30)

                this.ctx.fillText(
                    'Made in 13 days, in pure JavaScript',
                    this.cvs.width / 2,
                    this.cvs.height / 2 + fontSize * FONT_OFT)

                this.ctx.fillText(
                    'Licensed under CC BY-SA 4.0',
                    this.cvs.width / 2,
                    this.cvs.height / 2 + fontSize * FONT_OFT + this.box * 20)

                // Text
                this.ctx.fillStyle = rgb(.9,.9,.9,a)
                this.ctx.textAlign = 'center'
                this.ctx.font = textSize + 'px font, monospace, sans-serif'
                this.ctx.fillText(
                    'by Hope41',
                    this.cvs.width / 2 + imgW / 2,
                    this.cvs.height / 2 + imgH / 2 + textSize * FONT_OFT + oft)

                if (this.displayTextTime > .98 && this.displayTextTime < 1) {
                    sound_spawn.play()
                }

                if (this.displayTextTime > 1) {
                    this.displayTextTime = 0
                    this.displayingText = true
                    this.presents = false
                }
            }

            if (!this.presents && this.displayingText && this.time > 1) {
                this.displayTextTime += .004 * this.dt

                const resetDisplayText = () => {
                    this.displayingText = false
                    this.displayTextTime = 0
                    this.fadeDir = -1
                    this.write = 0
                    this.writeTime = this.maxWrite
                }

                if (!this.map.level) {
                    resetDisplayText()
                }

                else {
                    const headSize = this.box * 25
                    const textSize = this.box * 20
                    const str = this.map.levels[this.level].text

                    const a = (1 - (this.displayTextTime*4-3)) * capDec(this.displayTextTime * 2)

                    this.writeTime -= this.dt
                    if (this.writeTime < 0) {
                        this.writeTime = random(2, 6)
                        this.write ++
                        if (this.write >= str.length) {
                            this.write = str.length
                            sound_tapping.volume = Math.max(0, sound_tapping.volume - .1 * this.dt)
                        }
                        else {
                            sound_tapping.volume = .6
                            sound_tapping.play()
                        }
                    }

                    // --- GAUGE ---
                    const gaugeSize = this.box * 80
                    const gaugeY = -this.box * 10
                    const ang = -Math.cos(this.time / 40) * .1
                    const needleOff = this.box * 10
                    const needleLen = this.box * 60

                    const needleAng = Math.PI / 2 + Math.sin(this.time / 50)

                    // Draw gauge
                    this.ctx.lineWidth = this.box * 7
                    this.ctx.strokeStyle = rgb(.25,.35,.45,a)
                    this.ctx.beginPath()
                    this.ctx.arc(
                        this.cvs.width / 2,
                        this.cvs.height / 2 + gaugeSize / 2 + gaugeY,
                        gaugeSize, Math.PI + ang, Math.PI * 2 + ang)

                    this.ctx.fillStyle = rgb(.05,.05,.05,a)
                    this.ctx.fill()

                    this.ctx.stroke()

                    this.ctx.lineWidth = this.box * 4
                    this.ctx.strokeStyle = rgb(.2,.3,.4,a)
                    this.ctx.stroke()

                    // Draw needle
                    this.ctx.lineWidth = this.box * 5
                    this.ctx.strokeStyle = rgb(.6,.2,.2,a)

                    this.ctx.beginPath()
                    this.ctx.moveTo(
                        this.cvs.width / 2 - Math.cos(needleAng) * needleOff,
                        this.cvs.height / 2 + gaugeSize / 2 + gaugeY - Math.sin(needleAng) * needleOff)
                    this.ctx.lineTo(
                        this.cvs.width / 2 - Math.cos(needleAng) * needleLen,
                        this.cvs.height / 2 + gaugeSize / 2 + gaugeY - Math.sin(needleAng) * needleLen)
                    this.ctx.stroke()

                    this.ctx.textAlign = 'center'

                    // Heading
                    this.ctx.save()
                    this.ctx.translate(this.cvs.width / 2, this.cvs.height / 2 + this.box * 5)
                    this.ctx.rotate(-Math.sin(this.time / 40) * .04)

                    this.ctx.font = headSize + 'px font, monospace, sans-serif'
                    this.ctx.fillStyle = rgb(0,0,0,a)
                    this.ctx.fillText(
                        'LEVEL ' + (this.map.level), 0, -headSize * FONT_OFT * 2 + this.box * 2)

                    this.ctx.fillStyle = rgb(1,1,1,a)
                    this.ctx.fillText(
                        'LEVEL ' + (this.map.level), 0, -headSize * FONT_OFT * 2)

                    this.ctx.restore()

                    // Text
                    this.ctx.save()
                    this.ctx.translate(this.cvs.width / 2, this.cvs.height / 2 + this.box * 5)
                    this.ctx.rotate(Math.sin(this.time / 40) * .1)

                    this.ctx.font = textSize + 'px font, monospace, sans-serif'

                    for (let i = 0; i < this.write + 1; i ++) {
                        const x = (i - (this.write - 1) / 2) * this.box * 9
                        const y = Math.sin(Math.floor(this.time / 20 + i) + i) * this.box * .5

                        const k = .9 + Math.sin(i*i) * .1
                        const blue = (.5 + Math.sin(i*i*i) / 2) / 5

                        if (i > this.write - 1) {
                            if (this.time % 15 > 8) {
                                const caretW = this.box * 3
                                const caretH = this.box * 20

                                this.ctx.fillStyle = rgb(0,0,0,a)
                                this.ctx.fillRect(
                                    x, y + textSize * FONT_OFT - caretH / 2 + this.box * 2,
                                    caretW, caretH)

                                this.ctx.fillStyle = rgb(.9,.9,1,a)
                                this.ctx.fillRect(
                                    x, y + textSize * FONT_OFT - caretH / 2,
                                    caretW, caretH)
                            }
                        }

                        else {
                            this.ctx.fillStyle = rgb(0,0,0)
                            this.ctx.fillText(str.charAt(i), x, textSize * FONT_OFT * 2 + y + this.box * 2)

                            this.ctx.fillStyle = rgb(k-blue,k-blue,k+blue,a)
                            this.ctx.fillText(str.charAt(i), x, textSize * FONT_OFT * 2 + y)
                        }
                    }

                    this.ctx.restore()

                    if (this.displayTextTime > 1) {
                        resetDisplayText()
                    }
                }
            }
        }

        // Draw FPS
        this.ctx.fillStyle = '#fff'

        if (this.frames.length > 10)
            this.frames.shift()
        this.frames.push(DT)

        for (let i = 0; i < this.frames.length; i ++) {
            const frame = this.frames[i]
            this.ctx.fillRect(this.cvs.width - i * 10, this.cvs.height - frame * 10, 5, 5)
        }

        // Glows
        this.glowTime -= this.dt
        if (this.glowTime < 0) {
            const pos = this.worldPos(random(0, this.cvs.width), random(0, this.cvs.height))
            this.glows.push({
                x: pos.x,
                y: pos.y,
                time: 0
            })

            this.glowTime = 100
        }

        for (let i = 0; i < this.glows.length; i ++) {
            const item = this.glows[i]
            const dec = capDec(Math.sin(item.time * Math.PI))
            const size = dec * 20

            item.y -= .5 * this.dt

            this.ctx.fillStyle = rgb(1,.7,.5,.5*dec)
            if (this.map.level > 3)
                this.ctx.fillStyle = rgb(.7,.5,1,.5*dec)

            this.rect(item.x - size / 2, item.y - size / 2, size, size)

            item.time += .002 * this.dt

            if (item.time > 1) {
                this.glows.splice(i, 1)
                i --
            }
        }

        if (this.finishedGame && this.time > 1) {
            const t = ((this.finishedGameTime - .1) * 40)

            const size = this.box * 10

            const w = this.box * 100 * easeInOutExpo(t)
            const h = this.box * 20
            const y = this.box * 5

            this.ctx.fillStyle = rgb(0,0,0,t)
            this.ctx.fillRect(this.cvs.width / 2 - w / 2, y, w, h)

            this.ctx.strokeStyle = rgb(1,1,1,t)
            this.ctx.strokeRect(this.cvs.width / 2 - w / 2, y, w, h)

            this.ctx.fillStyle = rgb(.7,1,.5,t)
            this.ctx.font = size + 'px font, monospace, sans-serif'
            this.ctx.fillText('ALL SYSTEMS BALANCED', this.cvs.width / 2, y + h / 2 + size * FONT_OFT - size / 2.3)
            this.ctx.fillText('Thanks for playing!', this.cvs.width / 2, y + h / 2 + size * FONT_OFT + size / 2.3)

            // Sliding text
            const size_ = this.box * 9
            const x = this.box * 10
            const scrollOft = -Math.max(0, this.finishedGameTime - .2) * 700
            const gap = size_ * 3

            let yOft = scrollOft + this.cvs.height + size_ * FONT_OFT * 2

            this.ctx.font = size_ + 'px font, monospace, sans-serif'

            const drawText = (text, func = false) => {
                let yPos = yOft

                if (func && yPos < this.cvs.height / 2 - gap / 2) {
                    yPos = this.cvs.height / 2 - gap / 2
                    yOft = yPos
                }

                this.ctx.fillStyle = rgb(0,0,0)
                this.ctx.fillText(text, x, yPos + this.box)

                const box = {
                    x,
                    y: yPos - size_ * FONT_OFT - size_,
                    w: this.cvs.width,
                    h: size_ * 2}

                this.ctx.fillStyle = rgb(1,1,1)

                if (func && collide({x:this.mouseX,y:this.mouseY,w:0,h:0},box)) {
                    this.ctx.fillStyle = rgb(1,.5,0)
                    document.body.style.cursor = 'pointer'

                    if (this.mouseDown) {
                        func()
                        this.mouseDown = false
                    }
                }

                this.ctx.fillText(text, x, yPos)

                yOft += gap
            }

            this.ctx.textAlign = 'left'
            drawText('A short game by Hope41')
            drawText('Made in 13 days for Gamedev.js 2025')
            drawText('Created in pure JavaScript, no libraries')
            drawText('Sound effects by authentic Pixabay sounds')
            drawText('All music by Hope41')
            drawText('Thanks for playing!')
            drawText('')
            drawText('Quick Links:')
            drawText('- Star Balance FISH on GitHub', () => {
                window.open('https://github.com/Hope41/balance-fish', '_blank')
            })
            drawText('- See more at joachimford.uk', () => {
                window.open('https://joachimford.uk', '_blank')
            })

            this.ctx.textAlign = 'center'
        }

        // MOBILE CONTROL PAD
        if (this.time > 1 && MOBILE) {
            const box = this.box * 10
            const text = box * 1.5

            PADRAD = box * 3
            x1PAD = box + PADRAD
            x2PAD = this.cvs.width - box - PADRAD
            yPAD = this.cvs.height - box - PADRAD

            xDetachButtonPAD = box * 2.5
            xDetachButtonRAD = box * 1.5

            restartButtonPAD = box * 2.5
            restartButtonRAD = box * 1.5

            this.ctx.fillStyle = '#d554'
            if (this.key.danger) this.ctx.fillStyle = '#d448'
            this.ctx.beginPath()
            this.ctx.arc(xDetachButtonPAD, xDetachButtonPAD, xDetachButtonRAD, 0, Math.PI * 2)
            this.ctx.fill()

            this.ctx.fillStyle = '#dd54'
            if (this.key.r) this.ctx.fillStyle = '#dd48'
            this.ctx.beginPath()
            this.ctx.arc(this.cvs.width - restartButtonPAD, restartButtonPAD, restartButtonRAD, 0, Math.PI * 2)
            this.ctx.fill()

            this.ctx.fillStyle = '#dfe3'
            if (this.key.right) this.ctx.fillStyle = '#dfe4'
            this.ctx.beginPath()
            this.ctx.arc(x1PAD, yPAD, PADRAD, -Math.PI / 2, Math.PI / 2)
            this.ctx.fill()

            this.ctx.fillStyle = '#dfe6'
            if (this.key.left) this.ctx.fillStyle = '#dfe5'
            this.ctx.beginPath()
            this.ctx.arc(x1PAD, yPAD, PADRAD, Math.PI / 2, -Math.PI / 2)
            this.ctx.fill()

            this.ctx.fillStyle = '#dfe3'
            if (this.key.up) this.ctx.fillStyle = '#dfe6'
            this.ctx.beginPath()
            this.ctx.arc(x2PAD, yPAD, PADRAD, 0, Math.PI * 2)
            this.ctx.fill()

            this.ctx.font = text + 'px font, monospace, sans-serif'
            const shad = this.box

            this.ctx.fillStyle = rgb(0,0,0)
            this.ctx.fillText('X', xDetachButtonPAD, xDetachButtonPAD + shad + text * FONT_OFT)
            this.ctx.fillText('R', this.cvs.width - restartButtonPAD, restartButtonPAD + shad + text * FONT_OFT)

            this.ctx.fillText('L', x1PAD - PADRAD / 2, yPAD + shad + text * FONT_OFT)
            this.ctx.fillText('R', x1PAD + PADRAD / 2, yPAD + shad + text * FONT_OFT)
            this.ctx.fillText('UP', x2PAD, yPAD + shad + text * FONT_OFT)

            this.ctx.fillStyle = rgb(1,1,1)
            this.ctx.fillText('X', xDetachButtonPAD, xDetachButtonPAD + text * FONT_OFT)
            this.ctx.fillText('R', this.cvs.width - restartButtonPAD, restartButtonPAD + text * FONT_OFT)

            this.ctx.fillText('L', x1PAD - PADRAD / 2, yPAD + text * FONT_OFT)
            this.ctx.fillText('R', x1PAD + PADRAD / 2, yPAD + text * FONT_OFT)
            this.ctx.fillText('UP', x2PAD, yPAD + text * FONT_OFT)
        }

        // Scanlines
        this.ctx.drawImage(this.scanlines, 0, 0, this.cvs.width, this.cvs.height)

        // Reset
        if (this.mouseClick) this.mouseClick = false
        if (this.mouseRelease) this.mouseRelease = false
        const old = performance.now()
        requestAnimationFrame(() => this.update(old))
    }
}