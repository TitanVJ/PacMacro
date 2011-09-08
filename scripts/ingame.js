
function StaticImage(img, x, y, w, h, ox, oy) {
	if (!ox) {
		ox = 0;
	}
	if (!oy) {
		oy = 0;
	}

	this.Draw = function(dx, dy, ctx) {
		ctx.drawImage(img, x, y, w, h, Math.floor(dx)+ox, Math.floor(dy)+oy, w, h);
	};
}

function InGame() {
	var context, canvas;
	var players = [];
	var tiles = [];
	var image = new Image();
	image.src = "images/image.png";
	var images = [];
	images["Pacman"] = new StaticImage(image, 20, 0, 19, 20);
	images["Inky"] = new StaticImage(image, 39, 0, 20, 20);
	images["Blinky"] = new StaticImage(image, 20, 20, 20, 20);
	images["Pinky"] = new StaticImage(image, 40, 20, 20, 20);
	images["Clyde"] = new StaticImage(image, 0, 20, 20, 20);
	images["Eat"] = new StaticImage(image, 24, 40, 8, 8, 4, 4);
	images["Pill"] = new StaticImage(image, 16, 40, 8, 8, 4, 4);
	images["PowerPill"] = new StaticImage(image, 0, 40, 16, 8, 0, 4);
	images["PowerPillEat"] = new StaticImage(image, 31, 40, 16, 8, 0, 4);

	var powerPills = [19, 28, 51, 60];

	var pos = -1,
	scoreBoard,
	startTime,
	powerPillActive = false,
	powerPillStart,
	localPlayerId,
	score,
	gameLength,
	gameOver = false,
	offsetX = 80,
	offsetY = 80;

	this.Activate = function() {
		channel.Connect(this);
		body.innerHTML = "<canvas id='canvas' width='620' height='620'></canvas><div id='scoreboard'></div>";
		scoreBoard = document.getElementById('scoreboard');
		canvas = document.getElementById('canvas');
		context = canvas.getContext('2d');
		this.Draw();
		canvas.addEventListener("click", this.OnClick, false);
		this.GetGameInfo();
		setInterval(ingame.UpdateScoreBoard, 1000);

	};

	this.GetGameInfo = function() {
		jx.load("getgameinfo", function(data) {
			ingame.UpdateGame(data);
		});
	};

	this.OnClick = function(e) {
		var x = e.offsetX;
		var y = e.offsetY;
		x = Math.floor((x-offsetX)/16);
		y = Math.floor((y-offsetY)/16);
		var tile = -1;
		if ((x%2 == 0 && y%2 == 0)){
			if (y%8 == 0) {
				tile = x/2+(y/8)*16;
			} else if (x%6 == 0) {
				tile = 79+y/2+(x/6)*12-Math.floor(y/8);
			}
		}
		if (tile == -1) {
			return;
		}

		if (pos == -1 || ingame.IsBeside(tile, pos)) {
			pos = tile;
			jx.load("moveto?pos="+tile, function(data) {ingame.UpdateGame(data);});
		}
	};

	this.TileToXY = function(tile) {
		var x = 0;
		var y = 0;
		if (tile < 80) {
			x = tile%16;
			y = ((tile-x)/16)*128+offsetY;
			x = (x * 32) + offsetX;
		} else {
			tile -= 80;
			y = tile%12;
			x = ((tile-y)/12)*96+offsetX;
			y = (y + Math.floor(y/3)+1)*32+offsetY;
		}
		var o = {};
		o.x = x;
		o.y = y;
		return o;
	}

	this.IsBeside = function(a, b) {
		var oa, ob;
		oa = this.TileToXY(a);
		ob = this.TileToXY(b);
		if (oa.x == ob.x && (oa.y + 32 == ob.y || oa.y - 32 == ob.y)) {
			return true;
		} else if (oa.y == ob.y && (oa.x + 32 == ob.x || oa.x - 32 == ob.x)) {
			return true;
		}
		return false;
	};

	this.MarkTile = function(tile, type) {
		var o = this.TileToXY(tile);
		if (type) {
			images[type].Draw(o.x, o.y, context);
		}
	};

	this.UpdateGame = function(data) {
		console.log(data)
		var o = JSON.parse(data);
		if (o.type == "move") {
			if (o.eat) {
				tiles.push(o.pos);
			}
			this.MarkTile(o.pos, o.role);
			for (var i = 0; i < players.length; i += 1) {
				if (players[i].name == o.name) {
					players[i].pos = o.pos;
				}
			}
			powerPillActive = o.powerPillActive;
			if (powerPillActive) {
				powerPillStart = Date.parse(o.powerPillStart+" GMT");
			}
			score = o.score;
		}else if (o.type == "score") {
			score = o.score
		} else if (o.type == "full") {
			players = o.players;
			tiles = o.tiles;
			startTime = Date.parse(o.startTime+" GMT");
			powerPillActive = o.powerPillActive;
			if (powerPillActive) {
				powerPillStart = Date.parse(o.powerPillStart+" GMT");
			}
			for (var i = 0; i < players.length; i += 1) {
				this.MarkTile(players[i].pos, players[i].role);
			}
			localPlayerId = o.localPlayer;
			score = o.score;
			gameLength = o.gamelength;
			pos = players[localPlayerId].pos;
			this.UpdateScoreBoard();
		} else if (o.type == "end") {
			menu.Activate();
		}
		this.Draw();
	};

	this.FormattedMinutesSeconds = function(time) {
		var seconds = time % 60;
		var minutes = Math.floor(time / 60);
		var output = minutes+":";
		if (seconds < 10) {
			output += "0";
		}
		output += seconds;
		return output;
	};

	this.UpdateScoreBoard = function() {
		if (gameOver) {
			return;
		}
		var output = "";
		var time = new Date().getTime();
		if (startTime) {
			var delta = time - startTime;
			delta = gameLength *60 - Math.floor(delta/1000);
			if (delta < 0) {
				output += "Game Over";
			} else {
				output += "Time Left: "+ingame.FormattedMinutesSeconds(delta)+"<br \>";
			}
			
		}
		if (powerPillActive) {
			var delta = time - powerPillStart;
			delta = 2*60 - Math.floor(delta/1000);
			if (delta < 0) {
				powerPillActive = false;
			} else {
				output += "Power Pill Time Left: "+ingame.FormattedMinutesSeconds(delta)+"<br \>";
			}
		}
		output += "Score: "+score+"<br \>";
		output += "<input type='submit' onclick='ingame.Eaten();' value='I was eaten'>";
		scoreBoard.innerHTML = output;
	};

	this.Eaten = function() {
		jx.load("eaten", function(data) {

		});
	};

	this.onMessage = function(data) {
		this.UpdateGame(data.data);
	};

	this.Draw = function() {
		
		context.fillStyle = "rgb(0, 0, 0)";
		context.fillRect(0, 0, 650, 650);
		context.fillStyle = "rgb(0, 0, 128)";

		for (var i = 0; i < 6; i += 1) {
			context.fillRect(offsetX+96*i, offsetX, 16, 528);
		}
		for (var i = 0; i < 5; i += 1) {
			context.fillRect(offsetX, offsetX+128*i, 480, 16);
		}

		context.fillStyle = "rgb(255,255,255)";
		for (var i = 0; i < 152; i += 1) {
			if (powerPills.indexOf(i) != -1) {
				this.MarkTile(i, "PowerPill");
			} else {
				this.MarkTile(i, "Pill");
			}
		}
		for (var i = 0; i < tiles.length; i += 1) {
			var x = parseInt(tiles[i]);
			if (powerPills.indexOf(x) != -1) {
				this.MarkTile(x, "PowerPillEat");
			} else {
				this.MarkTile(x, "Eat");
			}
		}
		for (var i = 0; i < players.length; i += 1) {
			this.MarkTile(players[i].pos, players[i].role);
		}
		context.font = "20px sans-serif";
		context.fillStyle = "rgb(255,255,255)";
		context.fillText("A", 80, 70);
		context.fillText("B", 176, 70);
		context.fillText("C", 272, 70);
		context.fillText("D", 368, 70);
		context.fillText("E", 464, 70);
		context.fillText("F", 560, 70);
		context.fillText("1", 60, 95);
		context.fillText("2", 60, 223);
		context.fillText("3", 60, 351);
		context.fillText("4", 60, 479);
		context.fillText("5", 60, 607);
	};
}

var ingame = new InGame();
