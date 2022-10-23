const getBytesString = (arrayBuffer, start, length) => String.fromCharCode(...new Int8Array(arrayBuffer.slice(start, start + length)))
const littleEndian = false
const getUint32 = (dataView, start) => dataView.getUint32(start, littleEndian)
const getUint16 = (dataView, start) => dataView.getUint16(start, littleEndian)
const assert = (condition, error) => {
    if (!condition) throw new Error(error)
}
import { parseVariableLengthQuantity, parseVariableLenghtBytes } from './variableLength.js'

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


const pre = document.createElement('pre')
document.body.append(pre)
pre.textContent = 'ooo'
pre.style = `font-size : 10px`
let content = []
const log = (...p) => {
    content.push(p.join(' '))
}

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
    const parseTrackEvents = (buffer) => {

        //log('parse track events', buffer.byteLength)
        //const dv = new DataView(b)
        const b = new Uint8Array(buffer)
        let offset = 0

        let runningStatus = undefined

        const events = []

        while (offset < b.byteLength) {

            const event = {}
            event['@offset'] = offset
            //log('@offset', offset)

            const vlq = parseVariableLengthQuantity(b, offset)
            const deltaTime = vlq[0]
            offset += vlq[1]
            event.deltaTime = deltaTime

            //log(deltaTime)

            let status;
            let byte1 = b[offset]
            //log('byte1', byte1)
            if (byte1 & 0x80) {
                status = byte1
                runningStatus = status
                offset += 1
                //    log('new status', byte1)
                event.runningStatus = false
            } else {
                status = runningStatus
                event.runningStatus = true
            }

            const byte1Left = (status >>> 4) & 7
            const byte1Right = status & 0xf

            if (byte1Left < 7) {
                event.isChannelVoiceMessage = true
                event.channel = byte1Right
                switch (byte1Left) {
                    case 0: {
                        event.messageType = 'noteOff'
                        const data1 = b[offset] & 0x7f
                        const data2 = b[offset + 1] & 0x7f
                        offset += 2
                        event.key = data1
                        event.velocity = data2
                        break;
                    }
                    case 1: {
                        event.messageType = 'noteOn'
                        const data1 = b[offset] & 0x7f
                        const data2 = b[offset + 1] & 0x7f
                        offset += 2
                        event.key = data1
                        event.velocity = data2
                        break;
                    }
                    case 2: {
                        event.messageType = 'Polyphonic Key Pressure (Aftertouch)'
                        const data1 = b[offset] & 0x7f
                        const data2 = b[offset + 1] & 0x7f
                        offset += 2
                        event.key = data1
                        event.pressureValue = data2
                        break;
                    }
                    case 3: {
                        // also channel mode message
                        event.isChannelModeMessage = true
                        event.messageType = 'control change, but also Channel Mode Message'
                        const data1 = b[offset] & 0x7f
                        const data2 = b[offset + 1] & 0x7f
                        event.controllerNumber = data1
                        event.newValue = data2
                        offset += 2
                    }
                    case 4: {
                        event.messageType = 'program change'
                        const data1 = b[offset] & 0x7f
                        offset += 1
                        event.programNumber = data1
                        break;
                    }
                    case 5: {
                        event.messageType = 'Channel Pressure (After-touch)'
                        const data1 = b[offset] & 0x7f
                        offset += 1
                        event.pressureValue = data1
                        break;
                    }
                    case 6: {
                        event.messageType = 'Pitch Wheel Change'
                        const data1 = b[offset] & 0x7f
                        const data2 = b[offset + 1] & 0x7f
                        offset += 2
                        event.lsb = data1
                        event.msb = data2
                        break;
                    }
                }
            } else if (byte1Left === 7) {
                if (byte1Right === 0xf) {
                    event.isMetaEvent = true
                    // also reatime message
                    event.isSystemRealtimeMessage = true

                    const metaEvent = {}

                    const type = b[offset]
                    offset += 1
                    metaEvent.type = type
                    metaEvent.typeString = MetaEventsTypes[type]

                    const vlb = parseVariableLenghtBytes(b,offset)
                    metaEvent.maybeText = String.fromCharCode(...vlb[0]) 
                    metaEvent.bytes = vlb[0]

                    offset += vlb[1]

                    event.metaEvent = metaEvent

                } else if (byte1Right < 8) {
                    event.isSystemCommonMessage = true
                    switch (byte1Right) {
                        case 0: {
                            event.systemCommonMessage = 'System Exclusive'
                            const vlb = parseVariableLenghtBytes(b,offset)
                            offset += vlb[1]
                            event.sysexBytes = vlb[0]
                            break
                        }
                        case 1: {
                            event.systemCommonMessage = 'Undefined'
                            break
                        }
                        case 2: {
                            event.systemCommonMessage = 'Song Position Pointer'
                            const lsb = b[offset] & 0x7f
                            const msb = b[offset + 1] & 0x7f
                            offset += 2
                            break
                        }
                        case 3: {
                            event.systemCommonMessage = 'Song Select'
                            const song = b[offset] & 0x7f
                            offset += 2
                            break
                        }
                        case 4: {
                            event.systemCommonMessage = 'System Exclusive'
                            break
                        }
                        case 5: {
                            event.systemCommonMessage = 'System Exclusive'
                            break
                        }
                        case 6: {
                            event.systemCommonMessage = 'Tune Request'
                            break
                        }
                        case 7: {
                            event.systemCommonMessage = 'End Of Exclusive'
                            const vlb = parseVariableLenghtBytes(b,offset)
                            offset += vlb[1]
                            event.sysexBytes = vlb[0]
                            break
                        }
                    }
                } else {
                    event.isSystemRealtimeMessage = true
                    switch (byte1Right) {
                        case 8: {
                            event.realtimeMessage = 'Timing Clock'
                            break;
                        }
                        case 9: {
                            event.realtimeMessage = 'Undefined'
                            break;
                        }
                        case 10: {
                            event.realtimeMessage = 'Start'
                            break;
                        }
                        case 11: {
                            event.realtimeMessage = 'Continue'
                            break;
                        }
                        case 12: {
                            event.realtimeMessage = 'Stop'
                            break;
                        }
                        case 13: {
                            event.realtimeMessage = 'Undefined'
                            break;
                        }
                        case 14: {
                            event.realtimeMessage = 'Active Sensing'
                            break;
                        }
                        // 15 is used for meta event
                        default: {
                            throw new Error('wrong system realtime message' + JSON.stringify({ byte1Right, byte1Left }))
                        }

                    }
                }
            }
            content.push(JSON.stringify(event))
            events.push(event)
        }
        content.push('----------------')
        return events
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