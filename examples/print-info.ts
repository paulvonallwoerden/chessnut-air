import { ChessnutAir } from '../src/main'

export async function main() {
    const chessnutAir = new ChessnutAir()
    await chessnutAir.connectWithBluetooth()

    const name = await chessnutAir.getDeviceName()
    const battery = await chessnutAir.getBatteryStatus()

    await chessnutAir.disconnectFromBluetooth()

    console.log(`My ChessnutAir is called '${name}'!`)
    console.log(`It has ${battery.percent}% battery left.`)
    console.log(`It is ${battery.charging ? 'charging' : 'not charging'}.`)

    // Seems like some handles are still open, so I will just exit the process. This is not
    // the nice way to do it, but it works for now.
    process.exit(0)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
