import { SafeOutput } from "./lib/safeOutput.js"
import { PanicButton } from "./lib/panicbutton.js"
import { MonoOsc } from "./synth.js"
import { noteOn, noteOff } from "./noteonoff.js"
import { Oscilloscope } from "./lib/graphicAnalyzer.js"

const part = [
    [0, 'note_on', 60, 0.5],
    [1, 'note_off', 60, 0],
    [0, 'note_on', 62, 0.5],
    [1, 'note_off', 62, 0],
    [0, 'note_on', 64, 0.5],
    [1, 'note_off', 64, 0]
]
class SynthInUse {
    createFunction = undefined
    synth = undefined
    availableAfter = undefined // undefined means never
    r = undefined
    constructor(createFunction, synth, availableAfter) {
        this.createFunction = createFunction
        this.synth = synth
        this.availableAfter = availableAfter
        this.r = Math.random()
    }
    isAvailable(createFunction, time) {
        return (this.createFunction === createFunction) && (this.availableAfter !== undefined) && (time > this.availableAfter)
    }
    notifyTimeOfUse(time) {
        if (time === undefined) {
            this.availableAfter = undefined
        } else if (this.availableAfter === undefined) {
            this.availableAfter = time
        } else if (time > this.availableAfter) {
            this.availableAfter = time
        }
    }
}

const MonoSynthCache = (ac) => {
    const oneSampleDuration = 1 / ac.sampleRate
    const synthsInUse = []
    const getSynth = (createFunction, time) => {
        const available = synthsInUse.find(synthInUse => synthInUse.isAvailable(createFunction, time))
        if (available) {
            return { reused: true, synthInUse: available }
        } else {
            console.log('create synth !')
            const synth = createFunction(ac)
            const synthInUse = new SynthInUse(createFunction, synth, time - oneSampleDuration)
            synthsInUse.push(synthInUse)
            return { reused: false, synthInUse }
        }
    }
    return { getSynth }
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
    return {
        findAndRemove,
        set
    }
}


const main = async () => {

    const ac = new AudioContext()
    PanicButton(ac)

    await ac.resume()

    const safeOutput = SafeOutput(ac)
    safeOutput.output.connect(ac.destination)
    safeOutput.output.gain.value = 0.5


    const destination = safeOutput.input
    const oscilloscope = Oscilloscope(ac)

    const monoSynthCache = MonoSynthCache(ac)
    const noteOnCache = NoteOnCache(ac)
    const multiNoteOn = (createFunction, time, channel, key, velocity) => {
        console.log('multiNoteOn', createFunction, time, key, velocity)
        const { reused, synthInUse } = monoSynthCache.getSynth(createFunction, time)
        const mono = synthInUse.synth
        if (reused === false) {
            mono.output.connect(destination)
            mono.output.connect(oscilloscope.input)
        }
        const monoNoteOn = noteOn(mono.nodes.osc.frequency, mono.nodes.gain.gain)
        const playedNoteOn = monoNoteOn(time, key, velocity)
        synthInUse.notifyTimeOfUse(undefined)
        noteOnCache.set(createFunction, channel, key, playedNoteOn, synthInUse)

    }
    const multiNoteOff = (createFunction, time, channel, key, velocity) => {
        console.log('multiNoteOff', createFunction, time, key, velocity)
        const cachedNoteOn = noteOnCache.findAndRemove(createFunction, channel, key)
        const synthInUse = cachedNoteOn.synthInUse
        const mono = cachedNoteOn.synthInUse.synth
        const monoNoteOff = noteOff(mono.nodes.osc.frequency, mono.nodes.gain.gain)
        const playedNoteOn = cachedNoteOn.playedNoteOn
        const playedNoteOff = monoNoteOff(playedNoteOn, time, key, velocity)
        synthInUse.notifyTimeOfUse(playedNoteOff.end)
    }
    const transposeEvent = t => e => [...e.slice(0, 3), e[3] + t, ...e.slice(4)]

    const part = [
        [0, 'on', 0, 0, 1],
        [0, 'on', 0, 8, 1],
        [0, 'on', 0, 14, 1],
        [1, 'off', 0, 0, 1],
        [0, 'off', 0, 8, 1],
        [0, 'off', 0, 14, 1],
       
        [2, 'on', 0, 2, 1],
        [1, 'off', 0, 2, 1],

        [0, 'on', 0, 3, 1],
        [1, 'off', 0, 3, 1],

        [0, 'on', 0, -1, 1],
        [3, 'off', 0, -1, 1]

    ].map(transposeEvent(48 + 12))



    console.log('part', part)
    const t0 = ac.currentTime + 1
    let t = t0
    part.forEach(event => {
        const [delta, type, channel, key, velocity] = event
        t += delta
        console.log('@t', t - t0)
        if (type === 'on') {
            multiNoteOn(MonoOsc, t, channel, key, velocity)
        } else if (type === 'off') {
            multiNoteOff(MonoOsc, t, channel, key, velocity)
        }
    })

    /*
        console.log(part)
        multiNoteOn(MonoOsc, ac.currentTime + 1, 48 + 12, 1)
        multiNoteOff(MonoOsc, ac.currentTime + 1.3, 48 + 12, 1)
    */
    function playIt() {

        const mono = MonoOsc(ac)
        mono.output.connect(destination)
        mono.output.connect(oscilloscope.input)

        const monoNoteOn = noteOn(mono.nodes.osc.frequency, mono.nodes.gain.gain)
        const monoNoteOff = noteOff(mono.nodes.osc.frequency, mono.nodes.gain.gain)
        console.log({ monoNoteOn, monoNoteOff })
        const playedNoteOn = monoNoteOn(ac.currentTime + 1, 48 + 12, 1)
        const playedNoteOff = monoNoteOff(playedNoteOn, ac.currentTime + 2, 48, 1)
    }
    //playIt()
    /*mono.nodes.osc.frequency.value = 440
    mono.nodes.gain.gain.value = 0.5
    */
    console.log(ac.state)

}

main()