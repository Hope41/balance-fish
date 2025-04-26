'use strict'

class GiantPlug {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.x = item.x
        this.y = item.y
        this.w = 300
        this.h = 150
        this.v = 0
        this.data = item.data
        this.position = {state: 'back', status: 'back'}
        this.id = makeID()
        this.r = 0

        this.x -= this.w / 2
        this.y -= this.h

        this.time = 0
    }

    update() {
        game.formatDT(this)

        // Look for cable
        game.map.shapeToCells(this, pos => {
            const cell = game.map.levels[game.level].both[pos]
            if (!cell) return

            for (let i = 0; i < cell.length; i ++) {
                const shape = cell[i]
                if (!shape.connected && shape.data.type == 'cable' &&
                    collide(this, {x: shape.x_, y: shape.y_, w: 0, h: 0})) {

                    hero.holding.reset()
                    shape.thread.pop()
                    shape.connected = {x: this.x, y: this.y + 15, w: this.w, h: this.h, r: 0}
                    shape.a = Math.PI
                    shape.onPower = this
                    shape.wow = true
                    game.finishedGame = true

                    // Draw time
                    const totalSeconds = (game.realTime * 16) / 1000
                    const hours = Math.floor(totalSeconds / 3600)
                    const minutes = Math.floor((totalSeconds % 3600) / 60)
                    const seconds = Math.floor(totalSeconds % 60)
                    const padded = (n) => String(n).padStart(2, '0')
                    const timeStr = padded(hours) + ':' + padded(minutes) + ':' + padded(seconds)

                    game.map.levels[game.level].advice = 'You took ' + timeStr

                    game.cam.shake(20, 20, 60, .3)
                    game.explosion({
                        x: this.x,
                        y: this.y,
                        w: this.w,
                        h: this.h,
                        amt: 15,
                        momentumX: .8,
                        momentumY: .8,
                        colors: [[.7,.2,.5,.5],[.6,.1,0,.7]],
                        minLifetime: 500,
                        maxLifetime: 800,
                        force: 100,
                        minSize: 30,
                        maxSize: 50
                    })
                }
            }
        })
    }

    draw() {
        const gap = 20
        const size = 20

        const top = .3

        const glow = easeInOutExpo(game.finishedGameTime * 10) / 5

        if (game.finishedGameTime) this.time += this.dt * 4
        else this.time += this.dt

        game.ctx.fillStyle = rgb(.1,0,.1+glow)
        game.ctx.strokeStyle = rgb(.4,0,.4+glow)
        game.ctx.lineWidth = game.zoom * 5
        game.rect(this.x, this.y, this.w, this.h)
        game.strokeRect(this.x, this.y, this.w, this.h)

        game.ctx.fillStyle = rgb(.2,0,.2+glow)
        game.ctx.strokeStyle = rgb(.6,.2,.6+glow)
        game.rect(this.x, this.y, this.w, this.h * top)
        game.strokeRect(this.x, this.y, this.w, this.h * top)

        const spread = .2
        const len = 1300
        const a1 = Math.PI / 2 + Math.sin(this.time / 70) / 6 - .3
        const a2 = Math.PI / 2 - Math.sin(this.time / 70 + 2) / 6 + .3

        const plugY = this.y + this.h * top * .5 - size / 2

        // Socket 1
        game.ctx.fillStyle = rgb(1,1,0,.05)
        game.ctx.beginPath()
        game.moveTo(this.x + this.w / 2 - gap - size / 2, plugY)
        game.lineTo(
            this.x + this.w / 2 - gap - Math.cos(a1 - spread) * len,
            plugY - Math.sin(a1 - spread) * len)
        game.lineTo(
            this.x + this.w / 2 - gap - Math.cos(a1 + spread) * len,
            plugY - Math.sin(a1 + spread) * len)
        game.lineTo(this.x + this.w / 2 - gap + size / 2, plugY)
        game.ctx.fill()

        // Socket 2
        game.ctx.fillStyle = rgb(1,1,0,.1)
        game.ctx.beginPath()
        game.moveTo(this.x + this.w / 2 + gap - size / 2, plugY)
        game.lineTo(
            this.x + this.w / 2 + gap - Math.cos(a2 - spread) * len,
            plugY - Math.sin(a2 - spread) * len)
        game.lineTo(
            this.x + this.w / 2 + gap - Math.cos(a2 + spread) * len,
            plugY - Math.sin(a2 + spread) * len)
        game.lineTo(this.x + this.w / 2 + gap + size / 2, plugY)
        game.ctx.fill()

        // Plug socket
        game.ctx.fillStyle = rgb(1,1,0)
        game.rect(this.x + this.w / 2 - gap - size / 2, plugY, size, size)
        game.rect(this.x + this.w / 2 + gap - size / 2, plugY, size, size)
    }
}