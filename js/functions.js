Object.prototype.addPrototype = function( parentClassOrObject ){
	for(var propertyName in parentClassOrObject){
		this[propertyName] = parentClassOrObject[propertyName];
	}
}

Function.prototype.inheritsFrom = function( parentClassOrObject ){ 
	//console.log(this.prototype);
	this.prototype.addPrototype( parentClassOrObject );
	if ( parentClassOrObject.constructor == Function ) 
	{ 
		//Normal Inheritance 
		this.prototype.addPrototype( new parentClassOrObject );
		this.prototype.constructor = this;
		this.prototype.__parent__ = parentClassOrObject.prototype;
	} 
	else 
	{ 
		//Pure Virtual Inheritance 
		this.prototype.addPrototype( parentClassOrObject );
		this.prototype.constructor = this;
		this.prototype.__parent__ = parentClassOrObject;
	} 
	return this;
} 

function isInt(x) {
   var y=parseInt(x);
   if (isNaN(y)) return false;
   return x==y && x.toString()==y.toString();
}

String.prototype.title = function(){
	return this.replace(/^\w/, function($0) { return $0.toUpperCase()})
}