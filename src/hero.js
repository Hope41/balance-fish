class Hero {
    constructor () {
        // Mandatory
        this.dt = 0
        this.w = 0
        this.h = 0
        this.id = makeID()

        // Locate
        this.x = 0
        this.y = 0
        this.a = -Math.PI / 2

        // Physics
        this.v = 0
        this.vx = 0
        this.vy = 0
        this.va = 0

        // Radius
        this.r = 40

        // Details
        this.walkSpeed = .17
        this.rotateSpeed = .007
        this.forwardSpeed = .4
        this.backwardSpeed = .1
        this.angularMomentum = .9
        this.momentumX = .95
        this.momentumY = .95
        this.dampingX = 1
        this.dampingY = 1
        this.dampingA = 1

        this.airMomentumX = .999

        // Trivia
        this.move = 0
        this.moveX = 0
        this.data = {type: 'hero'}
        this.gravity = .3
        this.inAir = false
        this.onGround = false
        this.max = 20
        this.holding = {
            shape: 0,
            func: () => {},
            reset: () => {
                this.holding.shape = 0
                this.holding.func = () => {}
            }
        }

        this.currentFollows = {}
        this.followers = []
        this.disable = false
        this.blink = 100
        this.eyeY = 0
        this.bubble = 0

        this.openLegs = 0
        this.openingLegs = false

        this.yOft = 0
        this.yOftGoal = 0

        this.dir = 0
    }

    empty() {
        this.holding.reset()
        this.followers = []
        this.currentFollows = {}
        this.disable = false
        this.vx = 0
        this.vy = 0
        this.a = 0
    }

    hasFollower(follower) {
        if (this.currentFollows[follower.id]) return true
        return false
    }

    addFollower(follower) {
        if (this.currentFollows[follower.id]) return
        this.currentFollows[follower.id] = follower
        this.followers.push(follower)
    }

    deleteFollower(follower) {
        if (!this.currentFollows[follower.id]) return
        this.currentFollows[follower.id] = false
        this.followers.splice(this.followers.indexOf(follower), 1)
    }

    maxSpeed() {
        if (this.vx > this.max) this.vx = this.max
        if (this.vx < -this.max) this.vx = -this.max
        if (this.vy > this.max) this.vy = this.max
        if (this.vy < -this.max) this.vy = -this.max
    }

    hold(shape, func) {
        this.holding.shape = shape
        this.holding.func = func
    }

    update() {
        if (game.start) return

        game.formatDT(this)

        // Key strokes
        if (this.inAir) {
            if (this.onGround) {
                if (game.key.left || (this.dir < 0 && !game.key.right)) {
                    this.va += (Math.PI - mod(this.a, Math.PI * 2)) / 50 * this.dt
                    this.dir = -1
                }
                else if (game.key.right || (this.dir > 0 && !game.key.left)) {
                    this.va += (Math.PI - mod(this.a + Math.PI, Math.PI * 2)) / 50 * this.dt
                    this.dir = 1
                }

                if (game.key.up && this.dir < 0) {
                    this.vx -= this.walkSpeed * this.dt
                }
                if (game.key.up && this.dir > 0) {
                    this.vx += this.walkSpeed * this.dt
                }
            }
        }
        else {
            const m = mod(this.a, Math.PI * 2)
            if (m < Math.PI / 2 || m > Math.PI * 1.5) this.dir = 1
            else this.dir = -1

            if (game.key.left) {
                this.va -= this.rotateSpeed * this.dt
            }
            if (game.key.right) {
                this.va += this.rotateSpeed * this.dt
            }
        }
        if (game.key.up && !this.inAir) {
            this.vx += Math.cos(this.a) * this.forwardSpeed * this.dt
            this.vy += Math.sin(this.a) * this.forwardSpeed * this.dt
        }

        // Gravity
        if (this.inAir) {
            this.vy += this.gravity * this.dt
        }

        // Restrict physics
        this.vx *= Math.pow(this.momentumX, this.dt)
        if (this.inAir && !this.onGround)
            this.vx *= Math.pow(this.airMomentumX, this.dt)
        if (!this.inAir)
            this.vy *= Math.pow(this.momentumY, this.dt)
        this.va *= Math.pow(this.angularMomentum, this.dt)

        this.maxSpeed()

        this.v = Math.hypot(this.vx, this.vy)
        this.move += this.v * this.dt
        this.moveX += (this.vx * (.5 + this.openLegs / 2)) * this.dt

        // Apply physics
        this.x += this.vx * this.dampingX * this.dt
        this.y += this.vy * this.dampingY * this.dt
        this.a += this.va * this.dampingA * this.dt

        // Hold
        if (this.holding.shape)
            this.holding.func()

        // Apply gravity or not
        const oldAir = this.inAir
        this.inAir = true

        // --- Collision response ---
        const BOUNCE = 1
        const collisionPoints = []

        // Camera sectors
        const hor = game.cvs.width / game.zoom
        const vrt = game.cvs.height / game.zoom
        const top = Math.floor((game.cam.y - vrt / 2) / game.map.cellSize)
        const lef = Math.floor((game.cam.x - hor / 2) / game.map.cellSize)
        const bot = Math.floor((game.cam.y + vrt / 2) / game.map.cellSize) + 1
        const rig = Math.floor((game.cam.x + hor / 2) / game.map.cellSize) + 1

        // Look at all the shapes
        for (let x = lef; x < rig; x ++) {
            for (let y = top; y < bot; y ++) {
                const cell = game.map.levels[game.level].both[
                    posToIndex(x, y, game.map.levels[game.level].sortWidth)]
                if (!cell) continue

                for (let i = 0; i < cell.length; i ++) {
                    const shape = cell[i]

                    if (shape.data.type == 'water') {
                        if (collide({x:this.x-this.r,y:this.y-this.r,w:this.r*2,h:this.r}, shape)) {
                            this.inAir = false
                        }
                    }

                    if (shape.data.type == 'ground') {
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
                                const x = this.x
                                const y = this.y
                                const r = this.r
            
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

                    if (shape.data.type == 'cable' && !shape.snapping && !this.holding.shape && !shape.connected && shape.time > 30) {
                        if (collide(
                            {x:shape.x_,y:shape.y_,w:shape.w_,h:shape.h_},
                            {x:this.x-this.r,y:this.y-this.r,w:this.r*2,h:this.r*2})) {
                            shape.beingHeld = true
                            sound_collect.play()
                            this.hold(shape, () => {
                                if (shape.snapping) return
                                const x = this.holding.shape.x_ + this.holding.shape.w_ / 2
                                const y = this.holding.shape.y_ + this.holding.shape.h_ / 2
                                this.holding.shape.x_ += (this.x - x) / 10 * this.dt
                                this.holding.shape.y_ += (this.y - y) / 10 * this.dt
                            })
                        }
                    }
                }
            }
        }

        if (this.inAir && !oldAir) {
            sound_leave_water.playbackRate = random(.9, 1)
            sound_leave_water.play()
        }
        if (!this.inAir && oldAir) {
            sound_splash.playbackRate = random(.8, 1)
            sound_splash.play()
        }

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
            if (!(this.inAir && this.onGround))
                this.vx += avgX * BOUNCE
            else {
                this.a += Math.max(-.05, Math.min(.05, this.vy / 100 * this.dt * this.vx))
            }
            this.vy += avgY * BOUNCE
        }
    }

    draw() {
        this.blink -= this.dt
        this.bubble -= this.dt

        if (!this.inAir) {
            sound_air_bubble.volume = Math.min(sound_air_bubble.volume + .002 * game.dt, .1)
        }
        else {
            sound_air_bubble.volume = Math.max(sound_air_bubble.volume - .004 * game.dt, 0)
        }

        if (this.bubble < 0 && !this.inAir) {
            game.explosion({
                x: this.x - 50,
                y: this.y,
                w: 100,
                h: 0,
                amt: 1,
                momentumX: .95,
                momentumY: .95,
                colors: [[1,1,1,.3],[.6,1,1,.3]],
                minLifetime: 200,
                maxLifetime: 400,
                force: 2,
                minSize: 20,
                maxSize: 20,
                vx: 0,
                vy: -3
            })

            this.bubble = random(
                Math.max(10, 10 - this.v * 5),
                Math.max(20, 40 - this.v * 5),
                1, .3)

            sound_bubble.playbackRate = random(.4, 1)
            sound_bubble.play()
        }

        let eyeYGoal = 0
        let blinking = false
        if (this.blink < 0) {
            if (this.blink < -40)
                this.blink = random(70, 200)

            else if (this.blink < -30) {
                eyeYGoal = -1
            }

            else if (this.blink < -15) {
                eyeYGoal = 6
                blinking = true
            }

            else {
                eyeYGoal = -4
            }
        }

        this.eyeY += (eyeYGoal - this.eyeY) / 2 * this.dt

        const BODY_W = 35 + Math.cos(this.a * 2) * 2.5
        const BODY_H = 35 + Math.cos(this.a * 2 + Math.PI) * 2.5

        const legShrink = 15
        const legLength = 15

        const LEG_LENGTH = lerp(legShrink, legLength, this.openLegs)

        const walkY = this.openLegs * 15
        const walkAmt = this.moveX / 15

        this.yOftGoal = 0
        if (this.inAir && this.onGround) {
            this.openingLegs = true
            this.yOftGoal = walkY

            if (mod(walkAmt + Math.PI / 2, Math.PI) < .3 && this.v > .1) {
                sound_footstep.playbackRate = random(2, 3)
                sound_footstep.play()
            }
        }
        else this.openingLegs = false

        if (this.openingLegs) this.openLegs += .03 * this.dt
        else this.openLegs -= .03 * this.dt

        this.openLegs = Math.max(0, Math.min(1, this.openLegs))
        const expo = easeInOutExpo(this.openLegs) / 2 + .5

        this.yOft += (this.yOftGoal - this.yOft) / (walkY + 1) * this.dt

        const walkingTransition = (this.yOft / (walkY + 1))

        const walkNoBob = 1 - walkingTransition
        const walkBob = Math.cos(walkAmt * 2) * -7 * walkingTransition

        const cos = Math.cos(this.a)

        const BOB = Math.sin(game.time / 10) * walkNoBob
        const BOB_2 = Math.cos(game.time / 10) * walkNoBob
        const X = this.x
        const Y = this.y + BOB * 5 + walkBob - this.yOft

        const EYE = 20
        const EYE_X = cos * 18
        const EYE_Y = Math.sin(this.a) * 15 - 10 - BOB_2 * 2 + this.eyeY
        const EYE_GAP = 17

        const PUPIL = 6
        const PUPIL_1_X = Math.cos(this.a - .3) * PUPIL
        const PUPIL_1_Y = Math.sin(this.a - .3) * PUPIL
        const PUPIL_2_X = Math.cos(this.a + .3) * PUPIL
        const PUPIL_2_Y = Math.sin(this.a + .3) * PUPIL

        const MOUTH_X = cos * 16
        const MOUTH_Y = 10 + Math.sin(this.a) * 17 - BOB_2
        const MOUTH_W = 54
        const MOUTH_H = 9
        const JAW_W = MOUTH_W - 3
        const JAW_X = -cos * 1

        const TAIL_X = -cos * BODY_W * .9
        const TAIL_Y = -Math.sin(this.a) * BODY_H * .9
        const TAIL_LEN = 20
        const TAIL_SPREAD = .25 + Math.sin(this.move / 20) * .05

        const FLIPPER_LEN = 25
        const FLIPPER_Y = 5
        const FLIPPER_X = BODY_W * .7
        const FLIPPER_SPLIT = .7
        const FLIPPER_1_SPREAD = Math.sin(this.move / 10) * .1 + Math.sin(this.a) * FLIPPER_SPLIT
        const FLIPPER_2_SPREAD = Math.sin(this.move / 10) * .1 - Math.sin(this.a) * FLIPPER_SPLIT

        const BLINK_H = 5

        // Legs!
        if (expo) {
            const legLen = LEG_LENGTH
            const sin = (1 - Math.sin(this.a))

            const legGap = 10
            const legOftX = 5
            const leg1X = (legGap - legOftX) * cos
            const leg2X = (-legGap - legOftX) * cos

            const legY = -5

            const kneeSwing = .7 * cos * sin
            const footSwing = .7 * cos * sin

            const kneeOft = 1 * cos
            const footOft = -.5 * cos

            const kneeAng = -.4 * cos * sin
            const footAng = .6 * cos * sin

            const defaultA = Math.PI / 2

            const knee1X = Math.cos(defaultA + kneeAng + sharpSin(kneeOft + walkAmt) * kneeSwing) * legLen
            const knee1Y = Math.sin(defaultA + kneeAng + sharpSin(kneeOft + walkAmt) * kneeSwing) * legLen

            const foot1X = Math.cos(defaultA + footAng + Math.sin(footOft + walkAmt) * footSwing) * legLen
            const foot1Y = Math.sin(defaultA + footAng + Math.sin(footOft + walkAmt) * footSwing) * legLen

            const knee2X = Math.cos(defaultA + kneeAng + Math.sin(Math.PI + kneeOft + walkAmt) * kneeSwing) * legLen
            const knee2Y = Math.sin(defaultA + kneeAng + Math.sin(Math.PI + kneeOft + walkAmt) * kneeSwing) * legLen

            const foot2X = Math.cos(defaultA + footAng + Math.sin(Math.PI + footOft + walkAmt) * footSwing) * legLen
            const foot2Y = Math.sin(defaultA + footAng + Math.sin(Math.PI + footOft + walkAmt) * footSwing) * legLen

            game.ctx.strokeStyle = rgb(0,0,0)
            game.ctx.lineWidth = game.zoom * 10
            game.ctx.lineJoin = 'round'

            const YY = Y - (Math.sin(this.a) + 1.7) * (1 - this.openLegs) * 13

            // Leg 1
            game.ctx.beginPath()
            game.moveTo(X + leg1X, YY + legY + BODY_H)
            game.lineTo(
                X + leg1X + knee1X,
                YY + legY + BODY_H + knee1Y)
            game.lineTo(
                X + leg1X + knee1X + foot1X,
                YY + legY + BODY_H + knee1Y + foot1Y)
            game.ctx.stroke()

            // Leg 2
            game.ctx.beginPath()
            game.moveTo(X + leg2X, YY + legY + BODY_H)
            game.lineTo(
                X + leg2X + knee2X,
                YY + legY + BODY_H + knee2Y)
            game.lineTo(
                X + leg2X + knee2X + foot2X,
                YY + legY + BODY_H + knee2Y + foot2Y)
            game.ctx.stroke()

            game.ctx.lineJoin = 'miter'
        }

        // Body
        game.ctx.fillStyle = rgb(0,0,0)
        game.rect(X - BODY_W, Y - BODY_H, BODY_W * 2, BODY_H * 2)

        // Tail
        game.ctx.lineWidth = game.zoom * 15
        game.ctx.strokeStyle = rgb(0,0,0)
        game.ctx.beginPath()
        game.moveTo(
            X + TAIL_X - Math.cos(this.a - Math.PI * TAIL_SPREAD) * TAIL_LEN,
            Y + TAIL_Y - Math.sin(this.a - Math.PI * TAIL_SPREAD) * TAIL_LEN)
        game.lineTo(X + TAIL_X, Y + TAIL_Y)
        game.lineTo(
            X + TAIL_X - Math.cos(this.a + Math.PI * TAIL_SPREAD) * TAIL_LEN,
            Y + TAIL_Y - Math.sin(this.a + Math.PI * TAIL_SPREAD) * TAIL_LEN)
        game.ctx.stroke()

        // Flippers
        game.ctx.lineWidth = game.zoom * 20
        const flip_1 = sharpSin(this.a - Math.PI / 2) * .1
        const flip_2 = sharpSin(this.a + Math.PI / 2) * .1

        game.ctx.strokeStyle = rgb(flip_1,flip_1,flip_1)
        game.ctx.beginPath()
        game.moveTo(X + FLIPPER_X, Y + BOB_2)
        game.lineTo(
            X + FLIPPER_X - Math.cos(FLIPPER_1_SPREAD + this.a) * FLIPPER_LEN,
            Y + BOB_2 + FLIPPER_Y - Math.sin(FLIPPER_1_SPREAD + this.a) * FLIPPER_LEN)
        game.ctx.stroke()

        game.ctx.strokeStyle = rgb(flip_2,flip_2,flip_2)
        game.ctx.beginPath()
        game.moveTo(X - FLIPPER_X, Y + BOB_2)
        game.lineTo(
            X - FLIPPER_X - Math.cos(FLIPPER_2_SPREAD + this.a) * FLIPPER_LEN,
            Y + BOB_2 + FLIPPER_Y - Math.sin(FLIPPER_2_SPREAD + this.a) * FLIPPER_LEN)
        game.ctx.stroke()

        if (blinking) {
            game.ctx.fillStyle = rgb(.4,.4,.4)
            game.rect(X + EYE_X + EYE_GAP - EYE / 2, Y + EYE_Y - BLINK_H / 2, EYE, BLINK_H)
            game.rect(X + EYE_X - EYE_GAP - EYE / 2, Y + EYE_Y - BLINK_H / 2, EYE, BLINK_H)
        }

        else {
            // Eye
            game.ctx.fillStyle = rgb(.8,.8,.8)
            game.rect(X + EYE_X + EYE_GAP - EYE / 2, Y + EYE_Y - EYE / 2, EYE, EYE)
            game.rect(X + EYE_X - EYE_GAP - EYE / 2, Y + EYE_Y - EYE / 2, EYE, EYE)

            // Pupil
            game.ctx.fillStyle = rgb(0,0,0)
            game.rect(X + EYE_X + EYE_GAP - PUPIL / 2 + PUPIL_1_X, Y + EYE_Y - PUPIL / 2 + PUPIL_1_Y, PUPIL, PUPIL)
            game.rect(X + EYE_X - EYE_GAP - PUPIL / 2 + PUPIL_2_X, Y + EYE_Y - PUPIL / 2 + PUPIL_2_Y, PUPIL, PUPIL)
        }

        // Mouth
        game.ctx.fillStyle = rgb(.2,.15,.3)
        game.rect(X - MOUTH_W / 2 + MOUTH_X, Y - MOUTH_H / 2 + MOUTH_Y, MOUTH_W, MOUTH_H)

        game.ctx.fillStyle = rgb(.25,.2,.35)
        game.rect(X - JAW_W / 2 + JAW_X + MOUTH_X, Y - MOUTH_H / 2 + MOUTH_Y + MOUTH_H, JAW_W, MOUTH_H)
    }
}