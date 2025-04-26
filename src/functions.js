'use strict'

let newID = 0
function makeID() {
    newID ++
    return newID
}

function mod(x, cap) {
    return (((x % cap) + cap) % cap)
}

function random(min, max, bias = .5, strength = 0) {
    let base = Math.random()

    if (strength == 0) return base * (max - min) + min

    if (base < bias) base = bias * Math.pow(base / bias, 1 - strength)
    else base = 1 - (1 - bias) * Math.pow((1 - base) / (1 - bias), 1 - strength)

    return base * (max - min) + min
}

function findAngle(A, B, C) {
    const AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2))
    const BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2))
    const AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2))
    return Math.PI - Math.acos((BC * BC + AB *AB - AC * AC) / (2 * BC * AB))
}

function capDec(x) {
    if (x < 0) return 0
    if (x > 1) return 1
    return x
}

function quad(x) {
    if (x < 0) return 0
    if (x > 1) return 1
    return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

function lerp(x, y, a) {
    if (a < 0) a = 0
    if (a > 1) a = 1
    return x * (1 - a) + y * a
}

function easeInOutExpo(x) {
    if (x < 0) return 0
    if (x > 1) return 1
    return x == 0
        ? 0
        : x == 1
        ? 1
        : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

function sharpSin(x) {
    return quad(.5 + Math.sin(x) * .5) * 2 - 1
}

const rgbFilters = []

function rgbAdd(rgb) {
    rgbFilters.push(rgb)
}

function rgbPop() {
    rgbFilters.pop()
}

function rgbCalc(x,idx) {
    for (let i = 0; i < rgbFilters.length; i ++)
        x *= rgbFilters[i][idx]
    return x
}

function rgb(r,g,b,a=1) {
    return 'rgb('+
        rgbCalc(r,0)*255+','+
        rgbCalc(g,1)*255+','+
        rgbCalc(b,2)*255+','+
        a+')'
}

function rgbReset() {
    rMultiply = 1
    gMultiply = 1
    bMultiply = 1
    rAdd = 0
    gAdd = 0
    bAdd = 0
}

function collide(a, b) {
    if (a.x + a.w > b.x &&
        a.x < b.x + b.w &&
        a.y + a.h > b.y &&
        a.y < b.y + b.h)
        return true
    return false
}

function indexToPos(index, width) {
    return {
        x: index % width,
        y: Math.floor(index / width)
    }
}

function posToIndex(x, y, width) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (x < 0 || x >= width) return
    return x + y * width
}

function pointIsInCircle(x, y, cx, cy, cr) {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy)
    if (d < cr) return {dx, dy, d}
    return false
}

function findCircleSide(dx, dy, d, r) {
    const normalX = dx / d
    const normalY = dy / d
    dx = normalX * r
    dy = normalY * r
    d = d - r
    return {dx, dy, d}
}

function press(e, bool) {
    if (e.repeat) return
    game.key.press = bool
    if (e.code == 'ArrowUp' || e.code == 'KeyW' || e.code == 'KeyZ') game.key.up = bool
    if (e.code == 'ArrowLeft' || e.code == 'KeyA' || e.code == 'KeyQ') game.key.left = bool
    if (e.code == 'ArrowDown' || e.code == 'KeyS') game.key.down = bool
    if (e.code == 'ArrowRight' || e.code == 'KeyD') game.key.right = bool

    if (e.code == 'Space' || e.code == 'Enter')
        game.key.confirm = bool
    if (e.code == 'KeyX')
        game.key.danger = bool
    if (e.code == 'KeyR')
        game.key.r = bool
}

addEventListener('keydown', e => press(e, 1))
addEventListener('keyup', e => press(e, 0))

// Down mouse
let xDetachButtonPAD = 0
let xDetachButtonRAD = 0
let restartButtonPAD = 0
let restartButtonRAD = 0
let PADRAD = 0
let x1PAD = 0
let x2PAD = 0
let yPAD = 0

addEventListener('mousedown', e => game.onMouseDown(e))
addEventListener('touchstart', e => game.touchStart(e))

// Up mouse
addEventListener('mouseup', e => game.onMouseUp(e))

addEventListener('touchend', e => {
    e.preventDefault()
    game.mouseDown = false
    game.cancelTouches(e)
})

addEventListener('touchleave', e => {
    e.preventDefault()
    game.mouseDown = false
    game.cancelTouches(e)
})

// Move mouse
addEventListener('mousemove', e => game.onMouseMove(e))
addEventListener('touchmove', e => game.touchMove(e))