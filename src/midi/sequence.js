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

    tempoMap.sort((a, b) => [a[0] - b[0]])



    tempoMap.forEach(el => {
        const [totalTick, uSecondPerQuarterNote] = el
    })
    console.log('tempoMap', tempoMap)


    const tickDuration = secondPerTick(tempoMap[0][1], tpqn)

    /*   tracks.forEach(track => {
           let totalTicks = 0
           track.forEach(event => {
               totalTicks += event.deltaTime
               if (eventIsNoteOn(event) || (eventIsNoteOff(event))) {
                   const absoluteTime = totalTicks * tickDuration
                   console.log(totalTicks,absoluteTime/60 , event.messageType,'c:', event.channel, 'k:', event.key, 'v:', event.velocity)
               }
           })
       })
   */

    const sequences = []
    tracks.forEach(track => {
        const sequence = []
        let lastAbsoluteTime = 0
        let totalTicks = 0
        track.forEach(event => {
            totalTicks += event.deltaTime
            const absoluteTime = totalTicks * tickDuration
            if (eventIsNoteOn(event) || (eventIsNoteOff(event))) {
                const absoluteTime = totalTicks * tickDuration
                // console.log(totalTicks, absoluteTime / 60, event.messageType, 'c:', event.channel, 'k:', event.key, 'v:', event.velocity)
                const deltaTime = absoluteTime - lastAbsoluteTime
                sequence.push([deltaTime, eventIsNoteOn(event) ? 'on' : 'off', event.channel, event.key, event.velocity/127])
                lastAbsoluteTime = absoluteTime
            } else {

            }
        })
        sequences.push(sequence)
    })
 

    return sequences


}