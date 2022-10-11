import { rafLoop } from "./lib/loop"
export const Oscilloscope = ac => {

    const analyser = ac.createAnalyser();
    analyser.fftSize =  256 * 8;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    document.body.append(canvas)
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    rafLoop((dt, t) => {
        analyser.getByteTimeDomainData(dataArray)
        ctx.fillStyle = 'rgba(128,128,128,0.5)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.lineWidth = 4
        ctx.strokeStyle = 'black'
        ctx.beginPath()

        const sliceWidth = canvas.width / bufferLength

        let x = 0
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (canvas.height / 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }
        ctx.stroke()

    })



 /*   const osc = ac.createOscillator()
    osc.frequency.value = 256;
    osc.start()
    osc.connect(analyser)
*/
    //    analyser.connect(ac.destination)

    return {
        nodes : { analyser },
        input : analyser
    }
}