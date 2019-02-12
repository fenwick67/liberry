
Vue.component('audio-player',{
    data:function(){
        return {
            volume:1,
            currentTime:0,
            duration:1,
            listeners:[],
            audioEl:null,
            interval:null,
            paused:true
        }
    },
    props:['src','preload','autoplay'],
    template:`
    <div class="level" style="max-width:100%">
        <small
            class="level-item"
            style="white-space:pre;"
            >{{timify(currentTime)}} / {{timify(duration)}}</small>
        <progress
            class="level-item progress is-primary is-flex-wide"
            :value="currentTime"
            :max="duration"
            min="0"
            @click="setTime"
            style="min-width:150px;cursor:pointer;width:auto;margin-bottom:0;"
        />
        <button @click="togglePause" class="button is-rounded level-item is-primary">
            {{ paused?"Play":"Pause" }}
        </button>
    </div>
    `,
    methods:{
        play(){
            this.audioEl.play();
            this.syncSelf();
        },
        pause(){
            this.audioEl.pause();
            this.syncSelf();
        },
        syncAudioEl(){  // set audio attributes to match my properties
            var props = ['volume','src','preload'];
            props.forEach(prop=>{
                if ( this[prop] != this.audioEl.getAttribute(prop) ){
                    this.audioEl.setAttribute(prop,this[prop]);
                }
            })
        },
        syncSelf(){  // set my properties to match audio properties
            var props = ['paused','currentTime','duration'];
            props.forEach(prop=>{
                if (this[prop] != this.audioEl[prop]){
                    this[prop] = this.audioEl[prop]
                }
            })

        },
        timify(t){
            if(!t){
                return '--:--';
            }
            var mins = Math.floor(t / 60);
            var secs = Math.floor(t - mins*60 );
            secs = secs.toString();
            if(secs.length < 2){
                secs = '0'+secs;
            }
            mins = mins.toString();
            if(mins.length < 2){
                mins = ' '+mins;
            }
            var ret = `${mins}:${secs}`;
            return ret;
        },
        togglePause(){
            if(this.paused){
                this.play();
            }else{
                this.pause();
            }
        },
        setTime(event){
            var amnt = event.offsetX / event.target.clientWidth;
            this.audioEl.currentTime = amnt * this.audioEl.duration;
            this.syncSelf();
        }
    },
    watch:{
        src(to,from){
            this.audioEl.src = to;
            if(to && this.autoplay){
                this.play();
            }else{
                this.pause();
            }
            this.syncSelf();
        },
        volume(to,from){
            this.audioEl.volume=to;
            this.syncSelf();
        }
    },
    created(){
        this.audioEl = new Audio();

        // check if we should play now
        if(this.src && this.autoplay){
            this.audioEl.src = this.src;
            this.play();
        }

        var lmd = ()=>{
            this.syncSelf();
        }
        this.audioEl.addEventListener('loadedmetadata',lmd);

        var timeUpdate = ()=>{
            this.syncSelf();
        }
        this.audioEl.addEventListener('timeupdate',timeUpdate);

        var onEnd = ()=>{
          this.$emit('ended');
        }
        this.audioEl.addEventListener('ended',onEnd);


    },
    destroyed(){
        // clean up listeners
        clearInterval(this.interval);
        //TODO clean up eventListeners
    }

})
