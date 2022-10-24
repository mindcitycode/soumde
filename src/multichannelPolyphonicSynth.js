import { SynthPool } from './synthPool.js'
import { NoteOnCache } from './noteOnCache.js'
import { AdsrNoteOn, AdsrNoteOff } from "./adsr-noteonoff.js"

export const MultiChannelPolyphonicSynth = (ac, destination) => {
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
    return { multiNoteOn, multiNoteOff, synthPool, noteOnCache }
}
