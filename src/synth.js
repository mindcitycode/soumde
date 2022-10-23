const disconnectAll = nodes => () => nodes.forEach(node => node.disconnect())

export const MonoOsc = (ac) => {
    const nodes = {
        osc: new OscillatorNode(ac),
        gain: new GainNode(ac)
    }
    nodes.osc.connect(nodes.gain)
    nodes.gain.gain.value = 0
    nodes.osc.start()
    return {
        nodes,
        output : nodes.gain,    
        stop: disconnectAll(nodes)
    }
}

export const PolyOsc = (ac, createMonoInstance) => {
    const monos = []
    const createMono = (id) => {
        const mono = createMonoInstance()
        monos[id] = mono
        return mono
    }
    const getMono = (id) => {
        const mono = monos[id] || createMono(id)
        return mono
    }
    return { getMono }
}

