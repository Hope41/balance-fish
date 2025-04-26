'use strict'

class Barrier {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.x = item.x
        this.y = item.y
        this.w = item.w
        this.h = item.h
        this.v = 0
        this.data = item.data
        this.position = {state: 'fore', status: 'back'}
        this.id = makeID()

        // Details
        this.open = 0
        this.oftGoal = 0
        this.oft = 0
        this.hasOpened = false
        this.alerted = 0
    }

    update() {
        game.formatDT(this)

        const box = {x:hero.x-hero.r,y:hero.y-hero.r,w:hero.r*2,h:hero.r*2}

        this.alerted -= this.dt

        if (this.open < .4 && collide(box, this)) {
            if (hero.y > this.y - hero.r) {
                hero.y = this.y - hero.r

                if (this.alerted < 0) {
                    game.alertMe('Connect the cable to the substation first!', 300)
                    this.alerted = 300
                }
            }
        }

        if (this.open >= 1) {
            this.hasOpened = true
        }

        if (!this.data.open_when_near) {
            if (game.completed) {
                this.open += .008 * this.dt
                this.oftGoal = 0
            }
            else this.open -= .008 * this.dt
        }

        this.open = Math.max(0, Math.min(1, this.open))
        this.oft += (this.oftGoal - this.oft) / 5 * this.dt
    }

    draw() {
        const evilGap = .4
        if (this.data.open_when_near) {
            const dx = hero.x - (this.x + this.w / 2)
            const dy = hero.y - (this.y + this.h)
            const d = Math.hypot(dx, dy)

            if (d < 200) this.open += .04 * this.dt
            else {
                this.open -= .04 * this.dt

                if (this.data.evil && this.hasOpened) {
                    if (this.open < evilGap && hero.x > this.x) this.open = evilGap

                    else if (hero.x > this.x) {
                        this.oftGoal = 70
                        game.evil = true
                    }
                    else this.oftGoal = 0
                }
            }
        }

        if (game.evil) game.evilTime += .01 * this.dt
        let bad = 0
        if (this.data.evil) bad = easeInOutExpo(game.evilTime)/6

        const dec = easeInOutExpo(1 - this.open)
        const half = dec / 2

        game.ctx.fillStyle = rgb(.075+bad,0,.05)
        game.ctx.strokeStyle = rgb(.2+bad,.2,.2,dec)

        game.ctx.lineWidth = game.zoom * 5

        if (this.data.evil) {
            game.rect(this.x, this.y, this.w, this.h * half + this.oft)
            game.rect(
                this.x, this.y + this.h - (this.h * half - this.oft),
                this.w, (this.h * half - this.oft))

            game.strokeRect(this.x, this.y, this.w, this.h * half + this.oft)
            game.strokeRect(
                this.x, this.y + this.h - (this.h * half - this.oft),
                this.w, (this.h * half - this.oft))
        }

        else {
            game.rect(this.x, this.y, this.w * half, this.h)
            game.rect(
                this.x + this.w - (this.w * half), this.y,
                this.w * half, this.h)

            game.strokeRect(this.x, this.y, this.w * half, this.h)
            game.strokeRect(
                this.x + this.w - (this.w * half), this.y,
                this.w * half, this.h)
        }
    }
}