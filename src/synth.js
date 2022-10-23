//const disconnectAll = nodes => () => nodes.forEach(node => node.disconnect())
//const stopAll = nodes => () => nodes.forEach(node => { if (node.stop) node.stop() })

const stopAndDisconnectAll = nodes => () => Object.values(nodes).forEach(node => {
    if (node.disconnect) node.disconnect()
    if (node.stop) node.stop()
})

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
        output: nodes.gain,
        remove: stopAndDisconnectAll(nodes)
    }
}