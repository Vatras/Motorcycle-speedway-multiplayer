
//TODO: dla smartfonow 2 przyciski
if(window.location.hash=="#tooFast")
{
	document.getElementById("tooFastMsg").setAttribute("class","show");
}
var myName = localStorage.getItem("name") || null;
document.getElementById("nameInput").value = localStorage.getItem("name") || "";
chooseBtn.innerHTML = localStorage.getItem("name") ? "Change" : "Choose"
var myNum;
var mainText;

newRoom.addEventListener("click", function () {
    window.location.href = "/new"+window.location.pathname;
})

chooseBtn.addEventListener("click", function () {
    if (document.getElementById("nameInput").value.length > 0) {
        myName = document.getElementById("nameInput").value;
        localStorage.setItem("name", myName)
        chooseBtn.innerHTML = "Change";
        renderMainText(myName);
    }
})

// nsp.emit("finished",{"who":motorIndex, "time":time})
var image;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

var player;
var direction;
// var speed=0.1;
var started;
var ellipse;
var text2;
var interval;
var players;
var speed;
var floors;
var ellipseLength;
var names;
var button;
var buttonText;
var laps;
var lastX;
var lastY;
var lastAngle;
var finishedTexts;
var currentPlace;
var rightArrow;
var leftArrow;
var infoText;

function renderMainText(value) {
    mainText.setText(value);
    mainText.visible = true;
}
function buttonClicked(sprite) {
    console.log("button clicked!")
    buttonText.visible = false;
    button.visible = false;
    players[myNum].ready = true;
    socket.emit("ready", {});
}
function spriteClicked(sprite) {

    for (x in players)
        players[x].events.onInputDown.remove(spriteClicked, this);
    myNum = sprite.num;
    socket.emit("spriteChoose", {
        'myNum': myNum,
        'name': myName || "guest" + myNum
    });

    console.log("kliknieto!" + sprite.num)

}
function renderTexts(num) {
    if (players[num].ready && names[num].text.indexOf("ready") == -1)
        names[num].text += " (ready)"
    names[num].text = laps[num].length > 0 ? names[num].realName + " (" + laps[num] + ")" : names[num].text;
    names[num].x = players[num].x - 30
    names[num].y = players[num].y + 15
}
function showButton(condition) {
    button.visible = condition;
    buttonText.visible = condition;
}
function initButton() {
    button = game.add.sprite(100, 200, 'button');
    var style = {font: "32px Courier", fill: "#ffffff"};
    var style2 = {font: "32px Courier", fill: "#ffffdd"};
    buttonText = game.add.text(0, 0, "READY", style);
    button.scale.x = 1.4//0.05
    button.scale.y = 1//0.035
    button.y = 80
    button.x = 340
    buttonText.alignTo(button, Phaser.CENTER, -10, -48);
    buttonText.inputEnabled = true;
    buttonText.input.useHandCursor = true;
    button.inputEnabled = true;
    button.input.useHandCursor = true;
    buttonText.events.onInputOver.add(function () {
        buttonText.setStyle({font: "32px Courier", fill: "#000000"})
    }, this);
    buttonText.events.onInputOut.add(function () {
        buttonText.setStyle({font: "32px Courier", fill: "#ffffff"})
    }, this);
    button.events.onInputDown.add(buttonClicked, this);
    buttonText.events.onInputDown.add(buttonClicked, this);
    showButton(false);
}

function preload() {
    game.load.image('button', 'assets/button.png');
    game.load.image('rightArrow', 'img/rightArrow.png');
    game.load.image('leftArrow', 'img/leftArrow.png');


}
function hideArrows(){
    infoText.visible=false
    rightArrow.visible=false
    leftArrow.visible=false
}
function renderArrows(){

    infoText = game.add.text(290, 330, "click on a motor to choose one \nthere will be 5 laps \nuse only these buttons:", {
        font: "20px Arial",
        fill: "#ffffff",
        align: "center"
    });
    rightArrow = game.add.sprite(390, 400, 'rightArrow');
    leftArrow = game.add.sprite(320, 400, 'leftArrow');
}
function create() {
    game.time.desiredFps = 40
    currentPlace = 0;
    myNum = -1;
    started = false;
    laps = ["", "", "", ""]
    direction = 1;
    players = [];
    speed = [];
    floors = [];
    ellipseLength;
    names = [];
    finishedTexts = "";
    mainText = game.add.text(game.world.centerX + 200, 0, "", {
        font: "20px Arial",
        fill: "#aaDD00",
        align: "center"
    });
    if (myName)
        renderMainText(myName);
    renderArrows();
    //game.physics.startSystem(Phaser.Physics.CANVAS);
    game.stage.backgroundColor = '#000000'//'#9999ff';

    dudeData2 = dudeData.map(function (a) {
        return a.split("D").join("A")
    });
    dudeData3 = dudeData.map(function (a) {
        return a.split("D").join("3")
    });
    dudeData4 = dudeData.map(function (a) {
        return a.split("D").join("6")
    });

    game.create.texture('phaserDude0', dudeData, 4, 4, 0);
    game.create.texture('phaserDude1', dudeData2, 4, 4, 0);
    game.create.texture('phaserDude2', dudeData3, 4, 4, 0);
    game.create.texture('phaserDude3', dudeData4, 4, 4, 0);
    game.create.texture('onePixel', onePixel, 4, 4, 0);
    floors = []
    ellipseLength = 130;
    for (var i = 0; i < ellipseLength; i++) {
        wspolczynnik = (130 - i) / 13
        //var tempRect=new Phaser.Rectangle(400-(i*wspolczynnik), 130+i, i*wspolczynnik*2-13, 1);
        var tempRect = game.add.sprite(400 - (i * wspolczynnik), 130 + i, 'onePixel');

        tempRect.scale.x = i * (wspolczynnik / 2)
        // tempRect.body.collideWorldBounds = true;
        // tempRect.body.checkCollision.up = true;
        // tempRect.body.checkCollision.down = true;
        // tempRect.body.immovable = true;
        floors.push(tempRect);
        game.physics.enable(floors[i], Phaser.Physics.ARCADE);
    }

    //ellipse=new Phaser.Ellipse(100, 350, 200, 300)

    initButton();

    var numOfPlayers = 4;
    for (var i = 0; i < numOfPlayers; i++) {
        player = game.add.sprite(170 + i * 150, 200, 'phaserDude' + i);
        player.num = i;
        players.push(player);
        setTimeout(function () {
            if (players[0].getBounds().width == 0)
                window.location.reload(false)

        }, 300)

        var t = game.add.text(0, 0, "", {font: "18px Arial", fill: "#aaDD00", align: "center"});
        names.push(t)
    }
    for (x in players) {
        players[x].anchor.set(0.5);
        players[x].scale.x = -0.25;
        players[x].scale.y = 0.25;
        players[x].angle = 0;
        players[x].speed = 3.5;
        players[x].ready = false;
        players[x].collidedFlag = false;
        game.physics.enable(players[x], Phaser.Physics.ARCADE);

        players[x].inputEnabled = true;
        players[x].input.useHandCursor = true; //if you want a hand cursor
        players[x].events.onInputDown.add(spriteClicked, this);


        tempRect.body.checkCollision.left = false;
        tempRect.body.checkCollision.right = false;
        tempRect.body.checkCollision.OVERLAP_BIAS = -50
        players[x].body.collideWorldBounds = true;
        players[x].body.bounce.setTo(1, 1);

        // players[x].body.velocity.y = -200;
        // players[x].body.velocity.x = 200;
    }

    game.physics.arcade.enable(player);
    var text = "Żużel game with sockets";
    var style = {font: "25px Arial", fill: "#ffDD44", align: "center"};
    var t = game.add.text(game.world.centerX - 150, 0, text, style);
    //text2 = game.add.text(game.world.centerX, 100, 'Hello World!',style);

    //game.add.existing(text2);
    cursors = game.input.keyboard.createCursorKeys();
    startSocketing();
    startChat();
}
function collisionRemove() {
    for (x in players) {
        if (players[x].collidedFlag) {
            players[x].collidedFlag = false;

        }
        else {
            players[x].speed = 3.5
        }
    }

}

setInterval(collisionRemove, 100);

function collisionHandler(a, b, c) {

    var i = b.num
    players[i].collidedFlag = true;
    if (players[i].speed > 0.5)
        players[i].speed -= 0.003;
    //text2.setText("COLISION!");
}

function render() {
    for (var i = 0; i < ellipseLength; i++)
        game.debug.geom(floors[i], '#000000');

    game.debug.geom(ellipse, '#0fffff');
}
function update() {
    //var speed=2.5;
    if (started) {

        x = myNum;
        if (isNaN(players[myNum].x) || isNaN(players[myNum].y) || isNaN(players[myNum].angle)) {
            players[myNum].x = lastX;
            players[myNum].y = lastY;
            players[myNum].angle = lastAngle;
        }
        for (var i = 0; i < ellipseLength; i++) {
            game.physics.arcade.collide(floors[i], players[x], collisionHandler, null, this);
        }

        //game.physics.arcade.collide(ellipse, players[x], collisionHandler, null, this);
        //game.physics.arcade.collide(players[x], ellipse);

        if (cursors.left.isDown) {
            players[x].angle -= 0.015 * players[x].speed;
            //player.scale.x = 0.25;
        }
        else if (cursors.right.isDown) {
            players[x].angle += 0.015 * players[x].speed;
        }


        if (-players[x].angle > 2 * Math.PI)
            players[x].angle = players[x].angle + 2 * Math.PI
        // newX=player.x+speed*direction;
        //    newY=player.y+speed*(1-direction);
        if (players[x].angle < -Math.PI)
            players[x].scale.x = 0.25 + ((players[x].angle + Math.PI) / (Math.PI) * 0.5)//*dir;
        if (players[x].angle > -Math.PI)//poczatek
            players[x].scale.x = -0.25 - (players[x].angle / 3.14) * 0.5//*dir;
        if (player.scale.x > 0.25)
            players[x].scale.x
        else if (players[x].scale.x < -0.25)
            players[x].scale.x = -0.25
        players[x].x = players[x].x + players[x].speed * Math.cos(players[x].angle);
        players[x].y = players[x].y + players[x].speed * Math.sin(players[x].angle);
        lastX = players[x].x;
        lastY = players[x].y;
        lastAngle = players[x].angle;
        socket.emit('position', {
                    'num': x,
                    'x': players[x].x,
                    'y': players[x].y,
                    'scaleX': players[x].scale.x,
                    'scaleY': players[x].scale.y,
                    'angle': players[x].angle
        })
        if (players[x].y > 195 && players[x].y < 215 && players[x].x > 250 && players[x].x < 500)
            players[x].speed = 0;
        renderTexts(x)

    }
}
var guestName="guest_"+(new Date().getTime()+"").substr(6);
function startChat() {
    var cont = document.createElement("div");
    cont.setAttribute("id", "rightDiv");
    var div = document.createElement("div");
    div.setAttribute("id", "chatDiv");
    var input = document.createElement("input");
    var ulElem = document.createElement("ul");
    ulElem.setAttribute("id", "chat");
    ulElem.setAttribute("width", "300");
    ulElem.setAttribute("height", "600");
    document.getElementsByTagName('body')[0].appendChild(cont);
    cont.appendChild(div)
    div.appendChild(ulElem)
    var input = document.createElement("input");
    input.setAttribute("id", "input");
    input.setAttribute("type", "text");
    input.setAttribute("placeholder", " type here.. (submit with pressing Enter)");
    cont.appendChild(input)
    document.getElementById('input').onkeypress = function (e) {
        if (!e) e = window.event;
        var keyCode = e.keyCode || e.which;
        if (keyCode == '13') {
            socket.emit("chatMessage", {who: document.getElementById("nameInput").value||guestName, message: this.value})
            this.value = ""
            input.setAttribute("placeholder", "");
            return false;
        }
    }
}
