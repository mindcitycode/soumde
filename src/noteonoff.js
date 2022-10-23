import { ktof } from './lib/frequencies.js'

const adsrEnveloppe = {
    // https://fr.wikipedia.org/wiki/Enveloppe_sonore#/media/Fichier:ADSR_envelope.png
    attack: 20 / 1000, // duration
    decay: 1 / 1000,  // duration
    sustain: 0.15,      // volume
    release: 0.2     // duration
}

export const noteOn = (freqAp, gainAp) => (time, key, velocity) => {

    freqAp.cancelScheduledValues(time)
    gainAp.cancelScheduledValues(time)

    const frequency = ktof(key)

    // start
    freqAp.setValueAtTime(frequency, time)
    gainAp.setValueAtTime(0, time)

    // attack peak
    const attackEndTime = time + adsrEnveloppe.attack
    gainAp.linearRampToValueAtTime(velocity, attackEndTime)

    // attack decay
    const decayEndTime = attackEndTime + adsrEnveloppe.decay
    const sustainGain = velocity * adsrEnveloppe.sustain
    gainAp.linearRampToValueAtTime(sustainGain, decayEndTime)

    return {
        hold: {
            time: decayEndTime,
            gain: sustainGain,
            frequency: frequency
        }
    }
}

export const noteOff = (freqAp, gainAp) => (matchingNoteOnValue, time, key, velocity) => {

    freqAp.cancelScheduledValues(time)
    gainAp.cancelScheduledValues(time)

    // linear ramp to same values (sustain volume * noteon velocity)
    freqAp.setValueAtTime(matchingNoteOnValue.hold.frequency, time)
    gainAp.linearRampToValueAtTime(matchingNoteOnValue.hold.gain, time)

    // release
    const releaseEndTime = time + adsrEnveloppe.release
    gainAp.linearRampToValueAtTime(0, releaseEndTime)
 
    return {
        end: releaseEndTime
    }
}