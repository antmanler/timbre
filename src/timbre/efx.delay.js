/**
 * timbre/efx.delay
 */
"use strict";

var timbre = require("../timbre");
// __BEGIN__

var EfxDelay = (function() {
    var EfxDelay = function() {
        initialize.apply(this, arguments);
    }, $this = EfxDelay.prototype;
    
    Object.defineProperty($this, "time", {
        set: function(value) {
            if (typeof value === "number") {
                this._.delayTime = value;
            }
        },
        get: function() { return this._.delayTime; }
    });
    Object.defineProperty($this, "fb", {
        set: function(value) {
            if (typeof value === "number") {
                this._.feedback = value;
            }
        },
        get: function() { return this._.feedback; }
                        
    });
    Object.defineProperty($this, "wet", {
        set: function(value) {
            if (typeof value === "number") {
                this._.wet = value;
            }
        },
        get: function() { return this._.wet; }
    });
    Object.defineProperty($this, "isOn", {
        get: function() { return this._.enabled; }
    });
    Object.defineProperty($this, "isOff", {
        get: function() { return !this._.enabled; }
    });
    
    
    var initialize = function(_args) {
        var bits, i, _;
        
        this._ = _ = {};
        bits = Math.ceil(Math.log(timbre.samplerate * 1.5) * Math.LOG2E)
        
        _.buffer = new Float32Array(1 << bits);
        _.buffer_mask = (1 << bits) - 1;
        _.pointerWrite = 0;
        _.pointerRead  = 0;
        _.delayTime = 250;
        _.feedback = 0.25;
        _.wet = 0.25;
        
        i = 0;
        if (typeof _args[i] === "number") {
            _.delayTime = _args[i++];
        }    
        if (typeof _args[i] === "number") {
            _.feedback = _args[i++];
        }    
        if (typeof _args[i] === "number") {
            _.wet = _args[i++];
        }
        _.enabled = true;
        
        set_params.call(this, _.delayTime, _.feedback, _.wet);
        this.args = timbre.fn.valist.call(this, _args.slice(i));
    };
    timbre.fn.set_ar_only($this);
    
    var set_params = function(delayTime, feedback, wet) {
        var offset, _ = this._;
        offset = delayTime * timbre.samplerate / 1000;
        
        _.pointerWrite = (_.pointerRead + offset) & _.buffer_mask;
        if (feedback >= 1.0) {
            _.feedback = +0.9990234375;
        } else if (feedback <= -1.0) {
            _.feedback = -0.9990234375;
        } else {
            _.feedback = feedback;
        }
        if (wet < 0) {
            _.wet = 0;
        } else if (wet > 1.0) {
            _.wet = 1.0;
        } else {
            _.wet = wet;
        }
    };
    
    $this.on = function() {
        this._.enabled = true;
        timbre.fn.do_event(this, "on");
        return this;
    };
    
    $this.off = function() {
        this._.enabled = false;
        timbre.fn.do_event(this, "off");
        return this;
    };
    
    $this.seq = function(seq_id) {
        var _ = this._;
        var args, cell;
        var tmp, i, imax, j, jmax;
        var mul, add;
        var x, feedback, wet, dry;
        var buffer, buffer_mask, pointerRead, pointerWrite;
        
        cell = this.cell;
        if (seq_id !== this.seq_id) {
            args = this.args;
            for (j = jmax = cell.length; j--; ) {
                cell[j] = 0.0;
            }
            for (i = args.length; i--; ) {
                tmp = args[i].seq(seq_id);
                for (j = jmax; j--; ) {
                    cell[j] += tmp[j];
                }
            }
            
            buffer = _.buffer;
            buffer_mask = _.buffer_mask;
            feedback = _.feedback;
            wet = _.wet;
            dry = 1 - wet;
            pointerRead  = _.pointerRead;
            pointerWrite = _.pointerWrite;
            mul = _.mul;
            add = _.add;
            
            // filter
            if (_.enabled) {
                for (i = 0, imax = cell.length; i < imax; ++i) {
                    x = buffer[pointerRead];
                    buffer[pointerWrite] = cell[i] - x * feedback;
                    cell[i] *= dry;
                    cell[i] += x * wet;
                    cell[i] = cell[i] * mul + add;
                    pointerWrite = (pointerWrite + 1) & buffer_mask;
                    pointerRead  = (pointerRead  + 1) & buffer_mask;
                }
            } else {
                for (i = 0, imax = cell.length; i < imax; ++i) {
                    x = buffer[pointerRead];
                    buffer[pointerWrite] = cell[i] - x * feedback;
                    pointerWrite = (pointerWrite + 1) & buffer_mask;
                    pointerRead  = (pointerRead  + 1) & buffer_mask;
                    cell[i] = cell[i] * mul + add;
                }
            }
            _.pointerRead  = pointerRead;
            _.pointerWrite = pointerWrite;
            
            this.seq_id = seq_id;
        }
        return cell;
    };
    

    return EfxDelay;
}());
timbre.fn.register("efx.delay", EfxDelay);

// __END__