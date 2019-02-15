
Vue.component("album-cover",{
    props:['src'],
    template:`
        <span style="width:150px;height:150px;">
            <img :src="_src" @error="onerror" style="width:150px;height:100%;background-image:url('album_placeholder.svg');background-size:contain;object-fit:cover;">
        </span>
    `,
    data:function(){
        return {
            error:false
        }
    },
    methods:{
        onerror:function(){
            this.error=true;
        }
    },
    computed:{
        _src:function(){
            return (this.src && !this.error)?this.src:null;
        }
    }
})