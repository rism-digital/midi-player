#MIDI Player


MIDI Player is a JavaScript player based on [Wild Web Midi](https://github.com/zz85/wild-web-midi) with a simple jQuery interface. It uses instrument patches from [Freepats](http://freepats.zenvoid.org/).

##Demo and example use

Try this [demo](http://rism-ch.github.io/midi-player/) for seeing / hearing it running.

Once included in your page, you only need to do (where song is a Base64 coded midi file):

```
<script type="text/javascript" src="wildwebmidi.js"></script>
<script type="text/javascript" src="midiplayer.js"></script>
<script type="text/javascript" src="example-song.js"></script>

$( document ).ready(function() {
    $("#player").midiPlayer({
        color: "red",
        onUnpdate: midiUpdate,
        onStop: midiStop,
        width: 250
    });
    $("#player").midiPlayer.play(song);
});
```

The source code of the demo is available [here](https://github.com/rism-ch/midi-player/tree/gh-pages)

## Building it

For building the midi-player you need Emscripten installed on your machine.

```sh
git clone git@github.com:Mindwerks/wildmidi.git
node make
```

