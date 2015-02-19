window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60); };;

window.addEventListener("load", function()
{
	var
		canvas = document.getElementById("display"),
		context = canvas.getContext("2d"),
		game = new GameManager(canvas),
		update = Date.now(),
		inputs = document.getElementsByTagName("input"),
		selects = document.getElementsByTagName("select"),
		options = document.getElementsByTagName("option");

	for(var i=0; i<options.length; i++)
		options[i].style.fontFamily = options[i].value = options[i].innerHTML;

	for(var i=0; i<inputs.length; i++) {
		inputs[i].value = Constants[inputs[i].id];
		inputs[i].addEventListener("change", function() {
			if(this.value.charAt(0) == "#")
				Constants[this.id] = this.value;
			else
				Constants[this.id] = parseFloat(this.value);
		});
	}

	for(var i=0; i<selects.length; i++) {
		selects[i].value = Constants[selects[i].id];
		selects[i].addEventListener("change", function() {
			Constants[this.id] = this.value;
		});
	}

	function resize() {
		canvas.width = canvas.height = Math.min(document.body.offsetWidth-300, document.body.offsetHeight);
	}
	resize();
	window.addEventListener("resize", resize);

	function paint()
	{
		var now = Date.now();
		if(now > update) {
			//time has passed; update game state
			game.update((now - update)/1000.0);
			update = now;
		}
		context.fillStyle = Constants.backgroundColor;
		context.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
		game.paint(context);
		window.requestAnimationFrame(paint);
	}
	window.requestAnimationFrame(paint);
});
