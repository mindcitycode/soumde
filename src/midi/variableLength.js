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