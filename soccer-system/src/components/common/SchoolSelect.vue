<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSelect from './AppSelect.vue'
import { CITY_DISTRICTS, SICHUAN_CITIES, SICHUAN_SCHOOLS } from '../../data/sichuan-schools'
import type { SchoolInfo } from '../../data/sichuan-schools'

// 学校选择器：按「市 → 区县 → 学校名称/代码搜索」精准定位学校，禁止自由文本填写学校名（避免重名错填）。
// 选项里同时展示学校名称与 10 位「学校（机构）标识码」，选中后回显代码且只读，重选需点击按钮。
const props = defineProps<{
  modelValue: SchoolInfo | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SchoolInfo | null): void
}>()

const city = ref('')
const district = ref('')
const keyword = ref('')
const open = ref(false)
const root = ref<HTMLElement | null>(null)

// 搜索防抖：演示数据为本地过滤，接入后端时把这里换成防抖请求学校接口
const DEBOUNCE_MS = 250
const debouncedKeyword = ref('')
let timer: ReturnType<typeof setTimeout> | null = null
watch(keyword, (k) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedKeyword.value = k.trim()
  }, DEBOUNCE_MS)
})

// 点击组件外部时收起搜索面板
function onDocPointerDown(e: PointerEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  if (timer) clearTimeout(timer)
})

const cityNames = computed(() => SICHUAN_CITIES.map((c) => c.name))
const districtOptions = computed(() => (city.value ? (CITY_DISTRICTS[city.value] ?? []) : []))
const districtNames = computed(() => districtOptions.value.map((d) => d.name))

// 搜索范围：选了区县在本区县内搜，只选市则在全市搜；关键词匹配学校名称或代码
const matchedSchools = computed<SchoolInfo[]>(() => {
  if (!city.value) return []
  const pool = SICHUAN_SCHOOLS.filter((s) =>
    district.value ? s.district === district.value : s.city === city.value,
  )
  const k = debouncedKeyword.value
  if (!k) return pool
  return pool.filter((s) => s.name.includes(k) || s.code.includes(k))
})

// 编辑回显：已有值时自动带出所在市/区县
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      city.value = v.city
      district.value = v.district
    }
  },
  { immediate: true },
)

// 切换市州后清空区县，需要重新搜索学校
watch(city, () => {
  district.value = ''
  open.value = false
})

function choose(school: SchoolInfo) {
  emit('update:modelValue', school)
  open.value = false
}

// 清除已选学校（保留市/区县便于就近重选）
function clearPicked() {
  emit('update:modelValue', null)
  keyword.value = ''
  debouncedKeyword.value = ''
}

const picked = computed(() => props.modelValue)
const hasPicked = computed(() => picked.value !== null)
</script>

<template>
  <div ref="root" class="school-select">
    <template v-if="!hasPicked">
      <div class="region-row">
        <AppSelect v-model="city" :options="cityNames" placeholder="选择市州" />
        <AppSelect v-model="district" :options="districtNames" placeholder="区县（可筛选）" />
      </div>

      <div v-if="city" class="search-wrap">
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          :placeholder="district ? `在${city}${district}搜索学校名称或代码` : `在${city}搜索学校名称或代码`"
          @focus="open = true"
          @input="open = true"
        />
        <Transition name="drop">
          <ul v-if="open" class="search-menu" role="listbox">
            <li v-if="matchedSchools.length === 0" class="search-empty">未找到匹配学校，请更换关键词或区县</li>
            <li
              v-for="s in matchedSchools"
              :key="s.code"
              class="search-option"
              role="option"
              :aria-selected="false"
              @click="choose(s)"
            >
              <span class="opt-name">
                {{ s.name }}
                <i class="opt-stage">{{ s.stage }}</i>
              </span>
              <span class="opt-code">{{ s.code }}</span>
            </li>
          </ul>
        </Transition>
      </div>
      <p v-else class="school-hint">请先选择学校所在市州，再按学校名称或 10 位学校代码搜索</p>
    </template>

    <!-- 已选中：学校与标识码只读回显，避免误改 -->
    <div v-else class="picked">
      <div class="picked-main">
        <p class="picked-name">
          {{ picked?.name }}
          <span class="picked-stage">{{ picked?.stage }}</span>
        </p>
        <p class="picked-code">
          学校标识码 <strong>{{ picked?.code }}</strong>
          <span class="picked-region">{{ picked?.city }} · {{ picked?.district }}</span>
        </p>
      </div>
      <button type="button" class="picked-reset" @click="clearPicked">重选学校</button>
    </div>
  </div>
</template>

<style scoped>
.school-select {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.region-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.search-wrap {
  position: relative;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
}

.search-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 40;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(20, 60, 40, 0.16);
  max-height: 240px;
  overflow-y: auto;
}

.search-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-option:hover {
  background: var(--green-light);
}

.opt-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.opt-stage {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--green);
  background: var(--green-light);
  border-radius: 999px;
  padding: 1px 7px;
}

.opt-code {
  font-family: Consolas, monospace;
  font-size: 12.5px;
  color: var(--muted);
  flex-shrink: 0;
}

.search-empty {
  padding: 14px 10px;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.school-hint {
  font-size: 12.5px;
  color: var(--muted);
}

/* 已选中回显 */
.picked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--green-light);
  border: 1.5px solid rgba(30, 122, 63, 0.3);
  border-radius: 8px;
  padding: 11px 14px;
  flex-wrap: wrap;
}

.picked-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--green-dark);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.picked-stage {
  font-size: 11px;
  font-weight: 600;
  color: var(--green);
  background: #fff;
  border-radius: 999px;
  padding: 1px 7px;
}

.picked-code {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--muted);
}

.picked-code strong {
  font-family: Consolas, monospace;
  color: var(--green-dark);
  letter-spacing: 0.5px;
}

.picked-region {
  margin-left: 8px;
}

.picked-reset {
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  background: #fff;
  padding: 6px 12px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  flex-shrink: 0;
}

.picked-reset:hover {
  border-color: var(--green);
  color: var(--green);
}

/* 搜索面板展开收起动画 */
.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
