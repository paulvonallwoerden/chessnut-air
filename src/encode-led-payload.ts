import assert from 'assert'

const LetterLut: Record<string, number | undefined> = {
    a: 128,
    b: 64,
    c: 32,
    d: 16,
    e: 8,
    f: 4,
    g: 2,
    h: 1,
}

const NumberLut: Record<string, number | undefined> = {
    '1': 7,
    '2': 6,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
    '8': 0,
}

/**
 * Encodes an array of chess squares ['e2', 'e4', ...] into a buffer that can be sent to the Chessnut Air. It
 * is used to enable the LEDs on the board.
 */
export function encodeLedPayload(squares: string[]): Buffer {
    const payload: number[] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    for (const pos of squares) {
        assert(pos.length === 2, `Invalid square "${pos}"!`)

        const number = NumberLut[pos[1]]
        const letter = LetterLut[pos[0]]
        assert(number !== undefined, `Invalid square "${pos}"!`)
        assert(letter !== undefined, `Invalid square "${pos}"!`)

        payload[number] |= letter
    }

    return Buffer.from(payload)
}
