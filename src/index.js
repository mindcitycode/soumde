import { SafeOutput } from "./lib/safeOutput.js"
import { PanicButton } from "./lib/panicbutton.js"
import { MonoOsc } from "./synth.js"
import { Oscilloscope } from "./lib/graphicAnalyzer.js"


import { parseMidiFile } from './midi/parse.js'
import { sequence } from './midi/sequence.js'

import { MultiChannelPolyphonicSynth } from "./multichannelPolyphonicSynth.js"

const main = async () => {

    //const path = "assets/midi_test-smpte-offset.mid"
    const path = "assets/bwv812.mid"
    const parsedMidiFile = await parseMidiFile(path)
    console.log('midiPart', parsedMidiFile)
    const parts = sequence(parsedMidiFile)
    //  parts[1].length = 500
    console.log('parts', parts)
    //   return midiPart


    const ac = new AudioContext()
    PanicButton(ac)

    await ac.resume()

    // safe output
    const safeOutput = SafeOutput(ac)
    safeOutput.output.connect(ac.destination)
    safeOutput.output.gain.value = 0.5

    const destination = safeOutput.input

    // oscillo
    const oscilloscope = Oscilloscope(ac)
    safeOutput.output.connect(oscilloscope.input)

    // fullsreen + background
    const oscilloscopeCanvas = oscilloscope.canvas
    document.body.append(oscilloscopeCanvas)
    oscilloscopeCanvas.style = `position:fixed;top:0;left:0;z-index:-5`
    onresize = () => oscilloscope.setSize(window.innerWidth, window.innerHeight)
    onresize()

    const { multiNoteOn, multiNoteOff, synthPool, noteOnCache } = MultiChannelPolyphonicSynth(ac, destination)


    function planPart(t0, part) {
        let t = t0
        part.forEach(event => {
            const [delta, type, channel, key, velocity] = event
            t += delta
            if (type === 'on') {
                multiNoteOn(MonoOsc, t, channel, key, velocity)
            } else if (type === 'off') {
                multiNoteOff(MonoOsc, t, channel, key, velocity)
            }
        })
    }
    const t0 = ac.currentTime + 1
    /*
    const [part, part2, part3] = getExampleParts()
    planPart(t0, part)
    planPart(t0, part2)
    planPart(t0, part3)
*/
    parts.forEach(part => planPart(t0, part))

    noteOnCache._checkEmpty()
    console.log('pool stats', synthPool._stats())

    setInterval(() => {
        const oneRemoved = synthPool.removeOldAndUseless(ac.currentTime)
        if (oneRemoved)
            console.log('i did remove', oneRemoved)
    }, 1000)
}

main()