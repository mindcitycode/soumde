import { waitAudioContext } from "./lib/waitAudioContext.js"
const doit = async () => {
    const ac = await waitAudioContext(new AudioContext())
    console.log('got ac', ac.state)
}
doit()
