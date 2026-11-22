<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import PortalBanner from './PortalBanner.vue'
import AppSelect from '../common/AppSelect.vue'
import { fetchPortalPhotos, type PortalPhotoRow } from '../../api/portal'

// Portal photos page (public): photos grouped by tournament.

const photos = ref<PortalPhotoRow[]>([])
const activeTournament = ref('全部赛事')

onMounted(async () => {
  photos.value = await fetchPortalPhotos()
})

const tournamentOptions = computed(() => {
  const names = [...new Set(photos.value.map((p) => p.tournament_name))]
  return ['全部赛事', ...names]
})

const grouped = computed(() => {
  const groups = new Map<string, PortalPhotoRow[]>()
  for (const p of photos.value) {
    if (activeTournament.value !== '全部赛事' && p.tournament_name !== activeTournament.value) {
      continue
    }
    const key = p.tournament_name || '其他'
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }
  return [...groups.entries()]
})

function imgSrc(p: PortalPhotoRow) {
  return p.image.startsWith('http') ? p.image.replace(/^https?:\/\/[^/]+/, '') : p.image
}
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <PortalBanner
      kicker="公开信息 · 无需登录"
      title="赛事照片"
      desc="按赛事分组展示的照片墙，记录赛场内外的精彩时刻。"
    />

    <main class="container">
      <div class="toolbar">
        <span class="toolbar-label">按赛事筛选</span>
        <AppSelect v-model="activeTournament" :options="tournamentOptions" />
      </div>

      <div v-for="[name, list] in grouped" :key="name" class="photo-group">
        <h3 class="section-title">{{ name }}</h3>
        <div class="photo-grid">
          <figure v-for="p in list" :key="p.id" class="photo-card">
            <img :src="imgSrc(p)" :alt="p.title || '赛事照片'" loading="lazy" />
            <figcaption>{{ p.title || '赛事照片' }}</figcaption>
          </figure>
        </div>
      </div>

      <p v-if="photos.length === 0" class="page-tip">暂无照片：管理员发布赛事照片后这里会展示。</p>
    </main>

    <PortalFooter />
  </div>
</template>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  /* 空态时也把内容区撑开，footer 不会被顶到页面上部 */
  min-height: calc(100vh - 380px);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 18px;
}

.toolbar-label {
  font-size: 14px;
  color: var(--muted);
}

.photo-group {
  margin-bottom: 32px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.photo-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  margin: 0;
}

.photo-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.photo-card figcaption {
  padding: 10px 14px;
  font-size: 13px;
  color: var(--muted);
  border-top: 1px solid var(--line);
}

@media (max-width: 640px) {
  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
