//  => Worker (maximize processes)

let scope = self;

let mydrum;
let map;
let drumloop;
let playerloop;

// DrumKit contain differents sounds for kicks, snares..
// Could be possible to add sounds with upload feature

let DrumKit = {
    kicks: {
        "Kick01": {
            path: "default/kick/kick01.wav",
            activated: false,
            volume: 1
        },
        "Kick02": {
            path: "default/kick/kick02.wav",
            activated: true,
            volume: 1
        }
    },
    snares: {
        "Snare01": {
            path:"default/snare/snare01.wav",
            activated: false,
            volume: 1
        },
        "Snare02": {
            path: "default/snare/snare02.wav",
            activated: true,
            volume: 1
        }
    },
    hihats: {
        "Hi-hat01": {
            path: "default/hi-hat/hi-hat01.wav",
            activated: true,
            volume: 1
        },
        "Hi-hat02": {
            path: "default/hi-hat/hi-hat02.wav",
            activated: false,
            volume: 1
        }
    },
    percs: {
        "Perc01": {
            path: "default/perc/perc01.wav",
            activated: true,
            volume: 1
        },
        "Perc02": {
            path: "default/perc/perc02.wav",
            activated: false,
            volume: 1
        }
    },
    fx: {
        "FX01": {
            path: "default/fx/fx01.wav",
            activated: false,
            volume: 1
        },
        "FX02": {
            path: "default/fx/fx02.wav",
            activated: true,
            volume: 1
        }
    }
};


// Instrument Class for all Instruments

class Inst {

    constructor(kitObj, name){
        this.kit = kitObj;
        this.name = name;
    }


    addSoundToKit(sound){

        this.kit[sound.name] = [];
        this.kit[sound.name][sound.name] = {
            path: sound.path,
            activated: true,
            volume: 1
        };

        return sound.name;

    }

    returnAllSounds(){
        return this.kit;
    }

    changeVolume(inst, volume){
        for(let instKit in this.kit){
            if(instKit == inst){
                for(let prop in this.kit[instKit]){
                    this.kit[instKit][prop].volume = volume;

                    postMessage({volume: {
                        inst: prop,
                        volume: volume
                    }});

                }
            }
        }

    }


}

// Drum Class to have more options

class Drum extends Inst {

    constructor(kitObj, name){
        super(kitObj, name);
    }

}


// Player Class

class Player{
    constructor(bpm, barsNbr, Inst, loop){
        this.name = "Loop Random";
        this.bpm = bpm;
        this.barsNbr = barsNbr;
        this.onPlay = null;
        this.play = false;
        this.bpmCount = 1;
        this.intervalPlayer = null;
        this.intervalBPM = null;
        this.inst = Inst;
        this.map = {};
        this.intervalTiming = null;
        this.Timing = 0;
        this.differenceTiming = (60000 / this.bpm);

        this.valuesTiming = {
            "120": 4,
            "180": 1.85
        };

        if(typeof loop == "undefined") {
            this._createMapping();
            this.type = "myloop";
        } else {
            this._createMappingWithMapLoop(loop);
            this.type = "loopOnList";
        }

    }

    _createMapping(){

        for (let type in this.inst.kit) {

            this.map[type] = {};

            for (let i = 1; i < this.barsNbr + 1; i++) {
                this.map[type][i] = 0;
            }
        }

    }

    addToMapping(add){

        this.map[add] = {};

        for (let i = 1; i < this.barsNbr + 1; i++) {
            this.map[add][i] = 0;
        }
    }

    _createMappingWithMapLoop(loop){
        this.map = loop;
    }

    changeMap(obj){

        let type = (obj.id).split("_")[0];
        let barNbr = (obj.id).split("_")[1];
        this.map[type][barNbr] = obj.state;
    }

    changeMapWithController(gpios, volume){

        for(let gpiosType in gpios){

            if (this.map[gpiosType][(this.bpmCount - 1)] != gpios[gpiosType]) {

                this.map[gpiosType][(this.bpmCount - 1)] = gpios[gpiosType];

            }


        }

        // change the map into frontpage
        
        postMessage({mapChange: this.map});

    }

    _returnLinkActivatedInKit(type){

        for(let typeInst in this.inst.kit){
            if(typeInst == type){
                for(let kindOfInst in this.inst.kit[typeInst]){

                    for(let activation in this.inst.kit[typeInst][kindOfInst]) {

                        let link = this.inst.kit[typeInst][kindOfInst]["path"];

                        if (activation == "activated") {

                            if (this.inst.kit[typeInst][kindOfInst][activation] == true) {


                                postMessage({ newAudio : {
                                    typeInst: typeInst,
                                    kindOfInst: kindOfInst,
                                    link: link
                                }});

                                return kindOfInst;

                            }
                        }

                    }
                }
            }
        }
    }

    _playFunction(){
        let bpmCount = this.bpmCount;

        for(let type in this.map){

            for(let typedatas in this.map[type]){

                if(typedatas == bpmCount) {

                    if (this.map[type][typedatas] == 1) {
                        postMessage({sound: this._returnLinkActivatedInKit(type)});
                    }

                }
            }
        }
    }

    set SetBpm (bpm){

        if(bpm > 10 && bpm < 600) {
            this.bpm = bpm;
            this.onPlay = true;
        }
    }

    set SetName (name){
        this.name = name;
    }

    set onPlay (action){

        let that = this;

        if(typeof action !== null) {

            if(action == true) {

                this.play = true;

                if(typeof this.intervalPlayer !== null){

                    this.bpmCount = 1;
                    clearInterval(this.intervalBPM);
                }


                // 60,000 ms (1 minute) / Tempo (BPM) = Delay Time in ms for quarter-note beats

                this.intervalBPM = setInterval(function(){

                    that._playFunction();
                    that.bpmCounter();

                    scope.postMessage({bpmCount: that.bpmCount, bpmWhat: that.type});

                }, (60000 / that.bpm));

                // Know difference timing

                that.intervalTiming = setInterval(function(){

                    // that.differenceTiming = (60000 / that.bpm) - that.Timing;
                    // that.Timing = that.Timing + 4;
                    //
                    // console.log(that.differenceTiming);

                    //console.log(that.Timing);
                    that.Timing = that.Timing + 4;
                    //console.log(that.Timing);


                }, 1 );

            } else {
                clearInterval(this.intervalPlayer);

                this.bpmCount = 0;
                this.play = false;

                clearInterval(this.intervalBPM);
                clearInterval(that.intervalTiming);

            }
        }
    }


    bpmCounter(){
        if(this.bpmCount == this.barsNbr){
            this.bpmCount = 1;
        } else {
            this.bpmCount++;
            this.Timing = 0;
        }
    }
}


class GPIO {

    constructor(gpios, correspondTo){
        this.gpios = gpios;
        this.gpiosCorrespondTo = correspondTo;
        this.volume = 50;
        this.gpiosMap = null;
        this.bpmGPIO = 50;
        this.timeOut = 1;
        this.beatTimeOut = null;
        this.lastKey = 50;
        this.mapToChange = {};
        this.mapToChangeCorrespondTo = {};

        this._constructGPIOMap();
    }

    _constructGPIOMap(){

        this.gpiosMap = {};

        for(let gpioCorrespond in this.gpiosCorrespondTo){
            this.gpiosMap[gpioCorrespond] = 0;
        }

        for(let gpioNbr in this.gpios){
            for(let gpioCorrespond in this.gpiosCorrespondTo){

                if(this.gpiosCorrespondTo[gpioCorrespond] == gpioNbr){
                    this.gpiosMap[gpioCorrespond] = this.gpios[gpioNbr];
                }

            }
        }

    }

    stopTimeOut(){
        clearTimeout(this.beatTimeOut);
    }

    timeOutFn(){

        this.timeOut = 0;
        let that = this;

        this.beatTimeOut = setTimeout(function(){

            that.timeOut = 1;
            that.lastKey = 50;

            that.stopTimeOut();

        }, (60000/that.bpm));


    }


    _synchronizeMap(){

        for(let gpioNbr in this.gpios){
            for(let gpioCorrespond in this.gpiosCorrespondTo){

                if(this.gpiosCorrespondTo[gpioCorrespond] == gpioNbr){
                    this.gpiosMap[gpioCorrespond] = this.gpios[gpioNbr];
                }

            }
        }
    }

    _synchronizeMapToChange(){

        for(let gpioNbr in this.mapToChange){
            for(let gpioCorrespond in this.gpiosCorrespondTo){

                if(this.gpiosCorrespondTo[gpioCorrespond] == gpioNbr){
                    this.mapToChangeCorrespondTo[gpioCorrespond] = this.mapToChange[gpioNbr];
                }

            }
        }

    }

    upgradeWithInput(newGPIOS){


        for(let gpioNbr in newGPIOS){
            // Test if different => Change value

            if(newGPIOS[gpioNbr] != this.gpios[gpioNbr]){

                if(this.timeOut == 1 || this.lastKey != newGPIOS[gpioNbr]) {

                    this.lastKey = newGPIOS[gpioNbr];
                    this.timeOutFn();

                    if (this.bpmGPIO != (JSON.parse(JSON.stringify(myplayer.bpmCount)))) {

                        this.bpmGPIO = (JSON.parse(JSON.stringify(myplayer.bpmCount)));
                        this.gpios[gpioNbr] = newGPIOS[gpioNbr];

                        this.mapToChange[gpioNbr] = newGPIOS[gpioNbr];

                        this._synchronizeMap();
                        this._synchronizeMapToChange();
                        this._changePlayerValues();


                    }

                }


            }

        }

        //console.log(this.mapToChangeCorrespondTo);

        this.mapToChange = {};
        this.mapToChangeCorrespondTo = {};

    }

    _changePlayerValues(){
        myplayer.changeMapWithController(this.mapToChangeCorrespondTo, this.volume);
    }


}


// Kick => 15
// Snare => 19
// Hi-hats => 21
// Perc => 23
// FX => 29

let gpiosCorrespondTo = {
    "kicks" : 15,
    "snares" : 19,
    "hihats" : 21,
    "percs" : 23,
    "fx" : 29
};

let gpios = {
    "15": 0,
    "19": 0,
    "21": 0,
    "23": 0,
    "29": 0
};


// Init function

let init = function(bpm, barsNbr){

    mydrum = new Drum(DrumKit, "Drum");
    myplayer = new Player(bpm, barsNbr, mydrum);
    mygpio = new GPIO(gpios, gpiosCorrespondTo);


    postMessage({drum: mydrum.kit, added: false});
    postMessage({defaultSounds: mydrum.returnAllSounds()});

};


// Every call main message (Postmessage)

onmessage = function(e){

    let datas = e.data;

    if(typeof datas.init !== "undefined")
        init(datas.init.bpm, datas.init.barsNbr);

    if(typeof datas.play !== "undefined") {
        (datas.play == true) ? myplayer.onPlay = true : myplayer.onPlay = false;
    }

    if(typeof datas.bpm !== "undefined"){
        myplayer.SetBpm = datas.bpm;
    }

    if(typeof datas.nameLoop !== "undefined"){
        myplayer.SetName = datas.nameLoop;
    }

    if(typeof datas.instChange !== "undefined"){
        myplayer.changeMap(datas.instChange);
    }

    if(typeof datas.saveAction !== "undefined"){
        postMessage({loopToSave: myplayer});
    }

    if(typeof datas.newSound !== "undefined"){

        let newAddedObj = mydrum.addSoundToKit(datas.newSound);
        myplayer.addToMapping(newAddedObj);

        postMessage({defaultSounds: mydrum.returnAllSounds()});
        postMessage({drum: datas.newSound, added: true});
    }

    if(typeof datas.volume !== "undefined"){
        mydrum.changeVolume(datas.volume.inst, datas.volume.volume);
    }

    // Gpio Controller datas

    if(typeof datas.controller !== "undefined"){

        if(datas.controller.play == 1){

            if(myplayer.play != true) {
                myplayer.onPlay = true;
            }

        }

        if(datas.controller.stop == 1){

            if(myplayer.play != false) {
                myplayer.onPlay = false;
            }
        }

        if(myplayer.play != false)
            mygpio.upgradeWithInput(datas.controller.gpios);

    }

    // Play loops list

    if(typeof datas.playloop !== "undefined"){
        if(datas.playloop == true){

            if(typeof playerloop !== "undefined")
                playerloop.onPlay = false;

            map = datas.loopDatas.kit.map;

            drumloop = new Drum(datas.loopDatas.kit.inst.kit,
                                    datas.loopDatas.kit.inst.name);

            playerloop = new Player(datas.loopDatas.kit.bpm,
                                        datas.loopDatas.kit.barsNbr,
                                        drumloop, map);

            postMessage({SoundsLoop: drumloop.returnAllSounds()});

            playerloop.onPlay = true;

        } else if (datas.playloop == false){
            playerloop.onPlay = false;
        }
    }

};


