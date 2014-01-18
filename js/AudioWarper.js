/*--------------------------------------------------

Interface: 		AudioWarper 
Description:	This class represents is the view &
				controller for the Warped Audio Model
				which comprises of many stretched
				or compressed audio clips put together
				
---------------------------------------------------*/
var WARP_STATES = {
	idle:'idle',
	insert:'insert',
	select:'select',
	moving:'moving',
	dropped:'dropped',
	del:'delete',
	processing:'processing'
}

AudioWarper.inheritsFrom(CanvasItem);

function AudioWarper(args){
	CanvasItem.call(this,args);
	
	// Private object data members
	var originalClip = new AudioClip();
	//var warpedClips = [originalClip]
	var markers = new Array();
	this.state = WARP_STATES.processing;
	var clipDisplays = new UniqueArray();
	var orderedClips = {};
	
	this.getState = function(){
		return this.state;
	}
	
	this.setState = function(state){
		this.state = cleanValue(state,WARP_STATES.idle);
		//console.info("State Changed: "+this.state);
	}
	
	
	IntParameter.call(this,"windowSize",1024,"Engine window size");
	IntParameter.call(this,"anHop",32,"Engine Analysis Hop Size");
	ObjectParameter.call(this,"fileName",'','URL to audio file');
	
	this.getClipOrder = function(clip){
		for(var i = 0;i<orderedClips.length;++i){
			if(orderedClips[i] == clip){
				return i			
			}
		}
		return -1;
	}
	
	this.selectMarker = function(marker){
		if(marker instanceof WarpMarker){
			this.selectedMarker = marker;
		}else{
			this.selectedMarker = undefined;
		}
	}
	
	this.getSelected = function(){
		return this.selectedMarker;
	}
	
	this.getMarkers = function(){
		return markers
	}
	
	this.addClipDisplay = function(display){
		if(display instanceof AudioClipTimeDisplay){
			display.setParent(this);
			display.border = false;
			clipDisplays.insert(display);
			return display;
		}
	}
	
	this.removeClipDisplay = function(display){
		if(display instanceof AudioClipTimeDisplay){
			display.setParent();
			clipDisplays.remove(display);
		}
	}
	
	this.clearClipDisplays = function(){
		for(var display in clipDisplays){
			this.removeClipDisplay(display);
		}
	}
	
	this.createWarpDisplay = function(args){
		var display = new AudioClipTimeDisplay(args)
		display.setParent(this);
		display._init({
			width:this.getWidth(),
			height:this.getHeight(),
			id:clipDisplays.length,
			stroke:this.stroke,
			fill:this.fill,
			disabledStyle:this.disabledStyle
		});
		return display;
	}
	
	this.loadFile = function(fileName){
		fileName = fileName || this.getFileName();
		originalClip = new AudioClip({name:"originalClip"});
		orderedClips = [originalClip];
		orderedClips[0].order = 0;
		this.clearClipDisplays();
		this.addClipDisplay(this.createWarpDisplay({clip:originalClip}));
		var self = this;
		originalClip.loadingComplete =  function(){
			self.setState(WARP_STATES.idle);
		};
		originalClip.readAudio(fileName);	
	}
	ObjectAction.call(this,"Load File",this.loadFile);  
		
	this.insertMarker = function(mousePos){
		marker = new WarpMarker({parent:this,markerPos:mousePos,id:markers.length});
		markers.push(marker);
		return markers[markers.length-1];
	}
	
	this.removeMarker = function(id){
		markers[id].remove();
		markers[id].setParent();
		markers.splice(id,1);
	}
	
	this.clearMarkers = function(){
		for(var i = 0;i<markers.length;++i){
			markers[i].remove();
			delete markers[i];
		}
		markers = [];
		this.addClipDisplay(this.createWarpDisplay({clip:originalClip}));
	}
	ObjectAction.call(this,"Clear Markers",this.clearMarkers);  
	
	this.splitClip = function(marker){
		if(marker instanceof WarpMarker){
		
		}
	}
	
	this.setClip = function(audioClip){
		//originalClip.setParent() = undefined;
		//originalClip = audioClip.setParent(this);
	}
	this.getClip = function() {
		return originalClip;
	}
	
	var getFirstMarker = function(){
		if(markers.length > 0){
			var firstMarker = markers[0];
			for(var i = 1; i < markers.length; ++i){
				if(markers[i].markerPos < firstMarker.markerPos)
					firstMarker = markers[i];
			}	
			return firstMarker;
		}
		return undefined;
	}
	
	this.warpAudio =  function(marker){
		var leftClip = marker.displays.left.clip;
		var rightClip = marker.displays.right.clip;
		
		leftClip.setSamples(marker.displays.left.originalClip.samples);
		rightClip.setSamples(marker.displays.right.originalClip.samples);
		
		var ratios = marker.getWarpRatios();
		this.setState(WARP_STATES.processing);
		var leftStretcher = new AudioStretcher({
			windowSize:this.windowSize,
			anHop:this.anHop,
			stretchFactor:ratios.left
		});
		var rightStretcher = new AudioStretcher({
			windowSize:this.windowSize,
			anHop:this.anHop,
			stretchFactor:ratios.right
		});
		
		var leftDisplay = marker.displays.left;
		var rightDisplay = marker.displays.right;
		leftDisplay.progress = 0;		
		rightDisplay.progress = 0;
		// temporarily override the clips display to display the fact that 
		// we are processing it.
		leftDisplay.draw = function(app){
			AudioClipTimeDisplay.prototype.draw.call(this,app);
			AudioClipTimeDisplay.prototype.drawProgress.call(this,app,this.progress);
		}
		rightDisplay.draw = leftDisplay.draw;		
		
		var self = this;
		leftStretcher.progressCallBack = function(progress){
			leftDisplay.progress = progress;
		}
		leftStretcher.processingFinishedCallBack = function(outputClip){
			leftDisplay.draw = AudioClipTimeDisplay.prototype.draw
			leftDisplay.progress = undefined;
			leftClip.copySamples(outputClip.samples);
			leftClip.setEnabled(true);
			if(rightClip.enabled == true){
				self.setState(WARP_STATES.idle)
			}
		}
		rightStretcher.progressCallBack = function(progress){
			rightDisplay.progress = progress;
		}
		rightStretcher.processingFinishedCallBack = function(outputClip){
			rightDisplay.draw = AudioClipTimeDisplay.prototype.draw
			rightDisplay.progress = undefined;
			rightClip.copySamples(outputClip.samples);
			rightClip.setEnabled(true);
			if(leftClip.enabled == true){
				self.setState(WARP_STATES.idle)
			}
		}
		
		
		leftStretcher.stretch(leftClip);
		rightStretcher.stretch(rightClip);
	}
	
	this.play = function(clip){
		if(clip instanceof AudioClip){
				var warper = this;
				clip.clipEnded = function(){
					if(this.nextClip instanceof AudioClip)
						warper.play(this.nextClip);		
				}
				clip.play();
		}else{
			var firstMarker = getFirstMarker();
			if(firstMarker instanceof WarpMarker){
				this.play(firstMarker.displays.left.clip)
			}else{
				originalClip.play();
			}			
		}
	}
	ObjectAction.call(this,"Play",this.play);
}
/*
AudioWarper.prototype.handleMouseMove = function(mousePos){
	//console.info("move:"+this.state);
	switch(this.state){
		case WARP_STATES.insert:
			//this.selectedMarker.color = "#989898"
			
			
		case WARP_STATES.select:
					
		
		case WARP_STATES.dropped:
			
		case WARP_STATES.del:
		
		case WARP_STATES.processing:
			//console.log("Processing",this.selectedMarker)
			//this.setState(WARP_STATES.select);
		default:
			// do nothing
			
	
	}	
}*/

AudioWarper.prototype.handleMouseDrag = function(mousePos){
	var state = this.state;
	switch(state){
		case WARP_STATES.moving:
			this.getSelected().setMarkerPos(mousePos);
		case WARP_STATES.insert:
			this.getSelected().setMarkerPos(mousePos);
		default:
			// do nothing
	}	
}

AudioWarper.prototype.handleMouseRelease = function(mousePos){
	var state = this.state;
	switch(state){
		case WARP_STATES.insert:
			this.selectMarker();
			this.setState(WARP_STATES.idle);
			break;
		case WARP_STATES.select:
			//this.selectedMarker = undefined;
			//this.setState(WARP_STATES.idle);
			break;
		case WARP_STATES.moving:
			this.warpAudio(this.getSelected());
			break;
		case WARP_STATES.processing:
			break;
		default:
			// do nothing	
	}
}

AudioWarper.prototype.handleMousePress = function(mousePos){
	var state = this.state;
	switch(state){
		case WARP_STATES.idle:
			this.selectMarker(this.insertMarker(mousePos));
			this.setState(WARP_STATES.insert);
		case WARP_STATES.select:
			//this.selectedMarker = undefined;
			//this.setState(WARP_STATES.idle);
		
		case WARP_STATES.moving:
		
		case WARP_STATES.dropped:
		
		case WARP_STATES.del:
		
		case WARP_STATES.processing:
		
		default:
			// do nothing
	
	}	
	//this.insertMarker(this.getRelativePos(mousePos).x);
}


AudioWarper.prototype.draw = function(app){
	CanvasItem.prototype.draw.call(this,app,[AudioClipTimeDisplay,WarpMarker]);
}


/*--------------------------------------------------

Interface: 		WarpMarker 
Description:	This class represents information 
				regarding the points that the user
				would like to warp.
				
---------------------------------------------------*/


WarpMarker.inheritsFrom(CanvasItem);

function WarpMarker(args){
	CanvasItem.call(this,args);

	this.setMarkerPos = function(mousePos){
		var pos = this.getParent().getRelativePos(mousePos).x
		this.markerPos = pos;
		if(this.originalPos == undefined){
			this.originalPos = this.markerPos;
		}
		this.setX(this.markerPos-this.getWidth()/2);
		
		if(this.displays.left == undefined && this.displays.right == undefined){
			try{
				this.insert();
			}catch(e){
				console.error(e);
			}
		}
		if(this.displays.left instanceof AudioClipTimeDisplay){
			if(this.originalSizes.left == undefined)
				this.originalSizes.left = this.displays.left.getWidth();
			this.displays.left.setRight(this.markerPos);
		}
		
		if(this.displays.right instanceof AudioClipTimeDisplay){
			if(this.originalSizes.right == undefined)
				this.originalSizes.right = this.displays.right.getWidth();
			this.displays.right.setLeft(this.markerPos);
		}		
	}
	
	this.getWarpRatios = function(){
		var ratioRight = ratioLeft = 1.0;
		try{
			if(this.originalSizes.left != undefined && this.originalSizes.right != undefined){
				ratioLeft = this.displays.left.getWidth()/this.originalSizes.left;
				ratioRight = this.displays.right.getWidth()/this.originalSizes.right;
			}
		}catch(e){
			console.error(e);
			throw e;
		}
		return {left:ratioLeft,right:ratioRight};
	}
	
	this.remove = function(){
		
		// To do: make the following code work so that an individual marker can be removed,
		// i.e. since we have a sort of linked list (markers pointing to their displays)
		// we need to update the list entries for adjacent nodes.
		/*
		this.displays.original.clip.nextClip = this.displays.right.clip;
		this.displays.original.markerRight = this.displays.right.markerRight;
		this.displays.original.markerLeft = this.displays.left.markerLeft;
		
		if(this.displays.original.markerLeft instanceof WarpMarker){
			this.displays.original.markerLeft.displays.right = this.displays.original;
			this.displays.original.markerLeft.displays.left.nextClip = this.displays.original.clip;
			this.displays.original.markerLeft.originalSizes.right = this.displays.original.getWidth();
		}
		
		if(this.displays.original.markerRight instanceof WarpMarker){
			this.displays.original.markerRight.displays.left = this.displays.original;
			this.displays.original.markerRight.displays.left.nextClip = this.displays.original.clip;
			this.displays.original.markerRight.originalSizes.left = this.displays.original.getWidth();
		}
		*/
		
		if(this.displays.left instanceof AudioClipTimeDisplay){	
			this.getParent().removeClipDisplay(this.displays.left)
			delete this.displays.left;
		}		
		if(this.displays.right instanceof AudioClipTimeDisplay){
			this.getParent().removeClipDisplay(this.displays.right)
			delete this.displays.right;
		}
		/*
		if(this.displays.original instanceof AudioClipTimeDisplay){
			this.getParent().addClipDisplay(this.displays.original);
		}
		*/
		this.setParent();
		
	}
	
	this.insert = function(){
		try{
			var warper = this.getParent();
			var pos = {x:this.markerPos, y:warper.getY() + warper.getHeight()/2};
			var timeDisplay = warper.getObjectsFromMousePos(pos.x,pos.y,AudioClipTimeDisplay)[0];
			var splitPos = pos.x;
			warper.removeClipDisplay(timeDisplay);		
		
			var newDisplays = timeDisplay.splitDisplay(splitPos);
			this.displays.original = timeDisplay;
			this.displays.left = warper.addClipDisplay(newDisplays.left);
			this.displays.right = warper.addClipDisplay(newDisplays.right);
			
			this.displays.left.clip.nextClip = this.displays.right.clip;
			this.displays.left.markerRight = this;
			this.displays.right.markerLeft = this;
			
			// To Do: need to get the link list of clips sorted out so that they will play themselves,
			// Once this is done, we need to use the mozCurrentSampleOffset() in the audioWriter object
			// so that we can have seamless playback.
			if(this.displays.original.markerLeft instanceof WarpMarker){
				this.displays.original.markerLeft.displays.right = this.displays.left;
				this.displays.left.markerLeft = this.displays.original.markerLeft;
				this.displays.left.markerLeft.displays.left.clip.nextClip = this.displays.left.clip
				this.displays.left.markerLeft.originalSizes.right = this.displays.left.getWidth();
			}
			
			if(this.displays.original.markerRight instanceof WarpMarker){
				this.displays.original.markerRight.displays.left = this.displays.right;
				this.displays.right.markerRight = this.displays.original.markerRight;
				this.displays.right.clip.nextClip = this.displays.right.markerRight.displays.right.clip;
				this.displays.right.markerRight.originalSizes.left = this.displays.right.getWidth();
			}
					
			// To Do: make it so that this code can handle an arbitrary number of markers
			this.displays.left.originalClip = this.displays.left.clip;
			this.displays.right.originalClip = this.displays.right.clip;
			

		}catch(e){
			console.error(e);
			throw(e);
		}
	}


	
	this._init({
		y:this.getParent().getY(),
		width:20,
		height:20,
		displays:{original:undefined,left:undefined,right:undefined},
		originalSizes:{left:undefined,right:undefined},
		originalPos:undefined,
		markerPos:{x:0,y:0},
		name:'WarpMarker',
		id:'WarpMarker'+this.getOID(),
		stroke:{color:[255,0,0],width:1},
		fill:{color:[150]}
	});
	

	
}



WarpMarker.prototype.draw = function(app){
	app.stroke(this.stroke.color);
	var pSize = this.getParent().getSize();
	var lineStart = {x:this.markerPos,y:this.getY()+this.getHeight()};
	app.line(lineStart.x,lineStart.y,lineStart.x,pSize.height);
	CanvasItem.prototype.drawBorder.call(this,app);	
}

WarpMarker.prototype.handleMousePress = function(mousePos){
	var warper = this.getParent();
	if(warper.getState()!=WARP_STATES.processing){
		warper.selectMarker(this);
		warper.setState(WARP_STATES.moving);
		return false;
	}
	
}

/*WarpMarker.prototype.handleMouseRelease = function(mousePos){
	console.log("Should be moving to idle");
	
	if(warper.getState()!=WARP_STATES.insert){
		warper.selectedMarker = this;
		warper.setState(WARP_STATES.moving);
		return false;
	}
	warper.selectedMarker = undefined;
	warper.setState(WARP_STATES.idle);
	warper = this.getParent();
	switch(warper.state){
		case WARP_STATES.idle:
			this.selectedMarker = this.insertMarker(mousePos);
			this.setState(WARP_STATES.insert);
		case WARP_STATES.select:
			//this.selectedMarker = undefined;
			//this.setState(WARP_STATES.idle);
		
		case WARP_STATES.moving:
		
		case WARP_STATES.dropped:
		
		case WARP_STATES.del:
		
		case WARP_STATES.processing:
		
		default:
			// do nothing
	
	}
	
}*/

/*WarpMarker.prototype.handleMouseDrag = function(mousePos){

}*/

