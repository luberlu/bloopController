$(function() {

    // Imagined by Luberlu
    // 2017

    // init Firebase


    // Code simplifié du projet Bloop pour la version pilotée par Raspberry Pi => https://my-firebase-f02fa.firebaseapp.com/

    let config = {
        apiKey: "AIzaSyAUNsxtZkmEgVd2aEGTNn0KYTkxrIDqDoU",
        authDomain: "my-firebase-f02fa.firebaseapp.com",
        databaseURL: "https://my-firebase-f02fa.firebaseio.com",
        storageBucket: "my-firebase-f02fa.appspot.com",
        messagingSenderId: "912536062883"
    };

    firebase.initializeApp(config);

    let storage = firebase.storage();
    let storageRef = storage.ref();
    let soundsRef = storageRef.child('sounds');


    let newUser;

    // Create a worker

    let myworker = new Worker("js/worker.js");

    // Configuration

    let bpm = 180;
    let barsNbr = 16;

    // Init Call to Worker

    myworker.postMessage({
        init: {
            bpm: bpm,
            barsNbr: barsNbr
        }
    });

    let intervalController;

    // Raspberry XMLHttpRequest Part

    let requestController = function() {

        var req = new XMLHttpRequest();

        req.open('GET', 'http://192.168.41.200:6030/drummachine', true);

        req.onreadystatechange = function () {
            if (req.readyState == 4) {
                if(req.status == 200) {

                    if(typeof req.responseText != "undefined") {

                        // Send datas to the worker
                        myworker.postMessage({controller: JSON.parse(req.responseText)});

                    }
                }
            }
        };

        req.send(null);
    };

    intervalController = setInterval(requestController, 210);


    // All worker message here

    myworker.onmessage = function (event) {
        let datas = event.data;

        if (typeof datas.drum !== "undefined") {

            if(datas.added == false) {
                handlebarsStepsbar();
                handlebarstrackBar(datas.drum);
            } else {
                handlebarstrackBar(datas.drum, 1);
            }

        }

        if (typeof datas.bpmCount !== "undefined") {
            displayBpm(datas.bpmWhat, datas.bpmCount)
        }

        if (typeof datas.sound !== "undefined") {
            playSound(datas.sound);
        }

        // If new audio Upload

        if (typeof datas.newAudio !== "undefined") {

            if (typeof sounds.sources[datas.newAudio.kindOfInst.toLowerCase()] == "undefined") {
                sounds.sources[datas.newAudio.kindOfInst.toLowerCase()] = datas.newAudio;

                // firebase storage call for url

                soundsRef.child(datas.newAudio.link).getDownloadURL().then(function (url) {
                    sounds.audioObjects[datas.newAudio.kindOfInst.toLowerCase()] = new Audio(url);
                });
            }
        }

        // Init defaultSounds in html5

        if (typeof datas.defaultSounds !== "undefined") {

            for (let objects in datas.defaultSounds) {

                for (let kindOfObj in datas.defaultSounds[objects]) {

                    if (typeof sounds.sources[kindOfObj.toLowerCase()] == "undefined") {
                        sounds.sources[kindOfObj.toLowerCase()] = datas.defaultSounds[objects];

                        // firebase storage call for url

                        soundsRef.child(datas.defaultSounds[objects][kindOfObj].path).getDownloadURL().then(function (url) {
                            sounds.audioObjects[kindOfObj.toLowerCase()] = new Audio(url);
                            sounds.audioObjects[kindOfObj.toLowerCase()].volume = datas.defaultSounds[objects][kindOfObj].volume;
                        });
                    }

                }

            }

        }

        // CreateSound for list loops

        if (typeof datas.SoundsLoop !== "undefined") {

            for (let objects in datas.SoundsLoop) {

                for (let kindOfObj in datas.SoundsLoop[objects]) {

                    if (typeof sounds.sources[kindOfObj.toLowerCase()] == "undefined") {
                        sounds.sources[kindOfObj.toLowerCase()] = datas.SoundsLoop[objects];

                        // firebase storage call for url

                        soundsRef.child(datas.SoundsLoop[objects][kindOfObj].path).getDownloadURL().then(function (url) {
                            sounds.audioObjects[kindOfObj.toLowerCase()] = new Audio(url);
                            sounds.audioObjects[kindOfObj.toLowerCase()].volume = datas.SoundsLoop[objects][kindOfObj].volume;
                        });
                    }

                }

            }

        }


        if (typeof datas.loopToSave !== "undefined") {

            newUser.mapInObject = datas.loopToSave;
            newUser.setMap();

        }

        if(typeof datas.volume !== "undefined"){
            sounds.audioObjects[datas.volume.inst.toLowerCase()].volume = datas.volume.volume;
        }

        if(typeof datas.mapChange !== "undefined"){
            changeFrontMap(datas.mapChange);
        }
    };

    // all sounds Array to new Audio Obj

    let sounds = {
        sources: [],
        audioObjects: []
    };


    // Play sound html5

    let playSound = function (link) {

        if(typeof sounds.audioObjects[link.toLowerCase()].currentTime !== "undefined") {
            sounds.audioObjects[link.toLowerCase()].currentTime = 0;
            sounds.audioObjects[link.toLowerCase()].play();
        }
    };

    let stopEverySounds = function (){

        for(let sound in sounds.audioObjects){
            sounds.audioObjects[sound].pause();
        }
    };

    // DOM

    // variables

    let playbtn = $("#play");
    let stopbtn = $("#stop");
    let bpmInput = $("#bpm");
    let widthStep = (1 / barsNbr) * 100;


    // Display BPM Animation

    let displayBpm = function (what, BpmCounter) {

        if (what == "myloop") {

            $(".steps").removeClass("on");
            $("#step_" + (BpmCounter - 1)).addClass("on");

        } else {
            $('#all_loops .ON .progress-bar span').removeClass('on');
            $('#all_loops .ON .progress-bar #' + (BpmCounter - 2)).addClass("on");
        }

    };

    let playerMachine = $("#playerMachine");


    // change input state in front when raspberry button works

    let changeFrontMap = function(map){


        for(let mapLine in map){

            for(let mapValues in map[mapLine]){

                if(map[mapLine][mapValues] == 0){
                    playerMachine.find("#" + mapLine + "_" + mapValues).prop( "checked", false );
                } else {
                    playerMachine.find("#" + mapLine + "_" + mapValues).prop( "checked", true );
                }

            }

        }


    };

    // Interactions functionnalities

    playbtn.click(function () {
        myworker.postMessage({play: true});
    });

    stopbtn.click(function () {
        stopEverySounds();
        myworker.postMessage({play: false});
    });

    bpmInput.on("change paste keyup", function () {
        bpm = $(this).val();
        myworker.postMessage({bpm: bpm});
    });


    let afterCreateObjDom = function () {

        playerMachine.find(':input').change(function (e) {

            myworker.postMessage({
                instChange: {
                    id: (e.target.id).toLowerCase(),
                    state: (this.checked) ? 1 : 0
                }
            });

        });

        $(".dial").knob({
            'change' : function (v) {
                let value = (v/100);
                let what = this.$.attr('id').split("_")[1];

                myworker.postMessage({volume: {
                    inst: what,
                    volume: value
                }});

            }
        });


    };


    // Script block handlebars

    let trackbar = $("#track-bar").html();
    let stepsBarBlock = $("#steps-bar").html();


    Handlebars.registerHelper('bar', function (n, block) {

        let nbr = n.barsNbr;
        let name = (typeof n.name !== "undefined") ? n.name : "null";

        let accum = '';
        for (let i = 1; i < (nbr + 1); ++i)
            accum += block.fn({i: i, nbr: nbr, name: name});
        return accum;

    });

    // Handlebars Steps Helper

    Handlebars.registerHelper('step', function (n, block) {

        let nbr = n.barsNbr;

        let accum = '';
        for (let i = 1; i < (nbr + 1); ++i)
            accum += block.fn({i: i, nbr: nbr, widthStep: widthStep});
        return accum;

    });


    let handlebarsStepsbar = function(){

        let context = {
            infos: {
                barsNbr: barsNbr
            }
        };


        let template = Handlebars.compile(stepsBarBlock);
        let theCompiledHtml = template(context);

        $("#bar").prepend(theCompiledHtml);

        afterCreateObjDom();

    };

    // Handlebars Track Drum Machine

    let handlebarstrackBar = function(obj, add){

        let drumMachine = $("#playerMachine");

        // init

        if(typeof add == "undefined") {

            for (let inst in obj) {
                if (obj.hasOwnProperty(inst)) {

                    let context = {
                        name: inst,
                        infos: {
                            barsNbr: barsNbr,
                            name: inst
                        }

                    };

                    let template = Handlebars.compile(trackbar);
                    let theCompiledHtml = template(context);

                    drumMachine.append(theCompiledHtml);

                }
            }

        } else {

            // add Sounds

            let context = {
                name: obj.name,
                infos: {
                    barsNbr: barsNbr,
                    name: obj.name
                }

            };

            let template = Handlebars.compile(trackbar);
            let theCompiledHtml = template(context);

            drumMachine.append(theCompiledHtml);

        }

        afterCreateObjDom();

    };


});
