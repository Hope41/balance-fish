'use strict'
class UglyFish {
    constructor(item) {
        // Mandatory
        this.dt = 0
        this.x = item.x
        this.y = item.y
        this.w = 20
        this.h = 20
        this.v = 0
        this.data = item.data
        this.position = {state: 'back', status: 'fore'}
        this.id = makeID()

        // Traits
        this.speed = .008 + Math.random() * .004
        this.awareness = 100 + Math.random() * 500
        this.greed = Math.random()
        this.dizziness = Math.random()
        this.aggression = Math.random()
        this.fear = 50 + Math.random() * 120

        // Tail
        this.tail = []
        for (let i = 0; i < random(3, 20, .1, .5); i ++)
            this.tail.push({x: this.x, y: this.y, size: 5 + 20 / (i + 1.7)})

        // Details
        this.vx = 0
        this.vy = 0
        this.move = 0
        this.goalX = 0
        this.goalY = 0
        this.momentum = .9
        this.damping = .9
        this.shyness = 1

        // Trivia
        this.target = false
        this.a = 0
        this.A = 0
        this.bob = 0
        this.x_ = this.x
        this.y_ = this.y
        this.onGround = false
        this.inAir = false
    }

    update() {
        game.formatDT(this)

        const speed = Math.hypot(this.vx, this.vy)
        this.move += speed / (50 + this.dizziness * 50) * this.dt
        this.bob = Math.sin(this.move) * (5 + this.dizziness * 20)

        // Detailed position
        this.x_ = this.x + Math.sin(this.a) * this.bob
        this.y_ = this.y + Math.cos(this.a) * this.bob

        // Get distance from player to fish
        const x = this.x + this.w / 2
        const y = this.y + this.h / 2
        const disX = hero.x - x
        const disY = hero.y - y
        const length = Math.hypot(disX, disY)

        // Create goal position when in range
        if (length < this.awareness || this.target) {
            this.goalX = hero.x - Math.sign(disX) * this.fear * this.shyness
            this.goalY = hero.y - Math.sign(disY) * this.fear * this.shyness
            this.target = true
            hero.addFollower(this)
        }

        // Move toward goal
        if (this.goalX && this.goalY) {
            const dx = this.goalX - x
            const dy = this.goalY - y
            const d = Math.hypot(dx, dy)
            const a = Math.atan2(dy, dx)

            // Become more confident when close to player
            if (hero.v > .1)
                this.shyness = 2

            else if (d < 500) {
                this.shyness *= Math.pow(.98, this.dt)
                if (this.shyness < .3) this.shyness = .3
            }

            this.a = a + this.bob / (speed + 1)
            this.A = a

            const boost = (d + 10) * this.speed * 100

            this.vx += Math.cos(this.a) * boost * this.speed * this.dt
            this.vy += Math.sin(this.a) * boost * this.speed * this.dt
        }

        // Apply physics
        this.vx *= Math.pow(this.momentum, .9)
        this.vy *= Math.pow(this.momentum, .9)

        // Gravity
        if (this.inAir) {
            this.vy += 1 * this.dt
        }

        this.x += this.vx * this.dt
        this.y += this.vy * this.dt

        // Control tail
        for (let i = 0; i < this.tail.length; i ++) {
            const prev = (i ? this.tail[i - 1] : {
                x: this.x_ - Math.cos(this.a),
                y: this.y_ - Math.sin(this.a)})
            const item = this.tail[i]

            const dx = item.x - prev.x
            const dy = item.y - prev.y
            const d = Math.hypot(dx, dy)

            item.x = prev.x + (dx / d) * item.size
            item.y = prev.y + (dy / d) * item.size
        }

        // --- Collision detection ---
        const BOUNCE = 2
        const collisionPoints = []

        this.inAir = true
        game.map.shapeToCells(this, pos => {
            const cell = game.map.levels[game.level].fore[pos]
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

    draw() {
        game.ctx.lineJoin = 'miter'

        const eye = .6
        const eyeW = this.w * eye
        const eyeH = this.h * eye

        const x = this.x_ + this.w / 2
        const y = this.y_ + this.h / 2

        const pupil = 5
        const pupilX = Math.cos(this.A - this.a) * (eyeW / 2 - pupil / 2)
        const pupilY = Math.sin(this.A - this.a) * (eyeH / 2 - pupil / 2)

        // Tail
        for (let i = 0; i < this.tail.length; i ++) {
            const prev = (i ? this.tail[i - 1] : {x: this.x_, y: this.y_})
            const item = this.tail[i]

            game.ctx.lineWidth = item.size * game.zoom
            game.ctx.strokeStyle = rgb(0,.3-i/20,0)

            game.ctx.beginPath()
            game.moveTo(prev.x + this.w / 2, prev.y + this.h / 2)
            game.lineTo(item.x + this.w / 2, item.y + this.h / 2)
            game.ctx.stroke()
        }

        // Body
        const bodyPos = game.pixelPos(x, y)
        game.ctx.save()
        game.ctx.translate(bodyPos.x, bodyPos.y)
        game.ctx.rotate(this.a)

        game.ctx.fillStyle = rgb(0,.3,0)
        game.rectZoom(-this.w / 2, -this.h / 2, this.w, this.h)

        game.ctx.fillStyle = rgb(.8,.8,.8)
        game.rectZoom(-eyeW / 2, -eyeH / 2, eyeW, eyeH)

        game.ctx.fillStyle = rgb(0,0,0)
        game.rectZoom(pupilX - pupil / 2, pupilY - pupil / 2, pupil, pupil)

        game.ctx.restore()
    }
}