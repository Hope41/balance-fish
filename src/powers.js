'use strict'

// --- The things you plug the cables into ---

class Power {
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

        // Details
        this.r = 50

        // Trivia
        this.connections = []
        this.connectedTimer = 0
        this.hasConnections = 0
        this.connectedCableVoltage = 0
        this.connectedCableVoltageGoal = 0
        this.connectedCableVoltageSpeed = 0
        this.smoothVoltage = 0
        this.bustedTime = 0
        this.perfect = 0
        this.camLock = false
        this.open = 0
        this.total = 0

        this.message = 0
        this.disperseTime = 0
        this.disperseComplete = 0
        this.disperseProgress = 0
        this.close = 0
        this.cancelTime = 0

        this.needleA = 0
        this.needleV = 0

        // Magic glowing cable when complete
        this.cable = {
            on:false,
            x:0,y:0,
            vx:0,vy:0,
            arr:[],
            lastX:0,lastY:0,
            update:()=>{
                const item = this.cable
                const dx = game.cableGoal.x - item.x
                const dy = game.cableGoal.y - item.y
                const dis = Math.hypot(dx, dy)

                const speed = 5
                const momentum = .8

                item.vx += (dx / dis) * speed * this.dt
                item.vy += (dy / dis) * speed * this.dt

                item.vx *= Math.pow(momentum, this.dt)
                item.vy *= Math.pow(momentum, this.dt)

                item.x += item.vx * this.dt
                item.y += item.vy * this.dt

                const dx_ = item.x - item.lastX
                const dy_ = item.y - item.lastY
                const d = Math.hypot(dx_, dy_)

                if (d > 100) {
                    this.cable.arr.push({x: item.x, y: item.y})

                    item.lastX = item.x
                    item.lastY = item.y
                }
            },
            draw:()=>{
                game.ctx.lineWidth = game.zoom * 10

                for (let i = 1; i < this.cable.arr.length; i ++) {
                    const last = this.cable.arr[i - 1]
                    const item = this.cable.arr[i]

                    const k = .3+Math.sin(game.time / 3 - i / 2)*.3
                    game.ctx.strokeStyle = rgb(.1+k*2,.1+k*2,.1+k)

                    game.ctx.beginPath()
                    game.moveTo(last.x, last.y)
                    game.lineTo(item.x, item.y)

                    if (i >= this.cable.arr.length - 1)
                        game.lineTo(this.cable.x, this.cable.y)
                    game.ctx.stroke()
                }
            }
        }
        game.substations.push(this)
    }

    disperse(doNotDisperse = false) {
        hero.holding.reset()

        if (!doNotDisperse) {
            for (let i = 0; i < this.connections.length; i ++) {
                const item = this.connections[i]

                item.connected = 0
                item.shrink = true
                item.snap()

                game.cam.shake(20, 20, 20, .1)
                game.explosion({
                    x: this.x - this.r * 2,
                    y: this.y - this.r * 2,
                    w: this.r * 4,
                    h: this.r * 4,
                    amt: 20,
                    momentumX: .9,
                    momentumY: .9,
                    colors: [[.7,0,0,.5],[1,.3,0,.4],[.5,.5,.5,.7]],
                    minLifetime: 200,
                    maxLifetime: 400,
                    force: 20,
                    minSize: 50,
                    maxSize: 70
                })

                this.connections.splice(i, 1)
                i --

                this.connectedCableVoltageGoal = this.getTotal()
                this.bustedTime = 0
            }

            if (!this.connections.length)
                this.hasConnections = false

            this.cable.on = false
        }

        this.close = 0
        this.disperseTime = 0
        this.disperseComplete = 0
        this.disperseProgress = 0
        this.cancelTime = 0
        this.perfect = 0
        game.key.danger = false
    }

    disperseUpdate() {
        if (!this.disperseTime) return
        game.freezeExceptThese([this,...this.connections])
        this.disperseTime += .05 * this.dt

        game.overlay.push(() => {
            game.ctx.fillStyle = rgb(
                0,0,0,
                .4*easeInOutExpo(this.disperseTime)*(1-easeInOutExpo(this.close)))
            game.ctx.fillRect(0, 0, game.cvs.width, game.cvs.height)

            const dec_1 = easeInOutExpo(this.disperseTime / 2) * (1 - easeInOutExpo(this.close - .5))
            const dec_2 = easeInOutExpo(this.disperseTime - 1) * (1 - easeInOutExpo(this.close))

            if (this.close - .5 >= 1) {
                if (this.disperseComplete) this.disperse()
                else this.disperse(true)
                game.unfreezeAll()
            }

            const boxW = game.box * 130 * dec_1
            const boxH = game.box * 130 * dec_1

            const gaugeR = game.box * 45

            const cancelA = .05

            const needleLen = game.box * 25
            const needleOff = game.box * 10

            const goodRange = (.4 - easeInOutExpo(this.disperseProgress) * .2)
                + easeInOutExpo(this.disperseComplete) * .8

            // Move needle
            if (game.key.danger && !this.close) {
                this.needleV += .004 * this.dt
            }

            this.needleA += this.needleV * this.dt

            if (this.needleA < 0) {
                this.needleV = -this.needleA / 5
                this.needleA = 0
            }

            else if (this.needleA > Math.PI) {
                this.needleA = Math.PI
                this.needleV = 0
            }

            if (!this.close) {
                this.needleV -= this.needleA / 600 * this.dt
                this.needleV *= Math.pow(.99, this.dt)
            }
            else this.needleV *= Math.pow(.85, this.dt)

            // Detect accuracy
            let accurate = false
            if (!this.close) {
                if (this.needleA > Math.PI * (.5 - goodRange / 2) &&
                    this.needleA < Math.PI * (.5 + goodRange / 2)) {

                    accurate = true
                    this.disperseProgress += .004 * this.dt
                }
                else this.disperseProgress -= .01 * this.dt
            }
            else accurate = true

            let close = false
            if (this.disperseProgress >= 1) {
                this.disperseComplete += .01 * this.dt
                close = true
                this.disperseProgress = 1
            }

            if (this.needleA > Math.PI - cancelA && game.key.danger) {
                this.cancelTime += this.dt
                if (this.cancelTime > 7) close = true
            }
            else this.cancelTime = 0

            if (close || this.close) {
                if (this.disperseComplete)
                    this.close += .01 * this.dt
                else this.close += .1 * this.dt
            }

            this.disperseProgress = Math.max(0, this.disperseProgress)

            // Box
            game.ctx.fillStyle = rgb(
                easeInOutExpo(this.disperseComplete)/10,
                easeInOutExpo(this.disperseComplete)/10,
                easeInOutExpo(this.disperseComplete)/10,
                (1 - easeInOutExpo(this.close*2-1.5)))
            game.ctx.strokeStyle = rgb(.7,1,.7,dec_1)
            game.ctx.lineWidth = game.box * .75

            game.ctx.fillRect(
                game.cvs.width / 2 - boxW / 2,
                game.cvs.height / 2 - boxH / 2,
                boxW, boxH)
            game.ctx.strokeRect(
                game.cvs.width / 2 - boxW / 2,
                game.cvs.height / 2 - boxH / 2,
                boxW, boxH)

            // Gauge
            game.ctx.strokeStyle = rgb(.2,.25,.3,dec_2)
            game.ctx.lineWidth = game.box * 4

            game.ctx.beginPath()
            game.ctx.arc(
                game.cvs.width / 2,
                game.cvs.height / 2 + gaugeR / 2,
                gaugeR, Math.PI, Math.PI * 2)
            game.ctx.stroke()

            // Blue area
            game.ctx.strokeStyle = (accurate ?
                rgb(.5+this.disperseProgress*.1,.9+this.disperseProgress*.1,.2+this.disperseProgress*.1,dec_2) :
                rgb(.5,.9,1,dec_2))
            game.ctx.lineWidth = game.box * 5
            game.ctx.beginPath()
            game.ctx.arc(
                game.cvs.width / 2,
                game.cvs.height / 2 + gaugeR / 2,
                gaugeR,
                Math.PI * (1.5 - goodRange / 2),
                Math.PI * (1.5 + goodRange / 2))
            game.ctx.stroke()

            // Cancel area
            game.ctx.strokeStyle = rgb(.8,.2,.2,dec_2)
            game.ctx.lineWidth = game.box * 5
            game.ctx.beginPath()
            game.ctx.arc(
                game.cvs.width / 2,
                game.cvs.height / 2 + gaugeR / 2,
                gaugeR,
                Math.PI * (2 - cancelA),
                Math.PI * 2)
            game.ctx.stroke()

            // Cancel text
            game.ctx.fillStyle = rgb(.8,.2,.2,dec_2)
            game.ctx.textAlign = 'right'
            game.ctx.font = game.box * 6 + 'px font, monospace, sans-serif'
            game.ctx.fillText(
                'Cancel',
                game.cvs.width / 2 + gaugeR * .85,
                game.cvs.height / 2 + gaugeR / 2)
            game.ctx.textAlign = 'center'

            // Needle
            game.ctx.strokeStyle = rgb(1,.3,.3,dec_2)
            game.ctx.lineWidth = game.box * 3
            game.ctx.beginPath()
            game.ctx.moveTo(
                game.cvs.width / 2 - Math.cos(this.needleA) * needleOff,
                game.cvs.height / 2 + gaugeR / 2 - Math.sin(this.needleA) * needleOff)
            game.ctx.lineTo(
                game.cvs.width / 2 - Math.cos(this.needleA) * (needleLen + needleOff),
                game.cvs.height / 2 + gaugeR / 2 - Math.sin(this.needleA) * (needleLen + needleOff))
            game.ctx.stroke()

            // Text
            const textSize = game.box * 10
            game.ctx.textAlign = 'center'
            game.ctx.font = textSize + 'px font, monospace, sans-serif'

            game.ctx.fillStyle = rgb(
                1+Math.sin(game.time/3)/4,
                1+Math.sin(game.time/3+1)/4,
                1+Math.sin(game.time/3+2)/4,dec_2)
            game.ctx.fillText(
                'BALANCE the needle',
                game.cvs.width / 2,
                game.cvs.height / 2 - game.box * 45)

            game.ctx.fillStyle = rgb(.7,.7,.7,dec_2)
            game.ctx.fillText(
                'to detach the cables',
                game.cvs.width / 2,
                game.cvs.height / 2 - game.box * 45 + textSize)

            // --- BAR ---
            const dangerBoxSize = game.box * 10
            const dangerTextSize = game.box * 10
            const buttonY = game.box * 2

            const gap = game.box * 5
            const barW = game.box * 90

            const barY = game.box * 43
            const realBarW = barW - dangerBoxSize - gap
            const barH = game.box * 10
            const barLevelPad = game.box * 2

            const pressOft = (game.key.danger ? buttonY : 0)

            // Bar danger button
            game.ctx.fillStyle = rgb(.2,.2,.2,dec_2)
            game.ctx.fillRect(
                game.cvs.width / 2 - barW / 2,
                game.cvs.height / 2 + barY + dangerBoxSize / 2,
                dangerBoxSize, buttonY)

            game.ctx.fillStyle = rgb(.4,.4,.4,dec_2)
            game.ctx.fillRect(
                game.cvs.width / 2 - barW / 2,
                game.cvs.height / 2 + barY - dangerBoxSize / 2 + pressOft,
                dangerBoxSize, dangerBoxSize)

            game.ctx.textAlign = 'center'
            game.ctx.font = dangerTextSize + 'px font, monospace, sans-serif'

            game.ctx.fillStyle = rgb(1,1,1,dec_2)

            game.ctx.fillText(
                DANGER_KEY,
                game.cvs.width / 2 - barW / 2 + dangerBoxSize / 2,
                game.cvs.height / 2 + barY + dangerTextSize * FONT_OFT + pressOft)

            // Bar meter
            game.ctx.fillStyle = rgb(.1,.1,.1,dec_2)
            game.ctx.fillRect(
                game.cvs.width / 2 - barW / 2 + dangerBoxSize + gap,
                game.cvs.height / 2 + barY + barH / 2,
                realBarW, buttonY)

            game.ctx.fillStyle = rgb(.3,.3,.3,dec_2)
            game.ctx.fillRect(
                game.cvs.width / 2 - barW / 2 + dangerBoxSize + gap,
                game.cvs.height / 2 + barY - barH / 2,
                realBarW, barH)

            game.ctx.fillStyle = rgb(.2,.2,.2,dec_2)
            game.ctx.fillRect(
                game.cvs.width / 2 - barW / 2 + dangerBoxSize + gap + barLevelPad,
                game.cvs.height / 2 + barY - barH / 2 + barLevelPad,
                realBarW - barLevelPad * 2,
                barH - barLevelPad * 2)

            game.ctx.fillStyle = rgb(.5,1,0,dec_2)
            game.ctx.fillRect(
                game.cvs.width / 2 - barW / 2 + dangerBoxSize + gap + barLevelPad,
                game.cvs.height / 2 + barY - barH / 2 + barLevelPad,
                (realBarW - barLevelPad * 2) * this.disperseProgress,
                barH - barLevelPad * 2)
        })
    }

    update() {
        game.formatDT(this)

        if (this.perfect >= .1 && this.hasConnections) {
            if (!this.cable.on) {
                this.cable.x = this.x
                this.cable.y = this.y
                game.lastStationActivated = this
            }
            this.cable.on = true
        }
        else this.cable.on = false

        const box = {x:this.x-this.r,y:this.y-this.r,w:this.r*2,h:this.r*2}
        const heroBox = {x:hero.x-hero.r,y:hero.y-hero.r,w:hero.r*2,h:hero.r*2}

        // Message
        this.message = Math.max(0, this.message)

        if (this.message) {
            game.over.push(() => {
                const messageW = game.box * 100 * easeInOutExpo(this.message)
                const messageH = game.box * 10
                const messagePad = game.box * 10
                const textSize = game.box * 8

                game.ctx.fillStyle = rgb(1,1,1,.9)
                game.ctx.fillRect(messagePad, messagePad, messageW, messageH)

                game.ctx.fillStyle = rgb(0,0,0,easeInOutExpo(this.message-.5))
                game.ctx.textAlign = 'center'
                game.ctx.font = textSize + 'px font, monospace, sans-serif'
                game.ctx.fillText(
                    'Tap ' + DANGER_KEY + ' to detach cables',
                    messagePad + messageW / 2,
                    messagePad + messageH / 2 + textSize * FONT_OFT)
            })
        }
        if (collide(box, heroBox) && this.connections.length) {
            this.message += .04 * this.dt

            if (!this.disperseTime && game.key.danger) {
                this.disperseTime += .01 * this.dt
                game.key.danger = 0
            }
        }
        else {
            if (this.message > 1) this.message = 1
            this.message -= .04 * this.dt
        }

        this.disperseUpdate()

        // Get box around the shape
        const contain = {}
        contain.x = Math.floor(this.x / game.map.cellSize)
        contain.y = Math.floor(this.y / game.map.cellSize)
        contain.w = Math.floor((this.x + this.w) / game.map.cellSize) - contain.x
        contain.h = Math.floor((this.y + this.h) / game.map.cellSize) - contain.y

        // Look for cables!
        for (let x = 0; x < contain.w + 1; x ++) {
            for (let y = 0; y < contain.h + 1; y ++) {
                const pos = posToIndex(contain.x + x, contain.y + y, game.map.levels[game.level].sortWidth)

                // Do not look outside of map
                if (pos == undefined || pos < 0) continue

                const cell = game.map.levels[game.level].both[pos]

                // Ignore empty cell
                if (!cell) continue

                for (let i = 0; i < cell.length; i ++) {
                    const shape = cell[i]
                    if (shape.data.type != 'cable') continue

                    if (this.perfect < 1 && !shape.connected && collide({x:shape.x_,y:shape.y_,w:shape.w_,h:shape.h_}, box) &&
                        hero.holding.shape == shape) {

                        sound_connect_substation.play()

                        hero.holding.reset()
                        shape.thread.pop()
                        shape.connected = this
                        shape.onPower = this
                        this.connectedTimer = 0
                        this.connections.push(shape)

                        game.unfreezeAll()

                        game.cam.shake(20, 20, 15, .3)
                        game.explosion({
                            x: box.x,
                            y: box.y,
                            w: box.w,
                            h: box.h,
                            amt: 15,
                            momentumX: .9,
                            momentumY: .9,
                            colors: [[.5,.4,.7,.5],[.6,.1,0,.7]],
                            minLifetime: 100,
                            maxLifetime: 200,
                            force: 10,
                            minSize: 30,
                            maxSize: 50
                        })
                    }
                }
            }
        }

        if (this.connections.length) {
            this.connectedTimer += .0075 * game.dt
            this.hasConnections += game.dt
        }
    }

    // Get total volt count
    getTotal() {
        const len = this.connections.length
        this.total = 0
        for (let i = 0; i < len; i ++)
            this.total += this.connections[i].data.volt

        return this.total
    }

    drawBody() {
        game.ctx.lineJoin = 'miter'

        const sum = this.data.require - Math.round(this.smoothVoltage)

        const thick = 15
        const verts = 20
        const progress = this.connections.length / 2 + this.bustedTime

        if (!sum) {
            if (!this.perfect && !(this.data.require - this.connectedCableVoltageGoal)) {
                sound_complete_substation.play()
            }
            this.perfect += .005 * game.dt
            this.perfect = Math.min(this.perfect, 1)
            this.bustedTime = 0
        }
        else {
            this.perfect = 0
        }

        const makeFlash = (rad, speed) => {
            for (let i = 0; i < verts; i ++) {
                const r = rad + Math.sin(i * i + Math.floor(game.time * .1 * speed) * i) * rad / 2
                const x = Math.cos(i / verts * Math.PI * 2) * r
                const y = Math.sin(i / verts * Math.PI * 2) * r
                game.lineTo(this.x + x, this.y + y)
            }
        }

        // Inner electricity
        game.ctx.fillStyle = rgb(1,1,.5,.5)
        game.ctx.beginPath()
        makeFlash(50, 1)
        game.ctx.fill()

        // Outer electricity
        game.ctx.lineWidth = 7 * game.zoom
        game.ctx.fillStyle = this.bustedTime ? rgb(.8,.3,.3,progress) : rgb(.3,.7,.8,progress)
        game.ctx.strokeStyle = rgb(.4,.9,.9,1-this.perfect)
        game.ctx.beginPath()
        makeFlash(80-this.perfect * 50, .5 + progress * 2)
        game.ctx.fill()
        game.ctx.stroke()

        // Body
        const complete = Math.max(0, Math.min(1, this.perfect - .5))
        game.ctx.fillStyle = rgb(.1,.05+complete/2,.2)

        const r = this.r
        game.rect(this.x - r, this.y - r, r * 2, r * 2)

        // Outline
        game.ctx.lineWidth = thick * game.zoom
        game.ctx.strokeStyle = rgb(.2,.1+complete,.3)

        game.strokeRect(this.x - r / 2, this.y - r / 2, r, r)

        // Glow
        game.ctx.lineWidth = 4 * game.zoom
        game.ctx.fillStyle = (sum?rgb(.4+this.bustedTime/2,.2,.5-this.bustedTime/2,progress/2):rgb(0,.7,.4,.5,1-this.perfect))
        game.ctx.strokeStyle = (sum?rgb(.7+this.bustedTime/2,.5,.9-this.bustedTime/2):rgb(0,.7,.4,1-this.perfect))
        game.ctx.beginPath()
        makeFlash(50 * progress-this.perfect * 50, (2 + this.bustedTime))
        game.ctx.stroke()
        game.ctx.fill()
    }

    drawStats() {
        const speed = .04
        const swing = .85

        this.connectedCableVoltageSpeed += (this.connectedCableVoltageGoal - this.connectedCableVoltage) * speed * game.dt
        this.connectedCableVoltageSpeed *= Math.pow(swing, game.dt)
        this.connectedCableVoltage += this.connectedCableVoltageSpeed * game.dt

        this.getTotal()

        // Get cam distance to decide when to open generator
        const camDistX = game.cam.x - this.x
        const camDistY = game.cam.y - this.y
        const camDist = Math.hypot(camDistX, camDistY)

        this.open += .015 * this.dt * Math.sign(400 - camDist)
        if (this.open < 0) this.open = 0
        if (this.open > 1 || this.connectedTimer > 0 && this.connectedTimer < 2)
            this.open = 1

        if (this.open) {
            game.over.push(() => {
                const dec_1 = easeInOutExpo(this.open * 4)
                const dec_2 = easeInOutExpo(this.open * 4 - 1)
                const dec_3 = easeInOutExpo(this.open * 2 - .5)

                const dec = (1 - easeInOutExpo(this.connectedTimer - .5))
                const cardLift = 100 * dec * easeInOutExpo(this.connectedTimer * 4 + .25)
                const cardNumSize = 30

                const poleW = 5
                const poleLift = 60
                const poleH = 100 * dec_1

                const boxW = 250 * dec_2
                const boxH = 140
                const boxLift = 10

                const gaugeR = 80

                const unit = 4
                const units = 10
                const unitR = 65

                const maxGaugeRange = Math.ceil(this.data.require * 1.5)

                const needleW = 4
                const needleLen = 70
                const needleLenSmall = 50

                const len = this.connections.length

                const shake = () => {
                    return random(-1, 1) * Math.max(0, progress - .8) * .1
                }

                const progress = this.connectedCableVoltage / maxGaugeRange
                let needleA = Math.max(0, Math.min(1, progress) * Math.PI + Math.sin(game.time / 20) * .04)
                needleA += shake()

                const goalA = Math.PI + (this.data.require / maxGaugeRange) * Math.PI
                const increment = (1 / maxGaugeRange) * Math.PI

                const perfectBool = (this.perfect ? 0 : 1)

                // Pole
                game.ctx.fillStyle = rgb(0,0,0,.7)
                game.rect(this.x - poleW / 2, this.y - poleLift - poleH, poleW, poleH - Math.max(0, cardLift - poleLift + cardNumSize / 2 + 10))

                // Box
                game.ctx.fillStyle = rgb(0,0,0,.7)
                game.ctx.strokeStyle = rgb(.7-this.perfect/2,.5+this.perfect/2,1-this.perfect/2,dec_2)
                game.ctx.lineWidth = game.zoom * 2
                game.rect(this.x - boxW / 2, this.y - poleLift - poleH - boxLift - boxH, boxW, boxH)
                game.strokeRect(this.x - boxW / 2, this.y - poleLift - poleH - boxLift - boxH, boxW, boxH)

                // Gauge
                const gaugeY = -poleLift - poleH - boxLift - boxH / 2 + gaugeR / 2

                game.ctx.strokeStyle = rgb(.5,0,0,dec_3)
                game.ctx.lineWidth = game.zoom * 4
                game.ctx.beginPath()
                game.arc(
                    this.x,
                    this.y + gaugeY,
                    gaugeR,
                    Math.PI,
                    Math.PI * 2)
                game.ctx.stroke()

                // Gauge text
                const smallText = 23
                const smallTextSmallR = gaugeR + 18
                const smallTextR = gaugeR + 20

                game.ctx.fillStyle =  rgb(.7,.7,.7,dec_3)
                game.text(0, this.x - smallTextR, this.y + gaugeY, smallText)

                game.ctx.fillStyle =  rgb(.8,.4,.4,dec_3)
                game.text(maxGaugeRange, this.x + smallTextR + 4, this.y + gaugeY, smallText)

                game.ctx.fillStyle =  rgb(.5,.8,.2,dec_3)
                game.text(
                    this.data.require,
                    this.x + Math.cos(goalA) * smallTextSmallR,
                    this.y + gaugeY + Math.sin(goalA) * smallTextR + smallText * FONT_OFT,
                    smallText)

                // Green zone
                game.ctx.strokeStyle = rgb(.5,.8,0,dec_3)
                game.ctx.beginPath()
                game.arc(
                    this.x,
                    this.y + gaugeY,
                    gaugeR,
                    goalA - increment / 2,
                    goalA + increment / 2)
                game.ctx.stroke()

                // Units
                game.ctx.fillStyle = rgb(.4,.4,.4,dec_3)
                for (let i = 0; i < units; i ++) {
                    const x = Math.cos(((i + .5) / units) * Math.PI) * unitR
                    const y = Math.sin(((i + .5) / units) * Math.PI) * unitR

                    game.rect(
                        this.x - unit / 2 + x,
                        this.y + gaugeY - unit / 2 - y,
                        unit,
                        unit)
                }

                // Green arrow
                const arrow_off = 10
                const arrow_stretch = 10
                const arrow_wide = .1

                game.ctx.fillStyle = rgb(.5,.8,0,dec_3)
                game.ctx.beginPath()
                game.moveTo(
                    this.x + Math.cos(goalA) * (gaugeR - arrow_off),
                    this.y + gaugeY + Math.sin(goalA) * (gaugeR - arrow_off))

                game.lineTo(
                    this.x + Math.cos(goalA - arrow_wide) * (gaugeR - arrow_off - arrow_stretch),
                    this.y + gaugeY + Math.sin(goalA - arrow_wide) * (gaugeR - arrow_off - arrow_stretch))

                game.lineTo(
                    this.x + Math.cos(goalA + arrow_wide) * (gaugeR - arrow_off - arrow_stretch),
                    this.y + gaugeY + Math.sin(goalA + arrow_wide) * (gaugeR - arrow_off - arrow_stretch))
                game.ctx.fill()

                // Needle
                game.ctx.strokeStyle = rgb(.9,.2,.2,dec_3)
                game.ctx.lineWidth = game.zoom * needleW
                game.ctx.beginPath()
                game.moveTo(
                    this.x - Math.cos(needleA) * needleLenSmall,
                    this.y + gaugeY - Math.sin(needleA) * needleLenSmall)
                game.lineTo(
                    this.x - Math.cos(needleA) * needleLen,
                    this.y + gaugeY - Math.sin(needleA) * needleLen)
                game.ctx.stroke()

                // Stats
                this.smoothVoltage += (this.connectedCableVoltageGoal - this.smoothVoltage) * .3 * game.dt

                const textSize = 30 + ((this.smoothVoltage + .5) % 1) * 5

                game.ctx.fillStyle = Math.floor(this.smoothVoltage) > this.data.require ? rgb(1,0,0,dec_3) : rgb(perfectBool,1,perfectBool,dec_3)
                game.text(
                    Math.max(0, Math.round(this.smoothVoltage)) + ' / ' + this.data.require,
                    this.x + shake() * 50, this.y + gaugeY + shake() * 50, textSize)

                // CARDS
                if (len) {
                    const textSize = 20

                    // Set gauge
                    if (dec < 1) this.connectedCableVoltageGoal = this.total

                    // Draw individual cards
                    for (let i = 0; i < len; i ++) {
                        const item = this.connections[i]
                        let val = item.data.volt

                        const snappiness = 1.1
                        const decimal = Math.max(0, 1 - easeInOutExpo(this.connectedTimer) * snappiness)

                        const A = perfectBool * (1 - easeInOutExpo(this.connectedTimer * 3 - 2.2))

                        // Merge cards based on connectedTimer
                        const oftX = (i - (len - 1) / 2) * 50 * decimal
                        if (decimal < .5 && len > 1)
                            val = Math.round(lerp(item.data.volt, this.total, 1 - (decimal * 2)))

                        game.ctx.fillStyle = rgb(.6,1,1,A)
                        game.ctx.strokeStyle = rgb(1,1,1,A)
                        game.ctx.lineWidth = game.zoom
                        game.rect(this.x + oftX - cardNumSize / 2, this.y - cardLift - cardNumSize / 2, cardNumSize, cardNumSize)
                        game.strokeRect(this.x + oftX - cardNumSize / 2, this.y - cardLift - cardNumSize / 2, cardNumSize, cardNumSize)

                        game.ctx.fillStyle = rgb(0,0,0,A)
                        game.text(val, this.x + oftX, this.y - cardLift + textSize * FONT_OFT, textSize)

                        // If they have merged, no need to draw more than one
                        if (this.connectedTimer > 1) break
                    }
                }
            })
        }
    }

    outOfControl() {
        const sum = this.data.require - Math.round(this.connectedCableVoltageGoal)
        if (sum >= 0) return

        this.bustedTime += game.dt / 100

        game.cam.shake(10,10,0,0)
        game.explosion({
            x: this.x - this.r,
            y: this.y - this.r,
            w: this.r * 2,
            h: this.r * 2,
            amt: 1,
            momentumX: .9,
            momentumY: .9,
            colors: [[.3,.3,.3,.5],[0,0,0,.7]],
            minLifetime: 20,
            maxLifetime: 50,
            force: 10,
            minSize: 50,
            maxSize: 70
        })

        if (this.bustedTime > 1) {
            sound_crash.play()

            const idx = Math.floor(Math.random() * this.connections.length)
            const choice = this.connections[idx]

            choice.connected = 0
            choice.shrink = true
            choice.snap()

            game.cam.goal = hero

            game.cam.shake(20, 20, 20, .1)
            game.explosion({
                x: this.x - this.r * 2,
                y: this.y - this.r * 2,
                w: this.r * 4,
                h: this.r * 4,
                amt: 20,
                momentumX: .9,
                momentumY: .9,
                colors: [[.7,0,0,.5],[1,.3,0,.4],[.5,.5,.5,.7]],
                minLifetime: 200,
                maxLifetime: 400,
                force: 20,
                minSize: 50,
                maxSize: 70
            })

            this.connections.splice(idx, 1)
            this.connectedCableVoltageGoal -= choice.data.volt
            this.bustedTime = 0
        }
    }

    draw() {
        this.drawBody()
        this.drawStats()

        this.outOfControl()
    }
}