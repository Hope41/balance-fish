'use strict'
class Shark {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.x = item.x
        this.y = item.y
        this.w = 70
        this.h = 70
        this.v = 0
        this.data = item.data
        this.position = {state: 'back', status: 'fore'}
        this.id = makeID()

        // Traits
        this.speed = .006
        this.fear = 200
        this.awareness = 500

        // Tail
        this.tail = []
        for (let i = 0; i < 7; i ++)
            this.tail.push({x: this.x, y: this.y, size: 30 + Math.sin(1 + i) * 20})

        // Details
        this.vx = 0
        this.v = 0
        this.vy = 0
        this.move = 0
        this.goalX = 0
        this.goalY = 0
        this.momentum = .96
        this.damping = .9
        this.shyness = 1

        this.inAir = false

        // Trivia
        this.target = false
        this.a = 0
        this.bob = 0
        this.x_ = this.x
        this.y_ = this.y
        this.neck = .1
        this.onGround = false
        this.attack = 200
        this.attacking = false
        this.smoothA = 0

        this.a_ = 0
    }

    collision() {
        const BOUNCE = 1
        const collisionPoints = []

        this.inAir = true
        game.map.shapeToCells(this, pos => {
            const cell = game.map.levels[game.level].both[pos]
            if (!cell) return

            for (let i = 0; i < cell.length; i ++) {
                const shape = cell[i]

                if (shape.data.type == 'water') {
                    if (collide(this, shape)) {
                        this.inAir = false
                    }
                }

                if (shape.data.type != 'ground') continue

                for (let i = 0; i < shape.content.length; i += 2) {
                    // Create line
                    const ax = shape.content[i]
                    const ay = shape.content[(i + 1) % (shape.content.length + 1)]
                    const bx = shape.content[(i + 2) % (shape.content.length + 1)]
                    const by = shape.content[(i + 3) % (shape.content.length + 1)]
    
                    // Get line details
                    const abx = bx - ax
                    const aby = by - ay
                    const len = Math.hypot(abx, aby)
    
                    // Get centre line pos
                    const centerX = ax + abx / 2
                    const centerY = ay + aby / 2
    
                    const isColliding = () => {
                        const x = this.x + this.w / 2
                        const y = this.y + this.w / 2
                        const r = this.w
    
                        // Create virtual circle collision boundary
                        const lineMouseX = x - centerX
                        const lineMouseY = y - centerY
                        const lineMouseDis = Math.hypot(lineMouseX, lineMouseY)
    
                        // Touching the circle
                        if (lineMouseDis < len / 2 + r && len > 0) {
    
                            // Get distance from first point to player
                            const apx = x - ax
                            const apy = y - ay
    
                            // Find cross product to decide which side of the line we're on
                            const cross = ((abx * apy) - (aby * apx)) / len
                            const dot = ((abx * apx) + (aby * apy)) / Math.pow(len, 2)
    
                            // Find the line normal
                            const normX = aby / len
                            const normY = -abx / len
    
                            // Calculate intersection
                            const d = cross + r
                            const dx = normX * d
                            const dy = normY * d
    
                            // If completely on right side of line or are bordering but in range
                            if (cross > 0 || (d > 0 && dot > 0 && dot < 1))
                                return {dx, dy, d}
    
                            // The circle is touching one of the line points
                            else {
                                const edge = point => {
                                    if (!point.d) return {dx: 0, dy: 0, d: 0}
    
                                    const edgeX = (point.dx / point.d) * r
                                    const edgeY = (point.dy / point.d) * r
    
                                    return {
                                        dx: point.dx - edgeX,
                                        dy: point.dy - edgeY,
                                        d: point.d - r}
                                }
    
                                const a1 = pointIsInCircle(ax, ay, x, y, r)
                                const b1 = pointIsInCircle(bx, by, x, y, r)
    
                                if (a1) return edge(a1)
                                if (b1) return edge(b1)
                            }
                        }
    
                        return false
                    }

                    const touch = isColliding()
                    if (touch) collisionPoints.push(touch)
                }
            }
        })

        // Resolve collision if possible
        this.onGround = false
        if (collisionPoints.length) {
            let avgX = 0
            let avgY = 0
            let count = 0

            for (let i = 0; i < collisionPoints.length; i ++) {
                const touch = collisionPoints[i]
                this.onGround = true

                // Block in emergencies, as a failsafe
                if (!touch || touch.dx == NaN || touch.dy == NaN) continue

                avgX += touch.dx
                avgY += touch.dy
                count ++
            }

            if (avgX) avgX /= count
            if (avgY) avgY /= count

            this.x += avgX
            this.y += avgY
            this.vx += avgX * BOUNCE
            this.vy += avgY * BOUNCE
        }
    }

    update() {
        game.formatDT(this)

        const speed = Math.hypot(this.vx, this.vy)
        this.move += speed / 100 * this.dt
        this.bob = Math.sin(this.move) * 10

        // Detailed position
        this.x_ += (this.x - this.x_) / 2 * this.dt
        this.y_ += (this.y - this.y_) / 2 * this.dt
        this.x_ = this.x_ + Math.sin(this.a) * this.bob
        this.y_ = this.y_ + Math.cos(this.a) * this.bob

        this.a_ += .001 * this.dt * this.v

        this.a = this.a_ + this.bob / (speed + 1)

        const boost = 60

        this.vx += Math.cos(this.a) * boost * this.speed * this.dt
        this.vy += Math.sin(this.a) * boost * this.speed * this.dt
        this.v = Math.hypot(this.vx, this.vy)

        // Apply physics
        this.vx *= Math.pow(this.momentum, this.dt)
        this.vy *= Math.pow(this.momentum, this.dt)

        // Gravity
        if (this.inAir) {
            this.vy = 1
            this.vx = 0
        }

        this.x += this.vx * this.dt
        this.y += this.vy * this.dt

        // Control tail
        for (let i = 0; i < this.tail.length; i ++) {
            const prev = (i ? this.tail[i - 1] : {
                x: this.x_ - Math.cos(this.a) * this.w * this.neck,
                y: this.y_ - Math.sin(this.a) * this.w * this.neck})
            const item = this.tail[i]

            const dx = item.x - prev.x
            const dy = item.y - prev.y
            const d = Math.hypot(dx, dy)

            item.x = prev.x + (dx / d) * item.size
            item.y = prev.y + (dy / d) * item.size
        }

        // --- Attack (Obsolete) ---
        this.attacking = false

        if (this.target) {
            // this.attack -= this.dt

            if (this.attack < 20) {
                this.attacking = true

                // Run up
                if (this.attack > 0) {
                    const dx = this.x_ - this.target.x
                    const dy = this.y_ - this.target.y
                    const goalA = Math.atan2(dy, dx)

                    const rad = 200 + Math.sin(this.attack / 5) * 100
                    const a = goalA + Math.sin(this.attack / 10) * .3

                    this.goalX = this.target.x + Math.cos(a) * rad
                    this.goalY = this.target.y + Math.sin(a) * rad
                }

                // Charge
                else {
                    this.goalX = this.target.x + Math.cos(this.a) * 200
                    this.goalY = this.target.y + Math.sin(this.a) * 200

                    const box = {
                        x: this.x_ - this.w / 2,
                        y: this.y_ - this.h / 2,
                        w: this.w,
                        h: this.h}

                    if (this.target.data.type == 'hero') {
                        const target = {
                            x: this.target.x - this.target.r,
                            y: this.target.y - this.target.r,
                            w: this.target.r * 2,
                            h: this.target.r * 2}

                        if (collide(box, target)) {
                            game.cam.shake(10, 10, 10, .2)
                            this.attack = 500
                            this.shyness = 1
                        }
                    }

                    // Give up if attack isn't happening
                    if (this.attack < -100) {
                        this.attack = 500
                        this.shyness = 1
                    }
                }
            }
        }

        let currentNormalized = this.a % (Math.PI * 2)
        let targetNormalized = this.smoothA % (Math.PI * 2)

        let difference = targetNormalized - currentNormalized
        if (difference > Math.PI) difference -= Math.PI * 2
        else if (difference < -Math.PI) difference += Math.PI * 2

        this.smoothA -= difference / 10 * this.dt

        // --- Collision detection ---
        this.collision()
    }

    draw() {
        game.ctx.lineJoin = 'miter'

        const x = this.x_ + this.w / 2
        const y = this.y_ + this.h / 2

        let tint = [1,1,1]

        // Tail
        for (let i = 0; i < this.tail.length; i ++) {
            const prev = (i ? this.tail[i - 1] : {
                x: this.x_ - Math.cos(this.smoothA) * this.w * this.neck,
                y: this.y_ - Math.sin(this.smoothA) * this.w * this.neck})
            const item = this.tail[i]

            game.ctx.lineWidth = item.size * game.zoom

            const k = .1+i/50

            if (i < this.tail.length - 1) {
                game.ctx.strokeStyle = rgb(k,k,k)

                game.ctx.beginPath()
                game.moveTo(prev.x + this.w / 2, prev.y + this.h / 2)
                game.lineTo(item.x + this.w / 2, item.y + this.h / 2)
                game.ctx.stroke()
            }
            else {
                const a = Math.atan2(item.y - prev.y, item.x - prev.x)
                game.ctx.fillStyle = rgb(k,k,k)
                game.ctx.beginPath()
                game.moveTo(
                    prev.x + this.w / 2 + Math.cos(a - 1.57) * 10,
                    prev.y + this.h / 2 + Math.sin(a - 1.57) * 10)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a - 1.1) * 25,
                    prev.y + this.h / 2 + Math.sin(a - 1.1) * 25)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a - 1) * 50,
                    prev.y + this.h / 2 + Math.sin(a - 1) * 50)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a - .6) * 60,
                    prev.y + this.h / 2 + Math.sin(a - .6) * 60)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a - .2) * 40,
                    prev.y + this.h / 2 + Math.sin(a - .2) * 40)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a) * 30,
                    prev.y + this.h / 2 + Math.sin(a) * 30)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a + .2) * 40,
                    prev.y + this.h / 2 + Math.sin(a + .2) * 40)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a + .6) * 60,
                    prev.y + this.h / 2 + Math.sin(a + .6) * 60)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a + 1) * 50,
                    prev.y + this.h / 2 + Math.sin(a + 1) * 50)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a + 1.1) * 25,
                    prev.y + this.h / 2 + Math.sin(a + 1.1) * 25)
                game.lineTo(
                    prev.x + this.w / 2 + Math.cos(a + 1.57) * 10,
                    prev.y + this.h / 2 + Math.sin(a + 1.57) * 10)
                game.ctx.fill()
            }
        }

        const dx = hero.x - this.x_
        const dy = hero.y - this.y_
        const ang = this.smoothA

        let way = -1
        const whole = (Math.PI * 2)
        const normal = (((ang % whole) + whole) % whole)
        if (normal > Math.PI * 1.5 || normal < Math.PI / 2) way = 1

        // Head
        const bodyPos = game.pixelPos(x, y)
        game.ctx.save()
        game.ctx.translate(bodyPos.x, bodyPos.y)
        game.ctx.rotate(normal)

        const headX = this.w * .3
        const headW = this.w
        const headH = this.w * .7

        const eyeSize = this.w * .24
        const eyeX = -this.w * .13
        const eyeY = this.w * .05 * way

        const pupil = 5
        const pupilX = Math.cos(ang) * (eyeSize / 2 - pupil / 2) * way
        const pupilY = Math.sin(ang) * (eyeSize / 2 - pupil / 2) * way

        // Jaw
        const snap = Math.sin(this.move + this.attacking * 10) * .3

        game.ctx.lineWidth = game.zoom * 30
        game.ctx.strokeStyle = rgb(.15,.15,.15)
        game.ctx.beginPath()
        game.ctx.moveTo((headX - headW * .3) * game.zoom, (headH * .3) * game.zoom * way)
        game.ctx.lineTo(
            ((headX - headW * .3) + Math.cos(.5 + snap) * 50) * game.zoom,
            ((headH * .3) + Math.sin(.5 + snap) * 50) * game.zoom * way)
        game.ctx.stroke()

        // Teeth
        const tooth1 = 7
        const tooth2 = 6
        game.ctx.fillStyle = rgb(.7,.7,.6)
        game.rectZoom(headX, headH / 2 * way, tooth1, tooth1 * way)
        game.rectZoom(headX + 15, headH / 2 * way, tooth2, tooth2* way)

        // Head
        game.ctx.fillStyle = rgb(.2,.2,.2)
        game.rectZoom(headX - headW / 2, -headH / 2, headW, headH)

        rgbAdd(tint)

        // Eye
        game.ctx.fillStyle = rgb(.8,.8,.8)
        game.rectZoom(headX + eyeX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize)

        // Pupil
        game.ctx.fillStyle = rgb(0,0,0)
        game.rectZoom(
            headX + eyeX + pupilX - pupil / 2,
            eyeY + pupilY - pupil / 2,
            pupil, pupil)

        // Brow
        game.ctx.lineWidth = game.zoom * 5
        game.ctx.strokeStyle = rgb(0,0,0)
        game.ctx.beginPath()
        game.ctx.moveTo((headX + eyeX - eyeSize / 2) * game.zoom, (eyeY - (way < 0 ? 0 : eyeSize / 2) - 2) * game.zoom * way)
        game.ctx.lineTo((headX + eyeX + eyeSize / 2) * game.zoom, (eyeY - (way < 0 ? 0 : eyeSize / 2) - 2) * game.zoom * way)
        game.ctx.stroke()

        game.ctx.restore()

        rgbPop()
    }
}