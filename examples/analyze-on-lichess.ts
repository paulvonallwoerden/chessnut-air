import { ChessnutAir } from '../src/main'

export async function main() {
    const chessnutAir = new ChessnutAir()
    await chessnutAir.connectWithBluetooth()

    chessnutAir.on('change', (fen) => {
        const lichessUrl = new URL(fen, 'https://lichess.org/analysis/fromPosition/')
        console.log(new Date().toLocaleTimeString(), lichessUrl.toString())
    })
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
