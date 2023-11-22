# ChessnutAir

An unofficial library for the [Chessnut Air](https://www.chessnutech.com/products/chessnut-air) chess board. It allows
to communicate with the board over Bluetooth.

## Getting Started

```ts
const chessnutAir = new ChessnutAir();

chessnutAir.addEventListener('change', (fen) => {
    // Log the FEN string whenever a piece is moved on the board.
    console.log('FEN:', fen);
})

await chessnutAir.connectWithBluetooth();
```

## Examples

Use these examples to get started with this library.

```sh
# Install required dependencies
yarn

# Play a little animation with the LEDs.
yarn ts-node examples/led-animation.ts

# Get the name & battery status of your board.
yarn ts-node examples/print-info.ts

# React to button presses.
yarn ts-node examples/buttons.ts

# View the position on the board on Lichess
yarn ts-node examples/analyze-on-lichess.ts
```

## API

### `connectWithBluetooth()`

Scans for nearby Bluetooth devices and connects to the first Chessnut Air board it finds.

### `disconnectFromBluetooth()`

Stops scanning for Bluetooth devices and disconnects from the board.

### `addEventListener(event, callback)`

Adds an event listener to the board. Possible events are:

- `change`: Fires whenever a piece is moved on the board. The callback receives the new FEN string as an argument.
Note that only the piece placement data is relevant as the other parts are static. They can't be determined from
the board itself. You must keep track of the game state yourself.
- `button`: Fires whenever a button is pressed on the board. The callback receives the button ID as an argument.
- `error`: Fires whenever an error occurs. The callback receives the error as an argument.

### `setLeds(leds: string[])`

Sets the LEDs on the board. The argument is an array of square IDs. All other LEDs will be turned off.

#### Example:

```ts
await chessnutAir.setLeds(['e2', 'e4'])
```

### `getDeviceName()`

Returns the name of the board.

### `getBatteryStatus()`

Returns the battery charge level of the board and whether it's charging.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

### Scripts for development

```sh
# Build the library
yarn build

# Lint
yarn lint

# Fix linting
yarn lint:fix
```

## License

MIT - Do whatever you want with this code.
