'use strict'

class Resistor {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.w = 200
        this.h = 75
        this.x = item.x
        this.y = item.y - this.h
        this.v = 0
        this.data = item.data
        this.position = {state: 'back', status: 'far-fore'}
        this.id = makeID()

        // Trivia
        this.r = 0
        this.hasInput = false
        this.hasOutput = false
        this.disperseTime = 0
        this.needleA = 0
        this.needleV = 0

        this.inputs = []
        this.outputs = []

        this.disperseProgress = 0
        this.disperseComplete = 0
        this.close = 0
        this.cancelTime = 0

        this.message = 0

        this.maxPlugs = (this.data.plugs || 1)
        this.split = 70
    }

    addOutput() {
        const makeOutput = () => {
            const last = this.inputs[this.inputs.length - 1]

            let volt = last.data.volt
            let strength = last.strength
            let length = last.data.l

            if (this.data.ability == 'length') {
                if (this.data.add != undefined) length += this.data.add
                if (this.data.multiply != undefined) length *= this.data.multiply
            }
    
            else if (this.data.ability == 'strength') {
                if (this.data.add != undefined) strength += this.data.add
                if (this.data.multiply != undefined) strength *= this.data.multiply
            }
    
            else {
                if (this.data.add != undefined) volt += this.data.add
                if (this.data.multiply != undefined) volt *= this.data.multiply
            }

            const len = this.maxPlugs - 1
            const oftX = len > 0 ? ((this.outputs.length - len / 2) / len) * this.split : 0

            const shape = new Cable({x:this.x+this.w/2+oftX,y:this.y,w:0,h:0,data: {
                type:'cable',
                volt: Math.max(0, Math.round(volt)),
                strength: Math.max(0, Math.round(strength)),
                l: Math.max(0, Math.round(length))
            }})

            shape.oftY = shape.h_
            game.map.shapeToCells(shape)
            this.outputs.push(shape)
        }

        for (let i = 0; i < this.maxPlugs; i ++) {
            makeOutput()
        }

        this.hasOutput = true
    }

    disperse(doNotDisperse = false) {
        hero.holding.reset()

        if (!doNotDisperse) {
            for (let i = 0; i < this.inputs.length; i ++) {
                const item = this.inputs[i]

                item.connected = false
                item.shrink = true

                item.snap()
            }

            for (let i = 0; i < this.outputs.length; i ++) {
                const item = this.outputs[i]

                item.del = true

                if (item.connected && item.connected.data.type == 'resistor') {
                    item.connected.disperse()
                }

                item.connected = false
                item.shrink = true

                if (item.onPower) {
                    const idx = item.onPower.connections.indexOf(item)
                    item.onPower.connections.splice(idx, 1)

                    const total = item.onPower.getTotal()
                    item.onPower.connectedCableVoltage = total
                    item.onPower.connectedCableVoltageGoal = total
                }

                item.snap()
            }

            this.hasInput = 0
            this.hasOutput = 0
            this.inputs = []
            this.outputs = []

            game.cam.shake(20, 20, 20, .1)
            game.explosion({
                x: this.x,
                y: this.y,
                w: this.w,
                h: this.h,
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
        }

        this.close = 0
        this.disperseTime = 0
        this.disperseComplete = 0
        this.disperseProgress = 0
        this.cancelTime = 0
        game.key.danger = false
    }

    update() {
        game.formatDT(this)

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

        if (collide(this, hero) && this.hasInput && this.hasOutput) {
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

        if (this.disperseTime) {
            game.freezeExceptThese([this,...this.inputs,...this.outputs])
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
                    this.needleV += .006 * this.dt
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
                    this.needleV -= this.needleA / 400 * this.dt
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

        game.map.shapeToCells(this, pos => {
            const cell = game.map.levels[game.level].back[pos]
            if (!cell) return

            for (let i = 0; i < cell.length; i ++) {
                const shape = cell[i]
                if (shape.data.type != 'cable') continue

                if (!shape.connected && !shape.snapping &&
                    this.outputs.length < this.maxPlugs &&
                    !this.inputs.includes(shape) &&
                    !this.outputs.includes(shape) &&
                    collide({x:shape.x_,y:shape.y_,w:shape.w_,h:shape.h_},this) &&
                    hero.holding.shape == shape) {

                    sound_connect_substation.play()
                    hero.holding.reset()
                    shape.connected = this
                    shape.thread.pop()

                    this.inputs.push(shape)

                    this.addOutput()

                    game.cam.shake(20,20,15,0)

                    this.hasInput = true
                }
            }
        })
    }

    draw() {
        game.ctx.lineJoin = 'miter'
        const textSize = 30
        const w = 25
        const h = 10

        const sW = this.w - 20
        const sH = this.h - 20

        // Plugs
        const len = this.maxPlugs - 1
        game.ctx.fillStyle = rgb(.05,.05,.1)
        game.ctx.strokeStyle = rgb(.05,.05,.1)
        game.ctx.lineWidth = game.zoom * 3

        for (let i = 0; i < this.maxPlugs; i ++) {
            const oftX = len > 0 ? ((i - len / 2) / len) * this.split : 0
            game.rect(this.x + this.w / 2 - w / 2 + oftX, this.y - h, w, h)
            game.strokeRect(this.x + this.w / 2 - w / 2 + oftX, this.y - h, w, h+3)
        }

        // Body
        game.ctx.fillStyle = rgb(.1,.1,.15)
        game.rect(this.x, this.y, this.w, this.h)

        game.ctx.lineWidth = game.zoom * 3
        game.ctx.strokeStyle = rgb(.3,.6,.6)
        game.strokeRect(this.x + this.w / 2 - sW / 2, this.y + this.h / 2 - sH / 2, sW, sH)

        if (this.data.ability == 'strength')
            game.ctx.fillStyle = rgb(.5,1,1)
        else if (this.data.ability == 'length')
            game.ctx.fillStyle = rgb(1,1,.5)
        else game.ctx.fillStyle = rgb(1,1,1)

        let str = ''
        if (this.data.add) str = ((this.data.add > 0 ? '+' : '') + this.data.add)
        else if (this.data.multiply != undefined) str = ((
            this.data.multiply > 1 || !this.data.multiply ?
                '×'+this.data.multiply
            : '÷'+Math.floor((1 / (this.data.multiply)) * 10) / 10))

        if (this.data.ability == 'length') str += '↔'
        else if (this.data.ability == 'strength') str += '▲'
        else str += 'v'

        game.text(str, this.x + this.w / 2, this.y + this.h / 2 + textSize * FONT_OFT, textSize)
    }
}