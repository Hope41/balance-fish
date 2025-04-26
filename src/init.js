'use strict'
const hero = new Hero()
const game = new Game()
game.update(0)
game.map.formatAll()

const MOBILE = 'ontouchstart' in window

const FONT_OFT = .32
let DANGER_KEY = 'X'
let SAFE_KEY = 'Z'

let INTENSIVE = true