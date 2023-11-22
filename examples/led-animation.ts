import { ChessnutAir } from '../src/main'

// Rings going in
// prettier-ignore
const Animation = [
    ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'h7', 'h6', 'h5', 'h4', 'h3', 'h2'],
    ['b2','c2','d2','e2','f2','g2','b3','b4','b5','b6','b7','c7','d7','e7','f7','g7','g6','g5','g4','g3'],
    ['c3', 'd3', 'e3', 'f3', 'c4', 'c5', 'c6', 'd6', 'e6', 'f6', 'f5', 'f4'],
    ['d4', 'e4', 'd5', 'e5'],
]

export async function main() {
    const chessnutAir = new ChessnutAir()
    await chessnutAir.connectWithBluetooth()

    let frame = 0
    setInterval(() => {
        const leds = Animation[frame]
        chessnutAir.setLeds(leds)

        frame = (frame + 1) % Animation.length
    }, 200)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
