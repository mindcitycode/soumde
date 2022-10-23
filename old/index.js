import { waitAudioContext } from "./lib/waitAudioContext.js"
import { ktof } from "./lib/frequencies.js"
import { SafeOutput } from "./lib/safeOutput.js"
import { Oscilloscope, oscilloscope } from "./graphicAnalyzer.js"

{
    const stopButton = document.createElement('button')
    stopButton.style.fontSize = '88px'
    stopButton.textContent = 'STOP'
    stopButton.id = 'stop-button'
    stopButton.setGainAp = gainap => {

    }
    document.body.appendChild(stopButton)
}

const DetuneOsc = (ac) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    osc.type = 'triangle'
    osc.frequency.value = 1000
    gain.gain.value = 1000
    osc.start()
    return osc
}

const OscGain = (ac) => {

    const osc = ac.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 220
    osc.frequency.value = 220

    const detuneOsc = DetuneOsc(ac)
    detuneOsc.connect(osc.detune)

    const gain = ac.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    osc.start()
    return {
        nodes: { osc, gain },
        output: gain
    }
}

const noteOn = (frequencyAp, gainAp) => (envelope) => (startTime, key, velocity) => {

    const attackTime = 0.01
    const decayTime = 0.01
    const decayAmplitude = 0.5
    const sustainTime = 1
    const releaseTime = 0.05
    const t0 = startTime
    gainAp.setValueAtTime(0, t0)
    frequencyAp.setValueAtTime(ktof(key), t0)

    const t1 = t0 + attackTime
    gainAp.linearRampToValueAtTime(1, t1)

    const t2 = t1 + decayTime
    gainAp.linearRampToValueAtTime(decayAmplitude, t2)

    const t3 = t2 + sustainTime
    gainAp.linearRampToValueAtTime(decayAmplitude, t3)

    const t4 = t3 + releaseTime
    gainAp.linearRampToValueAtTime(0, t4)


}

const go = async () => {
    const ac = await waitAudioContext()
    const safeOutput = SafeOutput(ac)
    safeOutput.output.connect(ac.destination)
    safeOutput.output.gain.setValueAtTime(0.5, ac.currentTime)

    document.getElementById('stop-button').onclick = () => {
        safeOutput.output.gain.setValueAtTime(0, ac.currentTime + 0.1)
    }

    console.log(ac)
    const og = OscGain(ac)
    og.output.connect(safeOutput.input)

    const oscilloscope = Oscilloscope(ac)
    og.output.connect(oscilloscope.input)

    const startTime = ac.currentTime + 1
    new Array(12).fill(0).forEach((_, i) => {
            noteOn(og.nodes.osc.frequency, og.nodes.gain.gain)()(startTime + i * 2, 48 + 12 + i, 1)
    })

}
go()