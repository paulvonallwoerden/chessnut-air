import noble, { Characteristic, Peripheral } from '@abandonware/noble'
import assert from 'assert'
import EventEmitter from 'events'
import type TypedEventEmitter from 'typed-emitter'

enum BluetoothCharacteristic {
    Write = '1b7e8272287741c3b46ecf057c562023',
    ReadMiscData = '1b7e8273287741c3b46ecf057c562023',
    ReadBoardData = '1b7e8262287741c3b46ecf057c562023',
    ReadOtbData = '1b7e8283287741c3b46ecf057c562023',
}

export const BluetoothCommand = {
    ActionDataTransfer: Buffer.from('\x34\x01\x00', 'ascii'),
    ActionNewestDataTransfer: Buffer.from('\x34\x01\x01', 'ascii'),
    GetBatteryStatus: Buffer.from('\x29\x01\x00', 'ascii'),
    GetDeviceName: Buffer.from('\x2b\x01\x00', 'ascii'),
    GetDeviceTime: Buffer.from('\x26\x01\x00', 'ascii'),
    InitCode: Buffer.from('\x21\x01\x00', 'ascii'),
    IsAppReady: Buffer.from('\x33\x01\x00', 'ascii'),
    MaybeWipeOtb: Buffer.from('\x39\x01\x00', 'ascii'),
    QueryOtb: Buffer.from('\x31\x01\x00', 'ascii'),
    SetLed: Buffer.from('\x0a\x08', 'ascii'),
    SetOtbUploadMode: Buffer.from('\x21\x01\x01', 'ascii'),
}

// Empty square = 0, White is upper case, Black is lower case
const PieceLut: Record<number, string | null> = {
    0: null,
    1: 'q',
    2: 'k',
    3: 'b',
    4: 'p',
    5: 'n',
    6: 'R',
    7: 'P',
    8: 'r',
    9: 'B',
    10: 'N',
    11: 'Q',
    12: 'K',
}

type BluetoothControllerEvents = {
    disconnect: () => void
    'data:otb': (data: Buffer) => void
    'data:misc': (header: string, data: Buffer) => void
    'data:board': (pieces: (string | null)[]) => void
}

export class BluetoothError extends Error {
    public constructor(
        public readonly state: string,
        message: string,
    ) {
        super(message)
    }

    public static fromNobleState(state: string): BluetoothError {
        switch (state) {
            case 'poweredOff': {
                return new BluetoothError(state, 'Bluetooth is powered off')
            }
            case 'unauthorized': {
                return new BluetoothError(state, 'Bluetooth is unauthorized')
            }
            case 'unknown': {
                return new BluetoothError(state, 'Bluetooth is in an unknown state')
            }
            case 'unsupported': {
                return new BluetoothError(state, 'Bluetooth is unsupported')
            }
            case 'resetting': {
                return new BluetoothError(state, 'Bluetooth is resetting')
            }
            default: {
                return new BluetoothError(state, `Unknown bluetooth state`)
            }
        }
    }
}

export class BluetoothController extends (EventEmitter as new () => TypedEventEmitter<BluetoothControllerEvents>) {
    private lastSeenBoardData: Buffer | null = null

    private peripheral: Peripheral | null = null
    private characteristics: {
        write: Characteristic
        readOtbData: Characteristic
        readMiscData: Characteristic
        readBoardData: Characteristic
    } | null = null

    public async start(): Promise<void> {
        this.lastSeenBoardData = null
        this.characteristics = null
        this.peripheral = null

        await new Promise<void>((resolve, reject) =>
            noble.once('stateChange', async (state) => {
                if (state !== 'poweredOn') {
                    reject(BluetoothError.fromNobleState(state))

                    return
                }

                // Bluetooth is powered on, start scanning
                await noble.startScanningAsync()
                resolve()
            }),
        )

        await new Promise<void>((resolve) =>
            noble.on('discover', async (peripheral) => {
                const success = await this.onPeripheralDiscovered(peripheral)
                if (success) {
                    resolve()
                }
            }),
        )
    }

    public async stop(): Promise<void> {
        this.peripheral?.removeAllListeners()
        noble.removeAllListeners()

        await this.peripheral?.disconnectAsync()
        await noble.stopScanningAsync()
    }

    public async sendCommand(command: Buffer): Promise<void> {
        assert(this.characteristics, 'Cannot send command before board is connected')

        const { write } = this.characteristics
        await write.writeAsync(command, false)
    }

    public async waitForResponse(header: string, timeoutMs = 500): Promise<Buffer> {
        const promise = new Promise<Buffer>((resolve, reject) => {
            const listener = (dataHeader: string, data: Buffer) => {
                if (dataHeader === header) {
                    this.off('data:misc', listener)
                    resolve(data)
                }
            }

            this.on('data:misc', listener)

            setTimeout(() => {
                this.off('data:misc', listener)
                reject(new Error(`Timeout while waiting for response with header ${header}`))
            }, timeoutMs)
        })

        return promise
    }

    private async onPeripheralDiscovered(peripheral: Peripheral) {
        const trimmedName = peripheral.advertisement?.localName?.trim()
        if (trimmedName !== 'Chessnut Air') {
            // I think you can change the name of your board, so we should probably
            // check the UUID instead. However, I am new to BLE and don't know how
            // to do that yet.
            // TODO: Check UUID instead of name
            return false
        }

        // As we only want to connect to one device at a time, we stop scanning
        await noble.stopScanningAsync()
        await peripheral.connectAsync()

        await this.setupBoard(peripheral)

        return true
    }

    private async setupBoard(peripheral: Peripheral) {
        this.peripheral = peripheral
        const { characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync()

        // Create read characteristics
        const readOtbData = characteristics.find(({ uuid }) => uuid === BluetoothCharacteristic.ReadOtbData)
        const readMiscData = characteristics.find(({ uuid }) => uuid === BluetoothCharacteristic.ReadMiscData)
        const readBoardData = characteristics.find(({ uuid }) => uuid === BluetoothCharacteristic.ReadBoardData)

        assert(readOtbData, 'ReadOtbData characteristic not found')
        assert(readMiscData, 'ReadMiscData characteristic not found')
        assert(readBoardData, 'ReadBoardData characteristic not found')

        readOtbData.on('data', this.onOtbData.bind(this))
        readMiscData.on('data', this.onMiscData.bind(this))
        readBoardData.on('data', this.onBoardData.bind(this))

        await readOtbData.notifyAsync(true)
        await readMiscData.notifyAsync(true)
        await readBoardData.notifyAsync(true)

        // Create write characteristic
        const write = characteristics.find(({ uuid }) => uuid === BluetoothCharacteristic.Write)
        assert(write, 'Write characteristic not found')

        this.characteristics = {
            write,
            readOtbData,
            readMiscData,
            readBoardData,
        }

        // Finalize initialization
        await this.sendCommand(BluetoothCommand.InitCode)
    }

    private onBoardData(data: Buffer) {
        const { header, payload } = this.parseResponse(data)
        if (header !== '\x01\x24') {
            return
        }

        const boardData = data.slice(2, 34)
        // If the received board data is equal to the last received board data, we ignore it
        if (this.lastSeenBoardData?.equals(boardData)) {
            return
        }
        this.lastSeenBoardData = boardData

        // const timestamp = data.readUInt32LE(34)
        this.emitBoardData(boardData)
    }

    private emitBoardData(data: Buffer): void {
        const pieces = []
        for (let i = 0; i < 32; i += 1) {
            const byte = data[i]
            const upperBits = byte >> 4
            const lowerBits = byte & 0x0f
            const piece1 = PieceLut[lowerBits]
            const piece2 = PieceLut[upperBits]
            assert(piece1 !== undefined, `Unknown piece ${upperBits}`)
            assert(piece2 !== undefined, `Unknown piece ${lowerBits}`)
            pieces.push(piece1, piece2)
        }

        this.emit('data:board', pieces)
    }

    private onMiscData(data: Buffer) {
        const { header, payload } = this.parseResponse(data)
        const handled = this.emit('data:misc', header, payload)
        if (handled) {
            return
        }

        // Maybe log that we received an unhandled misc data packet?
    }

    private onOtbData(data: Buffer) {
        const handled = this.emit('data:otb', data)
        if (handled) {
            return
        }

        // Maybe log that we received an unhandled otb data packet?
    }

    public parseResponse(data: Buffer) {
        return {
            header: data.slice(0, 2).toString('ascii'),
            payload: data.slice(2),
        }
    }
}
