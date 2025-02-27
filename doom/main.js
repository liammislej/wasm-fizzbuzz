'use strict';
var memory = new WebAssembly.Memory({ initial : 108 });


function getMilliseconds() {
    return performance.now();
}

/*doom is rendered here*/
const canvas = document.getElementById('screen');
const doom_screen_width = 320*2;
const doom_screen_height = 200*2;


function drawCanvas(ptr) {
    var doom_screen = new Uint8ClampedArray(memory.buffer, ptr, doom_screen_width*doom_screen_height*4)
    var render_screen = new ImageData(doom_screen, doom_screen_width, doom_screen_height)
    var ctx = canvas.getContext('2d');

    ctx.putImageData(render_screen, 0, 0);
}

/*These functions will be available in WebAssembly. We also share the memory to share larger amounts of data with javascript, e.g. strings of the video output.*/
var importObject = {
    js: {
        js_console_log: () => console.log('log'),
        js_stdout: () => console.log('log'),
        js_stderr: () => console.log('log'),
        js_milliseconds_since_start: getMilliseconds,
        js_draw_screen: drawCanvas,
    },
    env: {
        memory: memory
    }
};

WebAssembly.instantiateStreaming(fetch('doom.wasm'), importObject)
    .then(obj => {

    /*Initialize Doom*/
    obj.instance.exports.main();


    /*input handling*/
    let doomKeyCode = function(keyCode) {
        // Doom seems to use mostly the same keycodes, except for the following (maybe I'm missing a few.)
        switch (keyCode) {
        case 8:
            return 127; // KEY_BACKSPACE
        case 17:
            return (0x80+0x1d); // KEY_RCTRL
        case 18:
            return (0x80+0x38); // KEY_RALT
        case 37:
            return 0xac; // KEY_LEFTARROW
        case 38:
            return 0xad; // KEY_UPARROW
        case 39:
            return 0xae; // KEY_RIGHTARROW
        case 40:
            return 0xaf; // KEY_DOWNARROW
        default:
            if (keyCode >= 65 /*A*/ && keyCode <= 90 /*Z*/) {
            return keyCode + 32; // ASCII to lower case
            }
            if (keyCode >= 112 /*F1*/ && keyCode <= 123 /*F12*/ ) {
            return keyCode + 75; // KEY_F1
            }
            return keyCode;
        }
    };
    let keyDown = function(keyCode) {obj.instance.exports.add_browser_event(0 /*KeyDown*/, keyCode);};
    let keyUp = function(keyCode) {obj.instance.exports.add_browser_event(1 /*KeyUp*/, keyCode);};

    /*keyboard input*/
    canvas.addEventListener('keydown', function(event) {
        keyDown(doomKeyCode(event.keyCode));
        event.preventDefault();
    }, false);
    canvas.addEventListener('keyup', function(event) {
        keyUp(doomKeyCode(event.keyCode));
        event.preventDefault();
    }, false);

    /*mobile touch input*/
    [["enterButton", 13],
     ["leftButton", 0xac],
     ["rightButton", 0xae],
     ["upButton", 0xad],
     ["downButton", 0xaf],
     ["ctrlButton", 0x80+0x1d],
     ["spaceButton", 32],
     ["altButton", 0x80+0x38]].forEach(([elementID, keyCode]) => {
        console.log(elementID + " for " + keyCode);
    });

    canvas.focus();

    var number_of_animation_frames = 0;
    /*Main game loop*/
    function step(timestamp) {
        ++number_of_animation_frames;
        obj.instance.exports.doom_loop_step();
        window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
});