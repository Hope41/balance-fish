class Camera {
    constructor() {
        this.x = 0
        this.y = 0
        this.vx = 0
        this.vy = 0

        this.momentum = .75
        this.damping = .1

        this.goal = {x:0,y:0}
        this.defaultZoom = .06
        this.zoom = this.defaultZoom
        this.goalZoom = this.defaultZoom

        this.booms = []
        this.capY = 0
    }

    shake(x, y, time, zoom) {
        this.booms.push({x, y, time, zoom})
    }

    zoom_reactor() {
        const maxZoom = .1
        const minZoom = .05
        const absoluteMaxZoom = .2
        const absoluteMinZoom = .03

        const cap = () => {
            zoom = Math.min(Math.max(zoom, minZoom), maxZoom)
        }

        const absoluteCap = () => {
            zoom = Math.min(Math.max(zoom, absoluteMinZoom), absoluteMaxZoom)
        }

        // Zoom out from intro
        const dx = 2400 - this.x
        const dy = 570 - this.y
        const d = Math.hypot(dx, dy) + 1
        let zoom = maxZoom - d / 10000
        cap()

        // Zoom out based on player speed
        if (this.goal == hero)
            zoom *= 1 - Math.hypot(hero.vx, hero.vy) / 30

        absoluteCap()

        this.goalZoom = zoom
    }

    zoom_level2() {
        let zoom = .05

        // Zoom out based on player speed
        if (this.goal == hero)
            zoom *= 1 - Math.hypot(hero.vx, hero.vy) / 30

        const maxZoom = .1
        const minZoom = .04
        const cap = () => {
            zoom = Math.min(Math.max(zoom, minZoom), maxZoom)
        }
        cap()

        this.goalZoom = zoom
    }

    zoom_level3() {
        let zoom = .05

        // Zoom out based on player speed
        if (this.goal == hero)
            zoom *= 1 - Math.hypot(hero.vx, hero.vy) / 20

        const maxZoom = .1
        const minZoom = .04
        const cap = () => {
            zoom = Math.min(Math.max(zoom, minZoom), maxZoom)
        }
        cap()

        this.goalZoom = zoom
    }

    zoom_level4() {
        let zoom = .06

        // Zoom out based on player speed
        if (this.goal == hero)
            zoom *= 1 - Math.hypot(hero.vx, hero.vy) / 15

        const maxZoom = .1
        const minZoom = .04
        const cap = () => {
            zoom = Math.min(Math.max(zoom, minZoom), maxZoom)
        }
        cap()

        this.goalZoom = zoom
    }

    zoom_level5() {
        let zoom = .06

        // Zoom out based on player speed
        if (this.goal == hero)
            zoom *= 1 - Math.hypot(hero.vx, hero.vy) / 20

        const maxZoom = .1
        const minZoom = .04
        const cap = () => {
            zoom = Math.min(Math.max(zoom, minZoom), maxZoom)
        }
        cap()

        this.goalZoom = zoom
    }

    zoom_level6() {
        this.zoom_level5()
    }

    zoom_city() {
        let zoom = .04

        // Zoom out based on player speed
        if (this.goal == hero)
            zoom *= 1 - Math.hypot(hero.vx, hero.vy) / 20

        const maxZoom = .1
        const minZoom = .04
        const cap = () => {
            zoom = Math.min(Math.max(zoom, minZoom), maxZoom)
        }
        cap()

        this.goalZoom = zoom
    }

    update() {
        this['zoom_'+game.level](game)

        for (let i = 0; i < this.booms.length; i ++) {
            const item = this.booms[i]
            item.time -= game.dt

            this.goalZoom += item.zoom / 10 * game.dt

            this.x += item.x * (Math.random() - .5)
            this.y += item.y * (Math.random() - .5)

            if (item.time < 0) {
                this.booms.splice(i, 1)
                i --
            }
        }

        this.zoom += (this.goalZoom - this.zoom) / 10 * game.dt

        this.vx += this.goal.x - this.x
        this.vy += this.goal.y - this.y

        this.vx *= Math.pow(this.momentum, game.dt)
        this.vy *= Math.pow(this.momentum, game.dt)

        this.x += this.vx * this.damping * game.dt
        this.y += this.vy * this.damping * game.dt

        if (this.capY && this.y > this.capY - game.cvs.height / game.zoom / 2)
            this.y = this.capY - game.cvs.height / game.zoom / 2

        if (game.mainCable && game.map.level > 1 &&
            this.y < game.mainCable.y + game.cvs.height / game.zoom / 2)
            this.y = game.mainCable.y + game.cvs.height / game.zoom / 2
    }
}