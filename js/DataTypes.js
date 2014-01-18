/*--------------------------------------------------

Data Type: 		UniqueArray	 
Description:	This object is an extension of the
				built in javascript array object 
				which maintains that each entry
				in the array is unique.
				
---------------------------------------------------*/

function UniqueArray(){
	Array.call(this);
}
UniqueArray.prototype = new Array();

UniqueArray.prototype.merge = function(arrObj){
	if(arrObj instanceof Array){
		for(var i=0;i<arrObj.length;++i){
			this.add(arrObj[i]);
		}
	}
}

UniqueArray.prototype.insert = function(obj){
	if(obj!=undefined){
		for(var i=0;i<this.length;++i){
			if(this[i] == obj){
				return;
			}
		}
		this.push(obj);
	}
}

UniqueArray.prototype.has = function(obj){
	if(obj!=undefined){
		for(var i=0;i<this.length;++i){
			if(this[i] == obj){
				return i;
			}
		}
	}
	return -1;
}

UniqueArray.prototype.remove = function(obj){
	if(obj!=undefined){
		index = this.has(obj);
		if(index != -1){
			return this.splice(index,1);
		}
	}	
	return undefined;
}
