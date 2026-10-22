import { createApp } from 'vue'
import App from './App.vue'
import router from './routers'
import { startAnimatedFavicon } from './utils/animatedFavicon'
import './assets/main.css'

createApp(App).use(router).mount('#app')

// 标签页图标逐帧旋转（Chrome/Edge 也生效），SVG 静态图作为首屏与回退
startAnimatedFavicon()
