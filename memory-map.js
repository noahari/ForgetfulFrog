jsPsych.plugins['memory-map'] = (function(){
    
  var plugin = {};

  plugin.info = {
    name: 'memory-map',
    parameters: {
      game_map:{
        type: jsPsych.plugins.parameterType.ARRAY,
        pretty_name: 'Game map',
        default: null,
        description: "A one dimensional array where -1 -> player, 0 -> floor, 1 -> wall, 2 -> exit"
      },
      row_length:{
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Row length",
        default: 16,
        description: "The amount of elements in a row of the map"
      },
      column_height:{
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Column height",
        default: 16,
        description: "The amount of elements in a column of the map"
      },
      blackout_speed:{
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Time to memorize",
        default: 1000,
        description: "The amount of time in ms that the player gets to memorize the map"
      },
      exit_length:{
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Exit length",
        default: 5,
        description: "The magnitude of the amount of moves from the start to the exit"
      },
      tutorial:{
        type: jsPsych.plugins.parameterType.BOOLEAN,
        pretty_name: 'Tutorial Marker',
        default: false,
        description: "A flag that indicates if it is a stage to not blackout as a tutorial"
      },
      lives:{
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Lives',
        default: undefined,
        description: "The number of lives the player has left before game over"
      },
      wins:{
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Score',
        default: undefined,
        description: "the number of wins the player has"
      }
    }
  }

  plugin.trial = function(display_element,trial){
    //creating canvases that buffer paintings, like layers in photoshop
    var ground = document.createElement("canvas").getContext("2d");
    var pad = document.createElement("canvas").getContext("2d");
    var frogbuffer = document.createElement("canvas").getContext("2d");
    if(document.querySelector("#canbg") == null){
      display_element.innerHTML = "<div id='canbg' style='background-image: url(img/waterSeamlessLoop.gif);'><canvas id='canvas-board'></canvas><canvas id='charcan'></canvas></div><div id ='infoBar'><div id='infoBarImage'></div><span id='leveltxt'></span><span id='livestxt'></span></div>";
    }
    var board = document.querySelector('#canvas-board').getContext("2d");
    var wipers = document.querySelector('#canvas-board');
    var frogboard = document.querySelector('#charcan').getContext("2d");
    var candiv = document.querySelector("#canbg");
    var lives = document.querySelector("#livestxt");
    var levels = document.querySelector("#leveltxt");

    loadWaiter = function(){
      imgs++;
      if(totimgs == imgs){
        //BEGIN CODE EXECUTION
        if(window.innerHeight > window.innerWidth){
          orientationFix();
        }
        beginGame();
      }
      else{
        return;
      }
    }
    var imgs = 0;
    var totimgs = 3;
    //blackout time switch
    var bo = false;
    var dead = false;
    var time;
    //LOAD IMG ASSETS
    var check = document.createElement("img");
    //check.onload = loadWaiter;
    check.src = "img/check.png";
    var cross = document.createElement("img");
    //cross.onload = loadWaiter;
    cross.src = "img/cross.png";
    var rot = document.createElement("img");
    //rot.onload = loadWaiter;
    rot.src = "img/rot.png";
    var frog = document.createElement("img");
    frog.onload = loadWaiter;
    frog.src = "img/frog.png";
    var lilypad = document.createElement("img");
    lilypad.onload = loadWaiter;
    lilypad.src = "img/padonly.png";
    var fly = document.createElement("img");
    fly.onload = loadWaiter;
    fly.src = "img/flypad.png";
    const infoBar = document.getElementById("infoBar");

    //console.log("TIME: "+trial.blackout_speed);
  
    //map data
    var level = {
      map: trial.game_map,
      scale: 64,
      x: trial.row_length,
      y: trial.column_height,
      walkable: [0,2],
      learntime: trial.blackout_speed,
      lives: trial.lives,
      wins: trial.wins
    }

    //character data
    var char = {
      tx: 1,
      ty: 8
  }

    var trial_data = {
      "success": null,
      "sequence_size": trial.exit_length,
      "mem_time": trial.blackout_speed,
      "inputs": [],
      "steps": 0,
      "map": trial.game_map,
      "startpos": null,
      "input_type": null,
      "device": navigator.userAgent,
      "solution": null,
      "ttp": [], //Time to press a key
      "waited": false //true if they waited for blackout, false if they didn't
    }
  
    drawMap = function() {
      //loop over array, checking val of each index to determine fill color (or image)
      for (let index = 0; index < level.map.length; index ++) {
  
        //REPLACE THIS WITH IMAGES WHEN WE HAVE GRAPHICS

        //check array val for type of tile & set fill color accordingly
        // 1 = black 0 = white 2 = exit
        switch(level.map[index]){
          case -1:
            char.tx = index%level.x;
            char.ty = Math.floor(index/level.x)+1;
            level.map[index] = 0;
            trial_data.startpos = index;
            break;
          case 0:
            //ground.fillRect((index % level.x) * level.scale, Math.floor(index/level.x) * level.scale, level.scale, level.scale);
            ground.drawImage(lilypad, (index % level.x) * level.scale, Math.floor(index/level.x) * level.scale, level.scale, level.scale);
            break;
          case 1:
            //DO NOTHING, BG IS WATER
            break;
          case 2:
            ground.drawImage(fly, (index % level.x) * level.scale, Math.floor(index/level.x) * level.scale, level.scale, level.scale);
            break;
        }
        //filled rectangle shape
      }
      board.drawImage(ground.canvas, 0, 0, ground.canvas.width, ground.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
    };
    //Draw Player Character
    charrender = function(){
        //for color changing player, if states to be conveyed
        //ground.fillStyle = "#ff0000"
        charx = char.tx*level.scale;
        chary = (char.ty-1)*level.scale;
        //ground.fillRect(charx, chary, level.scale, level.scale);
        if(dead == false){
          ground.drawImage(lilypad, charx, chary, level.scale, level.scale);
          frogbuffer.drawImage(frog,charx,chary,level.scale,level.scale);
        }
        else{
          //
        }
        board.drawImage(ground.canvas, 0, 0, ground.canvas.width, ground.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
        frogboard.drawImage(frogbuffer.canvas, 0, 0, frogbuffer.canvas.width, frogbuffer.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
    };

    //redraw moving objects
    redraw = function(){
      if(bo ==false){
        drawMap();
      }
      charrender();
      if(bo == true){
        blackout();
      }
    }

    settime = function(){
      var temptime = performance.now();
      trial_data.ttp.push(temptime-time);
      //console.log(temptime-time);
      time = temptime;      
    }

    //checks what key pressed, then moves char as appropriate
    dirCheckK = function(e) {
      settime();
      trial_data.input_type = "keyboard";
      trial_data.steps++;
      if(typeof(e) === "undefined"){
        e = window.event;
      }
      //Calls movement method with movement code
      switch(e.keyCode){
        case 38:
          moveChar(8);
          break;
        case 40:
          moveChar(2);
          break;
        case 37:
          moveChar(4);
          break;
        case 39:
          moveChar(6);
          break;
        case 87:
          moveChar(8);
          break;
        case 83:
          moveChar(2);
          break;
        case 65:
          moveChar(4);
          break;
        case 68:
          moveChar(6);
          break;
      }
    }

    dirCheckM2 = function(e){
      trial_data.input_type = "touch";
      if(typeof(e) === "undefined"){
        e = window.event;
      }
      var touch = e.touches.item(0);
      var touchx = touch.clientX;
      var touchy = touch.clientY;
      if(touchx > 0){
        if(touchy > 0){}
        else{}
      }
      else{
        if(touchy<0){}
        else{}
      }
    }

    //checks where tapped/swiped, then moves char as appropriate
    //non functional
    dirCheckM = function(e){
      settime();
      trial_data.input_type = "touch";
      if(typeof(e) === "undefined"){
        e = window.event;
      }
      //Store to prevent exploit
      var touch = e.touches.item(0);
      var touchx = touch.clientX;
      var touchy = touch.clientY;
      var centerx = document.documentElement.clientWidth/2;
      var centery = document.documentElement.clientHeight/2;
      var xmag = (touchx - centerx)/document.documentElement.clientWidth;
      var ymag = (touchy - centery)/document.documentElement.clientHeight;
      //console.log(xmag);
      //console.log(ymag);
      //x axis move
      if(Math.abs(xmag)>Math.abs(ymag)){
        if(xmag > 0){
          //right
          moveChar(6);
        }
        else{
          //left
          moveChar(4);
        }
      }
      else{
        if(ymag>0){
          //up
          moveChar(2);
        }
        else{
          //down
          moveChar(8);
        }
      }
    }

    //returns the tilecode at the input x&y coordinates
    collider = function(ix, iy){
      //console.log(ix+((iy-1)*level.x));
      return level.map[ix+((iy-1)*level.x)];
    }


    //moves that character in the passed direction
    moveChar = function(dir){
      wipeWaiters();
      blackout();
      switch(dir){
        case 2:
          char.ty = char.ty + 1;
          trial_data.inputs.push("Down");
          animateHop(Date.now(),1);
          break;
        case 4:
          char.tx = char.tx - 1;
          trial_data.inputs.push("Left");
          animateHop(Date.now(),2);
          break;
        case 6:
          char.tx = char.tx + 1;
          trial_data.inputs.push("Right");
          animateHop(Date.now(),3);
          break;
        case 8:
          char.ty = char.ty - 1;
          trial_data.inputs.push("Up");
          animateHop(Date.now(),4);
          break;
      }
    }

    var totshift = 0;
    animateHop = function(timestamp,int){
      //console.log("WIDTH: "+board.canvas.width+"\n HEIGHT: "+board.canvas.height);
      document.ontouchstart = null;
      document.onkeydown = null;
      var padcheck = false;
      if(!trial.tutorial){/*
      board.clearRect(0,0,board.canvas.width,board.canvas.height);
      ground.clearRect(0,0,ground.canvas.width,ground.canvas.height);*/
      wipers.style.opacity = 0;
      }
      frogbuffer.clearRect(0,0,frogbuffer.canvas.width,frogbuffer.canvas.height);
      frogboard.clearRect(0,0,frogboard.canvas.width,frogboard.canvas.height);
      //shift should be a multiple of 2 since level.scale is as well
      var shift = 8;
      switch(int){
        case 1:
          if(level.walkable.includes(collider(char.tx,char.ty))){
            padcheck = true;
          }
          frog.src = "img/frogD.png";
          chary = chary+shift;
          break;
        case 2:
          if(level.walkable.includes(collider(char.tx,char.ty))){
            padcheck = true;
          }
          frog.src = "img/frogL.png";
          charx = charx-shift;
          break;
        case 3:
          if(level.walkable.includes(collider(char.tx,char.ty))){
            padcheck = true;
          }
          frog.src = "img/frogR.png";
          charx = charx+shift;
          break;
        case 4:
          if(level.walkable.includes(collider(char.tx,char.ty))){
            padcheck = true;
          }
          frog.src = "img/frog.png";
          chary = chary-shift;
          break;
      }
      totshift = totshift+shift;
      if(padcheck && !trial.tutorial){
        pad.clearRect(0,0,pad.canvas.width,pad.canvas.height);
        pad.drawImage(lilypad, char.tx*level.scale, (char.ty-1)*level.scale, level.scale, level.scale);
        //console.log("TX: "+char.tx*level.scale+"\nTY: "+(char.ty-1)*level.scale)
        pad.globalAlpha = totshift/level.scale;
        frogboard.drawImage(pad.canvas, 0, 0, pad.canvas.width, pad.canvas.height, 0, 0, frogboard.canvas.width, frogboard.canvas.height);
        pad.clearRect(0,0,pad.canvas.width,pad.canvas.height);
      }
      frogbuffer.drawImage(frog,charx,chary,level.scale,level.scale);
      frogboard.drawImage(frogbuffer.canvas, 0, 0, frogbuffer.canvas.width, frogbuffer.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
      //board.drawImage(ground.canvas, 0, 0, ground.canvas.width, ground.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
      if(totshift<level.scale){
        switch(int){
          case 1:
            window.requestAnimationFrame(animateHopD);
            break;
          case 2:
            window.requestAnimationFrame(animateHopL);
            break;
          case 3:
            window.requestAnimationFrame(animateHopR);
            break;
          case 4:
            window.requestAnimationFrame(animateHopU);
            break;
        }
      }
      else{
        start = null;
        totshift = 0;
        document.onkeydown = dirCheckK;
        document.ontouchstart = dirCheckM;
        if(level.walkable.includes(collider(char.tx,char.ty))){
          /*if(!trial.tutorial){
            console.log("REDRAW: ANIMATEhop");
            redraw();
          }*/
          wincheck();
        }
        else{/*
          board.clearRect(0,0,board.canvas.width,board.canvas.height);
          ground.clearRect(0,0,ground.canvas.width,ground.canvas.height);*/
          die();
        }
      }
    }

    animateHopD = function(){
      animateHop(Date.now(),1);
    }
    animateHopL = function(){
      animateHop(Date.now(),2);
    }
    animateHopR = function(){
      animateHop(Date.now(),3);
    }
    animateHopU = function(){
      animateHop(Date.now(),4);
    }

    //handles loss
    die = function(){
      document.onkeydown = null;
      document.ontouchstart = null;
      bo = false;
      dead = true;
      //console.log("REDRAW: DIE");
      wipers.style.opacity = 1;
      //drawMap();
      //192,64
      frogbuffer.clearRect(0,0,frogbuffer.canvas.width,frogbuffer.canvas.height);
      frogboard.clearRect(0,0,frogboard.canvas.width,frogboard.canvas.height);
      ground.drawImage(cross, charx,chary, level.scale, level.scale);
      board.drawImage(ground.canvas, 0, 0, ground.canvas.width, ground.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
      bo = false;
      delay(500,lose);
    }

    lose = function(){
      trial_data.map[trial_data.startpos] = -1;
      trial_data.success = false;
      jsPsych.finishTrial(trial_data);
    }

    //generates an array to be mapped
    mapGen = function(){
      //dfsGen returns a ~~tuple~~ array [map,solution]
      var data = dfsGen(level.x,level.y,trial.exit_length);
      level.map = data[0];
      trial_data.solution = data[1];
      trial_data.map = level.map;
    }

    //Separate check for win, so you are actualy displayed ON the wincon
    wincheck = function(){
      if(level.map[char.tx+((char.ty-1)*level.x)] == 2){
        //block input whilewin screen is up
        wipers.style.opacity = 1;
        document.onkeydown = null;
        document.ontouchstart = null;
        bo = false;
        if(tutover){updateInfo();}
        //drawMap();
        frogbuffer.drawImage(check,0,0,ground.canvas.width,ground.canvas.height);
        frogboard.drawImage(frogbuffer.canvas, 0, 0, frogbuffer.canvas.width, frogbuffer.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
        //console.log(check);
        bo = false;
        delay(500,win);
      }
    }

    win = function(){
      trial_data.map[trial_data.startpos] = -1;
      trial_data.success = true;
      console.log(trial_data.waited);
      console.log(trial_data.ttp);
      jsPsych.finishTrial(trial_data);
    }

    remap = function(){
      bo = false;
      mapGen();
      resize();
      //console.log(level);
      delay(level.learntime,blackoutrec);
    }

    blackoutrec = function(){
      if(!trial.tutorial){
        trial_data.waited = true;
      }
      else{
        trial_data.waited = tutorial;
      }
      blackout();
    }

    blackout = function(){
      //board.fillStyle = "#000000";
      if(!trial.tutorial){
      /*
      board.clearRect(0,0,board.canvas.width,board.canvas.height);
      ground.clearRect(0,0,ground.canvas.width,ground.canvas.height);
      ground.drawImage(lilypad, charx, chary, level.scale, level.scale);
      frogbuffer.drawImage(frog,charx,chary,level.scale,level.scale);
      frogboard.drawImage(frogbuffer.canvas, 0, 0, frogbuffer.canvas.width, frogbuffer.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
      board.drawImage(ground.canvas, 0, 0, ground.canvas.width, ground.canvas.height, 0, 0, board.canvas.width, board.canvas.height);*/ 
      frogbuffer.drawImage(lilypad, char.tx*level.scale, (char.ty-1)*level.scale, level.scale, level.scale);
      frogbuffer.drawImage(frog,charx,chary,level.scale,level.scale);
      frogboard.drawImage(frogbuffer.canvas, 0, 0, frogbuffer.canvas.width, frogbuffer.canvas.height, 0, 0, board.canvas.width, board.canvas.height);
      wipers.style.opacity = 0;
      bo = true;
      //insert screen blackout here
      document.onkeydown = dirCheckK;
      document.ontouchstart = dirCheckM;
      }
      else{
        document.onkeydown = dirCheckK;
        document.ontouchstart = dirCheckM;
      }
    }
  
    //function that keeps the canvas element sized appropriately
    resize = function(event){
      var ratio = 1;
      //ORIENTATION DETECTION
      if(window.innerHeight < window.innerWidth){
        ratio = window.innerHeight/window.innerWidth;
        board.canvas.style.top = "0px";
        frogboard.canvas.style.top = "0px";
        //board.canvas.height = Math.floor(board.canvas.width * 0.5625);
        board.canvas.width = Math.floor(document.documentElement.clientWidth * ratio);
        board.canvas.height = Math.floor(document.documentElement.clientHeight);
        frogboard.canvas.width = Math.floor(document.documentElement.clientWidth * ratio);
        frogboard.canvas.height = Math.floor(document.documentElement.clientHeight);
        candiv.style.width = Math.floor(document.documentElement.clientWidth) + "px";
        candiv.style.height = Math.floor(document.documentElement.clientHeight) + "px";
        infoBar.style.width = 30 + "%";
        infoBar.style.height = 15 + "%";
        levels.width = infoBar.width;
        levels.height = infoBar.height;
        lives.width = infoBar.width;
        lives.height = infoBar.height;
        board.canvas.style.left = ((document.documentElement.clientWidth/2) - document.querySelector('#canvas-board').offsetWidth/2) + "px";
        frogboard.canvas.style.left = ((document.documentElement.clientWidth/2) - document.querySelector('#charcan').offsetWidth/2) + "px";
      }
      else{
        ratio = window.innerWidth/window.innerHeight;
        board.canvas.style.left = "0px";
        frogboard.canvas.style.left = "0px";
        board.canvas.width = Math.floor(document.documentElement.clientWidth);
        board.canvas.height = Math.floor(document.documentElement.clientHeight * ratio);
        frogboard.canvas.width = Math.floor(document.documentElement.clientWidth);
        frogboard.canvas.height = Math.floor(document.documentElement.clientHeight * ratio);
        candiv.style.width = Math.floor(document.documentElement.clientWidth) + "px";
        candiv.style.height = Math.floor(document.documentElement.clientHeight) + "px";
        infoBar.style.width = 40 + "%";
        infoBar.style.height = 10 + "%";
        levels.width = infoBar.width;
        levels.height = infoBar.height;
        lives.width = infoBar.width;
        lives.height = infoBar.height;
        board.canvas.style.top = ((document.documentElement.clientHeight/2) - document.querySelector('#canvas-board').offsetHeight/2) + "px";
        frogboard.canvas.style.top = ((document.documentElement.clientHeight/2) - document.querySelector('#charcan').offsetHeight/2) + "px";
        if(window.innerWidth < 390){
          lives.style.fontSize = "80%";
          levels.style.fontSize = "80%";
        }
      }
      if(window.innerWidth > 700){
        lives.style.fontSize = "130%";
        levels.style.fontSize = "130%";
      }
      if(((level.x > level.y)&&(window.innerHeight>window.innerWidth))||((level.y>level.x)&&(window.innerWidth>window.innerHeight))){
        if(window.innerHeight>window.innerWidth){}
        if(window.innerHeight<window.innerWidth){}
        orientationFix();
        //console.log("fixed");
      }
      //console.log("REDRAW: RESIZE");
      redraw();
      //console.log(level);
    }



    //dir, 0 = ccw 1 = cw
    rotate = function(map, dir){
      var new_map = map;
	    for(let j = 0; j < level.y-1; j++){
		    for (let i = 0; i < level.x-1; i++){
          new_map[((i*level.x)-1)+j] = map[(j*level.x)+i];
        }
      }
      return new_map;
    }

    //0 = portrait
    orientationCheck = function(){
      if(window.innerHeight > innerWidth){
        return 0;
      }
      else{
        return 1;
      }
    }

    orientationFix = function(){
      ///*
      var temp = level.x;
      level.x = level.y;
      level.y = temp;
      ground.canvas.width = level.x * level.scale;
      ground.canvas.height = level.y * level.scale;
      pad.canvas.width = level.x * level.scale;
      pad.canvas.height = level.y * level.scale;
    }

    var RAFid = [];
    restart = function(){
      wipeWaiters();
      //if or fix
      remap();
      beginGame();
    }

    wipeWaiters = function(){
      RAFid.forEach(element => {
        cancelAnimationFrame(element);
      });
      RAFid = [];
    }

    var start = null;
    delay = function(int,func){
      if(start == null){
        start = Date.now();
      }
      var progress = Date.now() - start;
      if(progress < int){
        //anon func t prevent glob
        id = requestAnimationFrame(function(timestamp){
          delay(int,func);
        });
        RAFid.push(id);
      }
      else{
        start = null;
        func();
        return;
      }
    }

    updateInfo = function(){
      var lvls = "LEVEL: ";
      lvls += trial.exit_length+" "
      for(let i = 0; i<5;i++){
        if(i <= trial.wins+1){lvls = lvls+="* ";}
        else{lvls+="o ";}
      }
      lvls += trial.exit_length+1;
      levels.innerText = lvls;
    }
  
    beginGame = function(){
      time = performance.now();
      //console.log("GAME START");
      orientation = orientationCheck();
      //console.log("orientation: "+orientation);
      //canvas = size * dimension of array
      ground.canvas.width = level.x * level.scale;
      ground.canvas.height = level.y * level.scale;
      pad.canvas.width = level.x * level.scale;
      pad.canvas.height = level.y * level.scale;
      frogbuffer.canvas.width = level.x * level.scale;
      frogbuffer.canvas.height = level.y * level.scale;
      lives.innerText = "LIVES";
      levels.innerText = "LEVEL";
      if(trial.game_map != null){
        level.map = trial_data.map;
      }
      else{
        mapGen();
      }
      infoBar.style.left = 0 + "px";
      infoBar.style.top = 5 + "px";
      infoBar.style.zIndex = "1";
      var lvls = "LEVEL: ";
      if(trial.tutorial){
        lvls += "TUTORIAL"
      }
      else{
        lvls += trial.exit_length+" "
        for(let i = 0; i<5;i++){
          if(i <= trial.wins){lvls = lvls+="* ";}
          else{lvls+="o ";}
        }
        lvls += trial.exit_length+1;
      } 
      levels.innerText = lvls;
      lives.innerText = "LIVES: "+trial.lives;
      /*
      ground.drawImage(infoBar,0,0,200,100);
      board.drawImage(ground.canvas, 0, 0, ground.canvas.width, ground.canvas.height, 0, 0, board.canvas.width, board.canvas.height);*/
      //this calls resize everytime the window changes size
      window.addEventListener("resize", resize, {passive:true});
      //window.addEventListener("orientationchange", restart, {passive:true});
      
      //this sizes up the window properly the first time
      resize();
      bo = false;
      document.onkeydown = dirCheckK;
      document.ontouchstart = dirCheckM;
      delay(level.learntime,blackoutrec);
    }
  }

  return plugin;
  
  })();