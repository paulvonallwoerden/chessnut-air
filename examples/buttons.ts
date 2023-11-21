import { ChessnutAir } from '../src/main'

export async function main() {
    const chessnutAir = new ChessnutAir()
    await chessnutAir.connectWithBluetooth()

    chessnutAir.on('button', (button) => {
        switch (button) {
            case 1:
                console.log('Power button pressed!')
                break
            case 2:
                console.log('+ button pressed!')
                break
        }
    })
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
