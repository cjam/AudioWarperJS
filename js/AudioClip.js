
/*--------------------------------------------------

Data Type: 		AudioClipReader 
Description:	This object is used to read audio
				from a file into an AudioClip object.
				
---------------------------------------------------*/

// Should make the reader and writer functions AppObjects that can be used as children in the AudioClip.
AudioReader.inheritsFrom(AppObject)

function AudioReader(args){
	AppObject.call(this,args)
	if(this.getParent() instanceof AudioClip){
		var loaded = false;
		var clip = this.getParent();
		var self 	= this;
		var audioElement;
		this.bufferSize = clip.frameBufferSize / 2; 
		var signal;
		
		this.isLoaded = function(){
			return loaded;
		}
		clip.isLoaded = this.isLoaded;
		this.getPercentLoaded = function(){
			var percentLoaded = 0;
			try{
				percentLoaded = parseFloat(clip.samples.length/(clip.duration * clip.sampleRate));
			}catch(e){
				percentLoaded = 0;
			}
			if(isNaN(percentLoaded))
				percentLoaded = 0;
			return percentLoaded;	
		};
		clip.getPercentLoaded = this.getPercentLoaded;
		this.loadSamples = function(event) {
			signal = DSP.getChannel(DSP.MIX, event.frameBuffer);
			for ( var i = 0; i < signal.length; i++) {
			  clip.samples.push(signal[i]);
			}
			if(clip.postLoadFrameHook != undefined){
				clip.postLoadFrameHook(signal);
			}
		};
		this.loadComplete = function() {
			// convert flexible js array into a fast typed array
			clip.setSamples(clip.samples);
			audioElement    = undefined;
			clip.normalize();
			signal = undefined
			loaded 	= true;
			if(self.loadCompleteHook instanceof Function ){
				self.loadCompleteHook();
			}
			clip.setEnabled(true);
		};
		this.loadMetaData = function() {
			clip.setEnabled(false);
			clip.samples 			= [];
			clip.duration 			= audioElement.duration;
			clip.sampleRate 		= audioElement.mozSampleRate; 
			clip.frameBufferSize 	= audioElement.mozFrameBufferLength;
			this.bufferSize		 	= clip.frameBufferSize / 2;
			loaded					= false;
			signal 					= new Float32Array(this.bufferSize);
		};
		this.readAudio = function(fileName){
			audioElement = document.createElement("AUDIO");
			audioElement.addEventListener("loadedmetadata", this.loadMetaData, false);
			audioElement.addEventListener("MozAudioAvailable", this.loadSamples, false);
			audioElement.addEventListener("ended", this.loadComplete, false);
			audioElement.muted = true;
			audioElement.src = fileName;
			audioElement.play();
		}
	}else{
		console.error("AudioReader requires it's parent to be an AudioClip object")
	}
}


function AudioWriter(args){
	AppObject.call(this,args)
	if(this.getParent() instanceof AudioClip){
		var STATUS_TYPE = {stopped:0,playing:1,paused:2};
		var self = this;
		var clip = this.getParent();
		clip.isPlaying = false;
		var audioElement;
		
		var mozSampleOffsetStart;
		var currentWritePos = 0;	
		var currentReadPos = 0;
		var preBufferSize;
		var tail = null, tailPosition;
			
		var status = STATUS_TYPE.stopped;
		var writeIntervalID;
		var endNotified;
	
		var writeAudio = function(){
			var written;
			// Check if some data was not written in previous attempts.
			if(tail) {
				written = audioElement.mozWriteAudio(tail.subarray(tailPosition));
				currentWritePos += written;
				tailPosition += written;
				if(tailPosition < tail.length) {
					// Not all the data was written, saving the tail...
					return; // ... and exit the function.
				}
				tail = null;
			}
			
			// Check if we need to add some data to the audio output.
			if( currentReadPos < clip.samples.length){
				var available = currentReadPos + preBufferSize - currentWritePos;
				if(available > 0) {
					// Request some sound data from the callback function.
					var soundData = new Float32Array(available);
					readClipData(soundData);
					// Writing the data.
					written = audioElement.mozWriteAudio(soundData);
					if(written < soundData.length) {
						// Not all the data was written, saving the tail.
						tail = soundData;
						tailPosition = written;
					}
					currentWritePos += written;
				}
			}
			if(audioElement.mozCurrentSampleOffset() - mozSampleOffsetStart >= clip.samples.length ){
				console.log(audioElement.mozCurrentSampleOffset() - mozSampleOffsetStart,clip.samples.length)
				clipEnded();
			}else if(audioElement.mozCurrentSampleOffset() - mozSampleOffsetStart >= clip.samples.length - 100/1000*clip.sampleRate){
				if( clip.clipEnded instanceof Function){
					clip.clipEnded();
				}
			}

			
			
		}
		
		var readClipData = function(buffer){
			if( clip.samples.length == 0){
				return; // No samples loaded into clip
			}
			for (var i=0; i < buffer.length; ++i) {
				++currentReadPos;
				buffer[i] = clip.samples[currentReadPos];
			}
		}
		
		this.getStatus = function(){
			return status;
		}
		
		var clipEnded = function(){
			clip.stop();
		}
		
		this.getCurrentPos = function(){
			if(audioElement != undefined){
				return audioElement.mozCurrentSampleOffset() - mozSampleOffsetStart;
			}
		}
		clip.getCurrentPlayPos = function(){
			if( clip.isPlaying == true){
				return self.getCurrentPos();
			}
			return 0;
		}
		
		this.play = function(startSample){
			if(this.isPlaying == false){
				if( audioElement == undefined ){
					createAudioElement();
				}
				preBufferSize = clip.sampleRate/2;  // Buffer 500 ms of audio
				currentReadPos = cleanValue(startSample,0);
				currentWritePos = cleanValue(startSample,0);
				mozSampleOffsetStart = audioElement.mozCurrentSampleOffset();
				writeIntervalID = setInterval(function(){writeAudio()},50);
				status = STATUS_TYPE.playing
				clip.isPlaying = true;
			}
			return this;
		}
		clip.play = this.play;

		this.pause = function(){
			if( status == STATUS_TYPE.playing ){
				status = STATUS_TYPE.paused;
				clearInterval(writeIntervalID);
			}else{
				this.play(currentReadPos);
			}
			// To do: need to implement play/pause code
		}
		clip.togglePause = this.pause;

		this.stop = function(){
			clearInterval(writeIntervalID);
			currentReadPos = 0;
			currentStopPos = 0;
			status = STATUS_TYPE.stopped;
			clip.isPlaying = false;
			console.log("Clip stopped");
		}
		clip.stop = this.stop
		
		
		var createAudioElement = function(){
			audioElement = document.createElement("AUDIO");
			audioElement.mozSetup(1,clip.sampleRate);
			currentWritePosition = 0;
		}
	
	}else{
		console.error("AudioWriter requires it's parent to be an AudioClip object")
	}

}


/*--------------------------------------------------

Data Type: 		AudioClip 
Description:	This object is used to represent an
				clip of audio, it is a container
				to load and hold audio data.
				
---------------------------------------------------*/
AudioClip.inheritsFrom(AppObject);

function AudioClip(args) {
	AppObject.call(this,args);
	// independent parameters	
	this.isLoaded = function(){return true;}
	this.getPercentLoaded = function(){return 0;}
	
	var reader;
	var writer = new AudioWriter({parent:this});
	
	this.loadingComplete = function(){
		// Do nothing
	}

	this.readAudio = function(fileName){
		this.fileName = cleanValue(fileName,'');
		reader 	= new AudioReader({parent:this,fileName:this.fileName});
		reader.loadCompleteHook = this.loadingComplete
		reader.readAudio(fileName);
	}

	this.setSamples = function(sampleBuffer,normalize){
		normalize = (normalize == undefined) ? false : normalize;
		if( sampleBuffer instanceof Float32Array ){
			this.samples = sampleBuffer;
		}else{
			this.samples = new Float32Array(sampleBuffer);
		}
		this.duration = this.samples.length/this.sampleRate;
		if(normalize){
			this.normalize();
		}		
	}
	
	this.copySamples = function(sampleBuffer,normalize){
		normalize = (normalize == undefined) ? false : normalize;
		this.samples = new Float32Array(sampleBuffer);
		this.duration = this.samples.length/this.sampleRate;
		if(normalize){
			this.normalize();
		}		
	}
	
	this.setAudioClip = function(clip){
		if(clip instanceof AudioClip){
			this.frameBufferSize = clip.frameBufferSize;
			this.fileName = clip.fileName;
			this.sampleRate = clip.sampleRate;
			this.duration = clip.duration;
			this.setSamples(clip.samples);
			this.setEnabled(clip.enabled);
		}
	}
	
	this.cropAudio = function(pos){
		this.setSamples(this.getSection(pos));
	}
	
	this.getSection = function(pos){
		var start = cleanValue(pos.start,0);
		var end = cleanValue(pos.end,this.samples.length);
		return this.samples.subarray(start,end);
	}
	
	this.splitClip = function(splitPos){
		var leftClip = new AudioClip({audioClip:this});
		var rightClip = new AudioClip({audioClip:this});
		leftClip.cropAudio({start:0,end:splitPos});
		rightClip.cropAudio({start:splitPos+1});
		return {left:leftClip,right:rightClip}
	}
		
	this.normalize = function(){
		var range = getRange(this.samples);
		var maxVal = Math.max(Math.abs(range.min),range.max);
		for(var i = 0; i < this.samples.length; ++i){
			this.samples[i] /= maxVal;
		}	
	}

	this._init({
		frameBufferSize:1024,
		fileName:'',
		sampleRate:44100,
		duration:0,
		samples:[],
		enabled: false,
		audioClip:undefined
	});

}


/*--------------------------------------------------

Data Type: 		AudioClipDisplay 
Description:	This object is used as a base class
				which is responsible for displaying
				a visual representation of an audio
				clip.
				
---------------------------------------------------*/

AudioClipTimeDisplay.inheritsFrom(CanvasItem);

function AudioClipTimeDisplay(args) {
	CanvasItem.call(this,args);
	
	this.getClip = function(){
		return this.clip;
	}
	// To do: change the position argument to use the position standard object i.e. {x:value,y:value}
	this.splitDisplay = function(pos){
		var sampleIndex = this.convertPosToSample(pos);
		console.log("sample index:"+sampleIndex);
		var newClips = this.clip.splitClip(sampleIndex);
		var relPos = this.getRelativePos({x:pos,y:0});
		var p = this.getPos();
		var s = this.getSize();
		var parent = this.getParent();
		var leftDisplay = new AudioClipTimeDisplay({
			instance:this,
			width:pos-p.x,
			clip:newClips.left
		});
		var rightDisplay = new AudioClipTimeDisplay({
			instance:this,
			x:pos,
			width:s.width-relPos.x,
			clip:newClips.right
		});

		return {left:leftDisplay,right:rightDisplay}
	}	
	
	this.convertPosToSample = function(pos){
		var stride = this.getSampleStride();
		var relPos = this.getRelativePos({x:pos,y:0});
		return relPos.x*stride;		
	}
	
	this.convertSampleToPos = function(sampleIndex){
		try{
			var stride = this.getSampleStride();
			var pos = Math.floor(sampleIndex/stride);
		}catch(e){
			var pos = 0;
		}
		return pos;
	}
	
	this.getSampleStride = function(){
		var clip = this.getClip();
		return Math.floor(clip.samples.length / this.getWidth());
	}

	this._init({
		name:'clipDisplay',
		id:'clipDisplay'+this.getOID(),
		clip:new AudioClip(),
		disabledStyle:{stroke:{color:[90]},fill:{color:undefined}}
	});
}

AudioClipTimeDisplay.prototype.draw = function(app){
	
	var clip = this.getClip();
	this.setEnabled(clip.enabled);
	// parents draw function
	CanvasItem.prototype.draw.call(this,app);
	if(clip.samples.length > 0){
		var pos = this.getPos();
		var size = this.getSize();
		// To do: handle issues if the clip is smaller (in samples) than the width of the widget
		var sampleStride = this.getSampleStride();
		var color = this.getStrokeColor();
		
		// Translate matrix to the specified origin so that we can use our own coordinates
		var range = getRange(clip.samples);
		var scale = 1/Math.max(Math.abs(range.min),Math.abs(range.max))*size.height/2;
		app.pushMatrix();
		var absPos = this.getPos();
		app.translate(absPos.x+1,absPos.y+size.height/2)
		var lineStart, lineEnd = {x:0,y:clip.samples[0]*scale};
		app.stroke(color);
		for(var i=1;i<size.width;++i){
			lineStart = lineEnd
			lineEnd = {x:i,y:clip.samples[i*sampleStride]*scale};
			app.line(lineStart.x,lineStart.y,lineEnd.x,lineEnd.y);
		}
		if(clip.isPlaying == true){
			var playPos = this.convertSampleToPos(clip.getCurrentPlayPos());
			app.line(playPos,-size.height/2,playPos,size.height/2);			
		}
		
		
		app.stroke();
		

		
		app.popMatrix();
		
	}
	if(clip.isLoaded() == false){
		this.drawProgress(app,clip.getPercentLoaded());
	}
}

AudioClipTimeDisplay.prototype.drawProgress = function(app,progress){
	var p = this.getPos();
	var s = this.getSize();
	var barHeight = 20;
	app.processing.fill(230,40,40,100+Math.floor(155*progress));
	app.processing.noStroke();
	app.rect(p.x,p.y+(s.height-barHeight)/2,s.width*progress,barHeight);
	app.processing.stroke(122,122,122);
	app.processing.noFill();
}


/*--------------------------------------------------

Data Type: 		AudioClipFFTDisplay 
Description:	This object is used as a base class
				which is responsible for displaying
				a visual representation of an audio
				clip.
				
---------------------------------------------------*/
/*
AudioClipFFTDisplay.inheritsFrom(CanvasItem);
function AudioClipFFTDisplay(clip, size, pos, parent) {
	CanvasItem.call(this,size,pos,'fftDisplay','fftDisplay'+this.getOID());
	this.audioClip 	= clip;
	this.fft 		= new FFT(this.audioClip.bufferSize, 44100);
	this.peak 		= new Float32Array(this.audioClip.bufferSize);
	
	var self 		= this;
	
	
	var processFFT = function(signal){
		        // perform forward transform
        self.fft.forward(signal);
        // calculate peak values
		for ( var i = 0; i < self.fft.bufferSize; i++ ) {
			self.fft.spectrum[i] *= -1 * Math.log((self.fft.bufferSize/2 - i) * (0.5/self.fft.bufferSize/2)) * self.fft.bufferSize; // equalize, attenuates low freqs and boosts highs
			if ( self.peak[i] < self.fft.spectrum[i] ) {
				self.peak[i] = self.fft.spectrum[i];
			} else {
				self.peak[i] *= 0.99; // peak slowly falls until a new peak is found
			}
		}
	}
	this.audioClip.postLoadFrameHook = processFFT;

	this.getClip = function(){
		return audioClip;
	}
	
	this.setClip = function(clip){
		audioClip = clip;
	}
}

AudioClipFFTDisplay.prototype.draw = function(app){
	// draw border
	CanvasItem.prototype.draw.call(this,app);

	var barWidth;
	if( this.getWidth() > this.fft.spectrum.length/2){
		barWidth = Math.floor(this.getWidth() / (this.fft.spectrum.length/2));
	}else{
		barWidth = Math.floor((this.fft.spectrum.length/2) / this.getWidth());
	}
	var color = "#000000";
	if(this.audioClip.loaded == false)
		color = "#992222";
		
	//console.log(this.fft.spectrum.length/2, barWidth, color);
	for(var i=0;i<this.fft.spectrum.length/2;++i){
		var magnitude = this.fft.spectrum[i];
		app.rect(this.getX()+i*barWidth,this.getY()+this.getHeight(),barWidth,-magnitude);
		app.stroke(color);
		app.line(this.getX()+i*barWidth,this.getY()+this.getHeight()-this.peak[i],this.getX()+(i+1)*barWidth,this.getY()+this.getHeight()-this.peak[i]);
		app.stroke("#FF0000");
	}

	// var step = Math.floor(this.audioClip.duration * this.audioClip.sampleRate / this.getWidth());
	// for ( int i = 0; i < fft.spectrum.length/2; i += 3 ) {          
		// if (3 * i > this.getWidth()) { break; }
		// var magnitude = fft.spectrum[i];

		draw magnitudes
		stroke((i) % 360, 60, constrain(magnitude * 6, 20, 100));
		// line(3*i, height, 3*i, height - magnitude * 16);

		draw peak indicators
		// stroke((i) % 360, 60, constrain(magnitude * 100, 50, 100));
		// line(3*i, height - peak[i] * 16 - 1, 3*i, height - peak[i] * 16);
	// }
	
}
*/

