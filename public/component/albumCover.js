var colorThief = new ColorThief();// this is some of the dumbest shit

Vue.component("album-cover",{
    props:['src'],
    template:`
        <span style="width:150px;height:150px;">
            <img v-if="error" style="width:150px;height:100%;background-image:url('album_placeholder.svg');background-size:contain;object-fit:cover;">
            <img v-else ref="image" @load="onload" :src="_src" @error="onerror" style="width:150px;height:100%;background-image:url('album_placeholder.svg');background-size:contain;object-fit:cover;">
        </span>
    `,
    data:function(){
        return {
            error:false
        }
    },
    watch:{
        src:function(){
            this.error=false
        }
    },
    methods:{
        onerror:function(){
            this.error=true;
            this.$emit('error');
            this.$emit('load', {color: '#fff', palette: ['#000','#000','#000','#000','#000','#000']});
        },
        onload: function(){
            var primaryColor = colorThief.getColor(this.$refs.image);
            var palette = colorThief.getPalette(this.$refs.image);

            let toCss = r=> `rgba(${r[0]},${r[1]},${r[2]})`;


            var toYuv = (color)=>{
                var rgb = color.map(channel => channel/255);
                var y = rgb[0]*0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
                var u = (0.492 * (rgb[2] - y) + 1)/2;
                var v = (0.877 * (rgb[0] - y) + 1)/2;
                return [y,u,v];
            }

            var getContrast = (c1,c2) =>{
                var yuv1 = toYuv(c1);
                var yuv2 = toYuv(c2);
                return Math.sqrt( 
                        Math.pow(yuv1[0]-yuv2[0],2) + Math.pow(yuv1[1]-yuv2[1],2) + Math.pow(yuv1[2]-yuv2[2],2)
                    ) / Math.sqrt(3);
            }
            var isReadable = (c1,c2)=>{
                return getContrast(c1,c2) > 0.1;
            }


            // // assume c1,c2 are in array format!
            // var getContrast = (c1,c2) =>{
            //     return Math.sqrt( 
            //             Math.pow(c1[0]-c2[0],2) + Math.pow(c1[1]-c2[1],2) + Math.pow(c1[2]-c2[2],2)
            //         ) / Math.sqrt(255*255*3);
            // }
            // var isReadable = (c1,c2)=>{
            //     return getContrast(c1,c2) > 0.2;
            // }

            // iterate through palette and find 3 colors that are readable on color, else black or white.
            var readablePalette = palette.filter((paletteColor)=>{
                return isReadable(paletteColor, primaryColor);
            });

            // readablePalette = _.sortBy(readablePalette,(c)=>-1*getContrast(c, primaryColor))

            // try and make copies of previous colors if only 1 or 2 make it
            if (readablePalette.length > 0 && readablePalette.length < 4){
                while (readablePalette.length < 4){
                    readablePalette.push(readablePalette[readablePalette.length - 1])
                }
            }
            else if (readablePalette.length == 0){
                // we can always add black or white.
                var alwaysGoodColor = getContrast(primaryColor,[0,0,0]) > getContrast(primaryColor,[255,255,255]) ? [0,0,0] : [255,255,255];
                while(readablePalette.length < 4){
                    readablePalette.push(alwaysGoodColor)
                }
            }
            this.$emit('load', {color: toCss(primaryColor), palette: readablePalette.map(toCss)});
        }
    },
    computed:{
        _src:function(){
            return (this.src && !this.error)?this.src:null;
        }
    }
})