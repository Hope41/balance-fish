'use strict'

game.cvs.style.display = 'none'

const fxCanvas = document.getElementById("fx-canvas")
const gl = fxCanvas.getContext("webgl")

function FXResize() {
    fxCanvas.width = game.cvs.width
    fxCanvas.height = game.cvs.height
    gl.viewport(0, 0, fxCanvas.width, fxCanvas.height)
}

addEventListener('resize', () => FXResize())
FXResize()

const vertexSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        v_texCoord = a_texCoord;
        gl_Position = vec4(a_position, 0, 1);
    }`

const fragmentSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_time;
    varying vec2 v_texCoord;
    void main() {
        vec2 uv = v_texCoord;
        uv.y += -0.02 * sin(uv.x * 70.0 + u_time * 2.0) * cos(uv.x * 100.0 + u_time * 4.0);
        gl_FragColor = texture2D(u_texture, uv);
    }`

function createShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
    }
    return shader
}

function createProgram(gl, vsSource, fsSource) {
    const program = gl.createProgram()
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
    }
    return program
}

const program = createProgram(gl, vertexSource, fragmentSource)
gl.useProgram(program)

// Fullscreen quad
const positionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1, 1, -1, -1, 1,
  1, -1, 1, 1, -1, 1
]), gl.STATIC_DRAW);

const texCoordBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  0, 0, 1, 0, 0, 1,
  1, 0, 1, 1, 0, 1
]), gl.STATIC_DRAW)

const positionLoc = gl.getAttribLocation(program, "a_position")
const texCoordLoc = gl.getAttribLocation(program, "a_texCoord")
const timeLoc = gl.getUniformLocation(program, "u_time")

const texture = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

let lastTime = performance.now()

gl.bindTexture(gl.TEXTURE_2D, texture)
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
    fxCanvas.width, fxCanvas.height, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, null)

function FXRun(now) {
    const dt = (now - lastTime) / 1000
    lastTime = now

    // --- WebGL filter ---
    gl.viewport(0, 0, fxCanvas.width, fxCanvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Update texture from 2D canvas
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, game.cvs)

    // Bind quad
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.enableVertexAttribArray(texCoordLoc)
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)

    gl.uniform1f(timeLoc, now / 1000)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    requestAnimationFrame(FXRun)
}

FXRun()