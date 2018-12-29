const w : number = window.innerWidth, h : number = window.innerHeight
const nodes : number = 5
const arcs : number = 4
const scGap : number = 0.05
const scDiv : number = 0.51
const strokeFactor : number = 90
const sizeFactor : number = 2.1
const color : string = "#43A047"

const maxScale : Function = (scale : number, i : number, n : number) : number => {
    return Math.max(0, scale - i / n)
}

const divideScale : Function = (scale : number, i : number, n : number) : number => {
    return Math.min(1/n, maxScale(scale, i, n)) * n
}

const scaleFactor : Function = (scale : number) => Math.floor(scale / scDiv)

const mirrorValue : Function = (scale : number, a : number, b : number) : number => {
    const k : number = scaleFactor(scale)
    return (1 - k) / a + k / b
}

const updateScale : Function = (scale : number, dir : number, a : number, b : number) : number => {
    return mirrorValue(scale, a, b) * dir * scGap
}

const drawQASNode : Function = (context : CanvasRenderingContext2D, i : number, scale : number) => {
    const gap : number = w / (nodes + 1)
    const sc1 : number = divideScale(scale, 0, 2)
    const sc2 : number = divideScale(scale, 1, 2)
    const totalSize : number = gap / sizeFactor
    const size : number = totalSize / arcs
    const cGap : number = size * Math.PI/4
    context.lineWidth = Math.min(w, h) / strokeFactor
    context.lineCap = 'round'
    context.strokeStyle = color
    context.save()
    context.translate(gap * (i + 1), h/2)
    context.rotate(Math.PI/2 * sc2)
    for(var j = 0; j < 2; j++) {
        const sf : number = 1 - 2 * j
        const scj : number = divideScale(sc1, j, 2)
        context.save()
        context.scale(sf, sf)
        context.translate(-cGap * 4,  cGap)
        for (var k = 0; k < arcs; k++) {
            const sck : number = divideScale(scj, k, arcs)
            const startDeg : number = 225
            const endDeg : number = 225 + 90 * sck
            context.save()
            context.translate(cGap + 2 * cGap * k, 0)
            context.beginPath()
            for (var t = startDeg; t <= endDeg; t++) {
                const x : number = size * Math.cos(t * Math.PI/180)
                const y : number = size * Math.sin(t * Math.PI/180)
                if (t == startDeg) {
                    context.moveTo(x, y)
                } else {
                    context.lineTo(x, y)
                }
            }
            context.stroke()
            context.restore()
        }
        context.restore()
    }
    context.restore()
}
class QuarterArcStepStage {
    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer :  Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w
        this.canvas.height = h
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = '#212121'
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : QuarterArcStepStage = new QuarterArcStepStage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {
    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += updateScale(this.scale, this.dir, arcs * 2, 1)
        console.log(this.scale)
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {
    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, 50)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class QASNode {
    prev : QASNode
    next : QASNode
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new QASNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        drawQASNode(context, this.i, this.state.scale)
        if (this.next) {
            this.next.draw(context)
        }
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : QASNode {
        var curr : QASNode = this.next
        if (dir == -1) {
            curr = this.prev
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class QuarterArcStep {
    root : QASNode = new QASNode(0)
    curr : QASNode = this.root
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.root.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {
    qas : QuarterArcStep = new QuarterArcStep()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.qas.draw(context)
    }

    handleTap(cb : Function) {
        this.qas.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.qas.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
