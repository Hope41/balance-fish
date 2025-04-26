'use strict'
class Shrimp {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.x = item.x
        this.y = item.y
        this.w = 40
        this.h = 30
        this.v = 0
        this.data = item.data
        this.position = {state: 'back', status: 'fore'}
        this.id = makeID()

        // Traits
        this.defaultSpeed = .002

        this.speed = this.speed
        this.awareness = 500
        this.fear = 300

        // Tail
        this.tail = []
        for (let i = 0; i < 5; i ++)
            this.tail.push({x: this.x, y: this.y, size: 30 + Math.sin(2 + i) * 20})

        // Details
        this.vx = 0
        this.vy = 0
        this.move = 0
        this.goalX = 0
        this.goalY = 0
        this.momentum = .9
        this.damping = .9
        this.shyness = 0

        // Trivia
        this.target = 0
        this.a = 0
        this.neck = .2
        this.onGround = false
        this.cable = 0
        this.attack = 150
        this.attacking = 0
        this.wait = 0
        this.aiming = 0
        this.following = false
        this.injure = 0
        this.electric = false
        this.electricSpeed = .01
        this.inAir = false
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

    reset() {
        game.unfreezeAll()
        game.cam.goal = hero
        this.attacking = 0
        this.cable = 0
        this.target = 0
        if (this.electric)
            this.attack = random(500, 700)
        else this.attack = random(100, 200)
        this.wait = 0
        this.aiming = 0
        this.following = true
        this.injure = 0
    }

    update() {
        game.formatDT(this)

        const speed = Math.hypot(this.vx, this.vy)
        this.move += speed / 100 * game.dt

        const attackStart = 100
        const snapTimer = 100
        const resetTimer = 100

        // Move toward player
        const x = this.x + this.w / 2
        const y = this.y + this.h / 2
        const dx = hero.x - x
        const dy = hero.y - y
        const d = Math.hypot(dx, dy)

        if (d < this.awareness && hero.v > 5 && this.following) {
            this.vx -= dx / 200 * this.speed * game.dt
            this.vy -= dy / 200 * this.speed * game.dt
        }

        if (d > this.fear && ((d < this.awareness && this.attack > attackStart) || this.following)) {
            this.a = Math.atan2(dy, dx) + Math.sin(this.move * 2) * .7
            this.vx += Math.cos(this.a) * d * this.speed * game.dt
            this.vy += Math.sin(this.a) * d * this.speed * game.dt
            hero.addFollower(this)

            this.following = true

            if (hero.holding.shape && hero.holding.shape.data.type == 'cable')
                this.cable = hero.holding.shape
        }

        if (!this.cable) this.reset()
        else if (this.cable.connected) this.reset()

        // Move toward cable
        if (this.cable && !this.cable.connected && !this.inAir) {
            const breakable = this.cable.strength <= 1

            // Only count down when near goal
            if (this.cable.thread.length > 10) {
                if (d <= this.fear) {
                    this.attack -= this.dt
                }
            }

            if (this.attack < attackStart) {
                if (!this.target) {
                    this.target = this.cable.thread[Math.max(0, this.cable.thread.length - 3)]
                }
                if (this.target) {
                    if (breakable || !this.electric)
                        game.freezeExceptThese([this,this.cable])
                    this.following = false

                    if (breakable || !this.electric) game.cam.goal = this
                    this.aiming += game.dt

                    const DX = (this.target.x + this.cable.w_ / 2) - x
                    const DY = (this.target.y + this.cable.h_ / 2) - y
                    const D = Math.hypot(DX, DY)

                    if (this.attacking < snapTimer) {
                        let speed = .01
                        if (!breakable && this.electric) speed = .05
                        this.vx += DX * speed * game.dt
                        this.vy += DY * speed * game.dt
                    }

                    // If in range or taking too long, start attacking
                    if (D < 50 || this.aiming > 100)
                        this.attacking += game.dt

                    if (this.attacking > snapTimer) {
                        if (!breakable) {
                            if (!this.injure)
                                game.cam.shake(20, 20, 30, .1)
                            this.injure += game.dt

                            game.ctx.fillStyle = rgb(0,1,1)
                            game.ctx.beginPath()
                            const verts = 20
                            const rad = 60
                            for (let i = 0; i < verts; i ++) {
                                const r = rad + Math.sin(i * i + Math.floor(game.time * .1) * i) * rad / 2
                                const X = Math.cos(i / verts * Math.PI * 2) * r
                                const Y = Math.sin(i / verts * Math.PI * 2) * r
                                game.lineTo(this.x + X, this.y + Y)
                            }
                            game.ctx.fill()

                            if (this.injure > 40) {
                                this.cable.strength --
                                this.reset()
                                this.electric = true
                            }
                        }

                        else {
                            // Snap cable
                            if (!this.target.snapped) {
                                game.cam.shake(20, 20, 30, .1)
                                this.target.snapped = game.dt
                                this.cable.fade = true
                                this.cable.shrink = false
                                this.cable.snap()
                            }

                            this.wait += game.dt

                            // Reset when cable has exploded
                            if (this.wait > resetTimer)
                                this.reset()
                        }
                    }
                }
            }
        }

        if (this.electric)
            this.speed = this.electricSpeed
        else this.speed = this.defaultSpeed

        // Apply physics
        this.vx *= Math.pow(this.momentum, this.dt)
        this.vy *= Math.pow(this.momentum, this.dt)

        // Gravity
        if (this.inAir) {
            this.vy = 1
            this.vx = 0
        }

        this.x += this.vx * game.dt
        this.y += this.vy * game.dt

        // Control tail
        for (let i = 0; i < this.tail.length; i ++) {
            const prev = (i ? this.tail[i - 1] : {
                x: this.x - Math.cos(this.a) * this.w * this.neck,
                y: this.y - Math.sin(this.a) * this.w * this.neck})
            const item = this.tail[i]

            const dx = item.x - prev.x
            const dy = item.y - prev.y
            const d = Math.hypot(dx, dy)

            item.x = prev.x + (dx / d) * item.size
            item.y = prev.y + (dy / d) * item.size
        }

        // --- Collision detection ---
        this.collision()
    }

    draw() {
        const eyeSize = this.w * .24
        const x = this.x + this.w / 2
        const y = this.y + this.h / 2
        const eyeX = -this.w * .15
        const eyeY = 0

        let way = 1
        const normal = mod(this.a, Math.PI * 2)
        if (normal > Math.PI * 1.5 || normal < Math.PI / 2) way = -1

        if (this.injure) rgbAdd([2,2,2])

        if (this.electric) {
            game.ctx.lineWidth = game.zoom * 2
            game.ctx.strokeStyle = rgb(0,1,1,.9)
            game.ctx.beginPath()
            const verts = 20
            const rad = 30
            for (let I = 0; I < verts + 1; I ++) {
                let i = I
                if (i >= verts) i = 0
                const r = rad + Math.sin(i * i + Math.floor(game.time * .2) * i) * rad / 2
                const X = Math.cos(i / verts * Math.PI * 2) * r
                const Y = Math.sin(i / verts * Math.PI * 2) * r
                game.lineTo(x + X, y + Y)
            }
            game.ctx.stroke()
        }

        // Tail
        for (let i = 0; i < this.tail.length; i ++) {
            const prev = (i ? this.tail[i - 1] : {
                x: this.x - Math.cos(this.a) * this.w * this.neck,
                y: this.y - Math.sin(this.a) * this.w * this.neck})
            const item = this.tail[i]

            game.ctx.lineWidth = item.size / 2 * game.zoom

            const k = .3-i/50
            game.ctx.strokeStyle = rgb(k,k/2,k/3)

            game.ctx.beginPath()
            game.moveTo(prev.x + this.w / 2, prev.y + this.h / 2)
            game.lineTo(item.x + this.w / 2, item.y + this.h / 2)
            game.ctx.stroke()
        }

        const bodyPos = game.pixelPos(x, y)
        const biting = (this.attacking && !this.wait ? this.attacking : 0)

        game.ctx.save()
        game.ctx.translate(bodyPos.x, bodyPos.y)
        game.ctx.rotate(this.a + Math.sin(biting) / 10)

        // Body
        game.ctx.fillStyle = rgb(.4,.2,.1)
        const bodH = this.h * .8
        game.rectZoom(-this.w / 2, (this.h / 2 * way) - bodH * way, this.w, bodH * way)

        // Jaw
        game.ctx.save()
        game.ctx.translate(0, (-this.h * .17) * game.zoom * way)
        game.ctx.rotate(Math.PI - Math.abs(Math.sin(biting / 2) / 2) * way)

        game.ctx.fillStyle = rgb(.4,.2,.1)
        game.rectZoom(-20, 0, 30, 10 * way)

        game.ctx.restore()

        // Back of head
        game.ctx.fillStyle = rgb(.5,.2,.1)
        game.rectZoom(-this.w * .5, -this.h / 2, this.w * .3, this.h)

        // Eye
        const k = (this.cable ? .5 : 0)
        game.ctx.fillStyle = rgb(.8+k,.8-k,.8-k)
        game.rectZoom(-eyeSize / 2 + eyeX, -eyeSize / 2 + eyeY, eyeSize, eyeSize)

        // Pupil
        const pupil = 5
        game.ctx.fillStyle = rgb(0,0,0)
        game.rectZoom(eyeX, -pupil / 2 + eyeY, pupil, pupil)

        const anger = (game.level == 'city' ? 2 : -2)
        // Brow
        game.ctx.strokeStyle = rgb(0,0,0)
        game.ctx.lineWidth = game.zoom * 3
        game.ctx.beginPath()
        game.ctx.moveTo((eyeX - eyeSize / 2) * game.zoom, (eyeY + (eyeSize / 2 + 2) * way) * game.zoom)
        game.ctx.lineTo((eyeX + eyeSize / 2) * game.zoom, (eyeY + (eyeSize / 2 + anger) * way) * game.zoom)
        game.ctx.stroke()

        // Mouth
        game.ctx.fillStyle = rgb(.1,0,0)
        game.rectZoom(this.w / 2, -8 * way, -18, 3 * way)
        game.rectZoom(this.w / 2 - 15, -5 * way, -3, 2 * way)

        // Teeth
        const toothY = -5 * way

        const tooth1X = 7
        const tooth1W = 2.5
        const tooth1H = 4.5 * way

        const tooth2X = 15
        const tooth2W = 3
        const tooth2H = 5 * way

        game.ctx.fillStyle = rgb(.7,.7,.5)

        game.ctx.beginPath()
        game.ctx.moveTo((this.w / 2 - tooth1X) * game.zoom, (toothY) * game.zoom)
        game.ctx.lineTo((this.w / 2 - tooth1X + tooth1W) * game.zoom, (toothY - tooth1H) * game.zoom)
        game.ctx.lineTo((this.w / 2 - tooth1X + tooth1W * 2) * game.zoom, (toothY) * game.zoom)
        game.ctx.fill()

        game.ctx.fillStyle = rgb(1,1,.8)

        game.ctx.beginPath()
        game.ctx.moveTo((this.w / 2 - tooth2X) * game.zoom, (toothY) * game.zoom)
        game.ctx.lineTo((this.w / 2 - tooth2X + tooth2W) * game.zoom, (toothY - tooth2H) * game.zoom)
        game.ctx.lineTo((this.w / 2 - tooth2X + tooth2W * 2) * game.zoom, (toothY) * game.zoom)
        game.ctx.fill()

        game.ctx.restore()

        if (this.injure) rgbPop()
    }
}