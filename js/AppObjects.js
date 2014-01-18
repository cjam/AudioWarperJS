/* Returns the class name of the argument or undefined if
   it's not a valid JavaScript object.
*/
function getObjectClass(obj) {
    if (obj && obj.constructor && obj.constructor.toString) {
        var arr = obj.constructor.toString().match(
            /function\s*(\w+)/);

        if (arr && arr.length == 2) {
            return arr[1];
        }
    }

    return undefined;
}

var cleanValue = function(value,_default,valueOut){
	try{
		output = ( valueOut == undefined ) ? value : valueOut ;
	}catch(e){
		value = undefined;
	}
	return ( value == undefined) ? _default : output;
}

String.prototype.title = function(){
	return this.replace(/^\w/, function($0) { return $0.toUpperCase()});
}

/*--------------------------------------------------

Interface: 		HasSize 
Description:	This interface will be inhertied from
				by classes that have a size.
				
---------------------------------------------------*/


HasSize = {
	setWidth : function(w){
		this.width = cleanValue(w,0,parseInt(w));
		return this;
	},
	getWidth : function(){
		return this.width || 0;
	},
	setHeight : function(h){
		this.height = cleanValue(h,0,parseInt(h));
		return this;
	},
	getHeight : function(){
		return this.height || 0;
	},
	getSize : function(){
		return {width:this.width,height:this.height};
	},
	setSize : function(size){
		size = cleanValue(size,{width:0,height:0});
		this.setWidth(size.width).setHeight(size.height);
	}
}

/*--------------------------------------------------

Interface: 		HasPos 
Description:	This interface will be inhertied from
				by classes that have a position.
				
---------------------------------------------------*/

HasPos = {
	setX : function(x){
		this.x = cleanValue(x,0,parseInt(x));
		return this;
	},
	getX : function(){
		return this.x || 0
	},
	setY : function(y){
		this.y = cleanValue(y,0,parseInt(y));
		return this;
	},
	getY : function(){
		return this.y || 0;
	},
	getPos : function(){
		return {x:this.getX(),y:this.getY()};
	},
	setPos : function(pos){
		pos = cleanValue(pos,{x:0,y:0});
		this.setX(pos.x).setY(pos.y);
		return this;
	},
	setAbsolutePos : function(pos){
		pos = cleanValue(pos,{x:0,y:0});
		var p = this.getParent();
		if(p){
			var parentPos = p.getAbsolutePos();
			var posDifference = pos;
			posDifference.x -= parentPos.x;
			posDifference.y -= parentPos.y;
			this.setPos(posDifference);
		}else{
			this.setPos(pos);
		}
		
		
	},
	getAbsolutePos : function(){
		var trans = this.getPos();
		var p = this.getParent();
		if(p){
			var tmpTrans;
			tmpTrans = p.getAbsolutePos();
			trans.x += tmpTrans.x;
			trans.y += tmpTrans.y;
		}
		return trans;
	},
	getRelativePos : function(pos){
		var absPos = this.getAbsolutePos();
		return {x:pos.x-absPos.x,y:pos.y-absPos.y}
	}
}


/*--------------------------------------------------

Interface: 		AppObject 
Description:	This class represents a base object
				in the application.  It contains
				name, id and parent/children relationship
				information.
				
argList: 	name - name of display (defaults to fftDisplay)
			id - id of the display (defaults to fftDisplay + ObjectID)
			parent - parent of the object
---------------------------------------------------*/

function AppObject(args){
	// To do: create hash table that every object gets placed in to allow for
	// quick searching for objects inside of other objects?  Maybe this functionality to go
	// in the MainApplication object
	this.args = cleanValue(args,{});
	var params = {}
	if(this.args.instance != undefined){
		var newArgs = this.args.instance.getArgs();
		newArgs.id = undefined;
		for(var key in this.args){
			if(key != 'addPrototype' && key != 'instance'){
				newArgs[key] = this.args[key];
			}
		}		
		this.args = newArgs;
	}
	
	this._init = function(argList){
		try{
			for(var key in argList){
				if(key != 'addPrototype'){
					if(this['set'+key.title()] instanceof Function){
						this['set'+key.title()](cleanValue(this.args[key],argList[key]));
					}else{
						this[key] = cleanValue(this.args[key],argList[key]);
					}
					params[key] = this[key];
					// To do: autmatically create setters and getters
				}
			}
		}catch(e){
			// somthing happened
		}
	}
		
	///////////////////////////////////////////////////
	// Private variables for holding unique object id
	///////////////////////////////////////////////////
	var OID = ++AppObject.staticObjectCount;
	this.getOID = function(){
		return OID;
	}
	///////////////////////////////////////////////////
	var children = new UniqueArray();
	
	// Handling parent children relationships
	this.hasChild = function(child){
		return children.has(child);
	}
	this.removeChild = function(child){
		if(child!=undefined){
			children.remove(child);
			child.parent = undefined;
		}
		return this;
	}
	this.addChild = function(child){
		if(child != undefined){
			try{
				child.getParent().removeChild(child);
			}catch(e){
				// handle errors
			}
			child.parent = this;
			this.args.parent = this;
			children.insert(child);
		}
		return this;
	}
	this.addChildren = function(arr){
		try{
			for(var i = 0;i<arr.length;++i){
				this.addChild(arr[i]);
			}
		}catch(e){
			// probably incompatable
		}
	}
	this.setChildren = function(list){
		this.clearChildren();
		this.addChildren(list);
	}
	this.clearChildren = function(){
		for(child in this.getChildren()){
			try{
				child.setParent();
			}catch(e){
				// something went wrong
			}
		}
	}	
	this.getChildren = function(type){
		// To do: change type argument to general args list,
		// then allow filtering and different object properties i.e. name, id
		if(type == undefined){
			return children;
		}else{
			var tmpList = new Array();
			var child;
			for(var i=0;i<children.length;++i){
				child = children[i];
				if(child instanceof type){
					tmpList.push(child)
				}
			}
			return tmpList;
		}
	}
	this.getParent = function(){
		return this.parent;
	}
	this.setParent = function(newParent){
		if(newParent==undefined){
			try{
				this.getParent().removeChild(this);
			}catch(e){
				// handle errors
			}
		}else{
			try{
				newParent.addChild(this);			
			}catch(e){
				// handle errors
			}
		}
		return this;
	}
	
	this.setEnabled = function(value){
		this.enabled = cleanValue(value,true);
	}
	
	this.getArgs = function(){
		for(var key in this.args){ 
			if(key != 'addPrototype'){
				//this[key] = cleanValue(this.args[key],argList[key]);
				params[key] = this[key];
				// To do: autmatically create setters and getters
			}
		}
		return params;
	}
	
	this._init({
		name:'AppObject',
		displayName: 'Application Object',		
		id:'AppObject'+this.getOID(),
		parent:undefined,
		children:[],
		enabled:true		
	});
		// To do: move this to the appropriate location in this file

	/*
	this.valueOfChildren = function(){
		var str = '';
		for(var i=0;i<this.children.length;++i){
			str += this.children[i].valueOf();
		}
		return str;
	}
	this.valueOf = function(){
		var str = "<div id='"+this.getId()+"' style='"+this.getStyle()+"'>"
		str = str + this.getName();
		str = str + this.valueOfChildren();
		str = str + "</div>";
		return str;
	}
*/

	/* future
	// allow objects to declare their own depencies so that app
	// can collect dependencies at runtime and include them
	this.getDependencies = function(){
		return AppObject.staticDependencies;
	}
	this.addDependency = function(dependency){
		if(dependency!=undefined){
			AppObject.staticDependencies.insert(dependency);
		}
		return this;
	}
	*/
	
}

AppObject.prototype.attachControls = function(selector, objectList){
	if(selector != undefined){
		var str = "<fieldset name='"+this.name+"_controls' >";
		str += "<legend>"+this.displayName.title()+"</legend>";
		str += "<div name='body'></div>";
		str += "</fieldset>"
		try{
			if(this.getControls instanceof Function || this.getActions instanceof Function){
				$(selector).append(str);
				selector += " fieldset[name='"+this.name+"_controls'] div[name='body']";
				var controlBox = $(selector);
				controlBox.append(this.getControls());
				this.bindControls();
				var actions = this.getActions();
				controlBox.append(actions);
				this.bindActions()
			}
		}catch(e){
			// must not have the proper
		}
		children = cleanValue(objectList,this.getChildren())
		var child;
		for(var i = 0;i < children.length; ++i){
			child = children[i];
			try{
				child.attachControls(selector)
			}catch(e){
				// child might not have either method
				console.error(e);
			}
		}
	}
}

AppObject.staticObjectCount = 0;

/*
AppObject.staticDependencies = new UniqueArray();
AppObject.includeDependencies = function(){
	var dependencies = AppObject.staticDependencies;
	var regPat=/([a-zA-Z0-9]{1,4}$)/gim;
	var dependency;
	var extension;
	var head = $('head');
	for(var i=0;i<dependencies.length;++i){
		dependency = dependencies[i];
		extension = dependency.match(regPat)[0].toLowerCase();
		console.log(dependency,extension); 
		var element;
		if(extension=='js'){
			element = document.createElement('script');
			element.type = 'text/javascript';
			element.src = dependency;
		}else if(extension=='css'){
			element = document.createElement('link');
			element.type = 'text/css';
			element.rel = 'stylesheet';
			element.href = dependency;
		}else if(extension=='cl'){
			console.log('webcl kernel dependency');
		}
		if(element != "undefined"){
			console.log(head,element);
			element.onload = function() { console.log(dependency,"loaded");}
			//head.append(element);
		}
	}
}
*/

// DISPLAY ITEM - Has position and size information

DisplayItem.inheritsFrom(AppObject).inheritsFrom(HasSize).inheritsFrom(HasPos);
function DisplayItem(args){
	AppObject.call(this,args);

	this.setLeft = function(pos){
		var w = this.getWidth();
		var x = this.getX();
		this.setX(pos);
		this.setWidth(w+(x-pos));
	}
	
	this.setRight = function(pos){
		this.setWidth(pos-this.getX());
	}

	this._init({
		x:0,y:0,
		width:0,height:0
	});
	
}


HtmlItem.inheritsFrom(DisplayItem)
function HtmlItem(args){
	DisplayItem.call(this,args);
	var classes = new UniqueArray();
	// public variables
	
	this.getStyle = function(){
		return this.style;
	}
	this.setStyle = function(value){
		this.style = cleanValue(value,"");
		return this;
	}
	this.setClasses = function(list){
		this.clearClasses();
		this.addClasses(list);
	}
	this.getClasses = function(){
		return classes;
	}
	this.addClass = function(value){
		classes.insert(value);
		return this;
	}
	this.addClasses = function(list){
		// for loop through list and add classes
		for(clss in list){
			this.addClass(clss);
		}
	}
	this.removeClass = function(value){
		classes.remove(value);
		return this;
	}
	this.clearClasses = function(){
		for(clss in classes){
			this.remove(clss)
		}
	}
	this._init({style:'',classes:[]});
	

}


MainApplication.inheritsFrom(DisplayItem);
function MainApplication(args){
	DisplayItem.call(this,args);

	var appCanvas = document.createElement("CANVAS");
	appCanvas.id = this.id+"_canvas";
	appCanvas.width = this.getWidth();
	appCanvas.height = this.getHeight();
	appCanvas.innerHTML = "Your browser does not support the canvas element.";
	
	$("#"+this.id).append(appCanvas);
	var context = appCanvas.getContext("2d");
	var self = this;
	
	var draw = function(){
		try{
			this.processing.background();
		}catch(e){
			//processing most likely not defined
		}
		var children = self.getChildren();
		for(var i = 0;i<children.length;++i){
			try{
				
				children[i].draw(self);
			}catch(e){
				// catch errors most likely doesn't have clear method
				console.error(e);
			}
		}
	}
	
	var clear = function(){
		/*
		var children = self.getChildren();
		for(var i = 0;i<children.length;++i){
			try{
				children[i].clear(self);
			}catch(e){
				// catch errors most likely doesn't have clear method
			}
		}
		*/
	}
	
	this.sketchProc = function(processing){
		processing.draw = draw;
	}
	
	this.getContext = function(){
		return context;
	}
	
	this.getCanvas = function(){
		return appCanvas;
	}
	
	this.render = function(){
		clear();
		draw();
	}

	this._init({updateInterval:200})
	
}

MainApplication.prototype.init = function(){
	this.initProcessing();
	this.setUpdateInterval(this.updateInterval);
}

MainApplication.prototype.initProcessing = function(){
	if(typeof Processing !== 'undefined'){
			var canv = this.getCanvas();
			this.processing = new Processing(canv,this.sketchProc);
			this.processing.size(canv.width,canv.height);
			this.processing.background("#FFFFFF");
			
			var self = this;
			
			this.processing.mousePressed = function(){
				var mousePos = {x:this.mouseX, y:this.mouseY, px:this.pmouseX, py:this.pmouseY}
				self.processingMousePressed(mousePos);
			}
			this.processing.mouseReleased = function(){
				var mousePos = {x:this.mouseX, y:this.mouseY, px:this.pmouseX, py:this.pmouseY}
				self.processingMouseReleased(mousePos);
			}	
			this.processing.mouseMoved = function(){
				var mousePos = {x:this.mouseX, y:this.mouseY, px:this.pmouseX, py:this.pmouseY}
				self.processingMouseMove(mousePos);
			}			
			this.processing.mouseDragged = function(){
				var mousePos = {x:this.mouseX, y:this.mouseY, px:this.pmouseX, py:this.pmouseY}
				self.processingMouseDragged(mousePos);
			}
			this.processing.mouseOut = function(){
				var mousePos = {x:this.mouseX, y:this.mouseY, px:this.pmouseX, py:this.pmouseY}
				self.processingMouseOut(mousePos);
			}
			CanvasItem.processing = this.processing;
	}
}

MainApplication.prototype.getUpdateInterval = function(){
	return this.updateInterval;
}

MainApplication.prototype.setUpdateInterval = function(value){
	if(this.processing != undefined){
		if(value>0){
			var fps = 1/(value/1000);
			this.processing.frameRate(fps);
		}else{
			this.processing.frameRate(0);
		}
	}else{
		if(this.intervalID != undefined){
			clearInterval(this.intervalID);
		}
		this.updateInterval = value;
		if(this.updateInterval > 0){
			var t = this;
			this.intervalID = setInterval(function(){t.render()},this.updateInterval);
		}else{
			this.intervalID = undefined;
		}
	}
}

MainApplication.prototype.getObjectsFromMousePos = function(x,y){
	var children = this.getChildren();
	var hitList = new Array();
	var tmpList;
	for(var i = 0; i < children.length; ++i){
		try{
			hitList = children[i].getObjectsFromMousePos(x,y);
			//tmpList = children[i].getObjectsFromMousePos(x,y);
			// if(tmpList.length > 0){
				// for(var j=0;j<tmpList.length;++j){
					// hitList.push(tmpList[j]);
				// }
			// }
		}catch(e){
			// The object probably doesn't have hit test methods, not a big deal
		}
	}
	return hitList;
}

// PROCESSING.JS UI METHODS

MainApplication.prototype.processingMouseMove = function(mousePos){
	// if Processing.js is being used, the mouseMove function will be attached to this method
	var objects = this.getObjectsFromMousePos(mousePos.x,mousePos.y);
	for(var i = 0;i<objects.length; ++i){
		if(objects[i].enabled == true){
			try{
				if(objects[i].handleMouseMove(mousePos) == false)
					return;
			}catch(e){
				// probably doesn't have the handler, not a big deal
			}
		}
	}
}

MainApplication.prototype.processingMousePressed = function(mousePos){
	// if Processing.js is being used, the mousePressed function will be attached to this method
	var objects = this.getObjectsFromMousePos(mousePos.x,mousePos.y);
	
	for(var i = 0;i<objects.length; ++i){
		if(objects[i].enabled == true){
			try{
				if(objects[i].handleMousePress(mousePos) == false)
					return;
			}catch(e){
				// probably doesn't have the handler, not a big deal
			}
		}
	}
}

MainApplication.prototype.processingMouseReleased = function(mousePos){
	// if Processing.js is being used, the mouseReleased function will be attached to this method
	var objects = this.getObjectsFromMousePos(mousePos.x,mousePos.y);
	for(var i = 0;i<objects.length; ++i){
		if(objects[i].enabled == true){
			try{
				if(objects[i].handleMouseRelease(mousePos) == false)
					return;
			}catch(e){
				// probably doesn't have the handler, not a big deal
			}
		}
	}
}

MainApplication.prototype.processingMouseDragged = function(mousePos){
	// if Processing.js is being used, the mouseReleased function will be attached to this method
	var objects = this.getObjectsFromMousePos(mousePos.x,mousePos.y);
	for(var i = 0;i<objects.length; ++i){
		if(objects[i].enabled == true){
			try{
				if(objects[i].handleMouseDrag(mousePos) == false)
					return;
			}catch(e){
				// probably doesn't have the handler, not a big deal
			}
		}
	}
}

MainApplication.prototype.processingMouseOut = function(mousePos){
	mousePos.x = mousePos.px;
	mousePos.y = mousePos.py;
	this.processingMouseReleased(mousePos);
}

// PRIMITIVE DRAWING METHODS

MainApplication.prototype.circle = function(x,y,r) {
	if(this.processing != undefined){
		this.processing.ellipse(x,y,r,r);
	}else{
		var ctx = this.getContext();
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI*2, true);
	}
}

MainApplication.prototype.rect = function(x,y,w,h) {
	if(this.processing != undefined){
		this.processing.rect(x,y,w,h);
	}else{
		var ctx = this.getContext();
		ctx.beginPath();
		ctx.rect(x,y,w,h);
		ctx.closePath();
	}
}

MainApplication.prototype.line = function(xStart,yStart,xEnd,yEnd) {
	if(this.processing != undefined){
		this.processing.line(xStart,yStart,xEnd,yEnd);
	}else{
		var ctx = this.getContext();
		ctx.beginPath();
		ctx.moveTo(xStart,yStart);
		ctx.lineTo(xEnd,yEnd);
		ctx.closePath();
	}
}

MainApplication.prototype.point = function(x,y) {
	if(this.processing != undefined){
		this.processing.point(x,y);
	}else{
		this.circle(x,y,0.5);
	}
}

MainApplication.prototype.stroke = function(color) {
	if(this.processing != undefined){
		if(color == undefined){
			this.processing.noStroke();
		}else{
			this.processing.stroke(color[0],color[1],color[2],color[3]);
		}
	}else{
		// To do:  color is now coming in as an array for processing.js to work
		// change this implementation to use the same format
		/*
		var ctx = this.getContext();
		ctx.strokeStyle = c;
		ctx.stroke();
		*/
	}
}

MainApplication.prototype.fill = function(color) {
	if(this.processing != undefined){
		if(color == undefined){
			this.processing.noFill();
		}else{
			this.processing.fill(color[0],color[1],color[2],color[3]);
		}
	}else{
		// To do:  color is now coming in as an array for processing.js to work
		// change this implementation to use the same format
		/*
		var ctx = this.getContext();
		ctx.fillStyle = color;
		ctx.fill();
		*/
	}
}

MainApplication.prototype.fillText = function(text,color,x,y) {
	if(this.processing != undefined){
		
	}else{
		var ctx = this.getContext();
		ctx.fillStyle = color;
		ctx.font = '14px Calibri';
		ctx.textBaseline = 'top';
		ctx.fillText(text, x, y);
	}
}

MainApplication.prototype.clearRect = function(x,y,width,height) {
	/*
	if(this.processing != undefined){
		// do nothing
	}else{
		this.getContext().clearRect(x,y,width,height);
	}
	*/
}

MainApplication.prototype.clearAll = function() {	
	/*
	if(this.processing != undefined){
		// do nothing
	}else{
		this.getContext().clearRect(0,0,this.getCanvas().width,this.getCanvas().height);
	}
	*/
}

MainApplication.prototype.pushMatrix = function(){
	if(this.processing != undefined){
		this.processing.pushMatrix();
	}else{
		this.getContext().save();
	}
}

MainApplication.prototype.popMatrix = function(){
	if(this.processing != undefined){
		this.processing.popMatrix();
	}else{
		this.getContext().restore();
	}
}

MainApplication.prototype.translate = function(x,y,z){
	if(this.processing != undefined){
		this.processing.translate(x,y,z);
	}else{
		this.getContext().translate(x,y);
	}
}

MainApplication.prototype.scale = function(x,y,z){
	if(this.processing != undefined){
		this.processing.scale(x,y,z);
	}else{
		//this.getContext().translate(x,y);
	}
}

/*--------------------------------------------------

Object: 		CanvasItem 
Description:	This interface will be inhertied from
				by classes which will be included in a canvas.
				
argList: 	size - size of display
			pos - position of display (rel to parent)
			name - name of display (defaults to fftDisplay)
			id - id of the display (defaults to fftDisplay + ObjectID)
---------------------------------------------------*/

// Inherits from base object and from the HasSize interface
CanvasItem.inheritsFrom(DisplayItem);

function CanvasItem(args){
	DisplayItem.call(this,args);
	// Todo: perhaps this information could be held within the style to use
	// regular css, that would be awesome.
	this._init({
		fill:{color:undefined},
		stroke:{color:[0],width:1},
		disabledStyle:{
			stroke:{color:[140]},
			fill:{color:undefined}
		}
	})
}

CanvasItem.prototype.getStrokeColor = function(){
	if(this.enabled){
		return this.stroke.color;
	}else{
		return this.disabledStyle.stroke.color;
	}
}
	
CanvasItem.prototype.getFillColor = function(){
	if(this.enabled){
		return this.fill.color;
	}else{
		return this.disabledStyle.fill.color;
	}
}

CanvasItem.prototype.draw = function(app,childSelector){
	// draw border
	this.drawBorder(app);
	this.drawChildren(app,childSelector);
}

CanvasItem.prototype.drawChildren = function(app,childSelector){
	var children;
	if(childSelector != undefined){
		var childType;
		for(var j = 0; j < childSelector.length; ++j){
			childType = childSelector[j];
			children = this.getChildren(childType);
			if(children.length > 0){
				app.pushMatrix();
				app.translate(this.getX(),this.getY());
				for(var i = 0;i<children.length;++i){
					try{
						children[i].draw(app);
					}catch(e){
						// catch errors
					}
				}
				app.popMatrix();
			}
		}
		
	}else{
		children = this.getChildren();
		if(children.length > 0){
			app.pushMatrix();
			app.translate(this.getX(),this.getY());
			for(var i = 0;i<children.length;++i){
				try{
					children[i].draw(app);
				}catch(e){
					// catch errors
				}
			}
			app.popMatrix();
		}
	}
}

CanvasItem.prototype.getObjectsFromMousePos = function(x,y,type){
	var hitList = new Array();
	if( this.hitTest(x,y) ){
		var children = this.getChildren();
		var tmpList;
		for(var i = 0; i < children.length; ++i){
			tmpList = children[i].getObjectsFromMousePos(x,y);
			if(tmpList.length > 0){
				for(j=tmpList.length-1;j>=0;--j){
					hitList.push(tmpList[j]);
				}
			}
		}
		if( type != undefined ){
			if(this instanceof type){
				hitList.push(this);
			}
		}else{
			hitList.push(this);
		}
	}
	return hitList;
}

CanvasItem.prototype.hitTest = function(x,y){
	var s = this.getSize();
	var p = this.getAbsolutePos();
	return ( ( x >= p.x ) && ( x <= p.x + s.width) ) && ( ( y >= p.y ) && ( y <= p.y + s.height) );
}

CanvasItem.prototype.drawBorder = function(app){
	if(this.stroke.width > 0)
		app.stroke(this.getStrokeColor());
	var fillColor = this.getFillColor();
	if(fillColor != undefined)
		app.fill(fillColor);
	
	var pos = this.getPos();
	var size = this.getSize();
	app.rect(pos.x,pos.y,size.width,size.height);
	
	app.stroke();
	app.fill();
}

CanvasItem.prototype.update = function(app){
	this.clearAll(app);
	this.draw(app);
}

CanvasItem.prototype.clearAll = function(app){
	app.clearAll();
}

CanvasItem.prototype.clear = function(app){
	this.clearAll(app);
}


CanvasItem.prototype.handleMouseMove = function(mousePos){
	// does nothing by default
}
CanvasItem.prototype.handleMousePress = function(mousePos){
	// does nothing by default
}
CanvasItem.prototype.handleMouseRelease = function(mousePos){
	// does nothing by default
}
CanvasItem.prototype.handleMouseDrag = function(mousePos){
	// does nothing by default
}

/*--------------------------------------------------

Object: 		ObjectParameter 
Description:	This object (and any children)'s 
				constructor can be called from any
				object to define the appropriate 
				parameter for the object.  Each of
				the ObjectParameter objects will 
				automatically add the appropriate
				methods to the object to enable 
				controllers to interact with the
				model.
Example:

function TestObject(){
	ObjectParameter.call(this,'NotherParam','12','General Paramter');
	IntParameter.call(this,'TestParam','12','Int Parameter');
	FloatParameter.call(this,'FloatTest','12','Float Parameter');
}

var test1 = new TestObject();
console.log(test1)

Output:

TestObject
	FloatTest: 12
	NotherParam: "12"
	TestParam: 12
	bindControls: function (){
	getControls: function (){
	getFloatTest: function (){
	getNotherParam: function (){
	getTestParam: function (){
	parameters: UniqueArray[3]
	setFloatTest: function (val){
	setNotherParam: function (value){
	setTestParam: function (val){
	__proto__: TestObject

---------------------------------------------------*/


ObjectParameter.parameterCount = 0;

function ObjectParameter(parameterName,defaultVal,displayName){
	var PID = ObjectParameter.parameterCount++;
	this.inputType = 'text'
	
	// SHOULD ADD REGEX TO CHECK that funcName doesn't start with a number
	if(displayName==undefined)
		displayName = parameterName;
	
	var getter = 'get'+parameterName.title();
	var setter = 'set'+parameterName.title();
	var setterProcess = setter+'Processing';

	var paramInfo = new Array();
	paramInfo['name'] = parameterName;
	paramInfo['display'] = displayName;
	paramInfo['PID'] = PID;
	paramInfo['id'] = ObjectParameter.getControlId(paramInfo);
	paramInfo['getter'] = getter;
	paramInfo['setter'] = setter;	


	this[getter] = function(){
		return this[paramInfo['name']];
	}
	this[setter] = function(value){
		if(this[setterProcess] != undefined)
			value = this[setterProcess](value);
		
		this[paramInfo['name']] = value;
		$("#"+paramInfo['id']).unbind('change');
		$("#"+paramInfo['id']).val(value);
		$("#"+paramInfo['id']).bind('change',{appObject:this, setter:paramInfo['setter']},function(e){e.data.appObject[e.data.setter]($(this).val());});
		return this;
	}
	

	if(this.parameters == undefined)
		this.parameters = new UniqueArray();
	
	if(this.getControls == undefined)
		this.getControls = ObjectParameter.getControls;
		
	if(this.bindControls == undefined)
		this.bindControls = ObjectParameter.bindControls;
	
	this.parameters.insert(paramInfo);
	ObjectParameter.setValue.call(this,parameterName,defaultVal)
}

ObjectParameter.getControlId = function(info){
	return info['name'].toLowerCase().replace(" ","_") + "_" + info['PID'];
}

ObjectParameter.getControls = function(){
	disabledText = "";
	controls = "";
	var info;
	for(var i = 0;i<this.parameters.length;++i){
		info = this.parameters[i];
		controls = controls + "\n<div><label>"+info['display']+" : </label><input "+disabledText+" type='text' id='"+ObjectParameter.getControlId(info)+"' value='"+this[info['getter']]()+"' /></div>";
	}
	return controls;
}

ObjectParameter.bindControls = function(){
	// May have to add some code later to deal with disabled controls.
	var info;
	for(var i = 0;i<this.parameters.length;++i){
		info = this.parameters[i];
		$("#"+ObjectParameter.getControlId(info)).bind('change',{appObject:this, setter:info['setter']},function(e){e.data.appObject[e.data.setter]($(this).val());});
	}
	return this;
}


/*
ObjectParameter.changeSetter = function(parameterName,newSetter){
	var info;
	for(var i = 0;i<this.parameters.length;++i){
		info = this.parameters[i];
		if(info['name'] == parameterName){
			this[info['setter']] = newSetter;
			break;
		}		
	}
}

ObjectParameter.changeGetter = function(parameterName,newGetter){
	var info;
	for(var i = 0;i<this.parameters.length;++i){
		info = this.parameters[i];
		if(info['name'] == parameterName){
			this[info['getter']] = newGetter;
			break;
		}		
	}
}
*/

ObjectParameter.setPreprocessor = function(parameterName,func){
	var info;
	for(var i = 0;i<this.parameters.length;++i){
		info = this.parameters[i];
		if(info['name'] == parameterName){
			this[info['setter']+'Processing'] = func;
			break;
		}		
	}
}

ObjectParameter.setValue = function(parameterName,value){
	this['set'+parameterName.title()](value);
}


/*--------------------------------------------------

Object: 		IntParameter 
Description:	Specifies an integer parameter.
				
---------------------------------------------------*/

function IntParameter(parameterName,defaultVal,displayName){
	ObjectParameter.call(this,parameterName,defaultVal,displayName);
	ObjectParameter.setPreprocessor.call(this,parameterName,function(val){
		return parseInt(val);
	})
	ObjectParameter.setValue.call(this,parameterName,defaultVal)
}

/*--------------------------------------------------

Object: 		FloatParameter 
Description:	Specifies a float parameter.
				
---------------------------------------------------*/

function FloatParameter(parameterName,defaultVal,displayName){
	ObjectParameter.call(this,parameterName,defaultVal,displayName);
	ObjectParameter.setPreprocessor.call(this,parameterName,function(val){
		return parseFloat(val);
	})
	ObjectParameter.setValue.call(this,parameterName,defaultVal)
}

/*
function ColorParameter(name, id, value, parent){
	ObjectParameter.call(this, name, id, value, parent);
	this.addDependency("jscolor/jscolor.js");
}
*/



/*--------------------------------------------------

Object: 		ObjectAction 
Description:	This object (and any children)'s 
				constructor can be called from any
				object to define an appropriate 
				action for the object.  An action 
				represents a function that will be 
				triggered via a button (by default)
Example:

function TestObject(){
	ObjectAction.call(this,'Say hello',this.hello);
	this.hello = function(){
		alert('Hello');
	}
}

Is equivilent to

function TestObject(){
	this.hello = function(){
		alert('hello');
	}
}

test = new TestObject();
ObjectAction.call(test,'Say Hello',test.hello);

Once actions are added to particular object they can be
used in the user interface by invoking the following commands:

test.getActions() => returns a string with the buttons for the user interface
test.bindActions() => * must call after appending the string from getActions() to the DOM

---------------------------------------------------*/


ObjectAction.globalCount = 0;

function ObjectAction(displayName, func){
	var AID = ObjectAction.globalCount++ ;
	
	if(this.objectActions == undefined)
		this.objectActions = new UniqueArray();
		
	if(this.getActions == undefined)
		this.getActions = ObjectAction.getActions;
	
	if(this.bindActions == undefined)
		this.bindActions = ObjectAction.bindActions;
	
	// SHOULD ADD REGEX TO CHECK that funcName doesn't start with a number
	var actionInfo = {AID:AID,displayName:displayName,func:func}
	actionInfo.actionID = ObjectAction.getActionId(displayName,AID);
	
	this.objectActions.insert(actionInfo);	
}

ObjectAction.getActionId = function(display,gid){
	return display.toLowerCase().replace(" ","_") + "_" + gid;
}

ObjectAction.getActions = function(){
	disabledText = "";
	actionText = "";
	var actionInfo;
	for(var i = 0;i<this.objectActions.length;++i){
		actionInfo = this.objectActions[i];
		actionText = actionText + "\n<button "+disabledText+" type='button' id='"+actionInfo.actionID+"' value='"+actionInfo.displayName+"' >"+actionInfo.displayName+"</button>";
	}
	return actionText;
}

ObjectAction.bindActions = function(){
	// May have to add some code later to deal with disabled controls.
	var actionInfo;
	for(var i = 0;i<this.objectActions.length;++i){
		actionInfo = this.objectActions[i];
		$("#"+actionInfo.actionID).bind('click',{appObject:this, func:actionInfo['func']},function(e){e.data.func.call(e.data.appObject);});
	}
	return this;
}



