Vue.component('audio-visualizer',{
    props:['audio'],
    data:function(){
        return {
            dead:false
        }
    },
    template:`
        <div>
            <canvas width="100" height="100" ref="canv"></canvas>
        </div>
    `,
    methods:{

    },
    created:function(){

        // all this will be cleaned up when we're done
        let context;
        let analyser;
        let source;
        let frequency_array;
        let canvas;
        let ctx;

        let cleanup = ()=>{
            context = null;
            analyser = null;
            source = null;
            frequency_array = null;
            ctx = null;
        }
        
        let onRender = ()=>{

            if (!this.audio){
                if(!this.dead){
                    // come back later
                    requestAnimationFrame(onRender);
                    return;
                }else{
                    // seeya later
                    cleanup();
                    return;
                }
            }
            
            // first call
            if (this.audio && this.$refs.canv && !ctx){
                context = new (window.AudioContext || window.webkitAudioContext)();
                analyser = context.createAnalyser();
                source = context.createMediaElementSource(this.audio);
                source.connect(analyser);
                analyser.connect(context.destination);
                frequency_array = new Uint8Array(analyser.frequencyBinCount);
                
                canvas = canvas || this.$refs.canv;
                ctx = ctx || canvas.getContext("2d");
                ctx.fillStyle = '#000';
                ctx.fillRect(0,0,canvas.width,canvas.height);
                
            }

            //  actual render stuffs
            analyser.getByteFrequencyData(frequency_array);

             // let's make 16 bars
             let len = frequency_array.length * 0.5;
             for (let i = 0; i < len; i ++){
                let y = Math.log2(i+1) / Math.log2(len+1);
                let height = Math.log2(i+2) / Math.log2(len) - y;

                y = y * canvas.height;
                height = height * canvas.height;

                let v = frequency_array[i]/255;
                ctx.fillStyle = `hsla(${90 - 90*v},${100}%,${50*v}%,0.8)`;
                ctx.fillRect(0,canvas.height - y,canvas.width,-height);
            }

            // end render stuff
            
            if(this.dead){
                cleanup();
            }else{
                requestAnimationFrame(onRender);
            }
        }

        requestAnimationFrame(onRender);


    },
    destroyed:function(){
        this.dead = false;
    }

})