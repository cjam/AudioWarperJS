function GPU_FFT(){
	var fftKernel;
	try {
		
		var self = this;
		// First check if the WebCL extension is installed at all 
		if ( !WCL.detectCL() ) {
			alert("Unfortunately your system does not support WebCL. " +
				  "Make sure that you have both the OpenCL driver " +
				  "and the WebCL browser extension installed.");
			return false;
		}
		
		// Setup WebCL context using the default device of the first available platform 
		var ctx = WCL.getContext();
		
		// Create and build program for the first device
		var kernelSrc = WCL.loadKernel("clProgramFFTRadix2");
		var program = WCL.getProgram();
		fftKernel = new WCLKernel("fft_radix2");
		
		fftKernel.reserveMemory = function(input){
			self.real = new Float32Array(input.length);
			self.imag = new Float32Array(input.length);
			this.bufLength = input.length*2;
			this.bufSize = this.bufLength*4; // size in bytes
			
			this.inputBuffer = WCL.getContext().createBuffer (WebCL.CL_MEM_READ_WRITE, this.bufSize);
			this.outputBuffer = WCL.getContext().createBuffer (WebCL.CL_MEM_READ_WRITE, this.bufSize);
			
			this.complexSignal = new Float32Array(this.bufLength);
			for(var i = 0;i<input.length; ++i){
				this.complexSignal[2*i] = input[i];
				this.complexSignal[2*i+1] = 0;
			}
						
			// Create command queue using the first available device
			var cmdQueue = WCL.getCommandQueue();
			
			// Create and Write the buffer to OpenCL device memory
			this.TDomainDataObject = WebCL.createDataObject();
			this.TDomainDataObject.allocate(this.bufSize);
			this.TDomainDataObject.set(this.complexSignal);
			
			// Create the data object for the output vector
			this.FDomainDataObject = WebCL.createDataObject();
			this.FDomainDataObject.allocate(this.bufSize);

			cmdQueue.enqueueWriteBuffer (this.inputBuffer, false, 0, this.TDomainDataObject.length, this.TDomainDataObject, []);
			WCL.getCommandQueue().finish (); //Finish all the operations
		}
		
		fftKernel.executeKernel = function(input){
			var utils = WebCL.getUtils();
			this.reserveMemory(input);
			// Set up the local and global work sizes
			this.localWS = [16];
			this.getGlobalWS(input.length/2);
			var x = this.inputBuffer;
			var y = this.outputBuffer;
			for(var p = 1;p <= input.length/2; p*=2){
				this.kernel.setKernelArg (0, x);
				this.kernel.setKernelArg (1, y);
				this.kernel.setKernelArg (2, p, WebCL.types.UINT);
				WCL.getCommandQueue().enqueueNDRangeKernel(this.kernel, this.globalWS.length, [], this.globalWS, this.localWS, []);
				WCL.getCommandQueue().finish();
				var tmp = y;
				y = x;
				x = tmp;
			}
			
			WCL.getCommandQueue().enqueueReadBuffer (x, false, 0, this.bufSize, this.FDomainDataObject, []);
			WCL.getCommandQueue().finish (); //Finish all the operations
			
			utils.writeDataObjectToTypedArray(this.FDomainDataObject, this.complexSignal);								
		}
		
	} catch(e) {
		console.error(e.message);
		throw e;
	}
	
	this.forward = function(signal){
		if(fftKernel instanceof WCLKernel){
			fftKernel.executeKernel(signal);
			for(var i = 0;i<this.real.length; ++i){
				this.real[i] = fftKernel.complexSignal[2*i];
				this.imag[i] = fftKernel.complexSignal[2*i+1];
			}
		}
	}
	
	this.inverse = function(real,imag){
		
	}	
	

	
}