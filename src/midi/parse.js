const getBytesString = (arrayBuffer, start, length) => String.fromCharCode(...new Int8Array(arrayBuffer.slice(start, start + length)))
const littleEndian = false
const getUint32 = (dataView, start) => dataView.getUint32(start, littleEndian)
const getUint16 = (dataView, start) => dataView.getUint16(start, littleEndian)
const assert = (condition, error) => {
    if (!condition) throw new Error(error)
}
const parseVariableLengthQuantity = (b, pos) => {
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

export const parseMidiFile = async path => {
    const b = await fetch(path).then(d => d.arrayBuffer())
    // <Header Chunk> = <chunk type><length><format><ntrks><division> 
    // console.log(b)

    const parseHeader = b => {
        const dv = new DataView(b)
        assert(getBytesString(b, 0, 4) === 'MThd', 'not a midi file')
        assert(getUint32(dv, 4) === 6, 'Wrong MThd length')
        const format = getUint16(dv, 8)
        const ntrks = getUint16(dv, 10)
        const division = getUint16(dv, 12)
        const bit15 = (division >>> 15)
        let ticksPerQuarterNote, timeCodeFormat, ticksPerFrame
        if (bit15) {
            timeCodeFormat = (division >>> 8) & 0x7f
            ticksPerFrame = division & 0x7f
        } else {
            ticksPerQuarterNote = division
        }
        return { format, ntrks, division, bit15, ticksPerQuarterNote, timeCodeFormat, ticksPerFrame }
    }
    const parseTracks = (header, b) => {
        const tracks = []
        let trackOffset = 0
        for (let i = 0; i < header.ntrks; i++) {
            console.log('track ', i, 'start at ', trackOffset)
            const dv = new DataView(b, trackOffset)
            assert(getBytesString(b, trackOffset, 4) === 'MTrk', 'not a midi track')
            const length = getUint32(dv, 4)
            console.log('track length', length)
            const trackEventsStart = trackOffset + 8
            tracks.push(parseTrackEvents(b.slice(trackEventsStart, trackEventsStart + length)))
            trackOffset = trackEventsStart + length
        }
        return tracks
    }

    const pre = document.createElement('pre')
    document.body.append(pre)
    pre.textContent = 'ooo'
    pre.style = `font-size : 10px`
    let content = []
    const log = (...p) => {
        content.push(p.join(' '))
    }


    const parseTrackEvents = (buffer) => {

        log('parse track events', buffer.byteLength)
        //const dv = new DataView(b)
        const b = new Uint8Array(buffer)
        let offset = 0

        let runningStatus = undefined

        while (offset < b.byteLength) {

            log('@offset', offset)
            const vlq = parseVariableLengthQuantity(b, offset)
            const deltaTime = vlq[0]
            offset += vlq[1]

            log(deltaTime)

            let status;
            let byte1 = b[offset]
            log('byte1', byte1)
            if (byte1 & 0x80) {
                status = byte1
                runningStatus = status
                offset += 1
                log('new status', byte1)
            } else {
                status = runningStatus
            }

            const byte1Left = (status >>> 4) & 7
            const byte1Right = status & 0xf

            if (byte1Left === 3) {
                // channel mode message   1011
                log('cc')
                offset += 2
            } else if (byte1Left < 7) {
                // channel voice message  1000 -> 1110
                switch (byte1Left) {
                    case 0: {
                        log('noteOff')
                        offset += 2
                        break;
                    }
                    case 1: {
                        log('noteOn')
                        offset += 2
                        break;
                    }
                    case 2: {
                        log('Polyphonic Key Pressure (Aftertouch)')
                        offset += 2
                        break;
                    }
                    // case 3 : {} // CC
                    case 4: {
                        log('program change')
                        offset += 1
                        break;
                    }
                    case 5: {
                        log('Channel Pressure (After-touch)')
                        offset += 1
                        break;
                    }
                    case 6: {
                        log('Pitch Wheel Change')
                        offset += 2
                        break;
                    }
                }
            } else if (byte1Left === 7) {
                if (byte1Right === 0xf) {
                    // system real-time message, also meta event 0xff
                    log('system realtime message, also meta event')
                    const type = b[offset]
                    offset += 1
                    
                    log('meta event of type', `0x${type.toString(16)}`,':',MetaEventsTypes[type])
                    const vlq = parseVariableLengthQuantity(b, offset)
                    const length = vlq[0]
                    offset += vlq[1]
                    log('...of vlq length', length)
                    const metaEventBytes = b.slice(offset,offset+length)
                    log('maybe text ?',getBytesString(b,offset,length))
                    offset += length
                } else {
                    log('system common message')
                    // system common message
                    if (byte1Right === 0) {
                        log('(system exclusive)')
                        throw new Error('sysex')
                        // sysex
                    } else {
                        // ....
                    }
                }
            } else {
                throw new Error('no  at ' + offset)
            }


        }
        return b
    }
    const header = parseHeader(b.slice(0))
    console.log("header", header)

    const tracksBuffer = b.slice(14)
    const tracks = parseTracks(header, tracksBuffer)
    console.log(tracks)
    pre.textContent = content.join("\n")

}

const MetaEventsTypes = {
    0: 'Sequence Number',
    1: 'Text Event',
    2: 'Copyright Notice',
    3: 'Sequence/Track Name',
    4: 'Instrument Name',
    5: 'Lyric',
    6: 'text Marker',
    7: 'Cue Point',
    0x20: 'MIDI Channel Prefix',
    0x2F: 'End of Track',
    0x51: 'Set Tempo (in microseconds per MIDI quarter-note)',
    0x54: 'SMPTE Offset',
    0x58: 'Time Signature',
    0x59: 'Key Signature',
    0x7F: 'data Sequencer Specific Meta-Event'
}