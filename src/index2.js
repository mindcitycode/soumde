import { waitAudioContext } from "./lib/waitAudioContext.js"
import { ktof } from "./lib/frequencies.js"
import { reduceDelta } from "./lib/reducedelta.js"

const OscGain = (ac) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    gain.gain.value = 0
    osc.frequency.value = 220
    osc.connect(gain)
    osc.start()
    return {
        nodes: { osc, gain }
    }
}

const partition0 = [
    [0, ktof(48), 0.5],
    [0.5, ktof(48 + 3), 0.25],
    [0.5, ktof(48 + 7), 0.5],
    [0.5, ktof(48), 0.5],
    [0.5, ktof(48 + 3), 0.25],
    [0.5, ktof(48 + 8), 0.5],
    [0.5, ktof(48), 0.5],
    [0.5, ktof(48 + 3), 0.25],
    [0.5, ktof(48 + 9), 0.5],
    [0.5, ktof(48), 0.5],
    [0.5, ktof(48 + 3), 0.25],
    [0.5, ktof(48 + 8), 0.5],
    [0.5, 0, 0]
].map(x => {
    x[0] /= 1
    return x
})

const partition = reduceDelta(partition0)

const queuePartition = (ac, partition, nodes) => {
    const startTime = ac.currentTime + .5
    const [oscNode, gainNode] = nodes

    let time = startTime
    for (let i = 0; i < partition.length; i++) {
        const [time, ...values] = partition[i]
        const [freq, gain] = values
        oscNode.frequency.setValueAtTime(freq, time + startTime)
        gainNode.gain.setValueAtTime(gain, time + startTime)
    }

}

function produceSome(ac, fromTime, measure, nodes) {

    const currentBeat = (fromTime - measure.startTime) / measure.period
    console.log({ currentBeat })
    const beat0 = measure.startTime + currentBeat * measure.period
    const beat1 = measure.startTime + (1 + currentBeat) * measure.period
    console.log(beat0,beat1)


}


const doit = async () => {
    const ac = await waitAudioContext(new AudioContext())
    window.ac = ac
    const osc = OscGain(ac)
    osc.nodes.gain.connect(ac.destination)
    //queuePartition(ac, partition, [osc.nodes.osc, osc.nodes.gain])

    const measure = {
        startTime: ac.currentTime + 0.5,
        period: 1,
    }
    produceSome(ac, measure.startTime, measure, [osc.nodes.osc, osc.nodes.gain])
    setTimeout(() => {
        ac.suspend()
    }, 10000)
}
doit()
