import { SafeOutput } from "./lib/safeOutput.js"
import { PanicButton } from "./lib/panicbutton.js"
import { MonoOsc } from "./synth.js"
import { AdsrNoteOn, AdsrNoteOff } from "./adsr-noteonoff.js"
import { Oscilloscope } from "./lib/graphicAnalyzer.js"
import { SynthPool } from './synthPool.js'

const NoteOnCache = (ac) => {
    const cache = []

    const findAndRemove = (createorFunction, channel, key) => {
        const index = cache.findIndex(cached => {
            return ((cached.createFunction === createorFunction)
                && (cached.key === key)
                && (cached.channel === channel))
        })
        if (index === -1) {
            console.error('no matching noteOn for', createorFunction, key)
        } else {
            const match = cache[index]
            cache.splice(index, 1)
            return match
        }
    }
    const set = (createFunction, channel, key, playedNoteOn, synthInUse) => {
        cache.push(({ createFunction, channel, key, playedNoteOn, synthInUse }))
    }
    const _checkEmpty = () => {
        if (cache.length) throw new Error('the cache should be empty')
    }
    return {
        findAndRemove,
        set,
        _checkEmpty
    }
}

import { parseMidiFile } from './midi/parse.js'
import { sequence } from './midi/sequence.js'

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

    const safeOutput = SafeOutput(ac)
    safeOutput.output.connect(ac.destination)
    safeOutput.output.gain.value = 0.5

    const destination = safeOutput.input
    
    const oscilloscope = Oscilloscope(ac)
    safeOutput.output.connect(oscilloscope.input)
    const oscilloscopeCanvas = oscilloscope.canvas
    
    document.body.append(oscilloscopeCanvas)
    oscilloscopeCanvas.style = `position:fixed;top:0;left:0;z-index:-5`
    onresize = () => {
        oscilloscope.setSize(window.innerWidth, window.innerHeight)
        console.log('resize')
    }
    onresize()
    //
    const synthPool = SynthPool(ac)
    const noteOnCache = NoteOnCache(ac)

    const multiNoteOn = (createFunction, time, channel, key, velocity) => {
        const { reused, synthInUse } = synthPool.getSynth(createFunction, time)
        const mono = synthInUse.synth
        if (reused === false) {
            mono.output.connect(destination)
            //mono.output.connect(oscilloscope.input)
        }
        const monoNoteOn = AdsrNoteOn(mono.nodes.osc.frequency, mono.nodes.gain.gain)
        const playedNoteOn = monoNoteOn(time, key, velocity)
        synthInUse.notifyTimeOfUse(undefined)
        noteOnCache.set(createFunction, channel, key, playedNoteOn, synthInUse)

    }
    const multiNoteOff = (createFunction, time, channel, key, velocity) => {
        const cachedNoteOn = noteOnCache.findAndRemove(createFunction, channel, key)
        const synthInUse = cachedNoteOn.synthInUse
        const mono = cachedNoteOn.synthInUse.synth
        const monoNoteOff = AdsrNoteOff(mono.nodes.osc.frequency, mono.nodes.gain.gain)
        const playedNoteOn = cachedNoteOn.playedNoteOn
        const playedNoteOff = monoNoteOff(playedNoteOn, time, key, velocity)
        synthInUse.notifyTimeOfUse(playedNoteOff.end)
    }



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