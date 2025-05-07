'use strict'

class Cable {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.x = item.x
        this.y = item.y
        this.w = 0
        this.h = 0
        this.v = 0
        this.data = item.data
        this.position = {state: 'back', status: 'fore'}
        this.id = makeID()

        // Thread
        this.startX = this.x
        this.startY = this.y
        this.thread = []

        // Trivia
        this.onPower = false
        this.connected = 0
        this.beingHeld = false
        this.beingHeldCount = 0
        this.a = 0
        this.x_ = this.x - 25
        this.y_ = this.y - 50

        if (this.data.state == 'reactor') {
            this.y_ = this.y + 130
        }

        this.w_ = 50
        this.h_ = 50
        this.lastX = this.x_
        this.lastY = this.y_
        this.maxLen = (this.data.l || 50)
        this.snapping = 0
        this.realStartX = this.x_
        this.realStartY = this.y_
        this.fade = false
        this.time = 0
        this.shrink = false
        this.oftY = 0
        this.strength = (this.data.strength || 1)
        this.del = false
        this.removeMe = false

        this.open = 0
        this.wow = false
    }

    snap() {
        if (this.connected) {
            this.snapping = 0
            this.beingHeld = false
            this.shrink = false
            this.fade = false
            return
        }

        if (this.fade || this.shrink) this.snapping += .01 * this.dt
        else this.snapping += .04 * this.dt

        if (this.shrink && this.thread.length) {
            const last = this.thread[Math.max(0, this.thread.length - 1)]
            const speed = .1

            this.x_ += (last.x - this.x_) * .02 * game.dt
            this.y_ += (last.y - this.y_) * .02 * game.dt

            for (let i = 0; i < this.thread.length; i ++) {
                const unit = this.thread[i]
                const last = (i ? this.thread[i - 1] : {x: this.realStartX, y: this.realStartY})

                unit.x += (last.x - unit.x) * speed * this.dt
                unit.y += (last.y - unit.y) * speed * this.dt
            }
        }

        if (this.snapping > 1) {
            this.thread = []
            this.x_ = this.realStartX
            this.y_ = this.realStartY
            hero.holding.reset()
            if (!this.fade && !this.shrink)
                game.cam.shake(20, 20, 15, .07)
            this.snapping = 0
            this.beingHeld = false
            this.shrink = false
            this.fade = false
            this.oftY = this.h_ * 2
            this.onPower = 0

            if (this.del)
                this.removeMe = true
        }
    }

    update() {
        game.formatDT(this)

        this.time += this.dt

        if (this.connected) {
            const r = this.connected.r + 30
            const w = this.connected.w
            const h = this.connected.h
            this.x_ = this.connected.x + w / 2 - this.w_ / 2 + Math.cos(this.a + Math.PI / 2) * (r + w / 2)
            this.y_ = this.connected.y + h / 2 - this.h_ / 2 + Math.sin(this.a + Math.PI / 2) * (r + h / 2)
            return
        }

        const dx = this.x_ - this.lastX
        const dy = this.y_ - this.lastY
        const d = Math.hypot(dx, dy)

        if (d > 100) {
            this.thread.push({x:this.x_,y:this.y_,time:0})

            this.lastX = this.x_
            this.lastY = this.y_
        }

        if (this.thread.length > this.maxLen || this.snapping) {
            this.snap()
        }

        let minX = this.startX
        let minY = this.startY
        let maxX = this.startX
        let maxY = this.startY

        for (let i = 0; i < this.thread.length; i ++) {
            const unit = this.thread[i]
            const last = this.thread[i - 1]
            const next = this.thread[i + 1]

            if (last && next) {
                // Calculate how much the line changes direction
                const area = findAngle(last, unit, next)
                const lineLength = Math.hypot(next.x - last.x, next.y - last.y)
                const threshold = .005 * lineLength

                if (unit.snapped) {
                    unit.snapped += this.dt
                    const dir = Math.sign(unit.x - last.x)
                    last.x -= this.dt * dir * (30 / unit.snapped)
                    unit.x += this.dt * dir * (30 / unit.snapped)
                }

                if (area > threshold) {
                    const smoothAmt = .1

                    const goalX = (last.x + next.x) / 2
                    const goalY = (last.y + next.y) / 2

                    unit.x += (goalX - unit.x) * smoothAmt * this.dt
                    unit.y += (goalY - unit.y) * smoothAmt * this.dt
                }

                // Delete segment if too small
                if (lineLength < 20) {
                    this.thread.splice(i, 1)
                    i --
                }
            }

            if (unit.x < minX) minX = unit.x
            else if (unit.x > maxX) maxX = unit.x
            if (unit.y < minY) minY = unit.y
            else if (unit.y > maxY) maxY = unit.y
        }

        if (this.x_ < minX) minX = this.x_
        else if (this.x_ + this.w_ > maxX) maxX = this.x_ + this.w_
        if (this.y_ < minY) minY = this.y_
        else if (this.y_ > maxY) maxY = this.y_

        this.x = minX
        this.y = minY
        this.w = (maxX - minX)
        this.h = (maxY - minY)

        if (this.beingHeld)
            this.beingHeldCount += this.dt / 10

        this.oftY *= Math.pow(.95, this.dt)

        if (hero.dt > .5 && !this.connected && hero.holding.shape.id == this.id && game.key.danger && game.level != 'reactor') {
            this.connected = false
            this.beingHeld = false
            this.snap()
            hero.holding.reset()
        }

        game.map.shapeToCells(this)
    }

    draw() {
        const s = this.w_
        const bodyW = 1 * s
        const bodyH = .7 * this.h_
        const pinW = .2 * s
        const pinH = .3 * s
        let inset = .15 * s

        const toSnap = Math.max(0, 20 - (this.maxLen - this.thread.length)) / 20
        let tension = Math.sin(game.time * game.time * toSnap * 9e4) * toSnap * 3
        let snapping = Math.sin(this.snapping * 9e4) * this.snapping * 10

        if (this.connected) {
            tension = 0
            snapping = 0
        }

        else if (toSnap) {
            game.explosion({
                x: this.x_,
                y: this.y_,
                w: this.w_,
                h: this.h_,
                amt: 1,
                momentumX: .95,
                momentumY: .95,
                colors: [[.1,.1,.1,.5],[.7,.4,0,.5],[.6,.1,0,.7]],
                minLifetime: 100,
                maxLifetime: 200,
                force: 4,
                minSize: 20,
                maxSize: 30
            })
            game.cam.shake(toSnap, toSnap, 5, .03)
        }

        game.ctx.lineJoin = 'round'

        let base = .1
        if (game.map.level > 3) base = 0

        // --- Draw cable ---
        const yOft = this.oftY
        const a = (this.fade ? (1 - this.snapping) : this.shrink ? (3 - this.snapping * 3) : 1)

        game.ctx.beginPath()
        game.moveTo(this.startX, this.startY)

        const yLift = 70
        if (this.beingHeld)
            game.lineTo(this.startX, this.startY + yOft - yLift)

        for (let i = (this.data.state == 'reactor' ? 0 : 1); i < this.thread.length; i ++) {
            const unit = this.thread[i]

            const calcBob = i => {
                let bob = sharpSin(game.time / 10 + i) * 5 + sharpSin(game.time / 33 + i / 3) * 15
                if (this.connected) bob += Math.sin(i * i + Math.floor(game.time / 20) * i) * 10
                return bob
            }

            const bob = calcBob(i)

            unit.time += .01 * this.dt

            const x = unit.x + bodyW / 2
            const y = unit.y + this.h_ / 2 + bob * quad(Math.min(1, unit.time)) + tension + snapping

            if (unit.snapped) game.moveTo(x, y + yOft)
            else game.lineTo(x, y + yOft)
        }

        game.lineTo(this.x_ + bodyW / 2, this.y_ + this.h_ / 2 + yOft + tension + snapping)

        if (game.map.level > 3) {
            game.ctx.lineWidth = (14 + Math.sin(game.time/25) * 2) * game.zoom
            game.ctx.strokeStyle = rgb(.5,1,.8,a/2*(this.strength/2))

            if (game.level == 'city') {
                game.ctx.strokeStyle = rgb(.4,0,.3)
            }

            game.ctx.stroke()
        }

        game.ctx.lineWidth = 10 * game.zoom
        if (this.connected) {
            const v = Math.sin(game.time / 10) * .5
            game.ctx.strokeStyle = rgb(.3+v,.1+v,.5+v,a)
        }
        else {
            game.ctx.strokeStyle = rgb(base+tension/6+snapping/6,base,base,a)
        }
        game.ctx.stroke()

        // --- Draw plug ---
        if (!this.connected) {
            let ang = 0
            if (this.data.state == 'reactor') ang = Math.PI
            if (this.thread.length > 1) {
                const dx = this.thread[this.thread.length - 2].x - this.x_
                const dy = this.thread[this.thread.length - 2].y - this.y_
                ang = Math.atan2(dy, dx) - Math.PI / 2
            }
            this.a = ang
        }

        const pos = game.pixelPos(this.x_ + bodyW / 2, this.y_ + yOft + this.h_ / 2 + tension / 3 + snapping)

        game.ctx.save()
        game.ctx.translate(pos.x, pos.y)
        game.ctx.rotate(this.a)

        game.ctx.fillStyle = rgb(base,base,base,a)
        if (game.level == 'city') {
            game.ctx.fillStyle = rgb(.4,0,.3)
        }
        game.rectZoom(-bodyW / 2, -this.h_ / 2, bodyW, bodyH)

        game.ctx.fillStyle = rgb(base+.1,base+.1,base+.1,a)
        if (game.level == 'city') {
            game.ctx.fillStyle = rgb(.5,.1,.4)
            if (this.wow) {
                game.ctx.fillStyle = rgb(.6,.6,0)
                inset = .05 * s
            }
        }
        game.rectZoom(inset - bodyW / 2, -this.h_ / 2, pinW, -pinH)
        game.rectZoom(bodyW / 2 - inset, -this.h_ / 2, -pinW, -pinH)
        game.ctx.restore()

        const dx = this.x_ - hero.x
        const dy = this.y_ - hero.y
        const d = Math.hypot(dx, dy)

        if (d < 300) this.open += .04 * this.dt
        else this.open -= .04 * this.dt
        this.open = Math.max(0, Math.min(1, this.open))

        // Stats
        if (!this.connected && game.map.level > 0) {
            game.over.push(() => {
                const shrink = quad(this.beingHeldCount / 2) * 10
                const dec = easeInOutExpo(this.open)
                const A = (a - yOft / 3) * dec

                const speechW = (100 - shrink) * dec
                const speechH = 35 - shrink / 2
                const oft = 10 - shrink / 2
                const lift = 30

                const textSize = 35 - shrink / 2

                let pos = 0

                // Voltage
                pos += speechH

                game.ctx.fillStyle = rgb(0,0,0,A*.6)
                game.rect(this.x_ + this.w_ / 2 - speechW / 2, this.y_ - lift - oft - pos, speechW, speechH)

                game.ctx.fillStyle = rgb(1,1,1,A)
                game.text(this.data.volt + 'v', this.x_ + this.w_ / 2, this.y_ - lift - oft - (pos - speechH / 2) + textSize * FONT_OFT, textSize)

                // Strength
                if (game.map.level > 3) {
                    pos += speechH

                    game.ctx.fillStyle = rgb(0,.2,.2,A*.6)
                    game.rect(this.x_ + this.w_ / 2 - speechW / 2, this.y_ - lift - oft - pos, speechW, speechH)

                    game.ctx.fillStyle = rgb(.5,1,1,A)
                    game.text(Math.max(0,this.strength-1)+'▲', this.x_ + this.w_ / 2, this.y_ - lift - oft - (pos - speechH / 2) + textSize * FONT_OFT, textSize)
                }

                // Length
                if (game.map.level > 2) {
                    pos += speechH

                    game.ctx.fillStyle = rgb(.2,.2,0,A*.6)
                    game.rect(this.x_ + this.w_ / 2 - speechW / 2, this.y_ - lift - oft - pos, speechW, speechH)

                    game.ctx.fillStyle = rgb(1,1,.5,A)
                    game.text(
                        Math.max(0,Math.min(this.maxLen,Math.round(this.maxLen-(this.thread.length-1))))+'↔',
                        this.x_ + this.w_ / 2,
                        this.y_ - lift - oft - (pos - speechH / 2) + textSize * FONT_OFT, textSize)
                }

                // Outline
                game.ctx.lineWidth = game.zoom
                game.ctx.strokeStyle = rgb(1,1,1,A/2)
                game.strokeRect(this.x_ + this.w_ / 2 - speechW / 2, this.y_ - lift - oft - pos, speechW, pos)
            })
        }
    }
}