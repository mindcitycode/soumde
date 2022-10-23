import { SafeOutput } from "./lib/safeOutput.js"
import { PanicButton } from "./lib/panicbutton.js"
import { MonoOsc } from "./synth.js"
import { AdsrNoteOn, AdsrNoteOff } from "./adsr-noteonoff.js"
import { Oscilloscope } from "./lib/graphicAnalyzer.js"
import { SynthPool } from './synthPool.js'

const transposeEvent = t => e => [...e.slice(0, 3), e[3] + t, ...e.slice(4)]
const getExampleParts = () => {
    const transpose60 = transposeEvent(48 + 12)
    const part = [
        [0, 'on', 0, 0, 1],
        [0, 'on', 0, 8, 1],
        [0, 'on', 0, 14, 1],
        [1, 'off', 0, 0, 1],
        [0, 'off', 0, 8, 1],
        [0.5, 'off', 0, 14, 1],

        [1.5, 'on', 0, 2, 1],
        [1, 'off', 0, 2, 1],

        [0, 'on', 0, 3, 1],
        [1, 'off', 0, 3, 1],

        [0, 'on', 0, -1, 1],
        [3, 'off', 0, -1, 1]

    ].map(transpose60)

    const part2 = []
    {
        const dur = 0.125
        const loop = [0, 2, 3, 5, 8, 5, 3, 2]
        const count = 8 / dur
        const v = 0.2
        for (let i = 0; i < count; i++) {
            const key = loop[i % loop.length]
            part2.push(transpose60([0, 'on', 1, key, v]))
            part2.push(transpose60([dur, 'off', 1, key, v]))
        }
    }
    const part3 = []
    {
        const dur = 0.125 * 3
        const loop = [8, 7, 8]
        const count = 8 / dur
        const v = 0.2
        const channel = 2
        for (let i = 0; i < count; i++) {
            const key = loop[i % loop.length]
            part3.push(transpose60([0, 'on', channel, key, v]))
            part3.push(transpose60([dur, 'off', channel, key, v]))
        }
    }

    return [part, part2, part3]
}

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
    const midiPart = await parseMidiFile(path)
    console.log('midiPart',midiPart)
    sequence(midiPart)
    return midiPart

    const ac = new AudioContext()
    PanicButton(ac)

    await ac.resume()

    const safeOutput = SafeOutput(ac)
    safeOutput.output.connect(ac.destination)
    safeOutput.output.gain.value = 0.5

    const destination = safeOutput.input
    const oscilloscope = Oscilloscope(ac)

    //
    const synthPool = SynthPool(ac)
    const noteOnCache = NoteOnCache(ac)

    const multiNoteOn = (createFunction, time, channel, key, velocity) => {
        const { reused, synthInUse } = synthPool.getSynth(createFunction, time)
        const mono = synthInUse.synth
        if (reused === false) {
            mono.output.connect(destination)
            mono.output.connect(oscilloscope.input)
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
    const [part, part2, part3] = getExampleParts()
    const t0 = ac.currentTime + 1
    planPart(t0, part)
    planPart(t0, part2)
    planPart(t0, part3)

    noteOnCache._checkEmpty()
    console.log('pool stats', synthPool._stats())

    setInterval(() => {
        const oneRemoved = synthPool.removeOldAndUseless(ac.currentTime)
        if (oneRemoved)
            console.log('i did remove', oneRemoved)
    }, 1000)
}

main()