import EventEmitter from 'events'
import type TypedEventEmitter from 'typed-emitter'
import { BluetoothCommand, BluetoothController } from './bluetooth-controller'
import { encodeLedPayload } from './encode-led-payload'

export type ChessnutAirEvents = {
    change: (fen: string) => void
    button: (button: number) => void
}

export class ChessnutAir extends (EventEmitter as new () => TypedEventEmitter<ChessnutAirEvents>) {
    private readonly bluetooth = new BluetoothController()

    public async connectWithBluetooth() {
        await this.bluetooth.start()

        this.bluetooth.on('data:misc', this.onMiscData.bind(this))
        this.bluetooth.on('data:board', this.onBoardData.bind(this))
    }

    public async disconnectFromBluetooth() {
        await this.bluetooth.stop()
    }

    /**
     * Turns on the specified LEDs and turns off all others.
     *
     * @param leds An array of strings representing the LEDs to turn on. For example: ['e2', 'e4']
     */
    public async setLeds(leds: string[]): Promise<void> {
        const cmd = Buffer.concat([BluetoothCommand.SetLed, encodeLedPayload(leds)])
        await this.bluetooth.sendCommand(cmd)
    }

    /**
     * Returns the name of the device. The name may be set by the user in the app.
     */
    public async getDeviceName(): Promise<string> {
        const deviceName = this.bluetooth.waitForResponse('\x2c\x0d')
        await this.bluetooth.sendCommand(BluetoothCommand.GetDeviceName)

        return (await deviceName).toString('ascii').trim()
    }

    public getDeviceTime(): Promise<Date> {
        throw new Error('Not implemented')
    }

    /**
     * Returns the current battery status. The returned object contains the battery percentage (0-100)
     * and whether the board is currently being charged.
     */
    public async getBatteryStatus(): Promise<{ percent: number; charging: boolean }> {
        const batteryStatus = this.bluetooth.waitForResponse('\x2a\x02')
        await this.bluetooth.sendCommand(BluetoothCommand.GetBatteryStatus)

        const percent = (await batteryStatus).readUint8(0)
        const charging = (await batteryStatus).readUint8(1) === 1

        return {
            percent,
            charging,
        }
    }

    private onBoardData(pieces: (string | null)[]) {
        let fen = ''
        for (let row = 0; row < 8; row += 1) {
            let emptyCount = 0
            for (let col = 7; col >= 0; col -= 1) {
                const index = row * 8 + col
                const piece = pieces[index]
                if (piece === null) {
                    emptyCount += 1

                    continue
                }

                if (emptyCount > 0) {
                    fen += emptyCount
                    emptyCount = 0
                }

                fen += piece
            }

            if (emptyCount > 0) {
                fen += emptyCount
            }

            if (row < 7) {
                fen += '/'
            }
        }

        fen += ' w - - 0 1'

        this.emit('change', fen)
    }

    private onMiscData(header: string, payload: Buffer) {
        switch (header) {
            case '\x0f\x01': {
                const button = payload.readUInt8(0)
                this.emit('button', button)
                break
            }
        }
    }
}
