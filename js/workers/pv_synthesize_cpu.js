importScripts("../lib/dsp/dsp.js","../TypedArrayFunctions.js");



function synthesize(mags,phases,windowSize,sampleRate,synthHop,anHop) {
	var window = new WindowFunction(DSP.HANN);
	var numWindows = Math.ceil(mags.length/windowSize);
	var fft = new FFT(windowSize,sampleRate);

	// Allocate space for the output signal
	var output = new Float32Array(numWindows*synthHop+windowSize); 
	var synthPhase = new Float32Array(numWindows*windowSize);
	
	// Target phase for each bin is pre-calculated
	var omega_k = new Float32Array(windowSize);
	for(var i = 0; i< omega_k.length;++i){
		omega_k[i] = 2*Math.PI*i/omega_k.length;
	}
	
	// We want the first window of phases to the same for input and output signals
	copyTypedArray(phases,synthPhase,0,0,windowSize);

	// PHASE UNWRAPPING
	var targetPhase;
	var deviationPhase;
	var phaseIncrement;
	var omega;
	for(var w = 1; w < numWindows; ++w){
		for(var p = 0; p < windowSize; ++p){
			omega = omega_k[p];
			targetPhase = phases[(w-1)*windowSize+p] + omega*anHop;
			deviationPhase = princArg(phases[w*windowSize+p]-targetPhase);
			phaseIncrement = princArg(omega*anHop+deviationPhase)/anHop;
			synthPhase[w*windowSize+p] = princArg(synthPhase[(w-1)*windowSize+p] + phaseIncrement*synthHop);
		}
		postMessage({status:"busy",message: "Unwrapping Phase",window:w+1,numWindows:numWindows,windowSize:windowSize/2});
	}
	
	var real = new Float32Array(windowSize);
	var imag = new Float32Array(windowSize);
	var tmpOut;
	var bufferIndex;
	var nStart = 0,nEnd;
	var taper = anHop != synthHop;
	for(var w=0;w<numWindows;++w){
		// Create real and imaginary buffers for this window so that the IFFT can be taken
		for(var p = 0; p < windowSize; ++p){
			bufferIndex = w*windowSize + p;
			real[p] = mags[bufferIndex]*Math.cos(synthPhase[bufferIndex]);
			imag[p] = mags[bufferIndex]*Math.sin(synthPhase[bufferIndex]);
		}
		tmpOut = fft.inverse(real,imag);
		fftShift(tmpOut);
		
		if(taper){
			window.process(tmpOut);
		}
		nEnd = nStart + windowSize - 1;
		for(var p = 0; p < windowSize; ++p){
			bufferIndex = w*windowSize + p;
			output[bufferIndex] = output[bufferIndex]+tmpOut[p];
		}
		nStart += synthHop;
	
		postMessage({status:"busy",message:"Overlapping and Adding",window:w+1,numWindows:numWindows,windowSize:windowSize/2});
	}
	 var args = {status:"done",
				 output: output}
	 postMessage(args);
}



onmessage = function(event) {
	synthesize(event.data.mags,
				event.data.phases,
				event.data.windowSize,
				event.data.sampleRate,
				event.data.synthHop,
				event.data.anHop)
}