AudioStretcher.inheritsFrom(AppObject);
function AudioStretcher(args){
	AppObject.call(this,args);
	var outputClip = new AudioClip('outputClip');
	
	var engineKernel = "js/workers/stretch_cpu.js";
	var engines = new Array(1);  // just one kernel for now
	
	IntParameter.call(this,"windowSize",512,"Window Size");
	IntParameter.call(this,"anHop",32,"Analysis Hop Size");
	FloatParameter.call(this,"stretchFactor",1.0,"Stretch Factor");
	
	this.stretchProgress = 0;

	var self = this;
	
	var onMessage = function(event){
		if(event.data.status == "busy"){
			self.stretchProgress = event.data.window/event.data.numWindows;
			if( self.windowProcessedCallBack != undefined){
				self.windowProcessedCallBack(event.data.window);
			}	
			if( self.progressCallBack != undefined){
				self.progressCallBack(self.stretchProgress);
			}			
		}
		if(event.data.status == "done"){
			console.log("Stretcher Done: ",event.data.message);
			outputClip.sampleRate = self.inputClip.sampleRate;
			outputClip.copySamples(event.data.output);			
			if( self.processingFinishedCallBack != undefined){
				self.processingFinishedCallBack(outputClip);
			}	
		}			
	}
	var onError = function(error){
		alert("Audio stretching Engine  Error: \n"+ ['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
		throw error;
	}
	
	this.stretch = function(inputClip){
		if( inputClip instanceof AudioClip ){
			this.inputClip = inputClip;
			this.inputClip.setEnabled(false);
			var args;
			for(var i = 0; i < engines.length; ++i){
				args = {
					input: 			inputClip.samples,
					sampleRate:		inputClip.sampleRate,
					windowSize:		this.getWindowSize(),
					anHop:			this.getAnHop(),
					stretchFactor:	this.getStretchFactor()
				}
				try{
					engines[i] = new Worker(engineKernel);
					engines[i].addEventListener('message', onMessage, false);
					engines[i].addEventListener('error', onError, false);
					engines[i].postMessage(args);				
				}catch(e){
					console.log(e);
				}
			}
		}
		return this;
	}
	
	this.cancelRender = function(){
		for(var i = 0; i < engines.length; ++i){
			engines[i].destroy();
		}
	}
	 
	this._init({name:"AudioStretchingEngine",windowSize:512,anHop:32,stretchFactor:1.0}); 
}

