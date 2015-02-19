if(localStorage.constants)
	Constants = JSON.parse(localStorage.constants);
else
	Constants = {
		backgroundColor: "#000",
		ballAcceleration: 0.01,
		ballColor: "#fff",
		ballRadius: 0.01,
		ballVelocity: 0.5,
		maxAngle: 60,
		paddleColor: "#fff",
		paddleSize: 0.2,
		paddleThickness: 0.02,
		paddleVelocity: 1.0,
		scoreFontColor: "#808080",
		scoreFontSize: 0.03,
		scoreFontFamily: "Segoe UI, Microsoft Sans Serif, sans-serif",
		scoreOffset: 0.1,
		uiBackground: "rgba(0, 0, 0, 0.5)",
		uiFontColor: "#fff",
		uiFontFamily: "Segoe UI, Microsoft Sans Serif, sans-serif",
		uiFontSize: 0.05,
	}

window.addEventListener("unload", function() {
	localStorage.constants = JSON.stringify(Constants);
})

/**
 * Base class for all game elements. Canvas is a reference to the canvas element, useful for setting up events.
 */
function Drawable(canvas) {
	this.canvas = canvas;
}

/**
 * Function called to update the component's state. 'time' is the amount of seconds passed since the last update, guaranteed to be larger than 0. The first
 * update is considered when the constructor is called.
 */
Drawable.prototype.update = function(time) {}

/**
 * Function called to paint the element on the 2D graphics context 'ctx'.
 */
Drawable.prototype.paint = function(ctx) {}

/**
 * Represents the ball object.
 */
function Ball(canvas) {
	Drawable.apply(this, [canvas]);
	this.reset();
}
Ball.prototype = new Drawable();
Ball.prototype.constructor = Ball;

Ball.prototype.paint = function(ctx) {
	ctx.beginPath();
	ctx.arc(this.x*this.canvas.width, this.y*this.canvas.height, Constants.ballRadius*this.canvas.width, 0, 2*Math.PI, false);
	ctx.fillStyle = Constants.ballColor;
	ctx.fill();
}

Ball.prototype.update = function(time)
{
	this.x += (this.accelerationX * time + this.velocityX) * time;
	this.y += (this.accelerationY * time + this.velocityY) * time;
	this.velocity += this.acceleration * time;
	this.velocityX += this.accelerationX * time;
	this.velocityY += this.accelerationY * time;

	var event = document.createEvent("Event");
	event.initEvent("ballmove", true, false);
	event.ballX = this.x;
	event.ballY = this.y;
	this.canvas.dispatchEvent(event);
}

Ball.prototype.setDirection = function(direction)
{
	this.direction = direction;
	var
		sin = Math.sin(this.direction),
		cos = Math.cos(this.direction);

	this.velocityX = this.velocity * cos;
	this.velocityY = this.velocity * sin;
	this.accelerationX = this.acceleration * cos;
	this.accelerationY = this.acceleration * sin;
}

Ball.prototype.reset = function()
{
	this.x = 0.5;
	this.y = 0.5;
	this.velocity = Constants.ballVelocity;
	this.acceleration = Constants.ballAcceleration;

	var direction = Math.PI/2*Math.random() - Math.PI/4;
	if(Math.random() < 0.5)
		direction += Math.PI;

	this.setDirection(direction);
}

/**
 * Base class for both human and computer players. paints the associated paddle.
 */
function Player(canvas)
{
	Drawable.apply(this, [canvas]);
	this.score = 0;
	this.y = 0.5;
	this.size = Constants.paddleSize;
	this.velocity = 0;
	this.setTarget(0.5);
}
Player.prototype = new Drawable();
Player.prototype.constructor = Player;

Player.prototype.paint = function(ctx)
{
	ctx.fillStyle = Constants.paddleColor;
	ctx.fillRect(
		this.canvas.width*(this.getX() - Constants.paddleThickness/2),
		this.canvas.height*(this.y - Constants.paddleSize/2),
		this.canvas.width*Constants.paddleThickness,
		this.canvas.height*Constants.paddleSize
	);
	this.paintScore(ctx);
}
Player.prototype.update = function(time)
{
	this.y += time * this.velocity;

	//overshot; teleport to target and stop moving
	if((this.velocity > 0 && this.y >= this.target) || (this.velocity < 0 && this.y <= this.target)) {
		this.velocity = 0;
		this.y = this.target;
	}
}

Player.prototype.paintScore = function(ctx) {}

Player.prototype.getX = function(ctx) {}

Player.prototype.setTarget = function(target)
{
	this.target = Math.max(Constants.paddleSize/2, Math.min(1-Constants.paddleSize/2, target));

	//begin moving towards the target
	if(this.y < this.target)
		this.velocity = Constants.paddleVelocity;
	else if(this.y > this.target)
		this.velocity = -Constants.paddleVelocity;
}

/**
 * Represents a mouse controlled paddle.
 */
function HumanPlayer(canvas)
{
	Player.apply(this, [canvas]);

	var self = this;
	canvas.addEventListener("mousemove", function(event) {
		Player.prototype.setTarget.apply(self, [(event.clientY - canvas.offsetTop)/canvas.offsetHeight]);
	});
}
HumanPlayer.prototype = new Player();
HumanPlayer.prototype.constructor = HumanPlayer;

HumanPlayer.prototype.getX = function() {
	return Constants.paddleThickness/2;
}

HumanPlayer.prototype.paintScore = function(ctx) {
	ctx.font = Math.floor(Constants.scoreFontSize * this.canvas.height) + "px " + Constants.scoreFontFamily;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillStyle = Constants.scoreFontColor;
	ctx.fillText("Player    " + this.score, Constants.scoreOffset * this.canvas.width, Constants.scoreOffset * this.canvas.height);
}

/**
 * Represents a computer controller paddle.
 */
function ComputerPlayer(canvas)
{
	Player.apply(this, [canvas]);

	var self = this;
	canvas.addEventListener("ballmove", function(event) {
		Player.prototype.setTarget.apply(self, [event.ballY]);
	});
}
ComputerPlayer.prototype = new Player();
ComputerPlayer.prototype.constructor = ComputerPlayer;

ComputerPlayer.prototype.getX = function() {
	return 1 - Constants.paddleThickness/2;
}

ComputerPlayer.prototype.paintScore = function(ctx) {
	ctx.font = Math.floor(Constants.scoreFontSize * this.canvas.height) + "px " + Constants.scoreFontFamily;
	ctx.textAlign = "right";
	ctx.textBaseline = "top";
	ctx.fillStyle = Constants.scoreFontColor;
	ctx.fillText(this.score + "    Computer", (1-Constants.scoreOffset) * this.canvas.width, Constants.scoreOffset * this.canvas.height);
}

/**
 * Represents the game manager. Handles game logic.
 */
function GameManager(canvas)
{
	this.player = new HumanPlayer(canvas);
	this.computer = new ComputerPlayer(canvas);
	this.ball = new Ball(canvas);
	this.status = "stopped";

	var self = this;
	canvas.addEventListener("click", function(){
		if(self.status == "playing")
			self.status = "paused";
		else
			self.status = "playing";
	});

	window.addEventListener("blur", function(){
		if(self.status == "playing")
			self.status = "paused";
	});

	this.solve = function(a, b, c) {
		//solve second order equation
		var d = b*b - 4*a*c;
		if(d<0)
			throw new Error("No solutions");
		d = Math.sqrt(d);
		a *= 2;
		return [(d-b)/a, (-d-b)/a];
	}

	this.update = function(time)
	{
		if(this.status != "playing")
			return;

		while(true)
		{
			var
				ball = this.ball,
				player = this.player,
				computer = this.computer,
				collision = time,//time of the first ball collision, if any
				direction = null,//the new ball direction for the first collision, if any. -Inf means player won, +Inf means computer won
				x = ball.x + time*(ball.velocityX + ball.accelerationX*time),//ideal X position at the end of ball update (no collisions)
				y = ball.y + time*(ball.velocityY + ball.accelerationY*time);//ideal Y position at the end of ball update (no collisions)

			if(x < Constants.paddleThickness)//player lost if no collisions
				direction = Infinity;
			if(x > 1-Constants.paddleThickness)//computer lost if no collisions
				direction = -Infinity

			//player collision
			if(x < Constants.paddleThickness+Constants.ballRadius)
			{
				//direct collision
				try {
					var
						result = this.solve(ball.accelerationX, ball.velocityX, ball.x - (Constants.paddleThickness+Constants.ballRadius)),
						collision_time = Math.max(result[0], result[1]),
						distance = ball.y - (player.y + player.velocity * collision_time);

					if(Math.abs(distance) <= Constants.paddleSize/2 && collision_time>0 && collision_time<collision) {
						collision = collision_time;
						direction = Math.atan2(Math.tan(Constants.maxAngle*Math.PI/180)*2*distance / Constants.paddleSize, 1);
					}
				}
				catch(e) {
					//ball is moving the wrong way; direct collision impossible
				}
				//player top corner collision
				var a = ball.velocityX/ball.velocityY;
				try {
					var
						b = (ball.x-Constants.paddleThickness) - a*(ball.y-player.y+Constants.paddleSize/2);
						result = this.solve(a*a+1, 2*a*b, b*b - Constants.ballRadius*Constants.ballRadius);
					for(var i=0; i<2; i++)
						try {
							var
								result2 = this.solve(ball.accelerationY, ball.velocityY, ball.y - (result[i]+player.y-Constants.paddleSize/2)),
								collision_time = Math.max(result2[0], result2[1]);

							if(collision_time>0 && collision_time<collision) {
								collision = collision_time;
								direction = Math.atan2(Math.tan(-Constants.maxAngle*Math.PI/180), 1);
							}
						}
						catch(e) {}
				}
				catch(e) {}
				//player bottom corner collision
				try {
					var
						b = (ball.x-Constants.paddleThickness) - a*(ball.y-player.y-Constants.paddleSize/2);
						result = this.solve(a*a+1, 2*a*b, b*b - Constants.ballRadius*Constants.ballRadius);
					for(var i=0; i<2; i++)
						try {
							var
								result2 = this.solve(ball.accelerationY, ball.velocityY, ball.y - (result[i]+player.y+Constants.paddleSize/2)),
								collision_time = Math.max(result2[0], result2[1]);

							if(collision_time>0 && collision_time<collision) {
								collision = collision_time;
								direction = Math.atan2(Math.tan(Constants.maxAngle*Math.PI/180), 1);
							}
						}
						catch(e) {}
				}
				catch(e) {}
			}

			if(x > 1-Constants.paddleThickness-Constants.ballRadius)
			{
				//direct computer collision
				try {
					var
						result = this.solve(ball.accelerationX, ball.velocityX, ball.x - (1-Constants.paddleThickness-Constants.ballRadius)),
						collision_time = Math.max(result[0], result[1]),
						distance = ball.y - computer.y - computer.velocity * collision_time;

					if(Math.abs(distance) <= Constants.paddleSize/2 && collision_time>0 && collision_time<collision) {
						collision = collision_time;
						direction = Math.atan2(Math.tan(Constants.maxAngle*Math.PI/180)*2*distance / Constants.paddleSize, -1);
					}
				}
				catch(e) {
					//ball is moving the wrong way; collision impossible
				}
				//player top corner collision
				var a = ball.velocityX/ball.velocityY;
				try {
					var
						b = (ball.x-Constants.paddleThickness) - a*(ball.y-computer.y+Constants.paddleSize/2);
						result = this.solve(a*a+1, 2*a*b, b*b - Constants.ballRadius*Constants.ballRadius);
					for(var i=0; i<2; i++)
						try {
							var
								result2 = this.solve(ball.accelerationY, ball.velocityY, ball.y - (result[i]+computer.y-Constants.paddleSize/2)),
								collision_time = Math.max(result2[0], result2[1]);

							if(collision_time>0 && collision_time<collision) {
								collision = collision_time;
								direction = Math.atan2(Math.tan(-Constants.maxAngle*Math.PI/180), -1);
							}
						}
						catch(e) {}
				}
				catch(e) {}
				//player bottom corner collision
				try {
					var
						b = (ball.x-Constants.paddleThickness) - a*(ball.y-computer.y-Constants.paddleSize/2);
						result = this.solve(a*a+1, 2*a*b, b*b - Constants.ballRadius*Constants.ballRadius);
					for(var i=0; i<2; i++)
						try {
							var
								result2 = this.solve(ball.accelerationY, ball.velocityY, ball.y - (result[i]+computer.y+Constants.paddleSize/2)),
								collision_time = Math.max(result2[0], result2[1]);

							if(collision_time>0 && collision_time<collision) {
								collision = collision_time;
								direction = Math.atan2(Math.tan(Constants.maxAngle*Math.PI/180), -1);
							}
						}
						catch(e) {}
				}
				catch(e) {}
			}

			if(y < Constants.ballRadius) {
				//top wall collision; always has a solution
				var
					result = this.solve(ball.accelerationY, ball.velocityY, ball.y - Constants.ballRadius),
					collision_time = Math.max(result[0], result[1]);

				if(collision_time<collision) {
					collision = collision_time;
					direction = Math.atan2(-ball.velocityY, ball.velocityX);
				}
			}

			if(y > 1-Constants.ballRadius) {
				//bottom wall collision; always has a solution
				var
					result = this.solve(ball.accelerationY, ball.velocityY, ball.y - (1-Constants.ballRadius)),
					delta = Math.sqrt(ball.velocityY*ball.velocityY - 4*ball.accelerationY*(ball.y - (1-Constants.ballRadius))),
					collision_time = Math.max(result[0], result[1]);

				if(collision_time<collision) {
					collision = collision_time;
					direction = Math.atan2(-ball.velocityY, ball.velocityX);
				}
			}

			if(direction) {
				//collision detected
				if(isFinite(direction)) {
					//update positions to the collision, change ball direction and increment the time step
					player.update(collision);
					computer.update(collision);
					ball.update(collision);

					ball.setDirection(direction);
					time -= collision;
				}
				else {
					//a player lost; reset ball and switch state to stopped
					ball.reset();
					this.status = "stopped";

					if(direction < 0)
						player.score++;
					else
						computer.score++;
					return;
				}
			}
			else {
				//no collision; update positions and paint frame
				player.update(time);
				computer.update(time);
				ball.update(time);
				return
			}
		}
	}

	this.paint = function(ctx)
	{
		this.player.paint(ctx);
		this.computer.paint(ctx);
		this.ball.paint(ctx);
		if(this.status != "playing") {
			var
				text = this.status == "paused"? "Game paused. Click to resume": "Click to start";
			ctx.fillStyle = Constants.uiBackground;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.font = Math.floor(Constants.uiFontSize * canvas.height) + "px " + Constants.uiFontFamily;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = Constants.uiFontColor;
			ctx.fillText(text, canvas.width/2, canvas.height/2);
		}
	}
}
