/************************************************************************
 * Circular Web Audio Buffer Queue
 */

class CircularAudioBuffer {
    constructor(slots) {
        slots = slots || 24;
        // number of buffers
        this.slots = slots;
        this.buffers = new Array(slots);
        
        this.reset();
        
        for (var i = 0; i < this.slots; i++) {
            var buffer = audioCtx.createBuffer(channels, BUFFER, SAMPLE_RATE);
            this.buffers[i] = buffer;
        }
    }
    
    // pseudo empty all buffers
    reset () {
        this.used = 0;
        this.filled = 0;
    }
    
    // returns number of buffers that are filled
    filledBuffers () {
        var fills = this.filled - this.used;
        if (fills < 0) fills += this.slots;
        return fills;
    }
    
    // returns whether buffers are all filled
    full () {
        //console.debug(this.filledBuffers());
        return this.filledBuffers() >= this.slots - 1;
    }
    
    // returns a reference to next available buffer to be filled
    prepare () {
        if (this.full()) {
            //console.log('buffers full!!')
            return
        }
        var buffer = this.buffers[ this.filled++];
        this.filled %= this.slots;
        return buffer;
    }
    
    // returns the next buffer in the queue
    use () {
        if (! this.filledBuffers()) return;
        var buffer = this.buffers[ this.used++];
        this.used %= this.slots;
        return buffer;
    }
}


/************************************************************************
 * Web Audio Stuff
 */

var SAMPLE_RATE = 44100;
var BUFFER = 4096;
var channels = 2;

var audioCtx;
var source;
var scriptNode;
var circularBuffer;
var emptyBuffer;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    scriptNode = audioCtx.createScriptProcessor(BUFFER, 0, channels);
    scriptNode.onaudioprocess = onAudioProcess;
    
    source = audioCtx.createBufferSource();
    circularBuffer = new CircularAudioBuffer(8);
    emptyBuffer = audioCtx.createBuffer(channels, BUFFER, SAMPLE_RATE);
    
    source.connect(scriptNode);
    source.start(0);
    console.debug("initAudio");
}

function startAudio() {
    scriptNode.connect(audioCtx.destination);
    console.debug("startAudio");
}

function pauseAudio() {
    circularBuffer.reset();
    scriptNode.disconnect();
    console.debug("pauseAudio");
}


/************************************************************************
 * Emscripten variables and callback - cannot be renamed
 */

var ULONG_MAX = 4294967295;
var _EM_signalStop = 0;
var _EM_seekSamples = ULONG_MAX;

//Player currently played
var currentPlayer = null;

function processAudio(buffer_loc, size) {
    var buffer = circularBuffer.prepare();
    var left_buffer_f32 = buffer.getChannelData(0);
    var right_buffer_f32 = buffer.getChannelData(1);
    
    // Copy emscripten memory (OpenAL stereo16 format) to JS
    for (var i = 0; i < size; i++) {
        left_buffer_f32[i] = MidiPlayer.HEAP16[(buffer_loc >> 1) + 2 * i + 0] / 32768;
        right_buffer_f32[i] = MidiPlayer.HEAP16[(buffer_loc >> 1) + 2 * i + 1] / 32768;
    }
}

function updateProgress(current, total) {
    midiPlayer_currentSamples = current;
    midiPlayer_totalSamples = total;
    //Progress of the current player is updated
    currentPlayer.midiPlayer_progress.style.width = (current / total * 100) + '%';
    currentPlayer.midiPlayer_playingTime.innerHTML = samplesToTime(current);
    currentPlayer.midiPlayer_totalTime.innerHTML = samplesToTime(total);

    if (current == total)
    {
        currentPlayer.midiPlayer_play.style.display = 'inline-block';
        currentPlayer.midiPlayer_pause.style.display = 'none';
        currentPlayer.midiPlayer_stop.style.display = 'none';
    }

    var millisec = Math.floor(current * 1000 / SAMPLE_RATE / midiPlayer_updateRate);
    if (midiPlayer_lastMillisec > millisec) {
        midiPlayer_lastMillisec = 0;
    }
    if (millisec > midiPlayer_lastMillisec) {
        if (currentPlayer.midiPlayer_onUpdate != null) currentPlayer.midiPlayer_onUpdate(millisec * midiPlayer_updateRate);
        //console.log(millisec * UPDATE_RATE);
    }
    midiPlayer_lastMillisec = millisec;
}

function completeConversion(status) {
    midiPlayer_drainBuffer = true;
    console.debug('completeConversion');
    midiPlayer_convertionJob = null;
    // Not a pause
    if (_EM_signalStop != 2) {
        setTimeout(stop, 1000);   
    }
}

/************************************************************************
 * Global player variables and functions
 */

// variables
var midiPlayer_isLoaded = false;
var midiPlayer_isAudioInit = false;
var midiPlayer_input = null;
var midiPlayer_lastMillisec = 0;
var midiPlayer_midiName = ''
var midiPlayer_convertionJob = null;
var midiPlayer_currentSamples = ULONG_MAX;
var midiPlayer_totalSamples = 0;
var midiPlayer_updateRate = 50;
var midiPlayer_drainBuffer = false;
var BASE64_MARKER = ';base64,';

// callbacks
var midiPlayer_onStop = null;
var midiPlayer_onUpdate = null;

var pageDragStart = 0;
var barDragStart = 0;

var MidiPlayer = {
    noInitialRun: true,
    totalDependencies: 1,
    filePackagePrefixURL : ((typeof MidiPlayer_filePackagePrefixURL === 'undefined' || MidiPlayer_filePackagePrefixURL === null) ? "" : MidiPlayer_filePackagePrefixURL),
    monitorRunDependencies: function(left) {
        //console.log(this.totalDependencies);
        //console.log(left);
        if ((left == 0) && !midiPlayer_isLoaded) {
          console.log("MidiPlayer is loaded");
          midiPlayer_isLoaded = true;
        }
    }
};
MidiModule(MidiPlayer);

function onAudioProcess(audioProcessingEvent) {
    var generated = circularBuffer.use();
    
    if (!generated && midiPlayer_drainBuffer) {
        // wait for remaining buffer to drain before disconnect audio
        pauseAudio();
        midiPlayer_drainBuffer = false;
        return;
    }
    if (!generated) {
        //console.log('buffer under run!!')
        generated = emptyBuffer;
    }
    
    var outputBuffer = audioProcessingEvent.outputBuffer;
    var offset = 0;
    if (outputBuffer.copyToChannel !== undefined) {
        // Firefox -> about 50% faster than decoding
        outputBuffer.copyToChannel(generated.getChannelData(0), 0, offset);
        outputBuffer.copyToChannel(generated.getChannelData(1), 1, offset);
    } else {
        // Other browsers -> about 20 - 70% slower than decoding
        var leftChannel = outputBuffer.getChannelData(0);
        var rightChannel = outputBuffer.getChannelData(1);
        var generatedLeftChannel = generated.getChannelData(0);
        var generatedRightChannel = generated.getChannelData(1);
        var i;
        for (i = 0; i < BUFFER; i++) {
            leftChannel[i] = generatedLeftChannel[i];
            rightChannel[i] = generatedRightChannel[i];
        }
    }
}

function samplesToTime(at) {
    var in_s = Math.floor(at / SAMPLE_RATE);
    var s = in_s % 60;
    var min = in_s / 60 | 0;
    return min + ':' + (s === 0 ? '00': s < 10 ? '0' + s: s);
}

function convertDataURIToBinary(dataURI) {
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));
    
    for (var i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

function runConversion() {
    midiPlayer_convertionJob = {
    sourceMidi: midiPlayer_midiName,
    targetWav: midiPlayer_midiName.replace(/\.midi?$/i, '.wav'),
    targetPath: '',
    conversion_start: Date.now()
    };
    
    var sleep = 10;
    circularBuffer.reset();
    startAudio();
    
    console.log(midiPlayer_convertionJob);
    
    MidiPlayer.ccall('wildwebmidi',
                     null,[ 'string', 'string', 'number'],[midiPlayer_convertionJob.sourceMidi, midiPlayer_convertionJob.targetPath, sleep], {
                     async: true
                     });
}


/* ***********************************************************
 * Class that must be instantiated for each displayed player
 * Creates all the HTML elements making the player
 */
class MidiPlayerClass {
    constructor(htmlPlayerElem, options) {
        // creates player of name htmlPlayerElem
        // PATCH1 EFR POUR WORDPRESS
        // remplacer $ par jQuery() pour compatibilité ancienne version WordPress
        var options = jQuery().extend({
            // These are the defaults.
            color: "#556b2f",
            backgroundColor: "white",
            width: 500,
            updateRate: 50
        },
        options);
        // width should not be less than 150
        options.width = Math.max(options.width, 150);
        // update rate should not be less than 10 milliseconds
        options.updateRate = Math.max(options.updateRate, 10);
        
        // Create the player
        jQuery("#"+htmlPlayerElem).append('<div id="midiPlayer_div_'+htmlPlayerElem+'" class="midiPlayer_div"></div>');
        jQuery("#midiPlayer_div_"+htmlPlayerElem).append('<div id="midiPlayer_playingTime_'+htmlPlayerElem+'" class="midiPlayer_playingTime">0:00</div>')
            .append('<div id="midiPlayer_bar_'+htmlPlayerElem+'" class="midiPlayer_bar"><div id="midiPlayer_progress_'+htmlPlayerElem+'" class="midiPlayer_progress"></div></div>')
            .append('<div id="midiPlayer_totalTime_'+htmlPlayerElem+'" class="midiPlayer_totalTime">0:00</div>')
            .append('<div id="midiPlayer_controllers_'+htmlPlayerElem+'" class="midiPlayer_controllers"><a class="icon play" id="midiPlayer_play_'+htmlPlayerElem+'" onclick="'+htmlPlayerElem+'.play()"></a><a class="icon pause" id="midiPlayer_pause_'+htmlPlayerElem+'" onclick="'+htmlPlayerElem+'.pause()"></a><a class="icon stop" id="midiPlayer_stop_'+htmlPlayerElem+'" onclick="'+htmlPlayerElem+'.stop()"></a></div>');
        
        jQuery("#midiPlayer_div_"+htmlPlayerElem).css("max-width", options.width + 200);
        jQuery("#midiPlayer_progress_"+htmlPlayerElem).css("background", options.color);
        
        this.midiPlayer_songIsLoaded = false;
        this.midiPlayer_loadSong = options.loadSong;
        // Assign the global variables
        this.midiPlayer_onStop = options.onStop;
        this.midiPlayer_onUpdate = options.onUpdate;

        this.midiPlayer_updateRate = options.updateRate;

        this.midiPlayer_bar = jQuery("#midiPlayer_bar_"+htmlPlayerElem)[0];
        this.midiPlayer_progress = jQuery("#midiPlayer_progress_"+htmlPlayerElem)[0];
        this.midiPlayer_playingTime = jQuery("#midiPlayer_playingTime_"+htmlPlayerElem)[0];
        this.midiPlayer_play = jQuery("#midiPlayer_play_"+htmlPlayerElem)[0];
        this.midiPlayer_pause = jQuery("#midiPlayer_pause_"+htmlPlayerElem)[0];
        this.midiPlayer_stop = jQuery("#midiPlayer_stop_"+htmlPlayerElem)[0];
        this.midiPlayer_totalTime = jQuery("#midiPlayer_totalTime_"+htmlPlayerElem)[0];
        
        this.midiPlayer_play.style.display = 'inline-block';
        
        this.midiPlayer_bar.addEventListener('mousedown', function (e) {
                if (midiPlayer_totalSamples == 0) return;
                pageDragStart = e.pageX;
                barDragStart = e.offsetX;
                updateDragging(e.pageX);
        });
        // Warkaround as 'this' can't be used in the callback
        var that = this;
        
        this.midiPlayer_bar.addEventListener('mousemove', function (e) {
                if (pageDragStart != 0) {
                    that.pause();
                    updateDragging(e.pageX);
                }
        });
        this.midiPlayer_bar.addEventListener('mouseup', function (e) {
                if (pageDragStart == 0) return;
                if (midiPlayer_totalSamples == 0) return;
                pageDragStart = 0;
                that.play();
        });
        
        function updateDragging(pageX) {
            var posX =  barDragStart + (pageX - pageDragStart);
            if (posX >= 0 && posX <= options.width) {
                var percent = posX / options.width;
                midiPlayer_currentSamples = percent * midiPlayer_totalSamples | 0;
                updateProgress(midiPlayer_currentSamples, midiPlayer_totalSamples);
            }
        }
    }
    
    loadSong (song) {
        if (midiPlayer_isLoaded == false) {
            midiPlayer_input = song;
        }
        else {
            var byteArray = convertDataURIToBinary(song);
            if (midiPlayer_totalSamples > 0) {
                this.stop();
                var that = this;
                // a timeout is necessary because otherwise writing to the disk is not done
                setTimeout(function() {that.convertFile("player.midi", byteArray);}, 200);
            }
            else {
                this.convertFile("player.midi", byteArray);
            }
        }
    }
    
    convertFile(file, data) {
        midiPlayer_midiName = file;
        midiPlayer_input = null;
        console.log('open ', midiPlayer_midiName);
        MidiPlayer['FS'].writeFile(midiPlayer_midiName, data, {
                                   encoding: 'binary'
                                   });
    }
    
    pause() {
        _EM_signalStop = 2;
        circularBuffer.reset();
        this.midiPlayer_play.style.display = 'inline-block';
        this.midiPlayer_pause.style.display = 'none';
    }
    
    play() {
        // If another player is playing we stop it
        if (currentPlayer && currentPlayer != this)
        {
            currentPlayer.stop();
            // and we force that the song will be reloaded
            currentPlayer.midiPlayer_songIsLoaded = false;
        }
        
        // This is the new current player
        currentPlayer = this;

        if (!this.midiPlayer_songIsLoaded)
        {
            this.midiPlayer_loadSong();
            this.midiPlayer_songIsLoaded = true;
        }

        if (!midiPlayer_isLoaded) {
            console.error("MidiPlayer is not loaded yet");
            return;
        }
        if (!midiPlayer_isAudioInit) {
            initAudio();
            midiPlayer_isAudioInit = true;
        }
        
        _EM_seekSamples = midiPlayer_currentSamples;
        if (midiPlayer_convertionJob) {
            return;
        }
        
        _EM_signalStop = 0;
        this.midiPlayer_play.style.display = 'none';
        this.midiPlayer_pause.style.display = 'inline-block';
        this.midiPlayer_stop.style.display = 'inline-block';
        // add small delay so UI can update.
        setTimeout(runConversion, 100);
    }
    
    stop() {
        _EM_signalStop = 1;
        _EM_seekSamples = 0;
        circularBuffer.reset();
        
        midiPlayer_totalSamples = 0;
        midiPlayer_currentSamples = ULONG_MAX;
        this.midiPlayer_progress.style.width = '0%';
        this.midiPlayer_playingTime.innerHTML = "0.00";
        this.midiPlayer_totalTime.innerHTML = "0.00";
        
        this.midiPlayer_play.style.display = 'inline-block';
        this.midiPlayer_pause.style.display = 'none';
        this.midiPlayer_stop.style.display = 'none';
        
        if (this.midiPlayer_onStop != null) this.midiPlayer_onStop();
    }
}
