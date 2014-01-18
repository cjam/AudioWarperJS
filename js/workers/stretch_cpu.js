importScripts("../lib/dsp/dsp.js","../TypedArrayFunctions.js");

function princArg(phaseIn){
	return (phaseIn+Math.PI)%(-2*Math.PI)+Math.PI;
}

function threshold(buffer,thresh){
	var bufferVal;
	for(var i = 0; i< buffer.length;++i){
		bufferVal = buffer[i];
		buffer[i] = (bufferVal > thresh) ? bufferVal : 0;
	}	
}

function toPolar(real,imag){
	return {mag:Math.sqrt(real*real+imag*imag),phase:Math.atan2(imag,real)};
}


function toCartesian(mag,phase){
	return {real:mag*Math.cos(phase),imag:mag*Math.sin(phase)};
}



function stretch(input,sampleRate,windowSize,anHop,stretchFactor) {
	var window 		= new WindowFunction(DSP.HANN);
	var numWindows 	= Math.ceil(input.length/anHop);

	// Buffers required for analysis
	
	// phase[0] => current phase info, phase[1] => last frames phase info
	var phase 		= [ new Float32Array(windowSize), new Float32Array(windowSize) ]; 	// Allocate space for two frames of phase information
	var mag 		= new Float32Array(windowSize);		// Allocate space for the current magnitude information
	
	// Variables required for synthesis
	var synthHop 	= Math.round(anHop*stretchFactor);
	var synthPhase  = [ new Float32Array(windowSize), new Float32Array(windowSize) ];	// Allocate space for the synthesized phase information
	var real 		= new Float32Array(windowSize);
	var imag		= new Float32Array(windowSize);	
	
	// Target phase for each bin is pre-calculated
	var omega_k = new Float32Array(windowSize);
	for(var i = 0; i< omega_k.length;++i){
		omega_k[i] = 2*Math.PI*i/windowSize;
	}		
		
	var fft 		= new FFT(windowSize,sampleRate);
	var output		= new Float32Array(numWindows*synthHop + windowSize);
	var nStart = 0, nEnd;
	var taper = anHop != synthHop;	
	var tmpOut;
		
	var signalToWindow = new Float32Array(windowSize);
	for(var w = 0; w < numWindows; ++w){
		
		// ======== ANALYSIS ======== //
		copyTypedArray(input,signalToWindow,w*anHop);
		window.process(signalToWindow);
		fftShift(signalToWindow);
		fft.forward(signalToWindow);
		
		//threshold(fft.real,1e-3);
		//threshold(fft.imag,1e-3);
		// Copy the current phase info to the previous phase information
		copyTypedArray(phase[0],phase[1]);
		// Place the newly calculated fft phase info to the current phase info
		var coords;
		for(var i = 0;i<windowSize;++i){
			coords = toPolar(fft.real[i],fft.imag[i]);
			phase[0][i] = coords.phase;
			mag[i] 		= coords.mag;			
		}
		
		
		// ======== ANALYSIS END ======== // 
		
		
		// ======== SYNTHESIS ======== // 
			
		// PHASE UNWRAPPING
		
		if( w > 0 ){
			var targetPhase;
			var deviationPhase;
			var phaseIncrement;
			var omega;
			var synthPhaseVal;
			var coords;
			for(var p = 0; p < windowSize; ++p){
				omega = omega_k[p];
				targetPhase = phase[1][p] + omega*anHop;
				deviationPhase = princArg(phase[0][p]-targetPhase);
				phaseIncrement = (omega*anHop+deviationPhase)/anHop;
				synthPhaseVal = princArg(synthPhase[1][p] + phaseIncrement*synthHop);
				coords = toCartesian(mag[p],synthPhaseVal);
				real[p] = coords.real;
				imag[p] = coords.imag;
				synthPhase[0][p] = synthPhaseVal;
			}
		}else{         
			copyTypedArray(phase[0],synthPhase[0]);
			var synthPhaseVal,coords;
			for(var p = 0; p < windowSize; ++p){
				synthPhaseVal = synthPhase[0][p];
				coords = toCartesian(mag[p],synthPhaseVal);
				real[p] = coords.real;
				imag[p] = coords.imag;				
			}			
		}
		
		//copyTypedArray(phase[0],synthPhase[0]);
		
		copyTypedArray(synthPhase[0],synthPhase[1]);
		
		
		var coords;
		for(var i = 0;i<windowSize;++i){
			coords = toCartesian(mag[i],synthPhase[0][i]);
			real[i] = coords.real;
			imag[i] = coords.imag;			
		}
		
		
		
		tmpOut = fft.inverse(real,imag);
		fftShift(tmpOut);
		if(taper){
			window.process(tmpOut);
		}
		var bufferIndex;
		for(var p = 0; p < windowSize; ++p){
			bufferIndex = nStart + p;
			output[bufferIndex] += tmpOut[p];
		}
		nStart += synthHop;
		
				
		// ======== SYNTHESIS END ======== // 
		postMessage({status:"busy",window:w+1,numWindows:numWindows,windowSize:windowSize/2});
	}
	var range = getRange(output);
	var max_val = Math.max(Math.abs(range.min),range.max);
	for(var i = 0;i<output.length; ++i){
		output[i] = output[i]/max_val;
	}
		
	postMessage({status:"done",
				message:"Done stretching audio.",
				output:output})
	
}

onmessage = function(event) {
	stretch(event.data.input,
			event.data.sampleRate,
			event.data.windowSize,
			event.data.anHop,
			event.data.stretchFactor)
}