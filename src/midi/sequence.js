export const sequence = ({ header, tracks }) => {
    if (header.ticksPerQuarterNote === undefined) {
        throw new Error('cannot sequence timecode midi')
    }
    const tpqn = header.ticksPerQuarterNote

    const eventIsTempoChange = event => (event.metaEvent?.typeString?.startsWith('Set Tempo'))
    const eventIsNoteOn = event => event.messageType === 'noteOn'
    const eventIsNoteOff = event => event.messageType === 'noteOff'
    const secondPerTick = (uSecondPerQuarterNote, ticksPerQuarterNote) => uSecondPerQuarterNote / ticksPerQuarterNote / 1000000


    const tempoMap = []
    tracks.forEach(track => {
        let totalTicks = 0
        track.forEach(event => {
            totalTicks += event.deltaTime
            if (eventIsTempoChange(event)) {
                const [byte0, byte1, byte2] = event.metaEvent.bytes
                // "microseconds per quarter-note"
                const value = (byte0 << 16) | (byte1 << 8) | byte2
                tempoMap.push([totalTicks, value])

                console.log(secondPerTick(value, tpqn))
            }
        })
    })

    const tickDuration = secondPerTick(tempoMap[0][1], tpqn)

    tracks.forEach(track => {
        let totalTicks = 0
        track.forEach(event => {
            totalTicks += event.deltaTime
            if (eventIsNoteOn(event) || (eventIsNoteOff(event))) {
                const absoluteTime = totalTicks * tickDuration
                console.log(totalTicks,absoluteTime/60 , event.messageType,'c:', event.channel, 'k:', event.key, 'v:', event.velocity)
            }
        })
    })


    console.log('tempoMap', tempoMap)





}