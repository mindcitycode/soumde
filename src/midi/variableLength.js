export const parseVariableLengthQuantity = (b, pos) => {
    let result = 0
    for (let i = 0; i < 4; i++) {
        const byte = b[pos + i]
        result |= byte & 0x7f
        if (byte & 0x80) {
            result = result << 7
        } else {
            return [
                result,
                i + 1,
            ]
        }
    }
}

export const parseVariableLenghtBytes = (b, pos) => {

    const vlq = parseVariableLengthQuantity(b, pos)
    const bufferLenght = vlq[0]
    const bufferOffset = pos + vlq[1]
    return [
        b.slice(bufferOffset, bufferOffset + bufferLenght),
        vlq[0] + vlq[1]
    ]

}

import { assert } from '../lib/assert.js'

const test = [
    [0x00000000, [0x00]],
    [0x00000040, [0x40]],
    [0x0000007F, [0x7F]],
    [0x00000080, [0x81, 0x00]],
    [0x00002000, [0xC0, 0x00]],
    [0x00003FFF, [0xFF, 0x7F]],
    [0x00004000, [0x81, 0x80, 0x00]],
    [0x00100000, [0xC0, 0x80, 0x00]],
    [0x001FFFFF, [0xFF, 0xFF, 0x7F]],
    [0x00200000, [0x81, 0x80, 0x80, 0x00]],
    [0x08000000, [0xC0, 0x80, 0x80, 0x00]],
    [0x0FFFFFFF, [0xFF, 0xFF, 0xFF, 0x7F]]
]
test.forEach(([value, array]) => {
    const [parsedValue, parsedLength] = parseVariableLengthQuantity(array, 0)
    assert(
        ((parsedValue === value) && (parsedLength === array.length)),
        'reading of vlq is wrong'
    )
})
