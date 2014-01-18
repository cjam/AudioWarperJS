importScripts("../lib/dsp/dsp.js","../TypedArrayFunctions.js");

function analyze(input,sampleRate,windowSize,anHop) {
	var window = new WindowFunction(DSP.HANN);
	var numWindows = Math.ceil(input.length/anHop);
	var fftMags = new Float32Array(numWindows*windowSize);
	var fftPhases = new Float32Array(numWindows*windowSize);
	var fft = new FFT(windowSize,sampleRate);
		
	var n_start = 0;
	var n_end;
	var signalToWindow = new Float32Array(windowSize);
	for(var w=0;w<numWindows;++w){
		copyTypedArray(input,signalToWindow,w*anHop);
		window.process(signalToWindow);
		fftShift(signalToWindow);
		fft.forward(window.process(signalToWindow));
		copyTypedArray(fft.mag,fftMags,0,fft.mag.length);
		copyTypedArray(fft.phase,fftPhases,0,fft.phase.length);
		postMessage({status:"busy",window:w+1,numWindows:numWindows,windowSize:windowSize/2});
	}
	var args = {status:"done",
				mags: fftMags,
				phases: fftPhases}
	postMessage(args);
}



onmessage = function(event) {
	analyze(event.data.inputSignal,
			event.data.sampleRate,
			event.data.windowSize,
			event.data.anHop)
}