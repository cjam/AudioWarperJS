/*--------------------------------------------------

Function: 		copyTypedArray
Description:	This functions copies the values from
				one typed javascript array to another.
				
				
---------------------------------------------------*/

function copyTypedArray(source,target,sourceOffset,targetOffset,length){
	sourceOffset = (sourceOffset == undefined || sourceOffset < 0)? 0 : parseInt(sourceOffset);
	targetOffset = (targetOffset == undefined || targetOffset < 0)? 0 : parseInt(targetOffset);
	
	var targetLength = (length == undefined)? target.length : parseInt(length);
	var targetStart = targetOffset;
	var sourceStart = sourceOffset;
	var sourceEnd = source.length - 1;
	
	var sourceVal
	for(var i = 0;i<targetLength-targetStart;++i){
		sourceVal = source[sourceStart+i];
		if(!isNaN(sourceVal)){
			target[i+targetStart] = sourceVal;
		}
	}

}

function fftShift(buffer){
	len = buffer.length;
	var tmp;
	for(var i = 0;i<len/2;++i){
		tmp = buffer[i];
		buffer[i] = buffer[len/2+i];
		buffer[len/2 + i] = tmp;
	}
}

function getRange(arr){
	var min = arr[0], max = arr[0];
	var val;
	for(var i = 0; i< arr.length; ++i){
		val = arr[i];
		min = Math.min(val,min);
		max = Math.max(val,max);
	}
	return {min:min,max:max}
}