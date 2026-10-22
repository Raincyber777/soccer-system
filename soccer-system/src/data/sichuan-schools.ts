// 四川省行政区划与学校基础数据（前端演示 mock）
// 范围：本项目仅面向四川省，省级固定，市/区县用 GB/T 2260 行政区划代码做主键
// 学校唯一标识用教育部「学校（机构）标识码」（10 位，全国唯一）；
// 演示编码规则 = 区划代码(6位) + 4位序号，真实数据以省教育厅权威导入为准，接入后端时替换本文件
export type SchoolStage = '小学' | '初中' | '高中' | '高校'

export interface RegionOption {
  code: string
  name: string
}

export interface SchoolInfo {
  /** 学校（机构）标识码：10 位 */
  code: string
  name: string
  city: string
  district: string
  stage: SchoolStage
}

// 全部 21 个市州（含 3 个自治州）
export const SICHUAN_CITIES: RegionOption[] = [
  { code: '510100', name: '成都市' },
  { code: '510300', name: '自贡市' },
  { code: '510400', name: '攀枝花市' },
  { code: '510500', name: '泸州市' },
  { code: '510600', name: '德阳市' },
  { code: '510700', name: '绵阳市' },
  { code: '510800', name: '广元市' },
  { code: '510900', name: '遂宁市' },
  { code: '511000', name: '内江市' },
  { code: '511100', name: '乐山市' },
  { code: '511300', name: '南充市' },
  { code: '511400', name: '眉山市' },
  { code: '511500', name: '宜宾市' },
  { code: '511600', name: '广安市' },
  { code: '511700', name: '达州市' },
  { code: '511800', name: '雅安市' },
  { code: '511900', name: '巴中市' },
  { code: '512000', name: '资阳市' },
  { code: '513200', name: '阿坝州' },
  { code: '513300', name: '甘孜州' },
  { code: '513400', name: '凉山州' },
]

// 演示页通用市州下拉选项（完整 21 市州里挑常用 6 个；「省本级」由页面按需追加）
export const SICHUAN_CITY_OPTIONS: string[] = ['成都市', '绵阳市', '德阳市', '宜宾市', '南充市', '达州市']

// 市州 → 区县（演示子集，真实数据以后端行政区划表为准）
export const CITY_DISTRICTS: Record<string, RegionOption[]> = {
  成都市: [
    { code: '510104', name: '锦江区' },
    { code: '510105', name: '青羊区' },
    { code: '510106', name: '金牛区' },
    { code: '510107', name: '武侯区' },
    { code: '510108', name: '成华区' },
    { code: '510112', name: '龙泉驿区' },
    { code: '510114', name: '新都区' },
    { code: '510115', name: '温江区' },
    { code: '510116', name: '双流区' },
    { code: '510117', name: '郫都区' },
  ],
  自贡市: [
    { code: '510302', name: '自流井区' },
    { code: '510303', name: '贡井区' },
    { code: '510304', name: '大安区' },
  ],
  攀枝花市: [
    { code: '510402', name: '东区' },
    { code: '510403', name: '西区' },
    { code: '510411', name: '仁和区' },
  ],
  泸州市: [
    { code: '510502', name: '江阳区' },
    { code: '510503', name: '纳溪区' },
    { code: '510504', name: '龙马潭区' },
  ],
  德阳市: [
    { code: '510603', name: '旌阳区' },
    { code: '510604', name: '罗江区' },
    { code: '510681', name: '广汉市' },
    { code: '510682', name: '什邡市' },
    { code: '510683', name: '绵竹市' },
  ],
  绵阳市: [
    { code: '510703', name: '涪城区' },
    { code: '510704', name: '游仙区' },
    { code: '510705', name: '安州区' },
    { code: '510781', name: '江油市' },
  ],
  广元市: [
    { code: '510802', name: '利州区' },
    { code: '510811', name: '昭化区' },
    { code: '510812', name: '朝天区' },
  ],
  遂宁市: [
    { code: '510903', name: '船山区' },
    { code: '510904', name: '安居区' },
  ],
  内江市: [
    { code: '511002', name: '市中区' },
    { code: '511011', name: '东兴区' },
  ],
  乐山市: [
    { code: '511102', name: '市中区' },
    { code: '511111', name: '沙湾区' },
    { code: '511112', name: '五通桥区' },
  ],
  南充市: [
    { code: '511302', name: '顺庆区' },
    { code: '511303', name: '高坪区' },
    { code: '511304', name: '嘉陵区' },
  ],
  眉山市: [
    { code: '511402', name: '东坡区' },
    { code: '511403', name: '彭山区' },
  ],
  宜宾市: [
    { code: '511502', name: '翠屏区' },
    { code: '511503', name: '南溪区' },
    { code: '511504', name: '叙州区' },
  ],
  广安市: [
    { code: '511602', name: '广安区' },
    { code: '511603', name: '前锋区' },
  ],
  达州市: [
    { code: '511702', name: '通川区' },
    { code: '511703', name: '达川区' },
  ],
  雅安市: [
    { code: '511802', name: '雨城区' },
    { code: '511803', name: '名山区' },
  ],
  巴中市: [
    { code: '511902', name: '巴州区' },
    { code: '511903', name: '恩阳区' },
  ],
  资阳市: [
    { code: '512002', name: '雁江区' },
    { code: '512021', name: '安岳县' },
    { code: '512022', name: '乐至县' },
  ],
  阿坝州: [
    { code: '513201', name: '马尔康市' },
    { code: '513221', name: '汶川县' },
  ],
  甘孜州: [
    { code: '513301', name: '康定市' },
    { code: '513322', name: '泸定县' },
  ],
  凉山州: [
    { code: '513401', name: '西昌市' },
    { code: '513423', name: '盐源县' },
  ],
}

// 学校基础数据（演示）：接入后端前用本表模拟「学校代码精准定位」
export const SICHUAN_SCHOOLS: SchoolInfo[] = [
  { code: '5101050003', name: '成都市实验小学', city: '成都市', district: '青羊区', stage: '小学' },
  { code: '5101050002', name: '成都市石室联合中学', city: '成都市', district: '青羊区', stage: '初中' },
  { code: '5101040001', name: '四川师范大学附属中学', city: '成都市', district: '锦江区', stage: '高中' },
  { code: '5101070004', name: '成都市第七中学', city: '成都市', district: '武侯区', stage: '高中' },
  { code: '5101160008', name: '四川省双流棠湖中学', city: '成都市', district: '双流区', stage: '高中' },
  { code: '5101080009', name: '成都市实验中学', city: '成都市', district: '成华区', stage: '初中' },
  { code: '5101070005', name: '四川大学', city: '成都市', district: '武侯区', stage: '高校' },
  { code: '5101080007', name: '电子科技大学', city: '成都市', district: '成华区', stage: '高校' },
  { code: '5101070006', name: '成都体育学院', city: '成都市', district: '武侯区', stage: '高校' },
  { code: '5107030001', name: '四川省绵阳中学', city: '绵阳市', district: '涪城区', stage: '高中' },
  { code: '5107030002', name: '绵阳南山中学', city: '绵阳市', district: '涪城区', stage: '高中' },
  { code: '5107030003', name: '西南科技大学', city: '绵阳市', district: '涪城区', stage: '高校' },
  { code: '5106030001', name: '四川省德阳中学', city: '德阳市', district: '旌阳区', stage: '高中' },
  { code: '5106030002', name: '德阳市第一小学', city: '德阳市', district: '旌阳区', stage: '小学' },
  { code: '5115020001', name: '宜宾市第一中学校', city: '宜宾市', district: '翠屏区', stage: '高中' },
  { code: '5115020002', name: '宜宾市人民路小学', city: '宜宾市', district: '翠屏区', stage: '小学' },
  { code: '5113020001', name: '四川省南充高级中学', city: '南充市', district: '顺庆区', stage: '高中' },
  { code: '5113020002', name: '西华师范大学', city: '南充市', district: '顺庆区', stage: '高校' },
  { code: '5117020001', name: '达州市第一中学', city: '达州市', district: '通川区', stage: '高中' },
]
